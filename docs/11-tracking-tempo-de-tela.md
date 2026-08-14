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
| `daily_free_target_seconds` / `free_step_seconds_per_week` | Ratchet: a franquia desce sozinha até o alvo | null / 0 |
| `weekly_free_seconds` / `weekly_overflow_mult` | Teto da semana e o quanto o preço sobe depois dele | null / 1.5 |
| `gold_per_hour` | Zona 2: preço do excedente, pró-rata POR SEGUNDO | 0 |
| `boss_threshold_seconds` | Início da zona 3 (null = fonte nunca alimenta o boss) | null |
| `block_after_seconds` | Início da zona 4 (null = nunca bloqueia) | null |
| `unlock_cost_gold` / `unlock_minutes` | Preço e duração da liberação comprada | 0 / 15 |
| `hp_per_hour` | Dano de HP por hora ACIMA da zona 3 (não incide na zona 2) | 0 (desligado) |

**Zona 4 — bloqueio com preço.** Nada é proibido: a tela é interceptada e
continuar custa ouro por tempo limitado (`POST /v1/tracking/unlock`, debitado no
ledger). Diferente da cobrança automática do tempo — que clampa no saldo — esta
é uma compra voluntária e **é recusada sem ouro suficiente**. Palavras
bloqueadas (`tracking_blocked_keywords`) seguem a mesma mecânica quando casam
com a URL ou o título da página.

- **Cobrança por estado acumulado** (idempotente): `devido = goldForOverage(cobrável);
  falta = devido − já_pago`. Reprocessar o dia nunca cobra duas vezes; hora
  parcial conta exata. Débito via `grant` com ouro negativo
  (`source_type='tracking'`) — o saldo nunca fica negativo.
- **Excesso ESCALANTE (2026-08-09)**, `overage-pricing.ts`: o preço é uma
  integral por faixas — 1ª hora de excesso 1,0× a taxa, 2ª 1,5×, daí 2,0×. Antes
  era linear, e a 3ª hora custava igual à 1ª: estourar muito saía
  proporcionalmente barato, o oposto do objetivo e incoerente com o dano
  escalante dos hábitos negativos. Config em dois níveis
  (`tracking_settings.overage_tiers` → `tracked_sources.overage_tiers`), NULL =
  padrão do código, config malformada cai no padrão em vez de derrubar a
  ingestão. **Continua função pura do `billable` acumulado** — é isso que
  preserva a idempotência; uma escalada dependente da ordem dos lotes a
  quebraria.
- **Dívida (2026-08-09)**: o ledger clampa no saldo, então `gold_charged` guarda
  o que REALMENTE saiu e `usage_daily.gold_owed` o resto —
  `pago = min(devido, saldo)`, `dívida = devido − pago`. A próxima ingestão do
  mesmo dia retenta sozinha (o estado acumulado já cuida disso); dia fechado sem
  uso novo é recolhido pela penhora sobre ganhos futuros. Antes o rollup gravava
  `devido` mesmo sem saldo: quem zerava o ouro usava de graça o resto do dia e a
  diferença sumia. **Módulo desligado não cobra E não endivida** — o dia é
  quitado, senão religar cobraria todo o período em que ficou off.
- **Penhora (2026-08-09)**, `economy/tracking-debt.ts`: a retentativa por
  ingestão só alcança dia com uso NOVO. Dia fechado, a dívida ficava parada — por
  isso todo GANHO de ouro passa `debt_seize_pct` (50%) para quitá-la antes de
  creditar, mais velha primeiro, e ela expira em `debt_expire_days` (7). Fica no
  `GrantService` porque são 15 chamadores e quem esquecesse pagaria integral em
  silêncio. **Ordem dos locks importa**: a penhora roda ANTES do `for update` em
  `characters`, porque a ingestão trava `usage_daily → characters` — invertida,
  as duas transações deadlockariam. O extrato explica o ganho reduzido via
  `meta.trackingDebtSeized`.
- **Dano da zona 3 (2026-08-09)**: `hp_per_hour` saiu do papel depois de um ano
  como gancho morto. `hp = ⌊(contado − limite_boss) × hp_per_hour / 3600⌋`, com
  `usage_daily.hp_charged` de acumulador (mesma idempotência do ouro). Incide só
  na zona 3: a zona 2 já tem preço, e cobrar ouro E HP pelo mesmo segundo puniria
  duas vezes. `DamageService.applyDamage` ganhou `source: 'habit' | 'tracking'` —
  reusar o caminho de hábito herdaria três coisas erradas (gate do módulo de
  hábitos, trégua e o teto diário DELES). Teto próprio em
  `habit_settings.daily_damage_cap_tracking_pct` (15%), pela lição de 2026-08-08:
  orçamento compartilhado vira disputa por ordem de chegada. O que o teto corta é
  perdido, não vira dívida — teto que adia o golpe não é teto.
- **Ratchet da franquia (2026-08-09)**: `efetiva = least(base, greatest(alvo,
  base − passo × semanas))`, dentro de `effective-limits.ts` e ANTES do
  multiplicador da marca do dia (senão um dia "tranquilo" dobraria a franquia
  VELHA). O `least(base, …)` cobre a borda real: sobrescrita de dia da semana
  menor que o alvo seria puxada para cima pelo `greatest`, e o ratchet
  AFROUXARIA justo o dia que você apertou à mão. Âncora (`free_ratchet_from`)
  nasce quando o ratchet é ligado e **não se move nas edições seguintes** —
  recontar do zero faria a franquia voltar ao topo a cada ajuste.
- **Bônus diário proporcional (2026-08-09)**: `bônus × max(piso, 1 − usado/franquia)`
  (`tracking_settings.daily_bonus_floor_pct`, 20%). Antes pagava igual para quem
  usou 1 segundo e para quem raspou a franquia. O piso existe porque quem raspou
  ainda respeitou o limite — zerar ensinaria que chegar perto é o mesmo que
  estourar.
- **Teto SEMANAL (2026-08-09)**, `weekly-budget.ts`: segundo teto por cima do
  diário, em `tracked_sources` E `tracking_sets` (o mais APERTADO manda). Semana
  domingo..sábado, a mesma de `weekBoundsIso`. Ele **não cobra sozinho** —
  multiplica o preço/hora do diário no resto da semana (`weekly_overflow_mult`,
  1,5×): cobrar o mesmo segundo duas vezes poluiria o extrato e quebraria a
  leitura "o total do dia é o último valor acumulado". Duas restrições que
  sustentam o desenho: (a) o fator sai dos dias **anteriores** da semana e fica
  CONGELADO durante o dia — variando no meio do dia, a cobrança deixaria de ser
  função do estado acumulado e reprocessar daria outro valor; (b) o teto é
  **imune às marcas de dia** — se valessem, marcar a semana toda como tranquila
  furaria o teto. Teto de CONJUNTO é o que resiste a substituição (cortar YouTube
  e migrar para Twitter não burla). Bônus semanal no fechamento, com
  `tracking_weekly_bonus` de trava de idempotência (o cron roda de hora em hora).
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

## 7b. Painel individual da fonte (2026-08-09)

`GET /tracking/sources/:id/analytics?days=` (`SourceAnalyticsService`). Existia
série diária GLOBAL e agregado por fonte no período, mas nunca a série de UMA
fonte com o próprio limite ao lado — então calibrar franquia e preço era chute.

- **Série diária × franquia efetiva**: o limite vem de `effectiveColumnsSql` com
  o dia da SÉRIE (não da linha de uso), porque dia sem uso também tem franquia e
  é a sequência de dias abaixo da linha que diz se ela está no lugar certo.
- **Por dia da semana** → é o formulário do `tracked_source_day_overrides`.
- **Por hora do dia** → é o formulário das janelas. Sai de `usage_intervals`, que
  é purgado aos 45 dias: a resposta declara a janela REAL em vez de fingir cobrir
  o período pedido. Cada intervalo conta na hora em que começou (erro de poucos
  minutos, já que os clientes fatiam a cada 5 min).
- **Placar**: tempo contado, ouro pago, dívida, dias dentro × fora da franquia,
  feed do boss, desbloqueios comprados.

**O histórico NÃO é reescrito quando a regra muda (2026-08-09).** O painel lê o
NÍVEL VIGENTE de cada dia; o motor de sugestões lê a regra de HOJE. Não é
inconsistência — são perguntas diferentes: o gráfico conta o que aconteceu, o
motor pergunta "o limite que vale agora aguenta meu padrão?". O modo é o 4º
parâmetro de `analytics()` (`'historical'` | `'current'`).

- Truque que evita duplicar a fórmula: os laterais do trecho histórico se chamam
  `s` e `o`, os MESMOS aliases que `effectiveColumnsSql` espera. O fragmento de
  `effective-limits.ts` é literalmente o mesmo texto nos dois modos; só muda para
  onde os aliases apontam.
- O **nível 1 vale para trás** (`'-infinity'`): existe uso medido antes de a
  fonte ser cadastrada, e sem isso esses dias sumiam do placar (medido: 21 dias
  com uso viravam 20).
- **Sobrescritas de dia da semana entram no snapshot** do nível, não em tabela
  de histórico própria — mudam junto com a fonte, e dois históricos separados se
  desincronizariam na primeira edição que tocasse só um. `DayProfilesService`
  chama `levels.recordById` ao gravar.
- **Marcas de dia congelam o multiplicador** vigente (`limit_multiplier`,
  `goal_multiplier`). A marca já era histórica; o que mutava era o significado
  dela — mexer em "tranquilo = 2×" reescrevia todo dia tranquilo do passado,
  inclusive dias já cobrados. `tracking_day_multiplier()` prefere o congelado.
- **Ouro e HP nunca foram afetados**: `gold_charged`/`gold_owed`/`hp_charged` são
  estado acumulado, gravados quando aconteceram. O que se reescrevia era só o
  derivado. Borda que permanece: intervalo atrasado para um dia passado (até 7
  dias) recalcula aquele dia com a regra vigente NELE, agora corretamente.

**Config versionada** (`tracked_source_levels`, `SourceLevelsService`): uma linha
por versão, `effective_to` nulo na corrente (índice único garante que só exista
uma). Sem isso o gráfico mostra um degrau sem causa e ninguém consegue responder
"subir o preço funcionou?". Duas edições no mesmo dia colapsam num nível só —
abrir outro criaria janela de duração zero. Divergência proposital em relação a
`habit_levels`: a config é **snapshot JSONB**, não colunas espelhadas, porque
`tracked_sources` tem ~15 campos de regra e vai ganhar mais.

## 7c. Motor de sugestões (2026-08-09)

`SourceSuggestionsService`, espelhando `HabitSuggestionsService`: analisa,
propõe, você aplica ou dispensa. Cron `10 7 * * 1` (uma hora depois do de
hábitos, para não disputarem a mesma janela). Índice único garante **uma
pendente por fonte e diagnóstico** — sem ele o cron semanal empilharia a mesma
recomendação até a tela virar uma lista de repetições.

| Diagnóstico | Sinal | Ação proposta |
|---|---|---|
| `price_ineffective` | estoura ≥70% dos dias, PAGA, e o tempo não cai | ligar `hp_per_hour` (ouro não é a alavanca) |
| `limit_ineffective` | estoura ≥70% dos dias | baixar a franquia |
| `limit_loose` | pico abaixo de 40% da franquia | apertar |
| `weekday_skew` | um dia da semana ≥1,8× a média | criar override daquele dia |
| `drifting` | 2ª metade do mês ≥1,3× a 1ª | só avisa |
| `insufficient_data` | menos de 7 dias com uso | nada a dizer |

**Sugestão nunca afrouxa** — `min(…, franquia_atual × 0,8)` em todo cálculo. O
primeiro teste com dados reais expôs o oposto: Dota 2, franquia de 80 min,
mediana de 112, e a sugestão saía "sua franquia não segura nada, aumente para
85". Aplicar passa pelo `SourcesService.update`, então grava nível novo em
`tracked_source_levels` e a sugestão aceita vira marco no gráfico do painel —
fecha o ciclo medir → sugerir → conferir.

## 8. Telas

- **Web/Desktop**: `Tempo` (Hoje · Fontes · Dispositivos) — custo do dia ao vivo,
  barra de franquia, badge "Boss +Xmin" na zona 3, badge "Devendo N" quando o
  saldo não cobriu, CRUD de fontes, pareamento (com 1-clique no Electron via
  `window.desktop.pair`). O ícone de gráfico em cada fonte cadastrada abre o
  **painel individual** (§7b) — a mesma modal nas abas Diário e Fontes.
- **App Expo**: mesma tela em `src/app/(app)/tracking/` (card na Central via
  `module_registry`).
