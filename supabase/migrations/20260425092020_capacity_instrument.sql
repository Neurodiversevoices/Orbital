-- Orbital Capacity Instrument tables (idempotent)
-- Capacity language only; no medical claims.

create extension if not exists "pgcrypto";

-- 1) capacity_logs (already exists — add missing columns only)
create table if not exists public.capacity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz default now()
);
alter table public.capacity_logs add column if not exists capacity_score numeric;
alter table public.capacity_logs add column if not exists state text;
alter table public.capacity_logs add column if not exists drift numeric;
alter table public.capacity_logs add column if not exists rolling_24h_avg numeric;
alter table public.capacity_logs add column if not exists factors jsonb default '{}'::jsonb;
alter table public.capacity_logs add column if not exists source text default 'orbital';

-- 2) health_inputs (new)
create table if not exists public.health_inputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz default now()
);
alter table public.health_inputs add column if not exists steps integer;
alter table public.health_inputs add column if not exists heart_rate_avg numeric;
alter table public.health_inputs add column if not exists sleep_minutes integer;
alter table public.health_inputs add column if not exists resting_heart_rate numeric;
alter table public.health_inputs add column if not exists hrv numeric;
alter table public.health_inputs add column if not exists stand_minutes integer;
alter table public.health_inputs add column if not exists mindful_minutes integer;
alter table public.health_inputs add column if not exists workout_minutes integer;
alter table public.health_inputs add column if not exists raw_payload jsonb default '{}'::jsonb;
alter table public.health_inputs add column if not exists captured_at timestamptz;

-- 3) pattern_history (new)
create table if not exists public.pattern_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz default now()
);
alter table public.pattern_history add column if not exists "window" text;
alter table public.pattern_history add column if not exists capacity_avg numeric;
alter table public.pattern_history add column if not exists volatility numeric;
alter table public.pattern_history add column if not exists top_factors jsonb default '[]'::jsonb;
alter table public.pattern_history add column if not exists trend text;
alter table public.pattern_history add column if not exists summary text;

-- RLS
alter table public.capacity_logs   enable row level security;
alter table public.health_inputs   enable row level security;
alter table public.pattern_history enable row level security;

-- Policies (idempotent drop+create)
do $$ declare tbl text; begin
  foreach tbl in array array['capacity_logs','health_inputs','pattern_history'] loop
    execute format('drop policy if exists "%s_select" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s_insert" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s_update" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s_delete" on public.%I', tbl, tbl);
  end loop;
end $$;

create policy "capacity_logs_select"   on public.capacity_logs   for select using (auth.uid() = user_id);
create policy "capacity_logs_insert"   on public.capacity_logs   for insert with check (auth.uid() = user_id);
create policy "capacity_logs_update"   on public.capacity_logs   for update using (auth.uid() = user_id);
create policy "capacity_logs_delete"   on public.capacity_logs   for delete using (auth.uid() = user_id);

create policy "health_inputs_select"   on public.health_inputs   for select using (auth.uid() = user_id);
create policy "health_inputs_insert"   on public.health_inputs   for insert with check (auth.uid() = user_id);
create policy "health_inputs_update"   on public.health_inputs   for update using (auth.uid() = user_id);
create policy "health_inputs_delete"   on public.health_inputs   for delete using (auth.uid() = user_id);

create policy "pattern_history_select" on public.pattern_history for select using (auth.uid() = user_id);
create policy "pattern_history_insert" on public.pattern_history for insert with check (auth.uid() = user_id);
create policy "pattern_history_update" on public.pattern_history for update using (auth.uid() = user_id);
create policy "pattern_history_delete" on public.pattern_history for delete using (auth.uid() = user_id);

-- Indexes
create index if not exists capacity_logs_user_created    on public.capacity_logs   (user_id, created_at desc);
create index if not exists health_inputs_user_captured   on public.health_inputs   (user_id, captured_at desc);
create index if not exists pattern_history_user_window   on public.pattern_history (user_id, "window", created_at desc);
