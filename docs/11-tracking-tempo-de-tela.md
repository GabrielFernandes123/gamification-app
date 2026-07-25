# 11 · Tracking de tempo de tela

> Monitoramento próprio de tempo de uso (estilo StayFree, sem depender de app de
> terceiros): sites no navegador, apps do PC e apps do iPhone. O tempo excedente
> vira custo em ouro pelo ledger e, além de um limite declarado, alimenta o
> contra-ataque do boss ([05 §3.2](./05-temporadas-boss.md)).

## 1. As quatro zonas (por fonte)

Cada **fonte** (`tracked_sources`) declara o contrato de uma coisa monitorada —
um domínio (`youtube.com`), um executável (`steam.exe`) ou um app do iPhone
(`youtube`):

```
0 ──── franquia ──── limite-boss ──── bloqueio ────▶
 ZONA 1     ZONA 2        ZONA 3         ZONA 4
 grátis     só ouro    ouro + boss    interceptado (liberar custa ouro)
```

| Campo | Significado | Default |
|---|---|---|
| `daily_free_seconds` | Zona 1: uso legítimo, sem custo | 3600 (1h) |
| `gold_per_hour` | Zona 2: preço do excedente, pró-rata POR SEGUNDO | 0 |
| `boss_threshold_seconds` | Início da zona 3 (null = fonte nunca alimenta o boss) | null |
| `block_after_seconds` | Início da zona 4 (null = nunca bloqueia) | null |
| `unlock_cost_gold` / `unlock_minutes` | Preço e duração da liberação comprada | 0 / 15 |
| `hp_per_hour` | Gancho futuro: dano direto de HP por hora excedida | 0 (desligado) |

**Zona 4 — bloqueio com preço.** Nada é proibido: a tela é interceptada e
continuar custa ouro por tempo limitado (`POST /v1/tracking/unlock`, debitado no
ledger). Diferente da cobrança automática do tempo — que clampa no saldo — esta
é uma compra voluntária e **é recusada sem ouro suficiente**. Palavras
bloqueadas (`tracking_blocked_keywords`) seguem a mesma mecânica quando casam
com a URL ou o título da página.

- **Cobrança por estado acumulado** (idempotente): `devido = ⌊cobrável × taxa/3600⌋;
  delta = devido − já_cobrado`. Reprocessar o dia nunca cobra duas vezes; hora
  parcial conta exata (1h38 a 60/h = 98 ouro). Débito via `grant` com ouro
  negativo (`source_type='tracking'`) — clampa no saldo, nunca negativa.
- **Zona 3**: `feed = Σ max(0, segundos_do_dia − limite)` por fonte ativa. No
  julgamento diário do boss: `dano_contra-ataque × (1 + min(0.50, ⌊feed/300s⌋ × 0.01))`,
  e `feed ≥ 3600s` torna o dia ruim por si só. Fontes iPhone (`youtube`) e PC
  (`youtube.com`) são **separadas** — franquias independentes por contexto.
- Tempo de fonte não cadastrada aparece como "só estatística" (não cobra).

## 1b. Três formas de consumir (medidas SEPARADAMENTE)

Com múltiplos monitores, "sem foco" ≠ "não está vendo". Cada intervalo carrega
um `mode`, e o rollup guarda os três em colunas próprias:

| Modo | Quando (extensão) | Coluna |
|---|---|---|
| `active` | janela em foco, com input **ou** com som | `seconds` |
| `parallel` | janela **não minimizada**, aba ativa, com som, sem foco → 2º monitor | `parallel_seconds` |
| `audio` | aba de fundo ou janela minimizada com som → você só escuta | `audio_seconds` |

- Visibilidade real (monitor, sobreposição) é impossível de saber numa extensão:
  "não minimizada + aba ativa + som" é o melhor proxy. Vídeo **mudo** fora de
  foco não é detectável — limitação conhecida.
- Assistir vídeo parado **em foco** conta como `active` (o som supre a falta de
  input). Sem input por 30 min, nada conta — você saiu.
- O desktop mede só foreground (`active`); áudio de app nativo exigiria APIs de
  áudio do Windows.
- `tracked_sources.charge_mode` decide o que entra na conta, sempre a 100%:
  `active` (padrão) · `parallel` (+2º monitor) · `all` (inclui só-áudio). A
  regra é única (`usage-mode.ts`) e vale para franquia, cobrança, bloqueio e
  feed do boss — os quatro nunca divergem.

## 1c. Exigência por DIA (domingo ≠ segunda)

Os limites de uma fonte e a **meta diária de XP** (a que o boss cobra) são
resolvidos em três camadas, da mais geral para a mais específica:

```
padrão da fonte / meta do personagem
   → sobrescrita do DIA DA SEMANA (0=domingo … 6=sábado)
      → × marca do DIA ESPECÍFICO ('tranquilo' | 'pesado')
```

| Camada | Tabela | Observação |
|---|---|---|
| Dia da semana (fonte) | `tracked_source_day_overrides` | campos nulos herdam a fonte |
| Dia da semana (meta XP) | `xp_goal_day_overrides` | ausente = `characters.daily_xp_goal` |
| Marca do dia | `tracking_day_marks` | cobre feriado/folga/plantão, que o calendário semanal não prevê |

- Os multiplicadores das marcas ficam em `tracking_settings`
  (`calm_limit_multiplier` 2.0, `calm_goal_multiplier` 0.6,
  `heavy_limit_multiplier` 0.6, `heavy_goal_multiplier` 1.25).
- A regra é **uma só**: a função SQL `public.tracking_day_multiplier(user, day, 'limit'|'goal')`
  + os fragmentos de `effective-limits.ts`, usados pela cobrança, pelo bloqueio,
  pela policy dos clientes e pelo contra-ataque do boss. Se divergissem, o jogo
  mentiria para o jogador.
- **Onde se configura**: tudo no web (aba **Dias** e o bloco "Limites por dia"
  dentro da fonte). No app mobile existe só **marcar o dia de hoje** — que é o
  que se decide na correria.

## 2. Pipeline de ingestão (API `src/tracking/`)

```
clientes ──POST /v1/tracking/ingest──▶ sanitize ──▶ usage_intervals ──▶ usage_daily ──▶ cobrança
         (intervalos fechados,          (clamp,      (bruto, 45d)      (rollup/dia)     (grant)
          uuid do CLIENTE)              split de meia-noite no fuso do usuário)
```

- **Idempotência**: uuid gerado no cliente; reenvio → `on conflict do nothing`.
- **Servidor manda no relógio**: `ended_at` clampado a now+2min; intervalos com
  mais de 7 dias ou 4h são descartados; `seconds` recalculado no servidor.
- **Fechamento**: cron `tracking-daily-close` (min 10 de cada hora, fuso do
  usuário) cobra o delta restante, carimba `settled_at` e limpa brutos >45 dias.
- **Eventos sem estado** (iPhone/Atalhos): `POST /v1/tracking/event`
  `{matcher, event: open|close}` — o servidor casa os pares (`usage_open_events`)
  e injeta no mesmo pipeline. Close sem open é ignorado; open duplo fecha o
  trecho anterior; opens órfãos são DESCARTADOS em 6h (nunca inventa tempo).

## 3. Dispositivos e pareamento

- Código de 8 chars (10 min, uso único) gerado pelo usuário logado em
  **Tempo → Dispositivos** → trocado por token opaco `dvc_` +32 bytes
  (`POST /v1/tracking/pair`, público, throttle 10/min/IP). O banco guarda só o
  sha256 (`devices.token_hash`); revogação = `revoked_at` → clientes recebem 401
  e voltam ao estado "parear".
- Plataformas: `extension` · `desktop` · `iphone`.

## 4. Endereço da API (fonte única)

`gamificacao-web/.env` → **`VITE_API_URL`** é a única fonte da URL para TODOS os
clientes. A interface lê em tempo de build (Vite); o **main do Electron** e a
**extensão** injetam o mesmo valor como `__API_URL__` nos respectivos
`scripts/build.mjs` (fallback: URL de produção). Não há configuração local que
possa divergir da tela — instalações antigas que persistiram uma URL própria têm
a chave descartada na inicialização. O app Expo usa `EXPO_PUBLIC_API_URL`.

> Ao apontar para outro servidor, mude só o `.env` do web e rebuilde os clientes.
> O `host_permissions` do manifest da extensão precisa conter o host novo, e a
> API precisa aceitar as origens `chrome-extension://…` e `app://` no CORS.

## 5. Clientes

| Cliente | Mede | Repo/pasta | Notas |
|---|---|---|---|
| Extensão MV3 | domínio ativo no navegador | `gamificacao-extensao/` | esbuild puro; estado do SW em `storage.session` + espelho local p/ órfãos; chunks de 5 min; fila local (teto 5k) com flush ≤500/lote e backoff |
| Desktop Electron | exe em foreground no Windows | `gamificacao-web/electron/` | UI = build do web via protocolo `app://`; `get-windows` + `powerMonitor` (idle 60s); **ignora navegadores** (anti-dupla-contagem); tray, pausar, auto-start; instalador NSIS |
| iPhone | apps com automação | Atalhos do iOS | receita completa em [10-tracking-iphone-atalhos](./10-tracking-iphone-atalhos.md) |

## 6. Ícones das fontes

- **Sites**: o favicon é resolvido **no cliente** a partir do domínio (serviço
  público de favicons) — sem storage, funciona até para domínios ainda não
  cadastrados. Falha de carregamento cai num ícone genérico.
- **Apps**: o desktop extrai o ícone real do executável (`app.getFileIcon` →
  32×32 data URL) e envia UMA vez por app em `POST /v1/tracking/icons`
  (validado como data URL de imagem, teto ~200 KB). Guardado em
  `tracking_source_icons`, chaveado por `(user_id, kind, matcher)` — vale
  inclusive para apps sem fonte cadastrada. `GET /summary` e `GET /sources`
  devolvem `icon_url` (null em sites).
- **Nome**: o `label` da fonte. No painel Hoje, fontes não cadastradas têm um
  botão **Cadastrar** que abre o formulário já preenchido com o matcher e um
  nome sugerido a partir do domínio.

## 7. Relação com o boss (resumo)

- Tracking **não causa dano** no boss (não gera XP — o boss é movido a XP) e fica
  fora de objetivos de fase e da eleição de fraqueza.
- A única via é a zona 3 → contra-ataque amplificado + conversão de dia ruim
  ([05 §3.2](./05-temporadas-boss.md)). Beat narrativo `tracking_feed` quando o
  amplificador dispara.

## 8. Telas

- **Web/Desktop**: `Tempo` (Hoje · Fontes · Dispositivos) — custo do dia ao vivo,
  barra de franquia, badge "Boss +Xmin" na zona 3, CRUD de fontes, pareamento
  (com 1-clique no Electron via `window.desktop.pair`).
- **App Expo**: mesma tela em `src/app/(app)/tracking/` (card na Central via
  `module_registry`).
