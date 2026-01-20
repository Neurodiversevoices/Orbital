/**
 * Rate Limiting Utility for Vercel API Routes
 *
 * Implements token bucket rate limiting with configurable limits.
 * Uses in-memory store with LRU eviction for serverless compatibility.
 *
 * For production scale, swap to Vercel KV or Upstash Redis.
 *
 * SECURITY: Prevents brute force attacks, enumeration, and abuse.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Identifier for this limiter (for logging) */
  name: string;
}

// Default configs for different endpoint types
export const RATE_LIMITS = {
  // Auth endpoints - stricter to prevent brute force
  AUTH: { maxRequests: 10, windowSeconds: 60, name: 'auth' },
  // Checkout creation - moderate to prevent abuse
  CHECKOUT: { maxRequests: 20, windowSeconds: 60, name: 'checkout' },
  // Entitlements fetch - more permissive for UX
  ENTITLEMENTS: { maxRequests: 60, windowSeconds: 60, name: 'entitlements' },
  // Webhooks - very permissive (Stripe controls the rate)
  WEBHOOK: { maxRequests: 1000, windowSeconds: 60, name: 'webhook' },
  // Session verification - moderate
  VERIFY: { maxRequests: 30, windowSeconds: 60, name: 'verify' },
} as const;

// =============================================================================
// IN-MEMORY STORE (with LRU eviction)
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Simple LRU cache with max 10000 entries
const MAX_ENTRIES = 10000;
const rateLimitStore = new Map<string, RateLimitEntry>();

function pruneStore(): void {
  if (rateLimitStore.size > MAX_ENTRIES) {
    // Remove oldest 20% of entries
    const toDelete = Math.floor(MAX_ENTRIES * 0.2);
    const keys = Array.from(rateLimitStore.keys()).slice(0, toDelete);
    keys.forEach(key => rateLimitStore.delete(key));
  }
}

// =============================================================================
// RATE LIMITER
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check rate limit for an identifier (typically IP or user ID)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = `${config.name}:${identifier}`;

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: now + (config.windowSeconds * 1000),
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  // Periodic cleanup
  if (Math.random() < 0.01) {
    pruneStore();
  }

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const retryAfter = allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    retryAfter,
  };
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For (Vercel), X-Real-IP, or falls back to a hash
 */
export function getClientIdentifier(req: VercelRequest): string {
  // Vercel provides the real IP in x-forwarded-for
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ip.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fallback - shouldn't happen on Vercel
  return 'unknown';
}

/**
 * Apply rate limiting to a request
 * Returns true if allowed, sends 429 response if not
 */
export function applyRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  config: RateLimitConfig
): boolean {
  const identifier = getClientIdentifier(req);
  const result = checkRateLimit(identifier, config);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());

  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfter?.toString() || '60');
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
    });
    return false;
  }

  return true;
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    if (!applyRateLimit(req, res, config)) {
      return; // 429 already sent
    }
    return handler(req, res);
  };
}
