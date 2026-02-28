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
          capacity_value: number | null;
          driver_data: Record<string, number> | null;
          confidence_flags: Record<string, unknown>;
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
          capacity_value?: number | null;
          driver_data?: Record<string, number> | null;
          confidence_flags?: Record<string, unknown>;
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
          capacity_value?: number | null;
          driver_data?: Record<string, number> | null;
          confidence_flags?: Record<string, unknown>;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Update: Record<string, never>; // Audit log is append-only
        Relationships: [];
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
        Relationships: [];
      };
      user_entitlements: {
        Row: {
          id: string;
          user_id: string;
          entitlement_id: string;
          source: string;
          purchase_id: string | null;
          granted_at: string;
          expires_at: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entitlement_id: string;
          source?: string;
          purchase_id?: string | null;
          granted_at?: string;
          expires_at?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entitlement_id?: string;
          source?: string;
          purchase_id?: string | null;
          granted_at?: string;
          expires_at?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restricted_domains: {
        Row: {
          id: string;
          domain: string;
          organization_name: string;
          enforcement_level: 'block_all' | 'redirect_sso' | 'contact_sales';
          sso_endpoint: string | null;
          sales_contact_url: string | null;
          added_by: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          domain: string;
          organization_name: string;
          enforcement_level: 'block_all' | 'redirect_sso' | 'contact_sales';
          sso_endpoint?: string | null;
          sales_contact_url?: string | null;
          added_by: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          domain?: string;
          organization_name?: string;
          enforcement_level?: 'block_all' | 'redirect_sso' | 'contact_sales';
          sso_endpoint?: string | null;
          sales_contact_url?: string | null;
          added_by?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      purchase_history: {
        Row: {
          id: string;
          user_id: string;
          purchase_id: string;
          product_id: string;
          product_name: string;
          price: number;
          billing_cycle: string;
          status: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          purchase_id: string;
          product_id: string;
          product_name: string;
          price: number;
          billing_cycle: string;
          status: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          purchase_id?: string;
          product_id?: string;
          product_name?: string;
          price?: number;
          billing_cycle?: string;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      circles: {
        Row: {
          id: string;
          created_by: string;
          name: string | null;
          status: 'active' | 'archived';
          max_members: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          name?: string | null;
          status?: 'active' | 'archived';
          max_members?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          name?: string | null;
          status?: 'active' | 'archived';
          max_members?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      circle_members: {
        Row: {
          id: string;
          circle_id: string;
          user_id: string;
          invited_by: string | null;
          status: 'pending' | 'active' | 'revoked' | 'blocked';
          joined_at: string | null;
          status_changed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          circle_id: string;
          user_id: string;
          invited_by?: string | null;
          status?: 'pending' | 'active' | 'revoked' | 'blocked';
          joined_at?: string | null;
          status_changed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          circle_id?: string;
          user_id?: string;
          invited_by?: string | null;
          status?: 'pending' | 'active' | 'revoked' | 'blocked';
          joined_at?: string | null;
          status_changed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      circle_invites: {
        Row: {
          id: string;
          circle_id: string;
          token: string;
          inviter_id: string;
          target_hint: string | null;
          expires_at: string;
          used: boolean;
          used_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          circle_id: string;
          token: string;
          inviter_id: string;
          target_hint?: string | null;
          expires_at: string;
          used?: boolean;
          used_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          circle_id?: string;
          token?: string;
          inviter_id?: string;
          target_hint?: string | null;
          expires_at?: string;
          used?: boolean;
          used_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_push_tokens: {
        Row: {
          id: string;
          user_id: string;
          expo_push_token: string;
          platform: 'ios' | 'android' | 'web';
          device_id: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expo_push_token: string;
          platform: 'ios' | 'android' | 'web';
          device_id?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expo_push_token?: string;
          platform?: 'ios' | 'android' | 'web';
          device_id?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      capacity_baselines: {
        Row: {
          id: string;
          user_id: string;
          computed_at: string;
          data_window_start: string;
          data_window_end: string;
          log_count: number;
          baseline_capacity: number | null;
          variability_index: number | null;
          sensory_tolerance: number | null;
          cognitive_resilience: number | null;
          recovery_pattern: Record<string, unknown>;
          dominant_drivers: Record<string, unknown>;
          confidence_score: number | null;
          version: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          computed_at?: string;
          data_window_start: string;
          data_window_end: string;
          log_count: number;
          baseline_capacity?: number | null;
          variability_index?: number | null;
          sensory_tolerance?: number | null;
          cognitive_resilience?: number | null;
          recovery_pattern?: Record<string, unknown>;
          dominant_drivers?: Record<string, unknown>;
          confidence_score?: number | null;
          version?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          computed_at?: string;
          data_window_start?: string;
          data_window_end?: string;
          log_count?: number;
          baseline_capacity?: number | null;
          variability_index?: number | null;
          sensory_tolerance?: number | null;
          cognitive_resilience?: number | null;
          recovery_pattern?: Record<string, unknown>;
          dominant_drivers?: Record<string, unknown>;
          confidence_score?: number | null;
          version?: string;
        };
        Relationships: [];
      };
      proof_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          event_type: string;
          event_date: string;
          tracking_start: string;
          tracking_end: string | null;
          status: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          event_type: string;
          event_date: string;
          tracking_start?: string;
          tracking_end?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          event_type?: string;
          event_date?: string;
          tracking_start?: string;
          tracking_end?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
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
      get_circle_member_count: {
        Args: { p_circle_id: string };
        Returns: { active_members: number; pending_members: number; max_members: number }[];
      };
      get_bundle_seat_count: {
        Args: { p_bundle_id: string };
        Returns: { active_seats: number; pending_seats: number; max_seats: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
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
export type ProofEvent = Database['public']['Tables']['proof_events']['Row'];
export type CapacityBaseline = Database['public']['Tables']['capacity_baselines']['Row'];

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
  capacity_value?: number | null;
  driver_data?: Record<string, number> | null;
}
