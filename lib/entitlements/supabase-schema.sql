-- =============================================================================
-- Orbital Entitlements Schema
-- Run this migration in your Supabase SQL Editor
-- =============================================================================

-- Create user_entitlements table
CREATE TABLE IF NOT EXISTS user_entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  entitlements JSONB NOT NULL DEFAULT '[]'::jsonb,
  circle_id TEXT,
  bundle_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON user_entitlements(user_id);

-- Create index on circle_id for group queries
CREATE INDEX IF NOT EXISTS idx_user_entitlements_circle_id ON user_entitlements(circle_id) WHERE circle_id IS NOT NULL;

-- Create index on bundle_id for group queries
CREATE INDEX IF NOT EXISTS idx_user_entitlements_bundle_id ON user_entitlements(bundle_id) WHERE bundle_id IS NOT NULL;

-- Create purchase_history table for audit trail
CREATE TABLE IF NOT EXISTS purchase_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  stripe_payment_intent_id TEXT,
  entitlement_granted TEXT NOT NULL,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user purchase history
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON purchase_history(user_id);

-- Create index for Stripe session lookups (for idempotency)
CREATE INDEX IF NOT EXISTS idx_purchase_history_stripe_session ON purchase_history(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own entitlements
CREATE POLICY "Users can read own entitlements" ON user_entitlements
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Policy: Only service role can modify entitlements (webhooks/API)
CREATE POLICY "Service role can modify entitlements" ON user_entitlements
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Users can read their own purchase history
CREATE POLICY "Users can read own purchase history" ON purchase_history
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Policy: Only service role can insert purchase history
CREATE POLICY "Service role can insert purchase history" ON purchase_history
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_entitlements_updated_at
  BEFORE UPDATE ON user_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
