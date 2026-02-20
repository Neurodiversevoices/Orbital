-- =============================================================================
-- Migration 00006: Bundle Seat Management + Stripe Customer Mapping
-- =============================================================================
-- Adds:
-- 1. bundles table (owner, type, max_seats, stripe subscription link)
-- 2. bundle_seats table (invited/active/removed seats)
-- 3. stripe_customers table (maps Supabase user_id → Stripe customer_id)
-- 4. RLS policies for all tables
-- 5. Add stripe_customer_id and stripe_subscription_id to purchase_history
-- =============================================================================

-- =============================================================================
-- BUNDLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bundle_type TEXT NOT NULL CHECK (bundle_type IN ('10_seat', '15_seat', '20_seat')),
  max_seats INTEGER NOT NULL CHECK (max_seats IN (10, 15, 20)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bundles_owner_id ON bundles(owner_id);
CREATE INDEX idx_bundles_stripe_sub ON bundles(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

-- Owner can read/update their own bundles
CREATE POLICY "Bundle owners can read own bundles"
  ON bundles FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Bundle owners can update own bundles"
  ON bundles FOR UPDATE
  USING (auth.uid() = owner_id);

-- Service role inserts bundles (via webhook)
-- No INSERT policy for users — bundles are created server-side on payment

-- =============================================================================
-- BUNDLE SEATS
-- =============================================================================

CREATE TABLE IF NOT EXISTS bundle_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bundle_id, user_id)
);

CREATE INDEX idx_bundle_seats_bundle_id ON bundle_seats(bundle_id);
CREATE INDEX idx_bundle_seats_user_id ON bundle_seats(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_bundle_seats_email ON bundle_seats(invited_email) WHERE invited_email IS NOT NULL;

ALTER TABLE bundle_seats ENABLE ROW LEVEL SECURITY;

-- Bundle owner can manage seats
CREATE POLICY "Bundle owners can read seats"
  ON bundle_seats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bundles WHERE bundles.id = bundle_seats.bundle_id AND bundles.owner_id = auth.uid()
    )
  );

CREATE POLICY "Bundle owners can insert seats"
  ON bundle_seats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bundles WHERE bundles.id = bundle_seats.bundle_id AND bundles.owner_id = auth.uid()
    )
  );

CREATE POLICY "Bundle owners can update seats"
  ON bundle_seats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bundles WHERE bundles.id = bundle_seats.bundle_id AND bundles.owner_id = auth.uid()
    )
  );

-- Seated users can read their own seat
CREATE POLICY "Users can read own seat"
  ON bundle_seats FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================================================
-- STRIPE CUSTOMERS (maps Supabase users → Stripe customer IDs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- Users can read their own Stripe mapping
CREATE POLICY "Users can read own stripe customer"
  ON stripe_customers FOR SELECT
  USING (auth.uid() = user_id);

-- No user INSERT/UPDATE — managed server-side only

-- =============================================================================
-- ADD STRIPE COLUMNS TO PURCHASE HISTORY
-- =============================================================================

ALTER TABLE purchase_history
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_bundles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bundles_updated_at
  BEFORE UPDATE ON bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_bundles_updated_at();

CREATE OR REPLACE FUNCTION update_bundle_seats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bundle_seats_updated_at
  BEFORE UPDATE ON bundle_seats
  FOR EACH ROW
  EXECUTE FUNCTION update_bundle_seats_updated_at();

-- =============================================================================
-- HELPER: Count active seats in a bundle
-- =============================================================================

CREATE OR REPLACE FUNCTION get_bundle_seat_count(p_bundle_id UUID)
RETURNS TABLE(active_seats BIGINT, pending_seats BIGINT, max_seats INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE bs.status = 'active') AS active_seats,
    COUNT(*) FILTER (WHERE bs.status = 'pending') AS pending_seats,
    b.max_seats
  FROM bundles b
  LEFT JOIN bundle_seats bs ON bs.bundle_id = b.id AND bs.status != 'removed'
  WHERE b.id = p_bundle_id
  GROUP BY b.max_seats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
