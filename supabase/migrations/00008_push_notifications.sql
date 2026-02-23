-- =============================================================================
-- Migration 00008: Push Notification Backend
-- =============================================================================
-- Adds:
-- 1. user_push_tokens table (Expo push tokens per device)
-- 2. notification_log table (audit trail of sent notifications)
-- 3. RLS policies
-- 4. Helper function to get active tokens for a user
--
-- When the next binary ships with expo-notifications, the client
-- registers tokens via the API route. This table is ready to receive them.
-- =============================================================================

-- =============================================================================
-- USER PUSH TOKENS
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id TEXT, -- optional device fingerprint for dedup
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, expo_push_token)
);

CREATE INDEX idx_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON user_push_tokens(user_id, active) WHERE active = TRUE;

ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own tokens
CREATE POLICY "Users can read own push tokens"
  ON user_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Users can register new tokens
CREATE POLICY "Users can insert own push tokens"
  ON user_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens (deactivate old devices)
CREATE POLICY "Users can update own push tokens"
  ON user_push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete own push tokens"
  ON user_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- NOTIFICATION LOG (audit trail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (
    notification_type IN ('daily_reminder', 'milestone', 'streak', 'cci_ready', 'system')
  ),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  expo_ticket_id TEXT, -- Expo Push API ticket ID for delivery tracking
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'dropped')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_log_user ON notification_log(user_id, created_at DESC);
CREATE INDEX idx_notification_log_type ON notification_log(notification_type, created_at DESC);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own notification history
CREATE POLICY "Users can read own notifications"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- No user INSERT — server-side only (via service role)

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

-- =============================================================================
-- HELPER: Get active push tokens for a user
-- =============================================================================

CREATE OR REPLACE FUNCTION get_active_push_tokens(p_user_id UUID)
RETURNS TABLE(expo_push_token TEXT, platform TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT upt.expo_push_token, upt.platform
  FROM user_push_tokens upt
  WHERE upt.user_id = p_user_id
    AND upt.active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
