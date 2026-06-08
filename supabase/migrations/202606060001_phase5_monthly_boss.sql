-- Phase 5: monthly boss loop.
-- This keeps the first playable season/boss cut inside Supabase while the API
-- migration is still in progress: ledger events cause deterministic boss damage.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'season_status') then
    create type public.season_status as enum ('ativa', 'concluida');
  end if;
  if not exists (select 1 from pg_type where typname = 'boss_tier') then
    create type public.boss_tier as enum ('mensal', 'trimestral', 'semestral', 'anual');
  end if;
  if not exists (select 1 from pg_type where typname = 'boss_status') then
    create type public.boss_status as enum ('ativo', 'vencido', 'perdido');
  end if;
  if not exists (select 1 from pg_type where typname = 'boss_phase_status') then
    create type public.boss_phase_status as enum ('ativa', 'vencida', 'bloqueada');
  end if;
end $$;

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lore text,
  theme_seed text,
  preset text not null default 'mensal',
  starts_on date not null,
  ends_on date not null,
  status public.season_status not null default 'ativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bosses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  tier public.boss_tier not null default 'mensal',
  parent_boss_id uuid references public.bosses(id) on delete set null,
  name text not null,
  theme text not null default 'disciplina',
  weakness_module_key public.economy_source_type references public.module_registry(key),
  weakness_bonus numeric not null default 0.50,
  attack_boss integer not null default 8,
  max_hp integer not null,
  current_hp integer not null,
  window_start date not null,
  window_end date not null,
  status public.boss_status not null default 'ativo',
  rewards_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bosses_hp_check check (max_hp > 0 and current_hp >= 0),
  constraint bosses_window_check check (window_end >= window_start)
);

create unique index if not exists bosses_one_monthly_per_window
  on public.bosses(user_id, tier, window_start)
  where tier = 'mensal';

create table if not exists public.boss_phases (
  id uuid primary key default gen_random_uuid(),
  boss_id uuid not null references public.bosses(id) on delete cascade,
  sort_order integer not null,
  max_hp integer not null,
  current_hp integer not null,
  status public.boss_phase_status not null default 'ativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (boss_id, sort_order)
);

create table if not exists public.boss_objectives (
  id uuid primary key default gen_random_uuid(),
  boss_id uuid not null references public.bosses(id) on delete cascade,
  phase_id uuid references public.boss_phases(id) on delete cascade,
  source_type public.economy_source_type not null,
  title text not null,
  spec jsonb not null default '{}'::jsonb,
  target integer not null,
  progress integer not null default 0,
  completed boolean not null default false,
  boss_damage integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boss_objectives_target_check check (target > 0),
  constraint boss_objectives_progress_check check (progress >= 0)
);

create table if not exists public.boss_damage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  boss_id uuid not null references public.bosses(id) on delete cascade,
  phase_id uuid references public.boss_phases(id) on delete set null,
  economy_event_id uuid references public.economy_events(id) on delete set null,
  amount integer not null,
  source_type public.economy_source_type,
  was_weakness boolean not null default false,
  was_critical boolean not null default false,
  occurred_at timestamptz not null default now()
);

create table if not exists public.boss_charges (
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  amount integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, season_id)
);

create table if not exists public.character_attribute_point_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  boss_id uuid references public.bosses(id) on delete set null,
  points integer not null,
  allocated_points integer not null default 0,
  source text not null default 'boss',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint character_attribute_point_grants_points_check check (points > 0),
  constraint character_attribute_point_grants_allocated_check check (allocated_points >= 0 and allocated_points <= points)
);

create unique index if not exists character_attribute_points_user_attribute_idx
  on public.character_attribute_points(user_id, attribute_key);

create table if not exists public.narrative_beats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  boss_id uuid references public.bosses(id) on delete cascade,
  kind text not null,
  content text not null,
  layer integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.seasons enable row level security;
alter table public.bosses enable row level security;
alter table public.boss_phases enable row level security;
alter table public.boss_objectives enable row level security;
alter table public.boss_damage_events enable row level security;
alter table public.boss_charges enable row level security;
alter table public.character_attribute_point_grants enable row level security;
alter table public.narrative_beats enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'seasons' and policyname = 'seasons_user_all') then
    create policy seasons_user_all on public.seasons for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bosses' and policyname = 'bosses_user_all') then
    create policy bosses_user_all on public.bosses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'boss_phases' and policyname = 'boss_phases_user_all') then
    create policy boss_phases_user_all on public.boss_phases
      for all using (exists (select 1 from public.bosses b where b.id = boss_id and b.user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'boss_objectives' and policyname = 'boss_objectives_user_all') then
    create policy boss_objectives_user_all on public.boss_objectives
      for all using (exists (select 1 from public.bosses b where b.id = boss_id and b.user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'boss_damage_events' and policyname = 'boss_damage_events_user_all') then
    create policy boss_damage_events_user_all on public.boss_damage_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'boss_charges' and policyname = 'boss_charges_user_all') then
    create policy boss_charges_user_all on public.boss_charges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'character_attribute_point_grants' and policyname = 'character_attribute_point_grants_user_all') then
    create policy character_attribute_point_grants_user_all on public.character_attribute_point_grants for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'narrative_beats' and policyname = 'narrative_beats_user_all') then
    create policy narrative_beats_user_all on public.narrative_beats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.pending_attribute_points(p_user_id uuid default auth.uid())
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(points - allocated_points), 0)::int
  from public.character_attribute_point_grants
  where user_id = p_user_id;
$$;

create or replace function public.allocate_attribute_point(
  p_attribute_key public.attribute_key,
  p_points integer default 1,
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer := greatest(1, coalesce(p_points, 1));
  v_grant record;
begin
  if p_user_id is null then
    raise exception 'user_id required';
  end if;

  if public.pending_attribute_points(p_user_id) < v_remaining then
    raise exception 'pontos de atributo insuficientes';
  end if;

  for v_grant in
    select id, points, allocated_points
    from public.character_attribute_point_grants
    where user_id = p_user_id and allocated_points < points
    order by created_at
    for update
  loop
    exit when v_remaining <= 0;

    update public.character_attribute_point_grants
    set allocated_points = allocated_points + least(v_remaining, points - allocated_points),
        updated_at = now()
    where id = v_grant.id;

    v_remaining := v_remaining - least(v_remaining, v_grant.points - v_grant.allocated_points);
  end loop;

  insert into public.character_attribute_points (user_id, attribute_key, points)
  values (p_user_id, p_attribute_key, p_points)
  on conflict (user_id, attribute_key)
  do update set points = public.character_attribute_points.points + excluded.points,
                updated_at = now();

  return jsonb_build_object(
    'attributeKey', p_attribute_key,
    'allocated', p_points,
    'pending', public.pending_attribute_points(p_user_id)
  );
end;
$$;

create or replace function public.boss_attribute_total(p_user_id uuid, p_key public.attribute_key)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with skill_points as (
    select coalesce(sum(coalesce(level, floor(sqrt(xp / 100.0))::int + 1)), 0)::int as value
    from public.skills
    where user_id = p_user_id and attribute_key = p_key
  ),
  body_points as (
    select coalesce(sum(coalesce(level, floor(sqrt(xp / 100.0))::int + 1)), 0)::int as value
    from public.body_parts
    where user_id = p_user_id and attribute_key = p_key and is_active = true
  ),
  permanent_points as (
    select coalesce(sum(points), 0)::int as value
    from public.character_attribute_points
    where user_id = p_user_id and attribute_key = p_key
  ),
  equipment_points as (
    select coalesce(sum(coalesce((attribute_bonuses ->> p_key::text)::int, 0)), 0)::int as value
    from public.character_equipment
    where user_id = p_user_id and is_equipped = true
  ),
  base_total as (
    select skill_points.value + body_points.value + permanent_points.value + equipment_points.value as value
    from skill_points, body_points, permanent_points, equipment_points
  ),
  class_bonus as (
    select case
      when c.class = 'guerreiro' and p_key = 'forca' then floor(base_total.value * 0.15)::int
      when c.class = 'mago' and p_key = 'foco' then floor(base_total.value * 0.15)::int
      when c.class = 'ladino' and p_key = 'agilidade' then floor(base_total.value * 0.15)::int
      else 0
    end as value
    from public.characters c, base_total
    where c.user_id = p_user_id
    limit 1
  )
  select greatest(0, base_total.value + coalesce(class_bonus.value, 0))::int
  from base_total
  left join class_bonus on true;
$$;

create or replace function public.ensure_current_monthly_boss(p_user_id uuid default auth.uid())
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date := date_trunc('month', current_date)::date;
  v_end date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
  v_days integer := extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int;
  v_season_id uuid;
  v_boss_id uuid;
  v_avg_xp numeric;
  v_daily_goal integer;
  v_hp integer;
  v_weakness public.economy_source_type;
  v_objective record;
begin
  if p_user_id is null then
    raise exception 'user_id required';
  end if;

  select id into v_boss_id
  from public.bosses
  where user_id = p_user_id and tier = 'mensal' and window_start = v_start
  limit 1;

  if v_boss_id is not null then
    return v_boss_id;
  end if;

  select id into v_season_id
  from public.seasons
  where user_id = p_user_id and status = 'ativa' and starts_on <= v_end and ends_on >= v_start
  order by starts_on desc
  limit 1;

  if v_season_id is null then
    insert into public.seasons (user_id, name, lore, preset, starts_on, ends_on)
    values (p_user_id, 'Temporada atual', 'Um arco mensal gerado pela sua consistencia.', 'mensal', v_start, v_end)
    returning id into v_season_id;
  end if;

  select coalesce(avg(day_xp), 0) into v_avg_xp
  from (
    select occurred_on, sum(greatest(xp_delta, 0)) as day_xp
    from public.economy_events
    where user_id = p_user_id
      and occurred_on >= current_date - 30
      and source_type <> 'boss'
    group by occurred_on
  ) d;

  select daily_xp_goal into v_daily_goal
  from public.characters
  where user_id = p_user_id
  limit 1;

  v_hp := greatest(300, least(20000, ceil(greatest(coalesce(v_avg_xp, 0), coalesce(v_daily_goal, 80), 80) * v_days * 0.95)::int));

  select mr.key into v_weakness
  from public.module_registry mr
  left join public.economy_events ev
    on ev.user_id = p_user_id
   and ev.source_type = mr.key
   and ev.occurred_on >= current_date - 14
   and ev.xp_delta > 0
  where mr.ativo = true and mr.kind = 'atividade'
  group by mr.key, mr.ordem
  order by count(ev.id) asc, mr.ordem asc
  limit 1;

  if v_weakness is null then
    v_weakness := 'habit';
  end if;

  insert into public.bosses (
    user_id, season_id, tier, name, theme, weakness_module_key, weakness_bonus,
    attack_boss, max_hp, current_hp, window_start, window_end
  )
  values (
    p_user_id, v_season_id, 'mensal',
    'Guardiao do Mes',
    'consistencia',
    v_weakness,
    0.50,
    greatest(6, ceil(coalesce((select max_hp from public.characters where user_id = p_user_id), 80) * 0.10)::int),
    v_hp,
    v_hp,
    v_start,
    v_end
  )
  returning id into v_boss_id;

  insert into public.boss_phases (boss_id, sort_order, max_hp, current_hp, status)
  values (v_boss_id, 1, v_hp, v_hp, 'ativa');

  for v_objective in
    select key
    from public.module_registry
    where ativo = true and kind = 'atividade'
    order by ordem
    limit 5
  loop
    insert into public.boss_objectives (boss_id, source_type, title, spec, target, boss_damage)
    values (
      v_boss_id,
      v_objective.key,
      case v_objective.key
        when 'habit' then 'Complete habitos neste mes'
        when 'workout' then 'Finalize treinos neste mes'
        when 'sidequest' then 'Conclua side quests neste mes'
        when 'body_goal' then 'Conclua metas corporais neste mes'
        when 'body_measurement' then 'Registre medidas neste mes'
        else 'Avance neste modulo'
      end,
      jsonb_build_object('kind', 'event_count', 'window', 'monthly'),
      case v_objective.key
        when 'habit' then 20
        when 'workout' then 8
        when 'sidequest' then 5
        when 'body_goal' then 2
        when 'body_measurement' then 4
        else 5
      end,
      greatest(25, floor(v_hp * 0.04)::int)
    );
  end loop;

  insert into public.narrative_beats (user_id, season_id, boss_id, kind, content, layer)
  values (
    p_user_id,
    v_season_id,
    v_boss_id,
    'capitulo',
    'O Guardiao do Mes surgiu. Cada acao positiva agora tambem fere o boss mensal.',
    0
  );

  return v_boss_id;
end;
$$;

create or replace function public.complete_monthly_boss_if_needed(p_boss_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boss public.bosses%rowtype;
  v_slot public.equipment_slot;
  v_attribute public.attribute_key;
  v_bonus integer;
begin
  select * into v_boss
  from public.bosses
  where id = p_boss_id
  for update;

  if not found or v_boss.status <> 'ativo' or v_boss.current_hp > 0 or v_boss.rewards_claimed then
    return;
  end if;

  update public.bosses
  set status = 'vencido', rewards_claimed = true, updated_at = now()
  where id = p_boss_id;

  update public.boss_phases
  set status = 'vencida', current_hp = 0, updated_at = now()
  where boss_id = p_boss_id and sort_order = 1;

  update public.characters
  set essencia = essencia + 1, updated_at = now()
  where user_id = v_boss.user_id;

  insert into public.economy_events (user_id, source_type, source_id, xp_delta, gold_delta, essencia_delta, occurred_on, meta)
  values (
    v_boss.user_id,
    'boss',
    p_boss_id,
    0,
    0,
    1,
    current_date,
    jsonb_build_object('tier', 'mensal', 'attribute_points_pending', 1)
  );

  insert into public.boss_charges (user_id, season_id, amount)
  values (v_boss.user_id, v_boss.season_id, 1)
  on conflict (user_id, season_id)
  do update set amount = public.boss_charges.amount + 1, updated_at = now();

  insert into public.character_attribute_point_grants (user_id, boss_id, points, source)
  values (v_boss.user_id, p_boss_id, 1, 'monthly_boss');

  v_slot := (array['arma', 'armadura', 'acessorio']::public.equipment_slot[])[
    ((('x' || substr(md5(p_boss_id::text || ':slot'), 1, 8))::bit(32)::bigint % 3) + 1)::int
  ];
  v_attribute := (array['forca', 'agilidade', 'vitalidade', 'foco']::public.attribute_key[])[
    ((('x' || substr(md5(p_boss_id::text || ':attr'), 1, 8))::bit(32)::bigint % 4) + 1)::int
  ];
  v_bonus := 2 + ((('x' || substr(md5(p_boss_id::text || ':bonus'), 1, 8))::bit(32)::bigint % 3)::int);

  insert into public.character_equipment (
    user_id, name, slot, attribute_bonuses, required_level, source, is_equipped
  )
  values (
    v_boss.user_id,
    'Trofeu do Guardiao',
    v_slot,
    jsonb_build_object(v_attribute::text, v_bonus),
    1,
    'boss_drop',
    false
  );

  insert into public.narrative_beats (user_id, season_id, boss_id, kind, content, layer)
  values (
    v_boss.user_id,
    v_boss.season_id,
    p_boss_id,
    'marco',
    'O boss mensal caiu. Voce ganhou Essencia, um ponto de atributo, uma carga e um equipamento.',
    0
  );
end;
$$;

create or replace function public.sync_monthly_boss_from_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.economy_events%rowtype;
  v_boss public.bosses%rowtype;
  v_phase_id uuid;
  v_forca integer;
  v_agilidade integer;
  v_foco integer;
  v_damage numeric;
  v_was_weakness boolean;
  v_was_critical boolean;
  v_roll numeric;
  v_objective public.boss_objectives%rowtype;
begin
  select * into v_event
  from public.economy_events
  where id = p_event_id;

  if not found or v_event.xp_delta <= 0 or v_event.source_type = 'boss' then
    return;
  end if;

  perform public.ensure_current_monthly_boss(v_event.user_id);

  select * into v_boss
  from public.bosses
  where user_id = v_event.user_id
    and tier = 'mensal'
    and status = 'ativo'
    and v_event.occurred_on between window_start and window_end
  order by window_start desc
  limit 1
  for update;

  if not found then
    return;
  end if;

  select id into v_phase_id
  from public.boss_phases
  where boss_id = v_boss.id and status = 'ativa'
  order by sort_order
  limit 1;

  v_forca := public.boss_attribute_total(v_event.user_id, 'forca');
  v_agilidade := public.boss_attribute_total(v_event.user_id, 'agilidade');
  v_foco := public.boss_attribute_total(v_event.user_id, 'foco');
  v_was_weakness := v_event.source_type = v_boss.weakness_module_key;
  v_roll := (('x' || substr(md5(v_event.id::text || ':crit'), 1, 8))::bit(32)::bigint)::numeric / 4294967295.0;
  v_was_critical := v_roll < least(0.50, v_agilidade * 0.005);

  v_damage := v_event.xp_delta * (1 + v_forca * 0.01);
  if v_was_critical then
    v_damage := v_damage * 2;
  end if;
  if v_was_weakness then
    v_damage := v_damage * (1 + (v_boss.weakness_bonus * (1 + v_foco * 0.01)));
  end if;

  v_damage := greatest(1, floor(v_damage));

  update public.bosses
  set current_hp = greatest(0, current_hp - v_damage::int), updated_at = now()
  where id = v_boss.id;

  update public.boss_phases
  set current_hp = greatest(0, current_hp - v_damage::int), updated_at = now()
  where id = v_phase_id;

  insert into public.boss_damage_events (
    user_id, boss_id, phase_id, economy_event_id, amount, source_type, was_weakness, was_critical
  )
  values (
    v_event.user_id, v_boss.id, v_phase_id, v_event.id, v_damage::int, v_event.source_type, v_was_weakness, v_was_critical
  );

  select * into v_objective
  from public.boss_objectives
  where boss_id = v_boss.id
    and source_type = v_event.source_type
    and completed = false
  order by created_at
  limit 1
  for update;

  if found then
    update public.boss_objectives
    set progress = least(target, progress + 1),
        completed = progress + 1 >= target,
        completed_at = case when progress + 1 >= target then now() else completed_at end,
        updated_at = now()
    where id = v_objective.id;

    if v_objective.progress + 1 >= v_objective.target then
      update public.bosses
      set current_hp = greatest(0, current_hp - v_objective.boss_damage), updated_at = now()
      where id = v_boss.id;

      update public.boss_phases
      set current_hp = greatest(0, current_hp - v_objective.boss_damage), updated_at = now()
      where id = v_phase_id;

      insert into public.boss_damage_events (
        user_id, boss_id, phase_id, economy_event_id, amount, source_type, was_weakness, was_critical
      )
      values (
        v_event.user_id, v_boss.id, v_phase_id, v_event.id, v_objective.boss_damage, v_event.source_type, false, false
      );
    end if;
  end if;

  perform public.complete_monthly_boss_if_needed(v_boss.id);
end;
$$;

create or replace function public.after_economy_event_sync_boss()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_monthly_boss_from_event(new.id);
  return new;
end;
$$;

drop trigger if exists economy_events_sync_monthly_boss on public.economy_events;
create trigger economy_events_sync_monthly_boss
after insert on public.economy_events
for each row
execute function public.after_economy_event_sync_boss();

create or replace function public.apply_character_death_from_boss(p_user_id uuid, p_boss_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season_id uuid;
begin
  select season_id into v_season_id
  from public.bosses
  where id = p_boss_id and user_id = p_user_id;

  update public.characters
  set total_xp = 0,
      gold = 0,
      current_hp = 60,
      death_count = death_count + 1,
      updated_at = now()
  where user_id = p_user_id;

  update public.skills
  set xp = 0, updated_at = now()
  where user_id = p_user_id;

  update public.body_parts
  set xp = 0, updated_at = now()
  where user_id = p_user_id;

  update public.habits
  set current_streak = 0, last_streak = 0, updated_at = now()
  where user_id = p_user_id;

  update public.character_equipment
  set is_equipped = false, updated_at = now()
  where user_id = p_user_id and required_level > 1;

  if v_season_id is not null then
    insert into public.narrative_beats (user_id, season_id, boss_id, kind, content, layer)
    values (
      p_user_id,
      v_season_id,
      p_boss_id,
      'marco',
      'O contra-ataque do boss derrubou o personagem. A run foi reiniciada, mas a meta-progressao permaneceu.',
      0
    );
  end if;
end;
$$;

create or replace function public.recalibrate_monthly_boss(p_user_id uuid default auth.uid(), p_day date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boss public.bosses%rowtype;
  v_elapsed numeric;
  v_total numeric;
  v_expected_damage numeric;
  v_done integer;
  v_extra_hp integer;
  v_cap integer;
begin
  select * into v_boss
  from public.bosses
  where user_id = p_user_id
    and tier = 'mensal'
    and status = 'ativo'
    and p_day between window_start and window_end
  order by window_start desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('status', 'no_active_boss');
  end if;

  v_elapsed := greatest(1, p_day - v_boss.window_start + 1);
  v_total := greatest(1, v_boss.window_end - v_boss.window_start + 1);
  v_done := greatest(0, v_boss.max_hp - v_boss.current_hp);
  v_expected_damage := (v_elapsed / v_total) * v_boss.max_hp;

  if v_elapsed < 10 or (v_done::numeric / v_boss.max_hp) < 0.58 or v_done <= v_expected_damage * 1.25 then
    return jsonb_build_object('status', 'on_pace', 'damageDone', v_done, 'expectedDamage', floor(v_expected_damage));
  end if;

  v_cap := floor(v_boss.max_hp * 0.20)::int;
  v_extra_hp := least(v_cap, greatest(25, floor((v_done - v_expected_damage) * 0.45)::int));

  update public.bosses
  set max_hp = max_hp + v_extra_hp,
      current_hp = current_hp + v_extra_hp,
      attack_boss = ceil(attack_boss * 1.10)::int,
      updated_at = now()
  where id = v_boss.id;

  update public.boss_phases
  set max_hp = max_hp + v_extra_hp,
      current_hp = current_hp + v_extra_hp,
      updated_at = now()
  where boss_id = v_boss.id and status = 'ativa';

  insert into public.narrative_beats (user_id, season_id, boss_id, kind, content, layer)
  values (
    v_boss.user_id,
    v_boss.season_id,
    v_boss.id,
    'enrave',
    'O boss enraiveceu ao sentir que cairia cedo demais. Ele ganhou folego, mas dentro de um limite.',
    0
  );

  return jsonb_build_object('status', 'enraged', 'extraHp', v_extra_hp, 'damageDone', v_done, 'expectedDamage', floor(v_expected_damage));
end;
$$;

create or replace function public.process_monthly_boss_daily_jobs(p_day date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_resolved integer := 0;
  v_enraged integer := 0;
  v_result jsonb;
begin
  for v_user in
    select distinct user_id
    from public.bosses
    where tier = 'mensal'
      and status = 'ativo'
      and p_day >= window_start
  loop
    v_result := public.resolve_monthly_boss_day(v_user.user_id, p_day - 1);
    v_resolved := v_resolved + 1;

    v_result := public.recalibrate_monthly_boss(v_user.user_id, p_day);
    if v_result ->> 'status' = 'enraged' then
      v_enraged := v_enraged + 1;
    end if;
  end loop;

  return jsonb_build_object('resolvedUsers', v_resolved, 'enragedBosses', v_enraged, 'day', p_day);
end;
$$;

create or replace function public.resolve_monthly_boss_day(p_user_id uuid default auth.uid(), p_day date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boss public.bosses%rowtype;
  v_character public.characters%rowtype;
  v_xp_today integer;
  v_vitalidade integer;
  v_agilidade integer;
  v_roll numeric;
  v_dodged boolean;
  v_damage integer := 0;
begin
  perform public.ensure_current_monthly_boss(p_user_id);

  select * into v_boss
  from public.bosses
  where user_id = p_user_id and tier = 'mensal' and status = 'ativo' and p_day >= window_start
  order by window_start desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('status', 'no_active_boss');
  end if;

  if p_day > v_boss.window_end and v_boss.current_hp > 0 then
    update public.bosses set status = 'perdido', updated_at = now() where id = v_boss.id;
    return jsonb_build_object('status', 'lost', 'bossId', v_boss.id);
  end if;

  select * into v_character from public.characters where user_id = p_user_id for update;
  select coalesce(sum(greatest(xp_delta, 0)), 0)::int into v_xp_today
  from public.economy_events
  where user_id = p_user_id and occurred_on = p_day and source_type <> 'boss';

  if v_xp_today < coalesce(v_character.daily_xp_goal, 0) then
    v_vitalidade := public.boss_attribute_total(p_user_id, 'vitalidade');
    v_agilidade := public.boss_attribute_total(p_user_id, 'agilidade');
    v_roll := (('x' || substr(md5(v_boss.id::text || p_day::text || ':dodge'), 1, 8))::bit(32)::bigint)::numeric / 4294967295.0;
    v_dodged := v_roll < least(0.50, v_agilidade * 0.005);
    if not v_dodged then
      v_damage := greatest(1, floor(v_boss.attack_boss * (1 - least(0.75, v_vitalidade * 0.01)))::int);
      update public.characters
      set current_hp = greatest(0, current_hp - v_damage), updated_at = now()
      where user_id = p_user_id;

      if (select current_hp from public.characters where user_id = p_user_id) <= 0 then
        perform public.apply_character_death_from_boss(p_user_id, v_boss.id);
      end if;
    end if;
    return jsonb_build_object('status', 'counterattack', 'damage', v_damage, 'dodged', v_dodged, 'xpToday', v_xp_today);
  end if;

  return jsonb_build_object('status', 'goal_met', 'damage', 0, 'xpToday', v_xp_today);
end;
$$;

create or replace function public.current_monthly_boss_snapshot(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boss_id uuid;
  v_result jsonb;
begin
  v_boss_id := public.ensure_current_monthly_boss(p_user_id);

  select jsonb_build_object(
    'boss', to_jsonb(b),
    'season', to_jsonb(s),
    'objectives', coalesce((
      select jsonb_agg(to_jsonb(o) order by o.created_at)
      from public.boss_objectives o
      where o.boss_id = b.id
    ), '[]'::jsonb),
    'recentDamage', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.occurred_at desc)
      from (
        select *
        from public.boss_damage_events
        where boss_id = b.id
        order by occurred_at desc
        limit 12
      ) d
    ), '[]'::jsonb),
    'charges', coalesce(c.amount, 0),
    'pendingAttributePoints', public.pending_attribute_points(b.user_id)
  )
  into v_result
  from public.bosses b
  join public.seasons s on s.id = b.season_id
  left join public.boss_charges c on c.user_id = b.user_id and c.season_id = b.season_id
  where b.id = v_boss_id;

  return v_result;
end;
$$;
