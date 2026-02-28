CREATE TABLE IF NOT EXISTS capacity_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT now(),
  data_window_start TIMESTAMPTZ NOT NULL,
  data_window_end TIMESTAMPTZ NOT NULL,
  log_count INTEGER NOT NULL,
  baseline_capacity FLOAT,
  variability_index FLOAT,
  sensory_tolerance FLOAT,
  cognitive_resilience FLOAT,
  recovery_pattern JSONB DEFAULT '{}',
  dominant_drivers JSONB DEFAULT '{}',
  confidence_score FLOAT,
  version TEXT DEFAULT '1.0'
);

-- RLS
ALTER TABLE capacity_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own baselines"
  ON capacity_baselines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own baselines"
  ON capacity_baselines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own baselines"
  ON capacity_baselines FOR UPDATE
  USING (auth.uid() = user_id);
