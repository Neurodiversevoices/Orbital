/**
 * CORS Utility for Vercel API Routes
 *
 * Centralized CORS handling with strict origin validation.
 *
 * SECURITY:
 * - Production: Only allows explicitly configured origins
 * - Development: Allows localhost variants
 * - Logs rejected origins for security monitoring
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logCorsRejected } from './securityAudit';
import { getClientIdentifier } from './rateLimit';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Get allowed origins from environment
 * Defaults to production domain only
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim()).filter(Boolean);
  }

  // Default production origins
  return [
    'https://orbital.health',
    'https://www.orbital.health',
    'https://app.orbital.health',
  ];
}

/**
 * Check if origin is allowed in development
 */
function isDevOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const devPatterns = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https?:\/\/\[::1\](:\d+)?$/,
    /^https?:\/\/.*\.vercel\.app$/,  // Vercel preview deployments
    /^https?:\/\/.*\.ngrok\.io$/,    // ngrok tunnels for testing
  ];

  return devPatterns.some(pattern => pattern.test(origin));
}

/**
 * Validate origin against allowed list
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    // No origin header - could be same-origin or server-to-server
    // Allow for webhooks and direct API calls
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check development origins
  if (isDevOrigin(origin)) {
    return true;
  }

  return false;
}

// =============================================================================
// CORS MIDDLEWARE
// =============================================================================

export interface CorsOptions {
  /** HTTP methods to allow */
  methods?: string[];
  /** Headers to allow */
  headers?: string[];
  /** Allow credentials */
  credentials?: boolean;
  /** Max age for preflight cache */
  maxAge?: number;
  /** Endpoint name for logging */
  endpoint: string;
}

const DEFAULT_OPTIONS: Partial<CorsOptions> = {
  methods: ['GET', 'POST', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Apply CORS headers to response
 * Returns false if origin was rejected (response already sent)
 */
export async function applyCors(
  req: VercelRequest,
  res: VercelResponse,
  options: CorsOptions
): Promise<boolean> {
  const origin = req.headers.origin as string | undefined;
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check if origin is allowed
  if (!isOriginAllowed(origin)) {
    // Log the rejection
    const ip = getClientIdentifier(req);
    await logCorsRejected(ip, opts.endpoint, req.method || 'UNKNOWN', origin || 'none');

    // For preflight, return 204 but without CORS headers (browser will block)
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return false;
    }

    // For actual requests, return 403
    res.status(403).json({
      error: 'Origin not allowed',
      code: 'CORS_REJECTED',
    });
    return false;
  }

  // Set CORS headers for allowed origins
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  if (opts.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', opts.methods!.join(', '));
  res.setHeader('Access-Control-Allow-Headers', opts.headers!.join(', '));
  res.setHeader('Access-Control-Max-Age', opts.maxAge!.toString());

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false; // Signal that response is complete
  }

  return true;
}

/**
 * CORS middleware wrapper
 */
export function withCors(
  options: CorsOptions,
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    const shouldContinue = await applyCors(req, res, options);
    if (!shouldContinue) {
      return; // CORS response already sent
    }
    return handler(req, res);
  };
}
