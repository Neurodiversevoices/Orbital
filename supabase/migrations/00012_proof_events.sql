CREATE TABLE IF NOT EXISTS proof_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  tracking_start TIMESTAMPTZ DEFAULT now(),
  tracking_end TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE proof_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own proof events"
  ON proof_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proof events"
  ON proof_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proof events"
  ON proof_events FOR UPDATE
  USING (auth.uid() = user_id);
