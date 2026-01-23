-- =============================================================================
-- User Entitlements Table
-- Stores purchased entitlements per user, replaces AsyncStorage for persistence
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_id TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = never expires (lifetime/one-time purchases)
  source TEXT NOT NULL DEFAULT 'purchase', -- 'purchase', 'gift', 'trial', 'admin'
  purchase_id TEXT, -- Reference to purchase intent ID
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, entitlement_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_entitlements_user_id ON user_entitlements(user_id);
CREATE INDEX idx_user_entitlements_entitlement_id ON user_entitlements(entitlement_id);

-- Enable RLS
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;

-- Users can read their own entitlements
CREATE POLICY "Users can read own entitlements"
  ON user_entitlements FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own entitlements (for checkout flow)
CREATE POLICY "Users can insert own entitlements"
  ON user_entitlements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own entitlements (for renewals)
CREATE POLICY "Users can update own entitlements"
  ON user_entitlements FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_entitlements_updated_at
  BEFORE UPDATE ON user_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_user_entitlements_updated_at();

-- =============================================================================
-- Purchase History Table (audit trail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL, -- cents
  billing_cycle TEXT NOT NULL, -- 'monthly', 'annual', 'one_time'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  entitlement_granted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Index for user purchase lookups
CREATE INDEX idx_purchase_history_user_id ON purchase_history(user_id);

-- Enable RLS
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

-- Users can read their own purchase history
CREATE POLICY "Users can read own purchases"
  ON purchase_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own purchases
CREATE POLICY "Users can insert own purchases"
  ON purchase_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own purchases (for status updates)
CREATE POLICY "Users can update own purchases"
  ON purchase_history FOR UPDATE
  USING (auth.uid() = user_id);
