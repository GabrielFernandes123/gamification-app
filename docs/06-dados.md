# 06 — Modelo de Dados Consolidado

> **Dono de:** as tabelas e relacionamentos. Semântica/fórmulas moram nos docs de
> domínio ([02](./02-economia.md) economia, [03](./03-atributos-build.md) atributos,
> [04](./04-modulos.md) módulos, [05](./05-temporadas-boss.md)/[09](./09-narrativa-e-ia.md)
> boss/narrativa). Aqui só estrutura. Estado: ✅ implementado — as 121 tabelas do banco estão descritas aqui (auditoria de 2026-08-06: as 22 que faltavam entraram no §9.17).
> Legenda: ✅ existe hoje · 🆕 nova · 🔄 coluna(s) a adicionar/alterar.
> Mantemos os nomes de tabela atuais (sem rename) para evitar churn.

---

## 0. Convenções
- Toda tabela de usuário tem `user_id` (FK → `auth.users`) e **RLS** por `auth.uid()`
  (rede de segurança; o contrato do app é a API — [01 §2/§7](./01-arquitetura.md)).
- `created_at`/`updated_at` em todas. `level`/`max_hp` permanecem **GENERATED** no
  Postgres ([02 §2](./02-economia.md)).
- **Atributo total NÃO é armazenado** — é computado na API (skills + partes + equip +
  pontos + classe, [03 §2](./03-atributos-build.md)). Só os *insumos* são persistidos.

### A régua do dado que vira estatística

> **Todo registro que vira estatística guarda o parâmetro que o julgou.**

Se o número depende de configuração mutável, a configuração vai **junto na
linha**. Senão, mudar a régua reescreve o passado em silêncio — o gráfico muda
sozinho e ninguém consegue explicar por quê.

Isso já mordeu três vezes antes de virar regra:

| Onde | O que faltava | Como ficou |
|---|---|---|
| Nutrição | "cumpriu 2 de 3" sem saber de quê | `nutrition_days.targets_snapshot` |
| Sono | a nota sem a meta que a produziu | `sleep_logs.targets` + `score` + `tz` |
| Hábitos | o dano sem a dificuldade da época | `habit_levels` + `streak_at_log` |

O corolário é o que decide onde uma coluna mora: **valor derivado de config
mutável é congelado no fechamento; valor derivado de dado que muda sozinho (como
o peso) é derivado na leitura.** Por isso `targets_snapshot` grava gramas
absolutas mesmo quando a meta é `2 g/kg` — a razão continua viva nas metas, o
número fica preso ao dia.

## 1. Núcleo RPG
- **characters** ✅🔄 — `user_id`, `total_xp`, `gold`, `current_hp`, `death_count`,
  `daily_xp_goal`, `daily_gold_goal`, `last_reset_at`; GENERATED `level`, `max_hp`.
  🔄 add: `essencia` (int), `class` (enum `guerreiro|mago|ladino`, nullable).
- **profiles** ✅ — `id`(→auth.users), `display_name`, `avatar_url`, `timezone`,
  `last_summary_at`.
- **difficulty_levels** ✅ — `difficulty`(enum), `xp`, `gold`, `damage_factor`,
  `sort_order`. (A âncora de [02 §4](./02-economia.md).)

## 2. Ledger e Registry 🆕
- **economy_events** 🆕 — `id`, `user_id`, `source_type`(enum: habit|workout|sidequest|
  body_goal|body_measurement|boss|achievement|tracking|store|death|build|event|
  sleep|**cardio**|**reading**), `source_id`, `xp_delta`, `gold_delta`,
  `essencia_delta`, `occurred_on`(date), `meta`(jsonb), `created_at`. **Append-only**.
  Espinha de histórico/conquistas/streak/dano-de-boss ([01 §3](./01-arquitetura.md)).
- **module_registry** 🆕 — `key`(=source_type, PK), `nome`, `icone`, `cor`, `ordem`,
  `ativo`(bool), `kind`(enum `atividade|meta`). Shell e filtros leem daqui
  ([04 §2](./04-modulos.md)).

## 3. Skills e Atributos
- **skills** ✅🔄 — `user_id`, `name`, `xp`, `color`, `icon_name`; GENERATED `level`.
  🔄 add: `attribute_key`(enum `forca|agilidade|vitalidade|foco`) — atributo que a
  skill alimenta ([03 §3](./03-atributos-build.md)).
- **character_attribute_points** 🆕 — `user_id`, `attribute_key`, `points`(int). Pontos
  **permanentes** ganhos de boss (sobrevivem à morte — [02 §8](./02-economia.md)); 4
  linhas por usuário.

## 4. Hábitos
- **habits** ✅🔄 — `user_id`, `name`, `type`(positive|negative), `difficulty`,
  `schedule`(weekdays|weekly_count|monthly), `executions_per_day` (**meta/limite
  DIÁRIO**), `weekdays[]`, `weekly_target`/`monthly_target` (**meta de período EM
  DIAS** — quantos dias completos/resistidos), `last_period_close` (🆕 idempotência do
  fechamento de período; o streak flexível é diário), `primary_skill_id`,
  `secondary_skill_id`, `current_streak`,
  `last_streak`, `best_streak`, `is_active`. 🔄 `monthly_day` **removido** (não há fixo
  mensal; o enum `schedule` já codifica fixo=`weekdays` vs flexível=`weekly_count`/`monthly`).  - 🆕 2026-08-04 — `weekly_target`/`monthly_target` significam coisas OPOSTAS
    conforme `type`: no positivo são **dias que precisam bater a meta**; no
    negativo são **teto de dias com recaída** no período. E as sequências são DUAS:
    `current_streak` conta DIAS limpos (zera em qualquer recaída) e
    `period_streak` conta PERÍODOS dentro do teto (zera só ao estourar) —
    ver [02 §5.19](./02-economia.md).

- **habit_logs** ✅ — `habit_id`, `user_id`, `occurred_on`, `success`, `is_auto`,
  `xp_gained`, `gold_gained`, `damage_taken`, `streak_at_log`. (Auditoria; o ledger
  passa a ser a fonte canônica de XP/ouro — ver §12.)
  🆕 (2026-08-08) add: `damage_nominal` (quanto o golpe VALIA, antes dos tetos) e
  `capped_by_day`. `damage_taken` continua sendo o HP realmente perdido — é o que
  o desfazer devolve. Os dois juntos são o que permite a tela dizer "eram 12, o
  teto do dia absorveu" em vez de mostrar um zero sem causa.

- **habit_settings** 🆕 (2026-08-08) — `user_id` (PK), `daily_damage_cap_positive_pct`,
  `daily_damage_cap_negative_pct`, `period_damage_cap_pct`, `streak_tiers` (int[5]),
  `updated_at`. Tetos de dano **por tipo de hábito** e os limiares das cinco faixas
  visuais de sequência. Sem linha = os defaults das colunas (25/25/80 e
  {7,15,30,60,100}), que são as constantes que viviam no `reward.ts` — ver
  [02 §5.20](./02-economia.md).

## 5. Corpo e Treino
- **body_parts** ✅🔄 — `user_id`, `name`, `color`, `xp`; GENERATED `level`; `is_active`.
  🔄 add: `attribute_key` (atributo que alimenta — tipicamente Vitalidade).
- **fitness_exercises** ✅ — `user_id`, `name`, `category`, `primary_skill_id`,
  `primary_body_part_id`, `secondary_body_part_id`, `notes`, `is_active`.
- **workout_sessions** ✅ — `user_id`, `name`, `started_at`, `ended_at`,
  `duration_minutes`, `status`, `total_sets`, `total_volume`, `xp_gained`,
  `gold_gained`, `template_id`, `notes`.
- **workout_sets** ✅ — `user_id`, `session_id`, `exercise_id`, `set_number`, `weight`,
  `reps`, `duration_seconds`, `distance_meters`, `is_warmup`, `is_skipped`, `set_type`,
  `drops`(jsonb), `rest_seconds`, `rpe`, `notes`.
- **workout_templates** ✅ · **workout_template_exercises** ✅ ·
  **workout_template_sets** ✅ — planejamento de treino (estrutura rica; ver memória
  treino-v2).
- **workout_personal_records** ✅ — `user_id`, `exercise_id`, `session_id`, `set_id`(null
  p/ PR de sessão), `record_type`, valores.
- **body_measurements** ✅ — `user_id`, `measured_on`, `weight_kg`, `body_fat_percent`,
  `waist_cm`, `chest_cm`, `right_arm_cm`, `left_arm_cm`, `right_thigh_cm`,
  `left_thigh_cm`, `hip_cm`. 🆕 registrar gera evento trivial no ledger ([04 §4.4](./04-modulos.md)).
- **body_goals** ✅🔄 — tipo(measurement|performance|frequency), `title`, `status`,
  `target_*`, `exercise_id`, `body_part_id`, `deadline`, `difficulty`, `reward_xp`,
  `reward_gold`, `is_manual`, `completed_at`. 🔄 passar a usar `deadline` (hoje ignorado).
- **body_alert_settings** ✅ — `user_id`, `workout_stale_days`, `measurement_stale_days`,
  `body_part_stale_days`.

## 6. Side Quests
- **side_quests** ✅🔄 — `user_id`, `name`, `description`, `difficulty`, `due_date`,
  `is_completed`, `completed_at`, `xp_gained`, `gold_gained`, `primary_skill_id`,
  `secondary_skill_id`. 🔄 consequência ao vencer o prazo ([04 §4.5](./04-modulos.md)).

## 7. Loja, Recompensas e Equipamento
- **system_items** ✅ — `id`, `name`, `description`, `cost`, `type`(heal|damage_reduction|
  streak_recovery), `effect_value`. (Catálogo global.)
- **rewards** ✅ — `user_id`, `name`, `cost`, `is_repurchasable`, `has_stock`,
  `current_stock`, `max_stock`, `cooldown_minutes`, `last_purchased_at`, `is_active`.
  Inclui recompensas reais ([05 §7](./05-temporadas-boss.md)). 🔄 add `cost_essencia`
  (nullable — recompensas grandes pagas em Essência) e `unlocked_by_boss_id` (nullable —
  desbloqueio direto por boss).
- **purchases** ✅ — `user_id`, `kind`, `reference_id`, `name`(snapshot), `gold_spent`.
  🔄 add `essencia_spent`.
- **active_buffs** ✅ — `user_id`, `buff_type`, `effect_value`, `expires_at`.
- **equipment_catalog** 🆕 — itens de poder compráveis (base): `id`, `name`, `slot`(arma|
  armadura|acessorio), `attribute_bonuses`(jsonb: {forca,agilidade,…}), `required_level`,
  `cost_gold`, `cost_essencia`, `tier_origem`.
- **character_equipment** 🆕 — instâncias **possuídas**: `id`, `user_id`, `name`, `slot`,
  `attribute_bonuses`(jsonb), `required_level`, `source`(loja|boss_drop), `is_equipped`.
  (Drops de boss têm stats próprios na instância; portão de nível em [02 §8.1](./02-economia.md).)

## 8. Conquistas
- **user_achievements** ✅ — `user_id`, `achievement_key`, `unlocked_at`. Avaliadas
  genericamente sobre o ledger ([04 §4.8](./04-modulos.md)).

> **Codex — `origin_type` é `text`, não enum.** Ganhou o valor `tracking_source` em
> 2026-07-30 (a fonte de tempo de tela que vira lacaio do boss) **sem migration**;
> `origin_id` aponta para `tracked_sources.id`. Ver [14 §5.2⑥](./14-backlog-modulos-e-mecanicas.md).

## 9. Temporadas e Boss 🆕
- **seasons** 🆕 — `id`, `user_id`, `name`, `lore`, `theme_seed`(input do usuário),
  `preset`(trimestral|semestral|anual|custom), `starts_on`, `ends_on`, `status`(ativa|
  concluida). Arco narrativo ([09 §1/§6](./09-narrativa-e-ia.md)).
- **bosses** 🆕 — `id`, `user_id`, `season_id`, `tier`(mensal|trimestral|semestral|anual),
  `parent_boss_id`(FK self — hierarquia [09 §2](./09-narrativa-e-ia.md)), `name`, `theme`,
  `weakness_module_key`(FK→module_registry — definido pela Camada 2 [09 §3.1](./09-narrativa-e-ia.md)),
  `weakness_bonus`, `max_hp`, `current_hp`, `window_start`, `window_end`, `status`(ativo|
  vencido|perdido).
- **boss_phases** 🆕 — `id`, `boss_id`, `sort_order`, `max_hp`, `current_hp`, `status`.
  (Fases mensais dos tiers longos — evolução [05 §2.1](./05-temporadas-boss.md).)
- **boss_objectives** 🆕 — `id`, `boss_id`, `phase_id`(nullable), `source_type`,
  `spec`(jsonb: regra), `target`, `progress`, `completed`, `boss_damage`. Objetivos
  cross-module ([05 §5](./05-temporadas-boss.md)).
- **boss_damage_events** 🆕 — `id`, `user_id`, `boss_id`, `phase_id`, `amount`,
  `source_type`, `was_weakness`(bool), `occurred_at`. Histórico de dano (alimenta a tela
  da história e a recalibração [05 §3.6](./05-temporadas-boss.md)).
- **boss_charges** 🆕 — `user_id`, `season_id`, `amount`. "Cargas" de minibosses, munição
  nos tiers maiores ([05 §7.3](./05-temporadas-boss.md)).

## 9.1 Sono ✅ (2026-07-30)
- **sleep_settings** ✅ — `user_id`(PK), `bedtime_max`(time), `bedtime_enabled`,
  `wake_max`(time), `wake_enabled`, `min_minutes`(int), `min_duration_enabled`,
  `difficulty`(enum), `updated_at`. Os `*_enabled` existem porque nem todo mundo
  quer os três critérios — desligar um muda o divisor da fração ([02 §5.4](./02-economia.md)).
- **sleep_logs** ✅ — `id`, `user_id`, `night_on`(date), `bedtime`, `wake_time`,
  `duration_minutes`, `source`(healthkit|manual), `external_id`, `criteria_met`(jsonb),
  `created_at`.
  **Dois uniques, e os dois importam:** `(user_id, night_on)` — uma noite, um registro
  (o relógio devolve a noite em pedaços) — e o índice parcial
  `(user_id, external_id) where external_id is not null` — dedupe da importação, sem o
  qual cada abertura do app pagaria de novo pela mesma noite.
  - **`targets`, `score` e `tz`** ✅ (2026-08-05) — aplicação da régua do §0:
    `targets` congela a meta que julgou a noite, `score` guarda a nota calculada
    e `tz` o fuso em que "a noite de 4" foi definida. Sem `tz`, uma viagem faria
    a mesma noite mudar de dia; sem `targets`, mudar o horário-alvo hoje
    reescreveria a avaliação de março.

## 9.2 Encontros diários ✅ (2026-07-30)
- **daily_events** ✅ — `id`, `user_id`, `day`(date), `title`, `description`,
  `options`(jsonb: `[{key,label,effect}]` — **sem números**), `chosen_key`,
  `outcome`(jsonb), `resolved_at`, `source`(ai|catalog), `model`, `created_at`.
  `unique (user_id, day)` é o que torna a geração preguiçosa idempotente: duas
  leituras simultâneas não produzem dois encontros. Valores e tetos em
  [02 §5.5](./02-economia.md).

## 9.3 Leitura ✅ (2026-07-31)
- **readings** ✅ — `id`, `user_id`, `title`, `author`, `kind`(livro|curso|artigo|outro),
  `unit`(pagina|capitulo|aula|modulo), `total_units`(**nullable — caso de primeira
  classe**, não buraco: sem total não há proporção e a sessão paga trivial),
  `current_units`, `status`(fila|lendo|concluida|abandonada), `difficulty`,
  `primary_skill_id`, `started_on`, `finished_on`, `cover_url`, `notes`.
  - **`needs_story` / `story_title` / `story_description` / `story_model`** ✅
    (2026-08-05) — a obra ganha nome de tomo na história ([09](./09-narrativa-e-ia.md)).
    `needs_story` tem de ser marcado **`true` no insert**: a coluna nasce `false`
    e o batismo filtra por ela. Marcar a coluna sem marcar o insert deixou o
    recurso morto e silencioso por um dia inteiro — não havia erro, só nunca
    acontecia. Mesmo cuidado vale para `bucket_items` e `character_scars`.
- **reading_logs** ✅ — `id`, `user_id`, `reading_id`, `occurred_on`,
  `units_delta`(**check > 0**: corrigir para baixo é edição da obra, não sessão),
  `minutes`, `note`, `xp_gained`, `gold_gained`.

## 9.4 Cardio ✅ (2026-07-31) — sem tabela nova
- **workout_sessions.modality** ✅ e **workout_templates.modality** ✅ —
  `text` com check `('forca','cardio')`, default `'forca'` (preserva o histórico:
  tudo que existe é musculação). A modalidade decide a fórmula de pontuação **e** o
  `source_type` do ledger.
- `workout_sets.duration_seconds` e `distance_meters` **já existiam** desde o workout
  v2 — nunca tinham sido lidos. Cardio pontua pelo primeiro.

## 9.5 Troféu e forja ✅ (2026-07-31) — sem tabela nova
- Troféu = linha em **user_items** com `category = 'trofeu'` e
  `metadata->>'codexEntryId'` (que é o que torna a concessão idempotente), mais a
  quantidade em `user_inventory_items` e a linha em `inventory_transactions`.
- Forja escreve em **character_equipment.attribute_bonuses** (jsonb por instância) e
  conta o total já forjado pelas linhas de `inventory_transactions` com
  `reason = 'forge_equipment'` — sem coluna de contador.

## 9.6 Diário ✅ (2026-08-01)
- **journal_entries** ✅ — `id`, `user_id`, `occurred_on`, **`unique (user_id,
  occurred_on)`** (o diário é do DIA, não um mural — e é isso que impede pagar
  duas vezes), `mood`(1-5), `text`, `photo_url`, `audio_url`, `transcription`,
  `transcription_model`, `needs_transcription`,
  **`transcription_attempts`** e `transcription_failed_reason` 🆕 (2026-08-04).
  - `transcription` em **coluna separada** de `text`: a mídia é a fonte da
    verdade e a transcrição é conveniência. `DELETE /journal/:id/transcription`
    limpa só as duas colunas da IA e deixa a mídia intacta.
  - `transcription_attempts` existe porque o cron de varredura **desligava
    `needs_transcription` no primeiro erro** — uma queda de rede apagava a
    transcrição para sempre, calada. Agora conta e só desiste em 5; o pedido
    manual zera o contador. É o único lugar do sistema onde um erro transitório
    chegou a custar dado do usuário.
  - `photo_url`/`audio_url` guardam o **caminho** no bucket **privado**
    `journal-media` — não uma URL. A URL de leitura é assinada a cada consulta
    (validade curta), então nenhuma URL permanente fica gravada em lugar nenhum.

## 9.7 Nutrição ✅ (2026-08-01, evoluída em 2026-08-06)
- **foods** ✅ — catálogo `source`(`taco`|`custom`), `external_id`, `unique
  (source, external_id)`, `name`, `search_name` (minúsculo e sem acento — é como
  o match da IA e a busca do usuário chegam), `category`, `brand`, `kcal`,
  `protein_g`, `carb_g`, `fat_g`, `fiber_g`, `sodium_mg`, `serving_size_g`,
  **por 100 g**. 582 linhas da TACO 4ª edição.
  `numeric` e não `float`: são somados o dia inteiro e comparados com metas.
  - **`user_id`** ✅ (2026-08-05) — `null` = linha global da TACO; preenchido =
    alimento do usuário (o whey dele, com os macros do rótulo). A busca escopa
    explicitamente no SQL (`user_id is null or user_id = $n`): a API fala com o
    Postgres por conexão direta, então a RLS **não** protege essa query.
- **food_portions** ✅ — porção doméstica ("1 fatia" = 30 g). Quem sabe quanto
  pesa é a tabela, nunca o cliente.
- **nutrition_meal_slots** ✅ (2026-08-05) — as refeições **do usuário**:
  `name`, `position`, `target_at`, `share_pct`, `active`. Substituiu o enum de
  cinco valores. Teto de 12 slots.
- **nutrition_entries** ✅ — `user_id`, `occurred_on`, `slot_id`, **`meal_name`
  congelado**, `logged_at`, `note`, `source`(manual|voice) e os totais
  materializados (`kcal`, `protein_g`, `carb_g`, `fat_g`, `fiber_g`,
  `sodium_mg`).
  - O nome vai congelado ao lado do `slot_id` **de propósito**: renomear um slot
    não pode reescrever o histórico, pela mesma razão que corrigir o catálogo não
    reescreve os macros de março.
- **nutrition_items** ✅ — `entry_id` (cascade), `food_id` (**`set null`**:
  procedência, não fonte do número), `name`, `quantity_g`(check > 0) e os macros
  **congelados no momento do registro**. Uma correção futura no dataset não pode
  reescrever o que você comeu em março.
- **nutrition_targets** ✅ — um por usuário. Cada nutriente tem **piso, teto e
  liga/desliga**, e os dois lados da faixa são opcionais.
  - **Por que faixa, e não teto** — a primeira versão tinha só `kcal_max`, e isso
    premiava não comer: um dia de 300 kcal satisfazia `kcal <= 2600` e era pago
    pelo fechamento.
  - Nutrientes: `kcal`, `protein`, `carb`, `fat`, `fiber`, **`sodium`** ✅
    (2026-08-06). Sódio é o único em que o normal é ter só teto — não precisou de
    tratamento especial porque a faixa já nasceu com os dois lados opcionais.
  - **`water_min_ml` / `water_enabled`** ✅ (2026-08-06) — água segue o padrão de
    `meals_min` (contagem com piso), **não** o de nutriente: não vem de alimento
    nenhum e fatiar "35% da água no almoço" não quer dizer nada.
  - **`protein_per_kg` / `carb_per_kg` / `fat_per_kg`** ✅ (2026-08-06) — metas
    relativas ao peso. Quando preenchidas, o `*_min_g` é **derivado na leitura**
    a partir do peso mais recente de `body_measurements`. Sem cron e sem
    reescrita: mudou o peso, o próximo cálculo já sai diferente.
  - **`activity_level` / `goal`** ✅ (2026-08-06) — insumos da calculadora de
    TDEE que são configuração de dieta (mudam com a fase, não com o corpo).
    Altura, nascimento e sexo ficam em `body_profile`, no Corpo.
  - Cada nutriente tem dois CHECK: `_range` (piso ≤ teto) e `_bounded` (critério
    ligado precisa de ao menos um lado). A regra mora no banco, e não só no DTO,
    porque é regra do dado.
- **`foods.barcode`** ✅ (2026-08-06) — EAN/UPC, com **índice parcial** (`where
  barcode is not null`): a TACO inteira e todo alimento digitado à mão têm nulo,
  e indexar nulo é espaço à toa.
  - **Coluna própria, não `external_id`.** Aquele é a chave DA FONTE e já tem
    `unique (source, external_id)`; o código de barras é propriedade do PRODUTO —
    o mesmo EAN pode vir de duas fontes, e alimento genérico não tem nenhum.
- **nutrition_recipes** + **nutrition_recipe_items** ✅ (2026-08-06) — a
  combinação que se repete, salva com nome. `unique (user_id, name)`.
  - **Guarda `food_id` + gramas, NUNCA macro.** O macro é congelado no momento
    do REGISTRO, lendo o catálogo (mesma doutrina de `nutrition_items`). Receita
    com macro salvo envelheceria em silêncio quando o alimento fosse corrigido, e
    ainda desalinharia da mesma refeição registrada por outro caminho.
  - `food_id` com **`restrict`**, e não `set null`: item sem alimento não tem de
    onde tirar macro, então a receita ficaria quebrada sem avisar.
- **nutrition_weekly_targets** + **nutrition_weeks** ✅ (2026-08-06) — o critério
  de MÉDIA semanal, que **convive** com o diário em vez de substituí-lo.
  - O diário mede **disciplina** ("bati a proteína hoje?"); o semanal mede
    **resultado** ("a média fechou?"). Só semanal deixaria compensar cinco dias
    ruins com dois ótimos; só diário castiga quem come fora uma vez.
  - Limites próprios, e não o diário × 7. Só kcal e os 3 macros: "média de 3,4
    refeições" não significa nada, e água é contagem do dia.
  - **`min_days` (padrão 5)** — abaixo disso a semana não é avaliada nem paga.
    Sem esse piso, uma semana com dois dias registrados teria "média" e pagaria
    como semana inteira, premiando quem parou de anotar.
  - `nutrition_weeks.targets_snapshot`: a régua do §0 de novo.
- **nutrition_water_logs** ✅ (2026-08-06) — `user_id`, `occurred_on`, `ml`.
  Tabela própria, e não um contador em `nutrition_days`, por uma questão de
  **ordem**: a linha de `nutrition_days` só nasce no fechamento, e a água é
  registrada ao longo do dia. Incrementar uma linha inexistente obrigaria a
  criá-la meio pronta, e aí o `on conflict do nothing` que o fechamento usa para
  detectar "já fechei este dia" passaria a mentir.
- **nutrition_pending** ✅ — a fila de aprovação. `transcript` (o que a IA
  ouviu, guardado mesmo depois de aprovado), `model`, `payload` jsonb (itens já
  resolvidos contra a `foods`), `status`(pending|approved|rejected|expired),
  `expires_at` (**36 h**), `resolved_at`, `entry_id`.
  - **Tabela própria, e não `assistant_pending_actions`**, apesar de o padrão ser
    o mesmo: aquela exige `thread_id` de uma conversa do assistente e expira em
    **1 hora**, enquanto o caso de uso é gravar no almoço e conferir à noite. O
    que é reusado é o mecanismo: a transição só acontece com
    `where status = 'pending'` na própria UPDATE.
- **nutrition_days** ✅ — o fechamento. `unique (user_id, occurred_on)` é o que
  torna o cron idempotente. Guarda os totais (`kcal`, macros, `fiber_g`,
  `sodium_mg`, `water_ml`), `meals` e `criteria_met` jsonb (com `null` para
  critério desligado **na hora do fechamento**).
  - **`targets_snapshot`** ✅ (2026-08-05) — o alvo que julgou este dia,
    congelado junto do veredito. Sem ele, "cumpriu 2 de 3" fica sem resposta para
    "2 de quê" assim que a meta mudar, e um painel de aderência somaria critérios
    diferentes no mesmo eixo sem avisar. Guarda o valor **absoluto** vigente no
    dia, mesmo quando a meta é definida em g/kg — é o que mantém o histórico
    legível depois de o peso mudar.

## 9.8 Plano do dia e trégua ✅ (2026-08-01)
- **daily_plans** ✅ — `user_id`, `plan_on`, `unique (user_id, plan_on)`,
  `planned_habits` (quantos você DISSE de manhã), `note`, e `actual_habits`,
  `accuracy`, `closed_at` preenchidos no fechamento. **Não há coluna de
  "falhou"**, nem dano, nem streak: errar a previsão não custa nada.
  - ⚠️ **`planned_habits` e `actual_habits` são `integer`** — CONTAGENS, não
    listas. Este doc dizia jsonb até 2026-08-06, e a primeira query do painel de
    estatística quebrou contra o banco real (`jsonb_array_length(integer)`).
    Corrigido depois de conferir o schema, não a memória.
- **truce_periods** ✅ — `user_id`, `started_on`, `ends_on` (**inclusivo**;
  `null` = em aberto), `reason`, `ended_at`. Período fechado em vez de um
  booleano em `characters`, para o histórico continuar explicando meses depois
  por que aquela semana não teve dano.

## 9.9 Notificações ✅ (2026-08-01)
- **notification_settings** ✅ — `user_id` (pk), `push_enabled` (a chave GERAL do
  sistema — o `PushService` lê daqui, não mais de `tracking_settings`),
  `quiet_start`/`quiet_end` (a janela atravessa a meia-noite de propósito) e
  `daily_cap` (teto somando TODOS os tipos).
- **notification_rules** ✅ — `(user_id, kind)` pk, `kind` check
  (habits|body|nutrition|journal|**bucket** 🆕 2026-08-04), `enabled`,
  `times` `time[]`.
  - `'bucket'` entrou na varredura: o cron `bucket-nudge` carimbava
    `nudged_at` e **não havia `kind` que o entregasse**, então o cutucão
    trimestral só era visto por quem abrisse `/bucket` sozinho — exatamente
    quem não precisa ser cutucado. A mecânica existia inteira e desligada.
  - **O horário é do TIPO, não de cada hábito.** É o que permite uma mensagem
    "3 hábitos pendentes" no lugar de três avisos simultâneos.
- **push_gates** ✅ (2026-08-01, leva anterior) — `(user_id, gate_key)` com
  `last_at`, `sent_today`, `day`. O gate e o carimbo na MESMA instrução, para
  duas requisições simultâneas não passarem as duas. `sum(sent_today)` do dia é
  o que implementa o teto diário sem uma tabela de log só para contar.

## 9.10 Mecânicas de personagem ✅ (2026-08-02)

- **skills.last_xp_at** ✅ — timestamptz, escrita **só no caminho do `_grant`**.
  Existe porque `updated_at` tem trigger e dispara em qualquer edição: renomear
  uma skill parada há três meses a "reviveria" sem nenhum XP. Semente = o
  `updated_at` do momento da migration (aproximação, e o erro se corrige no
  primeiro uso de cada skill).
- **character_scar_offers** ✅ — a oferta aberta pela morte:
  `death_number` + `unique (user_id, death_number)` (idempotência),
  `death_mode`, `options` jsonb com as opções **já escaladas pelo modo e
  congeladas** (se a escala mudar, a oferta aberta continua valendo o que
  prometeu), `status` (pending|chosen|declined).
  - Mesmo padrão de `character_attribute_point_grants`: a morte roda dentro da
    transação do dano e não tem onde parar para perguntar. Ela concede; você
    escolhe depois, de onde estiver.
- **character_scars** ✅ — `scar_key`, `label`, `effects` jsonb (`goldPct`,
  `xpHabitPct`, `damageTakenPct`, `bossDamagePct`), `is_active` (a 4ª empurra a
  mais antiga para inerte, **sem apagar**), `removed_at`, + campos de batismo.
- **wip_limits** ✅ — `(user_id, kind)` com `base_limit`. **A migration CONTA o
  que já existe** e usa como base: um teto que nasce abaixo do uso atual abriria
  o app dizendo que 5 hábitos precisam morrer.
- **wip_slot_grants** ✅ — cópia fiel de `character_attribute_point_grants`
  (`points`/`allocated_points`/`source`), com o mesmo `allocate` FIFO sob
  `for update`. Concedido só por boss **trimestral ou maior**.
- **wip_slots** ✅ — `(user_id, kind)` com os slots alocados. Teto efetivo =
  `base_limit + slots`.

## 9.11 Preço que respira ✅ (2026-08-02)
- **user_items.cost_effort_days** ✅ — `numeric`, terceira régua de preço. As
  constraints `user_items_purchasable_price` e `user_items_cost_positive` foram
  **relaxadas** para aceitá-la: como estavam, um item precificado só em dias
  seria rejeitado.
- **effort_price_cycles** ✅ — um ciclo por recalibração:
  `gold_per_day` (com clamp), `raw_gold_per_day` (sem — é o que **explica** por
  que o efetivo ficou onde ficou) e `window_days`.

## 9.12 Bucket list, Relacionamentos e Trabalho ✅ (2026-08-03)
- **bucket_items** ✅ — `state` (sonho|planejando|agendado|realizado),
  **`target_on` NULLABLE como caso de primeira classe** (é o único módulo onde
  não ter data é o normal), `cost_essencia`, `unlocked_by_boss_id`,
  `unlocked_at`, `nudged_at` (o cutucão trimestral) + campos de arte e história.
- **people** ✅ — `cadence_days` (nullable: nem toda relação precisa de
  relógio), `stage` (novo|conhecido|proximo), `stage_changed_at`, `met_on`.
- **people_contacts** ✅ — `occurred_on`, `kind`, `is_first` (guardado e não
  derivado: é o que justifica um XP diferente, e precisa sobreviver a apagar e
  recriar a pessoa). **Sem unique por dia** — falar duas vezes é normal; o teto
  de recompensa está no serviço.
- **work_tasks** ✅ — espelho fino com **`unique (user_id, external_id)`**, que
  é o dedupe do módulo inteiro. `measured_minutes` (zero é legítimo: feita sem
  cronômetro, paga o mínimo por prioridade).
- **work_project_skills** ✅ — mapa projeto → skill, que faz o trabalho
  alimentar **Foco**. Sem linha, o módulo funciona e o XP vai só ao personagem.

## 9.13 Trégua completa ✅ (2026-08-03)
- **truce_periods** ganhou `essencia_paid` e `is_retroactive`. O orçamento
  (~21 dias/ano) é **derivado** por janela deslizante de 365 dias — nada de
  contador em coluna, que ficaria errado no primeiro `delete`.
- **season_story_settings** ganhou `retrospective_enabled` e
  `retrospective_uses_journal` (§9.6 do diário; default **false** por
  privacidade).

> **Os relógios pausam por SUBTRAÇÃO, não por congelamento de coluna.** Ferrugem
> e reputação medem "dias parado"; a trégua desconta os dias que caíram dentro
> dela. Nada precisa ser reescrito quando a trégua acaba, e `last_xp_at`
> continua contando a verdade sobre quando a skill foi exercitada.

## 9.14 Regularidade e perfil corporal ✅ (2026-08-05 / 2026-08-06)
- **regularity_bonuses** ✅ (2026-08-05) — o bônus por constância. `user_id`,
  `kind`, `period_start`, `period_end`, `streak`, `bonus_gold`, `bonus_xp`,
  `granted_at`, com `unique` por (usuário, tipo, período) para o cron ser
  idempotente. Guarda o `streak` **da época**, não só o bônus: é a régua do §0
  de novo — o bônus sem a sequência que o gerou não explica nada seis meses
  depois.
- **body_profile** ✅ (2026-08-06) — `user_id` (pk), `height_cm`, `birth_date`,
  `sex`. Insumos fixos da calculadora de TDEE ([04](./04-modulos.md)).
  - Mora no **Corpo**, e não na Nutrição, porque é dado da PESSOA: quem consome
    hoje é a dieta, mas altura serve a IMC e idade serve a faixa de frequência
    cardíaca — nenhum dos dois é dieta.
  - **O peso NÃO está aqui de propósito.** Ele muda toda semana e já é série
    histórica em `body_measurements`; uma cópia "atual" criaria duas verdades, e
    a cópia é sempre a que envelhece. A calculadora lê a medida mais recente.

## 9.15 Liga-desliga de módulos ✅ (2026-08-06)
- **user_modules** ✅ — `user_id`, `module_key`, `enabled`, `disabled_at`, PK
  composta. **Só se grava linha para o que foi DESLIGADO**: ausência = ligado.
  Assim um módulo novo entra ligado para todo mundo sem backfill, e a tabela
  fica pequena — o normal é ter tudo ligado.
- **`module_key` é do enum `economy_source_type`**, o mesmo de
  `module_registry.key` e `economy_events.source_type`. A chave do módulo e o
  tipo de origem do ledger **são a mesma coisa** — o que faz o gate no `_grant`
  cair sozinho: o `sourceType` que já chega ali é a chave.

> ### ⚠️ `ativo` e `habilitado` são coisas DIFERENTES
>
> | Coluna | Onde | O que quer dizer |
> |---|---|---|
> | `module_registry.ativo` | global | "aparece no lançador de módulos" |
> | `user_modules.enabled` | por usuário | "está ligado para mim" |
>
> Seis módulos estão com **`ativo = false`** — achievement, boss, store, death,
> build, event — e o boss funciona, a loja funciona, você morre. Confundir as
> duas colunas colocaria a Leitura desligada no mesmo balde do Boss.

- **`disabled_at`** existe para os relógios que contam "dias desde" — ferrugem de
  skill, cadência de relacionamento. Eles pausam por **SUBTRAÇÃO**, não por
  congelamento de coluna (mesma doutrina da trégua, §9.13): sem essa data, voltar
  depois de um mês encontraria tudo enferrujado por um tempo que não passou.
  Streak de hábito **não** precisa disso — ele zera no fechamento, e com o módulo
  desligado o fechamento não roda, então congela sozinho.
- **Onde o gate incide** (fonte única em `src/modules/enabled.ts`, helper solto
  no padrão do `truce.ts`): `_grant` (não paga), `DamageService` (não bate), os
  5 crons de fechamento, objetivos de boss, o narrador (§9.16), o lançador do
  web e as abas de estatística.
- **Desligar não apaga nada.** O dado registrado continua no banco e reaparece
  inteiro ao religar — é pausa, não exclusão.

## 9.16 Digest cross-módulo ✅ (2026-08-06) — sem tabela
- **`src/common/module-digest.ts`** — não é schema, é uma LEITURA, mas está aqui
  porque define o que a narrativa enxerga da sua vida.
- O narrador lia sete tabelas, todas de combate (bosses, codex, beats, diário,
  perfil, temporada, configurações). **Não lia hábitos, sono, nutrição, leitura,
  treino, trabalho nem relacionamentos** — quinze módulos de vida real que nunca
  viravam uma frase de história.
- O digest agrega os oito módulos de vida numa query cada e devolve fatos curtos.
  **O narrador PUXA; os módulos não empurram** — a alternativa (cada módulo
  escrevendo capítulo) viraria log e exigiria ensinar quinze lugares a narrar.
- Respeita `user_modules`: módulo desligado não vira história.
- Do diário entra só a **contagem**, nunca o texto — expor o conteúdo continua
  sendo opt-in por `season_story_settings.retrospective_uses_journal` (§9.13).

## 9.18 Trabalho: tetos configuráveis ✅ (2026-08-06)
- **work_settings** ✅ — `max_minutes_per_task` (240), `max_minutes_per_day`
  (480), `minutes_per_unit` (90), com CHECK de faixa em cada um. Sem linha = os
  padrões, iguais aos `default` da tabela: ninguém precisa configurar nada para o
  módulo funcionar.
- **work_tasks.paid_minutes** ✅ — o que entrou na recompensa.
  `measured_minutes` passou a guardar o **BRUTO**, sem teto.
  - **Por que os dois.** Trabalho paralelo infla o medido (20 h num dia de 10 h) e
    o teto corta o que vira XP. Guardar só um mente de um jeito ou de outro: só o
    medido infla a realidade, só o pago esconde metade do que você fez.
  - O orçamento do dia é gasto por `paid_minutes`, não pelo medido — senão a
    contagem dobrada consumiria o teto sem esforço correspondente.

## 9.17 As tabelas que faltavam nomear ✅ (2026-08-06)

> Auditoria de 2026-08-06: **22 das 121 tabelas** não eram nomeadas em nenhum
> doc. Os CONCEITOS estavam explicados (tracking aparece em 13 docs, foco em 5) —
> faltava a referência de schema, que é o que este documento promete ser.
>
> Agrupadas por assunto, porque o padrão diz onde a documentação era fina.

### Tracking e dispositivos (9)

O `11-tracking-tempo-de-tela.md` explica a mecânica inteira; estas são as tabelas
por trás dela.

- **tracking_sets** — `name`. Conjunto nomeado de fontes ("redes sociais",
  "distrações"), para regra e janela agirem sobre um grupo em vez de app por app.
- **tracking_set_sources** — `set_id` + `source_id`. A tabela de ligação.
- **tracking_windows** — `name`, `set_id`, `unlock_cost_gold`, `unlock_minutes`,
  `is_active`. A **janela de bloqueio**: qual conjunto é barrado, quanto custa
  destravar e por quanto tempo.
- **tracking_window_slots** — `weekdays`, `start_time`, `end_time`. Os horários
  de cada janela. Tabela separada porque uma janela tem vários horários (dias de
  semana de manhã **e** fim de semana à noite).
- **tracking_unlocks** — `target_key`, `expires_at`, `gold_paid`. O destravamento
  ATIVO: pagou, tem até `expires_at`. É estado, não histórico.
- **tracking_unlock_receipts** — o mesmo evento, guardado como HISTÓRICO, com
  `client_id` para deduplicar. Separadas de propósito: o unlock expira e some, o
  recibo fica — senão "quanto de ouro já gastei destravando?" não teria resposta.
- **tracking_source_names** — `kind`, `matcher`, `label`. O apelido que você deu
  a uma fonte (`com.burbn.instagram` → "Instagram").
- **tracking_ignored_sources** — fontes que não contam nem cobram. Sem isto, um
  app de sistema entraria no relatório todo dia.
- **device_pairing_codes** — `code`, `expires_at`, `consumed_at`. O código de
  pareamento da extensão/desktop. `consumed_at` em vez de `delete`: código já
  usado precisa continuar existindo para a tentativa de reuso ser distinguível
  de código inválido.

### Modo foco (1)

- **focus_sessions** — `set_id`, `started_at`, `ends_at`, `status`,
  `reward_gold`, `abandon_cost_gold`, `closed_at`. A sessão de foco: bloqueia um
  conjunto por um tempo, paga ao concluir e **cobra ao abandonar**. O custo do
  abandono é gravado na LINHA, no início — decidir o preço no fim deixaria a
  penalidade mudar conforme a regra mudasse no meio da sessão.

### Objetivos e requisitos (5)

- **temporary_challenges** — o desafio com prazo (`starts_on`/`ends_on`,
  `repeatable`, recompensa em item) e **aposta opcional** (`stake_item_kind`/
  `stake_*_item_id`/`stake_quantity`). Com stake o desafio nasce `status='draft'`
  e ativar consome o item; cumprir devolve, falhar/cancelar perde. É a fusão de
  2026-08-26: a antiga `weekly_contracts` foi absorvida aqui e dropada
  (migration `20260826120000`) — "Contrato" virou rótulo visual do desafio com
  aposta. Tem as colunas de batismo narrativo (`story_title` etc.) como os
  demais.
- **requirement_groups** — `owner_type`/`owner_id`, `mode`, `required_count`.
  Agrupa requisitos de um objetivo com a regra de quantos precisam bater
  ("3 de 5").
- **objective_period_results** — `period_key`, `evaluated_on`, `passed`,
  `claimed`. O veredito de um período. `claimed` separado de `passed` porque
  passar e resgatar são momentos diferentes.
- **objective_claims** — o resgate em si, com o item que saiu.
- **objective_suggestions** — `diagnosis`, `suggested_objective`, `analytics`,
  `ai_summary`, `status`. Sugestões geradas pela IA a partir do seu histórico,
  numa fila de aprovação — mesma doutrina da fila da nutrição: a IA propõe, você
  decide.

### Assistente (3)

- **assistant_threads** — `title`, `archived_at`. A conversa.
- **assistant_messages** — `seq`, `role`, `content`, `tool_call_id`,
  `tool_name`, `tokens_in`/`tokens_out`. As mensagens, com o rastro das chamadas
  de ferramenta.
- **assistant_usage_daily** — `requests`, `tool_calls`, `tokens_in`,
  `tokens_out`. Consumo por dia — é o que permite ter teto sem contar linha a
  linha em `assistant_messages`.

### Narrativa, arte e catálogo (4)

- **narrative_generation_jobs** — `layer`, `status`, `model`, `prompt`,
  `output`, `error`, `attempts`. A fila de geração de texto. O `prompt` fica
  gravado: sem ele não dá para saber por que um capítulo saiu como saiu.
- **generated_images** — `kind`, `owner_table`, `owner_id`, `prompt_hash`,
  `status`, `url`, `cost_usd`, `attempts`. A fila de arte. O `prompt_hash`
  evita pagar duas vezes pela mesma imagem; o `cost_usd` é o que sustenta o teto
  mensal.
- **codex_encounters** — `entry_id`, `occurred_on`, `period_key`, `outcome`,
  `beat_id`. Cada vez que você enfrentou uma criatura ou dungeon do Codex. É o
  que transforma uma entrada estática em memória que atravessa temporadas.
- **exercise_catalog** — catálogo GLOBAL de exercícios (1.324 linhas), sem
  `user_id`, mesmo molde do `foods`: `external_id`, `name`, `name_pt`,
  `target`, `secondary_muscles`, `gif_url`, `attribution`. O app só lê.

## 10. Narrativa 🆕
- **narrative_beats** 🆕 — `id`, `user_id`, `season_id`, `boss_id`(nullable),
  `kind`(capitulo|marco|enrave), `content`(texto gerado), `layer`(1–4), `created_at`.
  Alimenta a tela da história ([09 §4/§5](./09-narrativa-e-ia.md)).

## 11. Relacionamentos-chave (FKs)
```
auth.users ──1:1── profiles
auth.users ──1:1── characters ──< character_attribute_points
auth.users ──< skills (→ attribute_key)        auth.users ──< body_parts (→ attribute_key)
auth.users ──< habits ──< habit_logs
auth.users ──< workout_sessions ──< workout_sets
fitness_exercises → (skill, body_part)         workout_sets → exercise
auth.users ──< character_equipment             equipment_catalog (global)
auth.users ──< seasons ──< bosses ──< boss_phases
bosses ──< boss_objectives        bosses ──< boss_damage_events
bosses → weakness_module_key (→ module_registry)
bosses → parent_boss_id (self, hierarquia)
seasons ──< narrative_beats        seasons ──< boss_charges
TODAS as recompensas de atividade ──escrevem──> economy_events  (via _grant)
```

## 12. Mudanças vs. schema atual (resumo p/ a migração)
- **Novas tabelas:** `economy_events`, `module_registry`, `character_attribute_points`,
  `equipment_catalog`, `character_equipment`, `seasons`, `bosses`, `boss_phases`,
  `boss_objectives`, `boss_damage_events`, `boss_charges`, `narrative_beats`.
- **Colunas novas:** `characters.essencia`, `characters.class`; `skills.attribute_key`;
  `body_parts.attribute_key`; `rewards.cost_essencia`, `rewards.unlocked_by_boss_id`;
  `purchases.essencia_spent`.
- **Comportamento:** `habit_logs` continua como auditoria, mas a **fonte canônica de
  XP/ouro vira o `economy_events`** (todo `_grant` escreve nele). `body_goals.deadline`
  e a consequência de side quest vencida passam a valer.
- **Sem rename de tabelas** existentes (UI usa rótulos PT; tabelas mantêm nomes atuais).

## 13. Decisões fechadas
1. ✔ **Pontos de atributo:** tabela `character_attribute_points` (4 linhas/usuário).
2. ✔ **Equipamento:** `equipment_catalog` (compráveis) separado de `character_equipment`
   (possuídos, com stats na instância).
3. ✔ **Sem rename** de tabelas existentes.
