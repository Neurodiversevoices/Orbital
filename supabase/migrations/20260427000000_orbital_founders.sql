-- Orbital Founder Year ($99) — tracking table
-- Separate from CCI Founding flow (purchase_history + user_entitlements)

CREATE SEQUENCE IF NOT EXISTS founders_position_seq START 1 MAXVALUE 100;

CREATE TABLE IF NOT EXISTS founders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  position int,  -- assigned post-payment via nextval('founders_position_seq')
  is_paid boolean NOT NULL DEFAULT false,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  paid_at timestamptz,
  amount_cents int,  -- must be 9900 for $99
  source text DEFAULT 'landing',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS founders_email_unique ON founders (lower(email));

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_founders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS founders_updated_at_trigger ON founders;
CREATE TRIGGER founders_updated_at_trigger
  BEFORE UPDATE ON founders
  FOR EACH ROW EXECUTE FUNCTION update_founders_updated_at();

-- RLS
ALTER TABLE founders ENABLE ROW LEVEL SECURITY;

-- anon can INSERT (rate limited at app layer)
DROP POLICY IF EXISTS "founders_anon_insert" ON founders;
CREATE POLICY "founders_anon_insert" ON founders
  FOR INSERT TO anon WITH CHECK (true);

-- service_role gets everything
DROP POLICY IF EXISTS "founders_service_role_all" ON founders;
CREATE POLICY "founders_service_role_all" ON founders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public aggregate view — anon can read count only, never PII
CREATE OR REPLACE VIEW founders_public_count
  WITH (security_invoker = false)
  AS
  SELECT
    count(*) FILTER (WHERE is_paid = true) AS paid_count,
    greatest(0, 100 - count(*) FILTER (WHERE is_paid = true))::int AS slots_remaining
  FROM founders;

GRANT SELECT ON founders_public_count TO anon;

-- RPC: assign_founder_position (called from stripe-webhook after payment confirmed)
CREATE OR REPLACE FUNCTION assign_founder_position(p_email text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_position int;
BEGIN
  SELECT nextval('founders_position_seq') INTO v_position;
  UPDATE founders SET position = v_position WHERE lower(email) = lower(p_email);
  RETURN v_position;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_founder_position(text) TO service_role;

-- Fix: add plain UNIQUE constraint on email (functional index alone doesn't work with supabase-js upsert)
ALTER TABLE founders DROP CONSTRAINT IF EXISTS founders_email_unique_plain;
ALTER TABLE founders ADD CONSTRAINT founders_email_unique_plain UNIQUE (email);
