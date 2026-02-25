-- =============================================================================
-- Migration 00007: Circles — Cloud-backed Circle membership
-- =============================================================================
-- Moves Circle data from local-only AsyncStorage to Supabase so that:
-- 1. Circle CCI Pro-member verification can query real membership
-- 2. Circle signals can sync across devices
-- 3. Invite/accept flow works server-side
--
-- Respects the Six Laws:
-- L1: NO AGGREGATION — max 25 members enforced by CHECK constraint
-- L3: BIDIRECTIONAL CONSENT — status lifecycle (pending → active → revoked)
-- L5: NO HIERARCHY — no admin column, all members are peers
-- =============================================================================

-- =============================================================================
-- CIRCLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT, -- optional display hint, not required
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  max_members INTEGER NOT NULL DEFAULT 25 CHECK (max_members <= 25),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circles_created_by ON circles(created_by);

ALTER TABLE circles ENABLE ROW LEVEL SECURITY;

-- Members of a circle can read it
CREATE POLICY "Circle members can read circle"
  ON circles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM circle_members
      WHERE circle_members.circle_id = circles.id
        AND circle_members.user_id = auth.uid()
        AND circle_members.status = 'active'
    )
    OR circles.created_by = auth.uid()
  );

-- Only authenticated users can create circles
CREATE POLICY "Authenticated users can create circles"
  ON circles FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Creator can update (e.g. archive)
CREATE POLICY "Creator can update circle"
  ON circles FOR UPDATE
  USING (auth.uid() = created_by);

-- =============================================================================
-- CIRCLE MEMBERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revoked', 'blocked')),
  joined_at TIMESTAMPTZ,
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

CREATE INDEX idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX idx_circle_members_user_id ON circle_members(user_id);
CREATE INDEX idx_circle_members_status ON circle_members(circle_id, status);

ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

-- Members can read other members of circles they belong to
CREATE POLICY "Members can read fellow members"
  ON circle_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM circle_members AS my_membership
      WHERE my_membership.circle_id = circle_members.circle_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.status = 'active'
    )
    OR circle_members.user_id = auth.uid()
  );

-- Users can insert themselves (accept invite)
CREATE POLICY "Users can join circles"
  ON circle_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own membership (revoke, etc.)
CREATE POLICY "Users can update own membership"
  ON circle_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Circle creator can invite (insert other members as pending)
CREATE POLICY "Creator can invite members"
  ON circle_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM circles
      WHERE circles.id = circle_members.circle_id
        AND circles.created_by = auth.uid()
    )
  );

-- =============================================================================
-- CIRCLE INVITES (ephemeral tokens for the handshake)
-- =============================================================================

CREATE TABLE IF NOT EXISTS circle_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_hint TEXT, -- optional display hint
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circle_invites_token ON circle_invites(token);
CREATE INDEX idx_circle_invites_circle ON circle_invites(circle_id);

ALTER TABLE circle_invites ENABLE ROW LEVEL SECURITY;

-- Inviter can read their own invites
CREATE POLICY "Inviter can read own invites"
  ON circle_invites FOR SELECT
  USING (auth.uid() = inviter_id);

-- Anyone authenticated can read an invite by token (to accept it)
CREATE POLICY "Anyone can read invite by token"
  ON circle_invites FOR SELECT
  USING (TRUE); -- token lookup; invite acceptance validates server-side

-- Members of the circle can create invites
CREATE POLICY "Circle members can create invites"
  ON circle_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM circle_members
      WHERE circle_members.circle_id = circle_invites.circle_id
        AND circle_members.user_id = auth.uid()
        AND circle_members.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM circles
      WHERE circles.id = circle_invites.circle_id
        AND circles.created_by = auth.uid()
    )
  );

-- Inviter can update (mark used)
CREATE POLICY "Inviter can update invite"
  ON circle_invites FOR UPDATE
  USING (auth.uid() = inviter_id);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_circles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER circles_updated_at
  BEFORE UPDATE ON circles
  FOR EACH ROW
  EXECUTE FUNCTION update_circles_updated_at();

CREATE OR REPLACE FUNCTION update_circle_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER circle_members_updated_at
  BEFORE UPDATE ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION update_circle_members_updated_at();

-- =============================================================================
-- HELPER: Count active members in a circle (for L1 enforcement)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_circle_member_count(p_circle_id UUID)
RETURNS TABLE(active_members BIGINT, pending_members BIGINT, max_members INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE cm.status = 'active') AS active_members,
    COUNT(*) FILTER (WHERE cm.status = 'pending') AS pending_members,
    c.max_members
  FROM circles c
  LEFT JOIN circle_members cm ON cm.circle_id = c.id AND cm.status != 'revoked' AND cm.status != 'blocked'
  WHERE c.id = p_circle_id
  GROUP BY c.max_members;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ENFORCE MAX MEMBER LIMIT (L1: NO AGGREGATION)
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_circle_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  circle_max INTEGER;
BEGIN
  IF NEW.status IN ('active', 'pending') THEN
    SELECT COUNT(*), c.max_members INTO current_count, circle_max
    FROM circle_members cm
    JOIN circles c ON c.id = cm.circle_id
    WHERE cm.circle_id = NEW.circle_id
      AND cm.status IN ('active', 'pending')
      AND cm.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    GROUP BY c.max_members;

    IF current_count >= COALESCE(circle_max, 25) THEN
      RAISE EXCEPTION 'L1_NO_AGGREGATION: Circle member limit (%) reached', circle_max;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_circle_limit
  BEFORE INSERT OR UPDATE ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_circle_member_limit();
