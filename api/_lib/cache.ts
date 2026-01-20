/**
 * In-Memory Cache for Serverless Functions
 *
 * Simple TTL-based cache that persists across warm invocations.
 * Degrades gracefully on cold starts (cache miss -> DB query).
 *
 * SCALABILITY:
 * - Reduces DB load for frequently accessed data (entitlements)
 * - Short TTL (30-60s) ensures eventual consistency
 * - No external dependencies (Redis not required for MVP)
 *
 * TRADE-OFFS:
 * - Not distributed: each function instance has its own cache
 * - Cache invalidation requires TTL expiry (or explicit clear)
 * - Memory bounded: LRU eviction prevents unbounded growth
 */

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

export interface CacheConfig {
  /** Time-to-live in milliseconds */
  ttlMs: number;
  /** Maximum entries before LRU eviction */
  maxEntries: number;
  /** Cache name for logging/metrics */
  name: string;
}

export const CACHE_CONFIGS = {
  /** Entitlements cache: short TTL for consistency */
  ENTITLEMENTS: {
    ttlMs: 30_000, // 30 seconds
    maxEntries: 1000,
    name: 'entitlements',
  },
  /** Auth validation cache: very short TTL for security */
  AUTH: {
    ttlMs: 10_000, // 10 seconds
    maxEntries: 500,
    name: 'auth',
  },
  /** Product catalog cache: longer TTL (rarely changes) */
  PRODUCTS: {
    ttlMs: 300_000, // 5 minutes
    maxEntries: 100,
    name: 'products',
  },
} as const;

// =============================================================================
// CACHE IMPLEMENTATION
// =============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessedAt: number;
}

class TTLCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;

  // Metrics
  private hits = 0;
  private misses = 0;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Get value from cache
   * Returns undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access time for LRU
    entry.accessedAt = Date.now();
    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.config.ttlMs,
      accessedAt: Date.now(),
    });
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const total = this.hits + this.misses;
    return {
      name: this.config.name,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
      maxSize: this.config.maxEntries,
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.accessedAt < oldestAccess) {
        oldestAccess = entry.accessedAt;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// =============================================================================
// CACHE METRICS
// =============================================================================

export interface CacheMetrics {
  name: string;
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
}

// =============================================================================
// SINGLETON CACHES
// =============================================================================

// Module-level singletons persist across warm invocations
const entitlementsCache = new TTLCache<string[]>(CACHE_CONFIGS.ENTITLEMENTS);
const authCache = new TTLCache<{ userId: string }>(CACHE_CONFIGS.AUTH);

/**
 * Get cached entitlements for user
 */
export function getCachedEntitlements(userId: string): string[] | undefined {
  return entitlementsCache.get(`ent:${userId}`);
}

/**
 * Set cached entitlements for user
 */
export function setCachedEntitlements(userId: string, entitlements: string[]): void {
  entitlementsCache.set(`ent:${userId}`, entitlements);
}

/**
 * Invalidate cached entitlements for user
 * Call after granting/revoking entitlements
 */
export function invalidateEntitlements(userId: string): void {
  entitlementsCache.delete(`ent:${userId}`);
}

/**
 * Get cached auth validation result
 */
export function getCachedAuth(token: string): { userId: string } | undefined {
  // Use token hash to avoid storing full token
  const tokenKey = hashToken(token);
  return authCache.get(`auth:${tokenKey}`);
}

/**
 * Set cached auth validation result
 */
export function setCachedAuth(token: string, result: { userId: string }): void {
  const tokenKey = hashToken(token);
  authCache.set(`auth:${tokenKey}`, result);
}

/**
 * Simple hash for token (not cryptographic, just for cache key)
 */
function hashToken(token: string): string {
  // Use last 32 chars of token as identifier (unique enough for cache)
  return token.slice(-32);
}

/**
 * Get all cache metrics
 */
export function getAllCacheMetrics(): CacheMetrics[] {
  return [
    entitlementsCache.getMetrics(),
    authCache.getMetrics(),
  ];
}

/**
 * Clear all caches (for testing/emergency)
 */
export function clearAllCaches(): void {
  entitlementsCache.clear();
  authCache.clear();
}
