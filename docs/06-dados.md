# 06 — Modelo de Dados Consolidado

> **Dono de:** as tabelas e relacionamentos. Semântica/fórmulas moram nos docs de
> domínio ([02](./02-economia.md) economia, [03](./03-atributos-build.md) atributos,
> [04](./04-modulos.md) módulos, [05](./05-temporadas-boss.md)/[09](./09-narrativa-e-ia.md)
> boss/narrativa). Aqui só estrutura. Estado: 📋 projetado.
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
  body_goal|body_measurement|boss|…), `source_id`, `xp_delta`, `gold_delta`,
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
  mensal; o enum `schedule` já codifica fixo=`weekdays` vs flexível=`weekly_count`/`monthly`).
- **habit_logs** ✅ — `habit_id`, `user_id`, `occurred_on`, `success`, `is_auto`,
  `xp_gained`, `gold_gained`, `damage_taken`, `streak_at_log`. (Auditoria; o ledger
  passa a ser a fonte canônica de XP/ouro — ver §12.)

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
