-- Phase 6: narrative/AI scaffolding.
-- The app must keep working without an AI provider, so these tables store
-- configuration, auditable generation attempts, and fallback/manual beats.

alter table public.narrative_beats
  add column if not exists title text,
  add column if not exists meta jsonb not null default '{}'::jsonb;

create index if not exists narrative_beats_story_order_idx
  on public.narrative_beats(user_id, season_id, created_at desc);

create table if not exists public.season_story_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  theme_seed text,
  preset text not null default 'mensal',
  starts_on date,
  ends_on date,
  ai_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id)
);

create table if not exists public.narrative_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  boss_id uuid references public.bosses(id) on delete cascade,
  layer integer not null check (layer between 1 and 4),
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed', 'fallback')),
  model text,
  prompt jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists narrative_generation_jobs_lookup_idx
  on public.narrative_generation_jobs(user_id, season_id, boss_id, layer, created_at desc);

alter table public.season_story_settings enable row level security;
alter table public.narrative_generation_jobs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'season_story_settings' and policyname = 'season_story_settings_user_all') then
    create policy season_story_settings_user_all on public.season_story_settings
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'narrative_generation_jobs' and policyname = 'narrative_generation_jobs_user_all') then
    create policy narrative_generation_jobs_user_all on public.narrative_generation_jobs
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
