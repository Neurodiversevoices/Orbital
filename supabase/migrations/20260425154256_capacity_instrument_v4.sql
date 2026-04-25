-- Capacity Instrument v4 schema (idempotent, RLS-enforced)
-- Orbital project: tenfwzjccqfecctxdbpi

CREATE TABLE IF NOT EXISTS public.capacity_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL DEFAULT now(),
  state text NOT NULL CHECK (state IN ('RESOURCED','ELEVATED','DEPLETED')),
  score numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_capacity_obs_user_time
  ON public.capacity_observations (user_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS public.signal_daily_normalized (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  signal_key text NOT NULL,
  z_value numeric(8,4),
  imputed boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'healthkit',
  UNIQUE (user_id, day, signal_key)
);
CREATE INDEX IF NOT EXISTS idx_sdn_user_day
  ON public.signal_daily_normalized (user_id, day DESC);

CREATE TABLE IF NOT EXISTS public.user_capacity_baseline (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rolling_window_days int NOT NULL DEFAULT 30,
  median_score numeric(5,2),
  mad numeric(5,2),
  typical_low numeric(5,2),
  typical_high numeric(5,2),
  computed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.capacity_observations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_daily_normalized  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_capacity_baseline   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS capacity_obs_select_own ON public.capacity_observations;
CREATE POLICY capacity_obs_select_own ON public.capacity_observations
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS capacity_obs_insert_own ON public.capacity_observations;
CREATE POLICY capacity_obs_insert_own ON public.capacity_observations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS capacity_obs_update_own ON public.capacity_observations;
CREATE POLICY capacity_obs_update_own ON public.capacity_observations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS capacity_obs_delete_own ON public.capacity_observations;
CREATE POLICY capacity_obs_delete_own ON public.capacity_observations
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sdn_select_own ON public.signal_daily_normalized;
CREATE POLICY sdn_select_own ON public.signal_daily_normalized
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS sdn_upsert_own ON public.signal_daily_normalized;
CREATE POLICY sdn_upsert_own ON public.signal_daily_normalized
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS baseline_select_own ON public.user_capacity_baseline;
CREATE POLICY baseline_select_own ON public.user_capacity_baseline
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS baseline_upsert_own ON public.user_capacity_baseline;
CREATE POLICY baseline_upsert_own ON public.user_capacity_baseline
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
