# 11 · Tracking de tempo de tela

> Monitoramento próprio de tempo de uso (estilo StayFree, sem depender de app de
> terceiros): sites no navegador, apps do PC e apps do iPhone. O tempo excedente
> vira custo em ouro pelo ledger e, além de um limite declarado, alimenta o
> contra-ataque do boss ([05 §3.2](./05-temporadas-boss.md)).

## 1. As três zonas (por fonte)

Cada **fonte** (`tracked_sources`) declara o contrato de uma coisa monitorada —
um domínio (`youtube.com`), um executável (`steam.exe`) ou um app do iPhone
(`youtube`):

```
0 ───────── franquia ───────── limite-boss ─────────▶
   ZONA 1        ZONA 2               ZONA 3
   grátis        só ouro              ouro + alimenta o boss
```

| Campo | Significado | Default |
|---|---|---|
| `daily_free_seconds` | Zona 1: uso legítimo, sem custo | 3600 (1h) |
| `gold_per_hour` | Zona 2: preço do excedente, pró-rata POR SEGUNDO | 0 |
| `boss_threshold_seconds` | Início da zona 3 (null = fonte nunca alimenta o boss) | null |
| `hp_per_hour` | Gancho futuro: dano direto de HP por hora excedida | 0 (desligado) |

- **Cobrança por estado acumulado** (idempotente): `devido = ⌊cobrável × taxa/3600⌋;
  delta = devido − já_cobrado`. Reprocessar o dia nunca cobra duas vezes; hora
  parcial conta exata (1h38 a 60/h = 98 ouro). Débito via `grant` com ouro
  negativo (`source_type='tracking'`) — clampa no saldo, nunca negativa.
- **Zona 3**: `feed = Σ max(0, segundos_do_dia − limite)` por fonte ativa. No
  julgamento diário do boss: `dano_contra-ataque × (1 + min(0.50, ⌊feed/300s⌋ × 0.01))`,
  e `feed ≥ 3600s` torna o dia ruim por si só. Fontes iPhone (`youtube`) e PC
  (`youtube.com`) são **separadas** — franquias independentes por contexto.
- Tempo de fonte não cadastrada aparece como "só estatística" (não cobra).

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

## 4. Clientes

| Cliente | Mede | Repo/pasta | Notas |
|---|---|---|---|
| Extensão MV3 | domínio ativo no navegador | `gamificacao-extensao/` | esbuild puro; estado do SW em `storage.session` + espelho local p/ órfãos; chunks de 5 min; fila local (teto 5k) com flush ≤500/lote e backoff |
| Desktop Electron | exe em foreground no Windows | `gamificacao-web/electron/` | UI = build do web via protocolo `app://`; `get-windows` + `powerMonitor` (idle 60s); **ignora navegadores** (anti-dupla-contagem); tray, pausar, auto-start; instalador NSIS |
| iPhone | apps com automação | Atalhos do iOS | receita completa em [10-tracking-iphone-atalhos](./10-tracking-iphone-atalhos.md) |

## 5. Relação com o boss (resumo)

- Tracking **não causa dano** no boss (não gera XP — o boss é movido a XP) e fica
  fora de objetivos de fase e da eleição de fraqueza.
- A única via é a zona 3 → contra-ataque amplificado + conversão de dia ruim
  ([05 §3.2](./05-temporadas-boss.md)). Beat narrativo `tracking_feed` quando o
  amplificador dispara.

## 6. Telas

- **Web/Desktop**: `Tempo` (Hoje · Fontes · Dispositivos) — custo do dia ao vivo,
  barra de franquia, badge "Boss +Xmin" na zona 3, CRUD de fontes, pareamento
  (com 1-clique no Electron via `window.desktop.pair`).
- **App Expo**: mesma tela em `src/app/(app)/tracking/` (card na Central via
  `module_registry`).
