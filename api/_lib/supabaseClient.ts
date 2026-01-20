/**
 * Supabase Client for API Routes
 *
 * Provides connection pooling and singleton pattern for serverless.
 *
 * SCALABILITY:
 * - Singleton pattern reuses connections within warm function instances
 * - Connection pooling configuration for Supabase Pooler
 * - Separate clients for auth validation vs data operations
 *
 * CONNECTION POOLING:
 * For high-traffic serverless, use Supabase Pooler URL:
 * - Set SUPABASE_POOLER_URL for connection pooling (Supavisor)
 * - Falls back to direct connection if not configured
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// SINGLETON CLIENTS
// =============================================================================

// Module-level singletons persist across warm invocations
let dataClient: SupabaseClient | null = null;
let authClient: SupabaseClient | null = null;

/**
 * Get Supabase client for data operations
 * Uses pooler URL if available for better connection management
 */
export function getSupabaseData(): SupabaseClient {
  if (dataClient) {
    return dataClient;
  }

  // Prefer pooler URL for serverless scalability
  const url = process.env.SUPABASE_POOLER_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  dataClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    // Connection configuration for serverless
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-connection-pool': 'serverless',
      },
    },
  });

  return dataClient;
}

/**
 * Get Supabase client for auth operations
 * Uses direct connection (auth operations don't need pooling)
 */
export function getSupabaseAuth(): SupabaseClient {
  if (authClient) {
    return authClient;
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  authClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return authClient;
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use getSupabaseData() for data ops, getSupabaseAuth() for auth
 */
export function getSupabase(): SupabaseClient {
  return getSupabaseData();
}

// =============================================================================
// CONNECTION HEALTH
// =============================================================================

export interface ConnectionHealth {
  dataClient: boolean;
  authClient: boolean;
  poolerEnabled: boolean;
  latencyMs?: number;
}

/**
 * Check Supabase connection health
 * Useful for health endpoints and debugging
 */
export async function checkConnectionHealth(): Promise<ConnectionHealth> {
  const start = Date.now();
  let dataHealthy = false;
  let authHealthy = false;

  try {
    const data = getSupabaseData();
    // Simple query to test connection
    await data.from('user_entitlements').select('count').limit(1).single();
    dataHealthy = true;
  } catch {
    dataHealthy = false;
  }

  try {
    const auth = getSupabaseAuth();
    // Auth health check - just verify client is configured
    authHealthy = auth !== null;
  } catch {
    authHealthy = false;
  }

  return {
    dataClient: dataHealthy,
    authClient: authHealthy,
    poolerEnabled: !!process.env.SUPABASE_POOLER_URL,
    latencyMs: Date.now() - start,
  };
}
