/**
 * Health Check API Endpoint
 *
 * Production-safe health monitoring for uptime checks and observability.
 * Returns JSON with service status and dependency checks.
 *
 * Security:
 * - No secrets leaked (only boolean presence checks)
 * - No authentication required (public endpoint)
 * - Safe for external monitoring services
 *
 * Usage:
 *   curl https://orbitalhealth.app/api/health
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// =============================================================================
// TYPES
// =============================================================================

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

interface HealthCheck {
  pass: boolean;
  message?: string;
}

interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  environment: 'production' | 'preview' | 'development';
  uptime_seconds: number;
  checks: {
    api_alive: HealthCheck;
    supabase_configured: HealthCheck;
    supabase_reachable: HealthCheck;
    auth_configured: HealthCheck;
    payments_mode: HealthCheck & { mode?: string };
    cors_configured: HealthCheck;
    stripe_webhook_configured: HealthCheck;
  };
}

// =============================================================================
// STARTUP TIME (for uptime calculation)
// =============================================================================

const startupTime = Date.now();

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

function getEnvironment(): 'production' | 'preview' | 'development' {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'production') return 'production';
  if (vercelEnv === 'preview') return 'preview';
  return 'development';
}

function getVersion(): string {
  // Try to get version from various sources
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) ||
    process.env.npm_package_version ||
    '1.0.0'
  );
}

// =============================================================================
// HEALTH CHECKS
// =============================================================================

/**
 * Check if Supabase is configured (URL and anon key present)
 */
function checkSupabaseConfigured(): HealthCheck {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const hasUrl = Boolean(url && url.includes('supabase'));
  const hasKey = Boolean(anonKey && anonKey.length > 20);

  if (hasUrl && hasKey) {
    return { pass: true, message: 'Supabase URL and anon key configured' };
  }

  return {
    pass: false,
    message: `Missing: ${!hasUrl ? 'SUPABASE_URL ' : ''}${!hasKey ? 'SUPABASE_ANON_KEY' : ''}`.trim(),
  };
}

/**
 * Check if Supabase is reachable (lightweight ping)
 */
async function checkSupabaseReachable(): Promise<HealthCheck> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!url) {
    return { pass: false, message: 'Supabase URL not configured' };
  }

  try {
    // Use the REST health endpoint (doesn't require auth)
    const healthUrl = `${url}/rest/v1/`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(healthUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });

    clearTimeout(timeoutId);

    // Any response (even 400) means Supabase is reachable
    if (response.status < 500) {
      return { pass: true, message: `Supabase reachable (${response.status})` };
    }

    return { pass: false, message: `Supabase error: ${response.status}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { pass: false, message: `Supabase unreachable: ${message}` };
  }
}

/**
 * Check if auth is properly configured
 */
function checkAuthConfigured(): HealthCheck {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Auth requires Supabase to be configured
  if (!supabaseUrl || !supabaseKey) {
    return { pass: false, message: 'Auth requires Supabase configuration' };
  }

  return { pass: true, message: 'Auth configured via Supabase' };
}

/**
 * Check payments configuration and report mode (no secrets)
 */
function checkPaymentsMode(): HealthCheck & { mode?: string } {
  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const founderDemo = process.env.EXPO_PUBLIC_FOUNDER_DEMO;

  // Determine mode based on configuration
  let mode: string;

  if (founderDemo === '1') {
    mode = 'demo';
  } else if (stripeKey?.startsWith('pk_live_')) {
    mode = 'live';
  } else if (stripeKey?.startsWith('pk_test_')) {
    mode = 'test';
  } else if (stripeKey) {
    mode = 'unknown';
  } else {
    mode = 'not_configured';
  }

  const pass = mode !== 'not_configured';

  return {
    pass,
    mode,
    message: pass ? `Payments mode: ${mode}` : 'Stripe publishable key not configured',
  };
}

/**
 * Check CORS configuration sanity
 */
function checkCorsConfigured(): HealthCheck {
  // In Vercel, CORS is typically handled by vercel.json headers
  // We check if the deployment is on Vercel (has VERCEL env var)
  const isVercel = Boolean(process.env.VERCEL);
  const vercelUrl = process.env.VERCEL_URL;

  if (isVercel && vercelUrl) {
    return { pass: true, message: 'CORS handled by Vercel configuration' };
  }

  // In development, CORS is less critical
  if (getEnvironment() === 'development') {
    return { pass: true, message: 'Development mode - CORS relaxed' };
  }

  return { pass: false, message: 'CORS configuration unclear' };
}

/**
 * Check if Stripe webhook secret is configured (boolean only)
 */
function checkStripeWebhookConfigured(): HealthCheck {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const hasSecret = Boolean(webhookSecret && webhookSecret.startsWith('whsec_'));

  return {
    pass: hasSecret,
    message: hasSecret ? 'Stripe webhook secret configured' : 'Stripe webhook secret not configured',
  };
}

// =============================================================================
// DETERMINE OVERALL STATUS
// =============================================================================

function determineStatus(checks: HealthResponse['checks']): HealthStatus {
  // Critical checks that make the service unhealthy if failed
  const criticalChecks = [
    checks.api_alive,
    checks.supabase_configured,
    checks.auth_configured,
  ];

  // Important checks that degrade the service if failed
  const importantChecks = [
    checks.supabase_reachable,
    checks.payments_mode,
  ];

  // If any critical check fails, we're unhealthy
  if (criticalChecks.some(check => !check.pass)) {
    return 'unhealthy';
  }

  // If any important check fails, we're degraded
  if (importantChecks.some(check => !check.pass)) {
    return 'degraded';
  }

  return 'healthy';
}

// =============================================================================
// HANDLER
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Set CORS headers for monitoring tools
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    // Run all checks
    const supabaseReachable = await checkSupabaseReachable();

    const checks: HealthResponse['checks'] = {
      api_alive: { pass: true, message: 'API responding' },
      supabase_configured: checkSupabaseConfigured(),
      supabase_reachable: supabaseReachable,
      auth_configured: checkAuthConfigured(),
      payments_mode: checkPaymentsMode(),
      cors_configured: checkCorsConfigured(),
      stripe_webhook_configured: checkStripeWebhookConfigured(),
    };

    const status = determineStatus(checks);

    const response: HealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      version: getVersion(),
      environment: getEnvironment(),
      uptime_seconds: Math.floor((Date.now() - startupTime) / 1000),
      checks,
    };

    // Return appropriate HTTP status
    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    res.status(httpStatus).json(response);
  } catch (error) {
    // Fail-closed: any unexpected error means unhealthy
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: getVersion(),
      environment: getEnvironment(),
      uptime_seconds: Math.floor((Date.now() - startupTime) / 1000),
      checks: {
        api_alive: { pass: false, message: `Health check failed: ${errorMessage}` },
        supabase_configured: { pass: false, message: 'Check skipped due to error' },
        supabase_reachable: { pass: false, message: 'Check skipped due to error' },
        auth_configured: { pass: false, message: 'Check skipped due to error' },
        payments_mode: { pass: false, message: 'Check skipped due to error' },
        cors_configured: { pass: false, message: 'Check skipped due to error' },
        stripe_webhook_configured: { pass: false, message: 'Check skipped due to error' },
      },
    });
  }
}
