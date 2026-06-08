# Roadmap — Evolve (app de gamificação)

> Documento vivo das funcionalidades **pendentes** (Fase 2 em diante). A Fase 1
> (núcleo: personagem, hábitos, skills, fechamentos, notificações) está **completa e
> rodando no iPhone**. Aqui estão os próximos blocos, detalhados o suficiente para
> executar cada um sem redescobrir as decisões.

---

## 0. Estado atual (base sobre a qual construímos)

**Backend (Supabase / Postgres) — já existe:**
- Tabelas: `profiles`, `characters` (level/max_hp são colunas *generated*), `skills` (level generated), `habits`, `habit_logs`, `difficulty_levels` (catálogo tunável).
- RPCs públicas: `complete_habit`, `log_relapse`, `undo_last_log`, `get_daily_summary`.
- Crons (`pg_cron`, UTC): `daily-close`, `weekly-close`, `monthly-close`.
- Segurança: RLS por usuário em tudo; helpers internos no schema `app` (não exposto); portas públicas no schema `public` forçam `auth.uid()`.

**App (Expo SDK 56, TypeScript) — já existe:**
- Rotas em `src/app` (expo-router, typedRoutes). Alias `@/*` → `src/*`.
- Tema dark em `src/theme` (Barlow/Barlow Condensed; laranja/verde/dourado/vermelho/ciano).
- Dados via `@tanstack/react-query` (`src/lib/queryKeys.ts`, hooks em `src/features/*`).
- Telas: login/signup, dashboard (HUD + resumo ao abrir), hábitos (lista + completar/recair/desfazer + form CRUD), skills (lista + form CRUD).

**Decisões de design já travadas (valem para tudo abaixo):**
- Pontuação **proporcional por dificuldade** (dificuldade = valor do dia/período; execução = fração).
- Morte (HP=0) = **reset hardcore** (zera XP/ouro/skills/streaks; `death_count++`).
- Avisos do fechamento = **resumo ao abrir o app** (não push).
- Sem optional chaining em initializers de form (`const h = obj ?? {}`).

---

## Convenções para novos blocos

Todo bloco de **backend** novo deve seguir o padrão existente:
1. Migration via `npx supabase migration new <nome>`.
2. Tabelas com RLS (`auth.uid() = user_id`); catálogos globais com leitura `to authenticated`.
3. Lógica em funções `app._x(p_user_id, …)` (SECURITY DEFINER, `search_path = app, public`).
4. Porta pública `public.x(...)` que injeta `auth.uid()` e delega para `app._x`.
5. Testar local (`npx supabase db reset` + psql no container) **antes** do `db push`.
6. Regerar tipos: `npx supabase gen types typescript --linked > src/types/db.ts`.

Todo bloco de **frontend** novo:
1. `src/features/<bloco>/hooks/*` (queries + mutations react-query, com `qk` em `queryKeys.ts`).
2. `src/features/<bloco>/components/*` (UI reutiliza `Card`, `Button`, `Text`, `Segmented`, `Stepper`, `ProgressBar`).
3. Rota/tela em `src/app/(app)/...`; modais como `presentation: 'modal'`.
4. Invalidar `qk.character` após qualquer ação que mexa em XP/ouro/HP.

---

## 📊 Bloco 1 — Estatísticas + Calendário/Histórico (War Room)

**Objetivo:** o usuário enxergar a própria evolução: calendário de check-ins, taxas, streaks e histórico por hábito. É o bloco de **maior valor por menor esforço** — os dados já estão em `habit_logs`.

### Backend
Quase nada novo. Leitura direta de `habit_logs` por intervalo já funciona via PostgREST + RLS. **Opcional** (otimização), 1 RPC de agregação mensal:

```sql
-- app._month_stats + public.get_month_stats(p_month text 'YYYY-MM')
-- retorna: { daysWithCheckin, totalCheckins, checkinRate, currentStreak,
--            perDay: [{date, success, fail}] }
```
> Decisão: começar **sem** RPC (agregar no cliente a partir de `habit_logs` do mês). Criar o RPC só se a performance pedir.

### Frontend
- `src/features/warroom/hooks/useMonthLogs(month)` — `habit_logs` no intervalo do mês (no timezone do usuário).
- Componentes:
  - `HabitCalendar` — grade 6×7; cada dia com indicador (verde = todos os hábitos do dia ok / vermelho = houve falha / cinza = nada). Toque no dia → detalhe do dia.
  - `MonthlyStatsCards` — 4 cards: dias com check-in, total de check-ins, taxa mensal (%), streak atual.
  - `HabitHistory` — por hábito: total XP/ouro/dano, melhor streak, taxa de conclusão.
- Nova aba **"Histórico"** (ícone `BarChart3`/`CalendarDays`) ou seção dentro do dashboard.
- Seletor de mês (`WeekDateSelector`/`MonthSwitcher`).

### UX / tema
- Calendário em bento card; bolinhas coloridas (sucesso/falha) seguindo a paleta.
- Streak com ícone `Flame`. Animar troca de mês (fade 200ms).

### Esforço
**Baixo-médio** (frontend-heavy, 0–1 RPC). Sem cron.

### Decisões em aberto
- Indicador do dia: por **hábito individual** (várias bolinhas) ou **agregado** (1 cor por dia)? Recomendo agregado + detalhe ao tocar.

---

## 🛒 Bloco 2 — Loja (Recompensas, Itens do Sistema, Buffs)

**Objetivo:** dar **utilidade ao ouro** (hoje ele acumula sem uso) — fecha o loop de gamificação. Dois subsistemas: recompensas autodefinidas e itens do sistema (efeitos no personagem).

### Backend — novas tabelas

```sql
-- Catálogo global de itens do sistema (sem user_id)
create type system_item_type as enum ('heal', 'damage_reduction', 'streak_recovery');
create table system_items (
  id uuid primary key default gen_random_uuid(),
  name text not null, description text not null,
  cost integer not null check (cost > 0),
  type system_item_type not null,
  effect_value integer not null,         -- heal: HP; damage_reduction: %; streak_recovery: n/a
  is_active boolean not null default true,
  sort_order smallint not null default 0
);

-- Recompensas pessoais (autodefinidas pelo usuário)
create table rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, description text,
  cost integer not null check (cost > 0),
  is_repurchasable boolean not null default true,
  has_stock boolean not null default false,
  current_stock integer, max_stock integer,
  cooldown_minutes integer,              -- simplificado: 1 campo só (vs hours/days do antigo)
  last_purchased_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Histórico de compras (rewards + system_items)
create table purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('reward','system_item')),
  reference_id uuid not null,            -- reward.id ou system_item.id
  gold_spent integer not null,
  purchased_at timestamptz not null default now()
);
create index purchases_user_idx on purchases (user_id, purchased_at);

-- Buffs ativos (efeitos temporários)
create table active_buffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  buff_type text not null,               -- 'damage_reduction'
  effect_value integer not null,         -- %
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index active_buffs_user_idx on active_buffs (user_id, expires_at);
```

### Backend — RPCs / lógica
- `public.purchase_reward(p_reward_id)` → valida ouro, estoque, cooldown; `spend_gold`; grava `purchases`; atualiza estoque/`last_purchased_at`.
- `public.purchase_system_item(p_item_id, p_habit_id?)` → aplica efeito por tipo:
  - `heal` → `app._restore_hp(user, effect_value)` (novo helper: `current_hp = min(max_hp, current_hp + v)`).
  - `damage_reduction` → cria `active_buffs` (duração fixa, ex. 7 dias); remove buffs antigos do mesmo tipo.
  - `streak_recovery` → requer `p_habit_id`; restaura `current_streak = last_streak` (≥1).
- **Modificar `app._apply_damage`** para descontar `damage_reduction` ativo (ler buff com `expires_at > now()`). ⚠️ É a única alteração em código existente.
- Padronizar erro "ouro insuficiente" (uma exceção só).
- Seed dos `system_items` (idempotente):

| Nome | Tipo | Custo | effect_value |
|---|---|---|---|
| Poção Pequena | heal | 50 | 25 |
| Poção Média | heal | 100 | 50 |
| Poção Grande | heal | 200 | 100 |
| Escudo (7 dias) | damage_reduction | 500 | 50 |
| Amuleto de Streak | streak_recovery | 150 | — |

### Backend — cron (opcional)
- Reposição de estoque de `rewards` com cooldown (`EVERY_HOUR`), espelhando o antigo. **Opcional** no MVP da loja.

### Frontend
- `src/features/store/hooks/`: `useSystemItems`, `useRewards`, `useActiveBuffs`, `usePurchaseReward`, `usePurchaseSystemItem`, `useRewardCrud`.
- Tela **Loja** (nova aba, ícone `ShoppingBag`):
  - Seção "Itens Mágicos" (system_items) — card com efeito + botão `{custo} 🪙`.
  - Seção "Recompensas Pessoais" (rewards) — estoque, cooldown restante, botão comprar (com `confirm`).
  - Indicador de **buff ativo** (ex.: "Escudo 50% — expira em 3d") no HUD.
- Form de recompensa (`RewardForm`, modal) — nome, custo, recompra, estoque, cooldown.
- `availableGold` vem de `character.gold`; invalidar `qk.character` pós-compra.

### UX / tema
- Itens do sistema com cor por efeito (cura = verde, escudo = ciano, streak = laranja).
- Compra com feedback (toast "Comprado!"), bloquear botão se ouro insuficiente.

### Esforço
**Médio-alto** (backend novo + 1 alteração em `_apply_damage` + várias telas).

### Decisões em aberto
- Cooldown: campo único em **minutos** (proposto) vs hours/days separados do antigo. Recomendo minutos.
- Duração do `damage_reduction`: fixa (7d) ou configurável por item (`effect_value2`/coluna extra)?
- Reposição de estoque automática agora ou depois?

---

## ⚔️ Bloco 3 — Side Quests (missões avulsas)

**Objetivo:** missões pontuais datadas (fora da rotina de hábitos), com recompensa única.

### Backend

```sql
create table side_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, description text,
  difficulty difficulty not null default 'medium',
  due_date timestamptz,                  -- opcional
  is_completed boolean not null default false,
  completed_at timestamptz,
  xp_gained integer, gold_gained integer,
  primary_skill_id uuid references skills(id) on delete set null,
  secondary_skill_id uuid references skills(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
- `public.complete_side_quest(p_id)` → usa `difficulty_levels` (valor cheio, sem streak); `add_xp`/`add_gold`; distribui skills (100%/50%); marca completa. Bloqueia recompletar.

### Frontend
- `src/features/sidequests/hooks/` (CRUD + complete).
- Tela **Side Quests** (aba ou seção): lista pendentes (ordenadas por `due_date`) + concluídas (riscadas). Estados visuais: atrasada (vermelho), hoje (amarelo). Form modal.

### Esforço
**Médio** (backend simples + telas).

### Decisões em aberto
- `due_date` obrigatório ou opcional? (Proposto: opcional.)
- Punição por atraso (dano) ou só "não ganha"? (Proposto: só não ganha — sem cron.)

---

## 🏆 Bloco 4 — Conquistas (Achievements)

**Objetivo:** marcos de progresso (dopamina barata, sem recompensa material).

### Backend

```sql
create table user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);
```
- **Catálogo estático em código** (`src/features/achievements/catalog.ts`) — sem tabela de catálogo (igual ao antigo).
- `public.evaluate_achievements()` → calcula contadores (hábitos concluídos, maior streak, nível, nº de skills, maior nível de skill, ouro de hábitos, side quests concluídas) e insere as recém-desbloqueadas; retorna só as novas.
- Chamar `evaluate_achievements` ao fim de `complete_habit` / `complete_side_quest` (como o antigo, com `catch`).

### Catálogo (15 — removidas as 4 de "reconhecimento" do antigo)
Primeiro hábito, 10 hábitos, 100 hábitos, streak 7/30/100, nível 5/10/25, primeira skill, 5 skills, skill nível 10, primeira side quest, 10 side quests, 1000 de ouro.

### Frontend
- Tela **Conquistas**: grid com ícone (lucide), bloqueada (cinza) vs desbloqueada (colorida + data).
- Toast/modal ao desbloquear (vem no retorno de `complete_habit`, campo `newAchievements`).
- ⚠️ Isso exige **estender `complete_habit`** para retornar `newAchievements` (hoje não retorna).

### Esforço
**Médio.**

---

## ✨ Bloco 5 — Polimentos e qualidade de vida

*Tudo frontend, exceto onde indicado. Fazer ao longo do caminho.*

| Item | Descrição | Esforço | Backend? |
|---|---|---|---|
| **Detalhe do hábito** | Tela com stats do hábito (XP/ouro/dano totais, streaks, histórico) | Baixo | Não (lê `habit_logs`) |
| **Perfil / Configurações** | Editar nome, timezone, metas diárias (`daily_xp_goal`/`daily_gold_goal`) | Baixo | Não (update direto) |
| **Hábitos inativos** | Listar/reativar (hoje somem; `useHabits` filtra `is_active`) | Baixo | Não |
| **FX de level-up** | Animação/confete quando `leveledUp` no retorno do complete | Baixo | Não |
| **Deep-link de notificação** | Tocar no lembrete abre o hábito (`data.habitId` já é enviado) | Baixo | Não |
| **Metas diárias no HUD** | Barra de progresso da meta de XP/ouro do dia | Baixo | Não |
| **Empty states / skeletons** | Carregamento e estados vazios mais ricos | Baixo | Não |
| **Confirmações/Toasts** | Padronizar feedback de ações (lib de toast) | Baixo | Não |
| **Push remoto (futuro)** | Lembrete "streak em risco" disparado do servidor | Alto | Sim (APNs) |

---

## 🗺️ Ordem recomendada e dependências

```
1. 📊 Estatísticas + Calendário   (barato, alto valor, sem backend novo)
2. 🛒 Loja + Buffs                 (destrava o uso do ouro; altera _apply_damage)
3. 🏆 Conquistas                   (estende complete_habit p/ retornar newAchievements)
4. ⚔️ Side Quests
5. ✨ Polimentos                   (intercalados ao longo de tudo)
```

**Dependências técnicas:**
- Conquistas dependem de estender `complete_habit` (retornar `newAchievements`).
- Loja exige alterar `app._apply_damage` (descontar buff de redução de dano).
- Todos os blocos de backend exigem regenerar `src/types/db.ts` após o `db push`.

---

## ❓ Decisões em aberto (consolidado)

1. **Calendário:** indicador por hábito vs agregado por dia. → *agregado + detalhe ao tocar.*
2. **Loja — cooldown:** minutos (único) vs hours/days. → *minutos.*
3. **Loja — redução de dano:** duração fixa (7d) vs configurável.
4. **Loja — reposição de estoque:** automática (cron) agora ou depois.
5. **Side Quests:** `due_date` opcional; punição por atraso (proposto: sem punição).
6. **Navegação:** novas seções viram **abas** (a barra já tem 3; cabem ~5) ou entram num menu "Mais"? → decidir quando passar de 5 itens.

---

> **Próximo passo sugerido:** começar pelo Bloco 1 (Estatísticas + Calendário). Não precisa
> de migration — dá pra entregar valor visível rápido sobre os dados que já existem.
