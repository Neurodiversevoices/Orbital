/**
 * Orbital Supabase Database Types
 *
 * Auto-generated types for the Orbital database schema.
 * Regenerate with: npx supabase gen types typescript
 */

export type CapacityState = 'green' | 'yellow' | 'red' | 'black';

export interface Database {
  public: {
    Tables: {
      capacity_logs: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          occurred_at: string;
          state: CapacityState;
          tags: string[];
          note: string | null;
          is_demo: boolean;
          deleted_at: string | null;
          local_id: string | null;
          synced_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          occurred_at: string;
          state: CapacityState;
          tags?: string[];
          note?: string | null;
          is_demo?: boolean;
          deleted_at?: string | null;
          local_id?: string | null;
          synced_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          occurred_at?: string;
          state?: CapacityState;
          tags?: string[];
          note?: string | null;
          is_demo?: boolean;
          deleted_at?: string | null;
          local_id?: string | null;
          synced_at?: string;
        };
      };
      user_daily_metrics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          green_count: number;
          yellow_count: number;
          red_count: number;
          black_count: number;
          total_signals: number;
          dominant_state: CapacityState | null;
          computed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          green_count?: number;
          yellow_count?: number;
          red_count?: number;
          black_count?: number;
          total_signals?: number;
          dominant_state?: CapacityState | null;
          computed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          green_count?: number;
          yellow_count?: number;
          red_count?: number;
          black_count?: number;
          total_signals?: number;
          dominant_state?: CapacityState | null;
          computed_at?: string;
        };
      };
      org_memberships: {
        Row: {
          id: string;
          user_id: string;
          org_id: string;
          org_type: 'employer' | 'school_district' | 'university' | 'healthcare' | 'research';
          consent_given_at: string;
          consent_version: string;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          org_id: string;
          org_type: 'employer' | 'school_district' | 'university' | 'healthcare' | 'research';
          consent_given_at?: string;
          consent_version?: string;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          org_id?: string;
          org_type?: 'employer' | 'school_district' | 'university' | 'healthcare' | 'research';
          consent_given_at?: string;
          consent_version?: string;
          revoked_at?: string | null;
          created_at?: string;
        };
      };
      org_aggregate_snapshots: {
        Row: {
          id: string;
          org_id: string;
          period_start: string;
          period_end: string;
          period_type: 'day' | 'week' | 'month';
          contributor_count: number;
          k_threshold: number;
          avg_green_pct: number | null;
          avg_yellow_pct: number | null;
          avg_red_pct: number | null;
          avg_black_pct: number | null;
          green_bucket_low: number | null;
          green_bucket_mid: number | null;
          green_bucket_high: number | null;
          computed_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          period_start: string;
          period_end: string;
          period_type: 'day' | 'week' | 'month';
          contributor_count: number;
          k_threshold?: number;
          avg_green_pct?: number | null;
          avg_yellow_pct?: number | null;
          avg_red_pct?: number | null;
          avg_black_pct?: number | null;
          green_bucket_low?: number | null;
          green_bucket_mid?: number | null;
          green_bucket_high?: number | null;
          computed_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          period_start?: string;
          period_end?: string;
          period_type?: 'day' | 'week' | 'month';
          contributor_count?: number;
          k_threshold?: number;
          avg_green_pct?: number | null;
          avg_yellow_pct?: number | null;
          avg_red_pct?: number | null;
          avg_black_pct?: number | null;
          green_bucket_low?: number | null;
          green_bucket_mid?: number | null;
          green_bucket_high?: number | null;
          computed_at?: string;
        };
      };
      audit_events: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          actor_type: 'user' | 'system' | 'admin' | 'org_admin';
          action: string;
          resource_type: string;
          resource_id: string | null;
          details: Record<string, unknown>;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          actor_type: 'user' | 'system' | 'admin' | 'org_admin';
          action: string;
          resource_type: string;
          resource_id?: string | null;
          details?: Record<string, unknown>;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: never; // Audit log is append-only
      };
      user_preferences: {
        Row: {
          user_id: string;
          share_with_orgs: boolean;
          anonymous_research_opt_in: boolean;
          default_view: string;
          notifications_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          share_with_orgs?: boolean;
          anonymous_research_opt_in?: boolean;
          default_view?: string;
          notifications_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          share_with_orgs?: boolean;
          anonymous_research_opt_in?: boolean;
          default_view?: string;
          notifications_enabled?: boolean;
          updated_at?: string;
        };
      };
    };
    Functions: {
      compute_user_daily_metrics: {
        Args: { p_user_id: string; p_date: string };
        Returns: void;
      };
      compute_org_aggregate: {
        Args: {
          p_org_id: string;
          p_period_start: string;
          p_period_end: string;
          p_period_type: string;
          p_k_threshold?: number;
        };
        Returns: void;
      };
      export_user_data: {
        Args: { p_user_id: string };
        Returns: Record<string, unknown>;
      };
      delete_user_data: {
        Args: { p_user_id: string };
        Returns: void;
      };
    };
  };
}

// Convenience types
export type CapacityLog = Database['public']['Tables']['capacity_logs']['Row'];
export type CapacityLogInsert = Database['public']['Tables']['capacity_logs']['Insert'];
export type UserDailyMetrics = Database['public']['Tables']['user_daily_metrics']['Row'];
export type OrgMembership = Database['public']['Tables']['org_memberships']['Row'];
export type OrgAggregateSnapshot = Database['public']['Tables']['org_aggregate_snapshots']['Row'];
export type AuditEvent = Database['public']['Tables']['audit_events']['Row'];
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];

// Sync types
export interface SyncStatus {
  lastSyncAt: Date | null;
  pendingCount: number;
  isSyncing: boolean;
  error: string | null;
}

export interface LocalCapacityLog {
  localId: string;
  occurredAt: Date;
  state: CapacityState;
  tags: string[];
  note: string | null;
  isDemo: boolean;
  syncedAt: Date | null;
  cloudId: string | null;
}
