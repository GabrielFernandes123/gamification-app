-- ============================================================
-- Migration: store_schema (Fase 2 — Loja + Buffs)
--   Tabelas: system_items (catálogo global), rewards (pessoais),
--            purchases (histórico), active_buffs (efeitos temporários)
--   Helpers: _spend_gold, _restore_hp, _active_damage_reduction
--   Altera : _apply_damage (passa a descontar buff de redução)
--   RPCs   : purchase_reward, purchase_system_item
-- ============================================================

create type system_item_type as enum ('heal', 'damage_reduction', 'streak_recovery');

-- ------------------------------------------------------------
-- Catálogo global de itens do sistema (sem user_id)
-- ------------------------------------------------------------
create table system_items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  description  text not null,
  cost         integer not null check (cost > 0),
  type         system_item_type not null,
  effect_value integer not null,   -- heal: HP; damage_reduction: %; streak_recovery: n/a
  is_active    boolean not null default true,
  sort_order   smallint not null default 0
);

insert into system_items (name, description, cost, type, effect_value, sort_order) values
  ('Poção Pequena',   'Restaura 25 de HP',              50,  'heal',             25, 1),
  ('Poção Média',     'Restaura 50 de HP',              100, 'heal',             50, 2),
  ('Poção Grande',    'Restaura 100 de HP',             200, 'heal',             100, 3),
  ('Escudo Protetor', 'Reduz dano em 50% por 7 dias',   500, 'damage_reduction', 50, 4),
  ('Amuleto de Streak','Restaura o streak de um hábito', 150, 'streak_recovery',  1, 5)
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- Recompensas pessoais (autodefinidas)
-- ------------------------------------------------------------
create table rewards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  description      text,
  cost             integer not null check (cost > 0),
  is_repurchasable boolean not null default true,
  has_stock        boolean not null default false,
  current_stock    integer,
  max_stock        integer,
  cooldown_minutes integer check (cooldown_minutes is null or cooldown_minutes >= 0),
  last_purchased_at timestamptz,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index rewards_user_idx on rewards (user_id, is_active);

-- ------------------------------------------------------------
-- Histórico de compras (rewards + system_items)
-- ------------------------------------------------------------
create table purchases (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('reward', 'system_item')),
  reference_id uuid not null,
  name         text not null,             -- snapshot do nome no momento da compra
  gold_spent   integer not null,
  purchased_at timestamptz not null default now()
);
create index purchases_user_idx on purchases (user_id, purchased_at);

-- ------------------------------------------------------------
-- Buffs ativos
-- ------------------------------------------------------------
create table active_buffs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  buff_type    text not null,            -- 'damage_reduction'
  effect_value integer not null,         -- %
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);
create index active_buffs_user_idx on active_buffs (user_id, expires_at);

create trigger rewards_updated_at before update on rewards
  for each row execute function set_updated_at();

-- ============================================================
-- Helpers do motor (schema app)
-- ============================================================
create or replace function app._spend_gold(p_user_id uuid, p_amount int)
returns void language plpgsql security definer set search_path = app, public as $$
declare
  v_gold int;
begin
  select gold into v_gold from characters where user_id = p_user_id;
  if v_gold is null or v_gold < p_amount then
    raise exception 'Ouro insuficiente';
  end if;
  update characters set gold = gold - p_amount where user_id = p_user_id;
end;
$$;

create or replace function app._restore_hp(p_user_id uuid, p_hp int)
returns void language plpgsql security definer set search_path = app, public as $$
begin
  update characters set current_hp = least(max_hp, current_hp + greatest(0, p_hp))
   where user_id = p_user_id;
end;
$$;

create or replace function app._active_damage_reduction(p_user_id uuid)
returns int language plpgsql security definer set search_path = app, public as $$
declare
  v int;
begin
  select coalesce(max(effect_value), 0) into v
    from active_buffs
   where user_id = p_user_id and buff_type = 'damage_reduction' and expires_at > now();
  return v;
end;
$$;

-- Substitui _apply_damage: agora desconta a redução de dano ativa.
create or replace function app._apply_damage(p_user_id uuid, p_damage int)
returns boolean language plpgsql security definer set search_path = app, public as $$
declare
  v_reduction int;
  v_actual    int;
  v_new_hp    int;
begin
  v_reduction := app._active_damage_reduction(p_user_id);
  v_actual := case
    when v_reduction > 0 then floor(greatest(0, p_damage) * (1 - v_reduction / 100.0))::int
    else greatest(0, p_damage)
  end;
  update characters set current_hp = greatest(0, current_hp - v_actual)
   where user_id = p_user_id
   returning current_hp into v_new_hp;
  if v_new_hp <= 0 then
    perform app._reset_character(p_user_id);
    return true;
  end if;
  return false;
end;
$$;

-- ============================================================
-- Compra de item do sistema
-- ============================================================
create or replace function app._purchase_system_item(p_user_id uuid, p_item_id uuid, p_habit_id uuid)
returns jsonb language plpgsql security definer set search_path = app, public as $$
declare
  v_item   system_items;
  v_habit  habits;
  v_msg    text;
begin
  select * into v_item from system_items where id = p_item_id and is_active = true;
  if not found then raise exception 'Item não encontrado'; end if;

  if v_item.type = 'streak_recovery' then
    if p_habit_id is null then raise exception 'Escolha um hábito para recuperar o streak'; end if;
    select * into v_habit from habits where id = p_habit_id and user_id = p_user_id;
    if not found then raise exception 'Hábito não encontrado'; end if;
  end if;

  perform app._spend_gold(p_user_id, v_item.cost);

  if v_item.type = 'heal' then
    perform app._restore_hp(p_user_id, v_item.effect_value);
    v_msg := 'Restaurado ' || v_item.effect_value || ' de HP';
  elsif v_item.type = 'damage_reduction' then
    delete from active_buffs where user_id = p_user_id and buff_type = 'damage_reduction';
    insert into active_buffs (user_id, buff_type, effect_value, expires_at)
      values (p_user_id, 'damage_reduction', v_item.effect_value, now() + interval '7 days');
    v_msg := 'Escudo de ' || v_item.effect_value || '% por 7 dias';
  elsif v_item.type = 'streak_recovery' then
    update habits set current_streak = greatest(1, last_streak) where id = p_habit_id;
    v_msg := 'Streak restaurado';
  end if;

  insert into purchases (user_id, kind, reference_id, name, gold_spent)
    values (p_user_id, 'system_item', v_item.id, v_item.name, v_item.cost);

  return jsonb_build_object('message', v_msg, 'goldSpent', v_item.cost);
end;
$$;

-- ============================================================
-- Compra/resgate de recompensa pessoal
-- ============================================================
create or replace function app._purchase_reward(p_user_id uuid, p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path = app, public as $$
declare
  v_reward      rewards;
  v_already     boolean;
  v_cooldown_ok boolean := true;
  v_next_at     timestamptz;
begin
  select * into v_reward from rewards where id = p_reward_id and user_id = p_user_id and is_active = true;
  if not found then raise exception 'Recompensa não encontrada'; end if;

  -- recompra
  if not v_reward.is_repurchasable then
    select exists (select 1 from purchases where reference_id = v_reward.id and user_id = p_user_id)
      into v_already;
    if v_already then raise exception 'Recompensa não recomprável (já resgatada)'; end if;
  end if;

  -- estoque
  if v_reward.has_stock and coalesce(v_reward.current_stock, 0) <= 0 then
    raise exception 'Fora de estoque';
  end if;

  -- cooldown
  if v_reward.cooldown_minutes is not null and v_reward.cooldown_minutes > 0
     and v_reward.last_purchased_at is not null then
    v_next_at := v_reward.last_purchased_at + (v_reward.cooldown_minutes || ' minutes')::interval;
    if now() < v_next_at then
      raise exception 'Em cooldown até %', v_next_at;
    end if;
  end if;

  perform app._spend_gold(p_user_id, v_reward.cost);

  update rewards
     set last_purchased_at = now(),
         current_stock = case when has_stock then greatest(0, coalesce(current_stock, 0) - 1) else current_stock end
   where id = v_reward.id;

  insert into purchases (user_id, kind, reference_id, name, gold_spent)
    values (p_user_id, 'reward', v_reward.id, v_reward.name, v_reward.cost);

  return jsonb_build_object('goldSpent', v_reward.cost);
end;
$$;

-- ============================================================
-- Portas públicas
-- ============================================================
create or replace function public.purchase_system_item(p_item_id uuid, p_habit_id uuid default null)
returns jsonb language plpgsql security definer set search_path = app, public as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  return app._purchase_system_item(auth.uid(), p_item_id, p_habit_id);
end; $$;

create or replace function public.purchase_reward(p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path = app, public as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  return app._purchase_reward(auth.uid(), p_reward_id);
end; $$;

grant execute on function public.purchase_system_item(uuid, uuid) to authenticated;
grant execute on function public.purchase_reward(uuid) to authenticated;

-- ============================================================
-- RLS
-- ============================================================
alter table system_items enable row level security;
alter table rewards      enable row level security;
alter table purchases    enable row level security;
alter table active_buffs enable row level security;

create policy "system_items_read" on system_items
  for select to authenticated using (true);

create policy "rewards_all_own" on rewards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "purchases_select_own" on purchases
  for select using (auth.uid() = user_id);

create policy "active_buffs_select_own" on active_buffs
  for select using (auth.uid() = user_id);
