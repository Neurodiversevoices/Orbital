-- Orbital User Demographics
-- Migration: 00002_user_demographics
-- Created: 2025-01-07
--
-- PRIVACY GUARANTEES:
-- 1. Demographics NEVER appear in Circles or social features
-- 2. Demographics NEVER affect pricing/eligibility/access
-- 3. Demographics used ONLY in k-anonymous (K>=10) aggregate analytics
-- 4. Self-described text is NEVER displayed or aggregated

-- =============================================================================
-- GENDER ENUM
-- =============================================================================

CREATE TYPE gender_choice AS ENUM (
    'woman',
    'man',
    'non_binary',
    'self_described',
    'unspecified'
);

-- =============================================================================
-- USER PROFILE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Year of birth (YYYY format only)
    -- Used to compute age brackets dynamically
    -- Never expose exact age publicly
    year_of_birth INTEGER CHECK (
        year_of_birth IS NULL OR
        (year_of_birth >= 1900 AND year_of_birth <= EXTRACT(YEAR FROM CURRENT_DATE))
    ),

    -- Gender selection
    gender_choice gender_choice DEFAULT 'unspecified',

    -- Free-text for self-described (NEVER displayed or aggregated)
    gender_self_described TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for aggregate queries (only on non-identifying columns)
CREATE INDEX idx_user_profiles_demographics ON user_profiles(year_of_birth, gender_choice)
    WHERE year_of_birth IS NOT NULL OR gender_choice != 'unspecified';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profile
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Compute age bracket from year of birth
CREATE OR REPLACE FUNCTION compute_age_bracket(p_year_of_birth INTEGER)
RETURNS TEXT AS $$
DECLARE
    v_age INTEGER;
BEGIN
    IF p_year_of_birth IS NULL THEN
        RETURN NULL;
    END IF;

    v_age := EXTRACT(YEAR FROM CURRENT_DATE) - p_year_of_birth;

    IF v_age <= 5 THEN RETURN '0-5';
    ELSIF v_age <= 9 THEN RETURN '6-9';
    ELSIF v_age <= 13 THEN RETURN '10-13';
    ELSIF v_age <= 18 THEN RETURN '14-18';
    ELSIF v_age <= 24 THEN RETURN '19-24';
    ELSIF v_age <= 30 THEN RETURN '25-30';
    ELSIF v_age <= 40 THEN RETURN '31-40';
    ELSIF v_age <= 50 THEN RETURN '41-50';
    ELSIF v_age <= 60 THEN RETURN '51-60';
    ELSE RETURN '60+';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get demographic aggregate for an org with k-anonymity enforcement
CREATE OR REPLACE FUNCTION get_org_demographic_breakdown(
    p_org_id TEXT,
    p_period_start DATE,
    p_period_end DATE,
    p_k_threshold INTEGER DEFAULT 10
)
RETURNS TABLE (
    dimension TEXT,
    bucket TEXT,
    contributor_count INTEGER,
    avg_green_pct NUMERIC(5,2),
    is_suppressed BOOLEAN
) AS $$
BEGIN
    -- Age bracket breakdown
    RETURN QUERY
    WITH user_metrics AS (
        SELECT
            cl.user_id,
            compute_age_bracket(up.year_of_birth) as age_bracket,
            COUNT(*) FILTER (WHERE cl.state = 'green')::NUMERIC / NULLIF(COUNT(*), 0) * 100 as green_pct
        FROM capacity_logs cl
        JOIN org_memberships om ON cl.user_id = om.user_id
        LEFT JOIN user_profiles up ON cl.user_id = up.user_id
        WHERE om.org_id = p_org_id
          AND om.revoked_at IS NULL
          AND cl.occurred_at >= p_period_start
          AND cl.occurred_at < p_period_end + INTERVAL '1 day'
          AND cl.deleted_at IS NULL
          AND cl.is_demo = FALSE
        GROUP BY cl.user_id, up.year_of_birth
    )
    SELECT
        'age_bracket'::TEXT as dimension,
        COALESCE(age_bracket, 'unspecified') as bucket,
        COUNT(*)::INTEGER as contributor_count,
        CASE WHEN COUNT(*) >= p_k_threshold THEN AVG(green_pct)::NUMERIC(5,2) ELSE NULL END as avg_green_pct,
        COUNT(*) < p_k_threshold as is_suppressed
    FROM user_metrics
    GROUP BY age_bracket
    HAVING age_bracket IS NOT NULL OR COUNT(*) > 0;

    -- Gender breakdown
    RETURN QUERY
    WITH user_metrics AS (
        SELECT
            cl.user_id,
            COALESCE(up.gender_choice, 'unspecified')::TEXT as gender,
            COUNT(*) FILTER (WHERE cl.state = 'green')::NUMERIC / NULLIF(COUNT(*), 0) * 100 as green_pct
        FROM capacity_logs cl
        JOIN org_memberships om ON cl.user_id = om.user_id
        LEFT JOIN user_profiles up ON cl.user_id = up.user_id
        WHERE om.org_id = p_org_id
          AND om.revoked_at IS NULL
          AND cl.occurred_at >= p_period_start
          AND cl.occurred_at < p_period_end + INTERVAL '1 day'
          AND cl.deleted_at IS NULL
          AND cl.is_demo = FALSE
        GROUP BY cl.user_id, up.gender_choice
    )
    SELECT
        'gender'::TEXT as dimension,
        -- Never expose 'self_described' text, just the category
        CASE WHEN gender = 'self_described' THEN 'self_described' ELSE gender END as bucket,
        COUNT(*)::INTEGER as contributor_count,
        CASE WHEN COUNT(*) >= p_k_threshold THEN AVG(green_pct)::NUMERIC(5,2) ELSE NULL END as avg_green_pct,
        COUNT(*) < p_k_threshold as is_suppressed
    FROM user_metrics
    GROUP BY gender;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATE user_preferences TO EXCLUDE DEMOGRAPHICS FROM SYNC
-- =============================================================================

-- Demographics are stored in user_profiles, NOT in user_preferences
-- This ensures they're never accidentally synced to social features

-- =============================================================================
-- AUDIT
-- =============================================================================

-- Log profile updates
CREATE OR REPLACE FUNCTION trigger_audit_user_profiles()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_events (user_id, actor_type, action, resource_type, resource_id, details)
    VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        'user',
        TG_OP,
        'user_profile',
        COALESCE(NEW.user_id, OLD.user_id)::TEXT,
        jsonb_build_object(
            'fields_updated', CASE TG_OP
                WHEN 'INSERT' THEN ARRAY['year_of_birth', 'gender_choice']
                WHEN 'UPDATE' THEN ARRAY(
                    SELECT unnest(ARRAY[
                        CASE WHEN OLD.year_of_birth IS DISTINCT FROM NEW.year_of_birth THEN 'year_of_birth' END,
                        CASE WHEN OLD.gender_choice IS DISTINCT FROM NEW.gender_choice THEN 'gender_choice' END
                    ]) WHERE unnest IS NOT NULL
                )
                ELSE '{}'
            END
        )
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_user_profiles_audit
    AFTER INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_user_profiles();

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION compute_age_bracket TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_demographic_breakdown TO service_role;
