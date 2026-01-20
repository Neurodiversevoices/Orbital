/**
 * Lightweight Health Metrics for Serverless
 *
 * Tracks latency, error rates, and throughput for capacity monitoring.
 * Uses in-memory rolling windows that persist across warm invocations.
 *
 * USAGE:
 * - Call recordRequest() at start and end of each request
 * - Query getMetrics() for current health snapshot
 * - Expose via /api/health endpoint for monitoring
 *
 * NOTE: Metrics are per-instance (not aggregated across all functions).
 * For production, consider sending to external monitoring (Datadog, etc.)
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Rolling window duration for metrics (5 minutes) */
const WINDOW_MS = 5 * 60 * 1000;

/** Bucket size for time-series data (10 seconds) */
const BUCKET_MS = 10 * 1000;

/** Number of buckets in window */
const NUM_BUCKETS = WINDOW_MS / BUCKET_MS;

// =============================================================================
// METRICS DATA STRUCTURES
// =============================================================================

interface RequestBucket {
  timestamp: number;
  requests: number;
  errors: number;
  totalLatencyMs: number;
  maxLatencyMs: number;
  minLatencyMs: number;
}

interface EndpointMetrics {
  buckets: RequestBucket[];
  currentBucketIndex: number;
}

// =============================================================================
// METRICS STORAGE
// =============================================================================

// Per-endpoint metrics (module-level singleton)
const endpointMetrics: Map<string, EndpointMetrics> = new Map();

// Global metrics across all endpoints
let globalMetrics: EndpointMetrics = createEmptyMetrics();

function createEmptyMetrics(): EndpointMetrics {
  const buckets: RequestBucket[] = [];
  for (let i = 0; i < NUM_BUCKETS; i++) {
    buckets.push({
      timestamp: 0,
      requests: 0,
      errors: 0,
      totalLatencyMs: 0,
      maxLatencyMs: 0,
      minLatencyMs: Infinity,
    });
  }
  return { buckets, currentBucketIndex: 0 };
}

function getOrCreateEndpointMetrics(endpoint: string): EndpointMetrics {
  let metrics = endpointMetrics.get(endpoint);
  if (!metrics) {
    metrics = createEmptyMetrics();
    endpointMetrics.set(endpoint, metrics);
  }
  return metrics;
}

function getCurrentBucket(metrics: EndpointMetrics): RequestBucket {
  const now = Date.now();
  const bucketTime = Math.floor(now / BUCKET_MS) * BUCKET_MS;
  const bucketIndex = Math.floor((now / BUCKET_MS) % NUM_BUCKETS);

  // Check if we need to reset this bucket (new time period)
  if (metrics.buckets[bucketIndex].timestamp !== bucketTime) {
    metrics.buckets[bucketIndex] = {
      timestamp: bucketTime,
      requests: 0,
      errors: 0,
      totalLatencyMs: 0,
      maxLatencyMs: 0,
      minLatencyMs: Infinity,
    };
  }

  metrics.currentBucketIndex = bucketIndex;
  return metrics.buckets[bucketIndex];
}

// =============================================================================
// RECORDING API
// =============================================================================

export interface RequestContext {
  endpoint: string;
  startTime: number;
}

/**
 * Start tracking a request
 * Returns context to pass to recordRequestEnd()
 */
export function startRequest(endpoint: string): RequestContext {
  return {
    endpoint,
    startTime: Date.now(),
  };
}

/**
 * Record request completion
 */
export function recordRequestEnd(
  context: RequestContext,
  statusCode: number
): void {
  const latencyMs = Date.now() - context.startTime;
  const isError = statusCode >= 400;

  // Update endpoint-specific metrics
  const endpointMet = getOrCreateEndpointMetrics(context.endpoint);
  const endpointBucket = getCurrentBucket(endpointMet);
  updateBucket(endpointBucket, latencyMs, isError);

  // Update global metrics
  const globalBucket = getCurrentBucket(globalMetrics);
  updateBucket(globalBucket, latencyMs, isError);
}

function updateBucket(bucket: RequestBucket, latencyMs: number, isError: boolean): void {
  bucket.requests++;
  if (isError) bucket.errors++;
  bucket.totalLatencyMs += latencyMs;
  bucket.maxLatencyMs = Math.max(bucket.maxLatencyMs, latencyMs);
  bucket.minLatencyMs = Math.min(bucket.minLatencyMs, latencyMs);
}

// =============================================================================
// METRICS QUERIES
// =============================================================================

export interface HealthMetrics {
  /** Requests per second (over window) */
  requestsPerSecond: number;
  /** Error rate 0-1 (over window) */
  errorRate: number;
  /** Average latency in ms */
  avgLatencyMs: number;
  /** P50 latency estimate */
  p50LatencyMs: number;
  /** P99 latency estimate (using max as proxy) */
  p99LatencyMs: number;
  /** Total requests in window */
  totalRequests: number;
  /** Total errors in window */
  totalErrors: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface EndpointHealthMetrics extends HealthMetrics {
  endpoint: string;
}

/**
 * Get global health metrics
 */
export function getGlobalMetrics(): HealthMetrics {
  return aggregateMetrics(globalMetrics);
}

/**
 * Get metrics for specific endpoint
 */
export function getEndpointMetrics(endpoint: string): HealthMetrics | null {
  const metrics = endpointMetrics.get(endpoint);
  if (!metrics) return null;
  return aggregateMetrics(metrics);
}

/**
 * Get metrics for all endpoints
 */
export function getAllEndpointMetrics(): EndpointHealthMetrics[] {
  const results: EndpointHealthMetrics[] = [];
  endpointMetrics.forEach((metrics, endpoint) => {
    results.push({
      endpoint,
      ...aggregateMetrics(metrics),
    });
  });
  return results;
}

function aggregateMetrics(metrics: EndpointMetrics): HealthMetrics {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let totalRequests = 0;
  let totalErrors = 0;
  let totalLatency = 0;
  let maxLatency = 0;
  let minLatency = Infinity;

  for (const bucket of metrics.buckets) {
    // Only include buckets within the window
    if (bucket.timestamp >= windowStart && bucket.requests > 0) {
      totalRequests += bucket.requests;
      totalErrors += bucket.errors;
      totalLatency += bucket.totalLatencyMs;
      maxLatency = Math.max(maxLatency, bucket.maxLatencyMs);
      minLatency = Math.min(minLatency, bucket.minLatencyMs);
    }
  }

  const windowSeconds = WINDOW_MS / 1000;
  const avgLatency = totalRequests > 0 ? totalLatency / totalRequests : 0;

  return {
    requestsPerSecond: totalRequests / windowSeconds,
    errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
    avgLatencyMs: Math.round(avgLatency),
    p50LatencyMs: Math.round(avgLatency), // Approximation
    p99LatencyMs: Math.round(maxLatency), // Using max as proxy
    totalRequests,
    totalErrors,
    windowSeconds,
  };
}

// =============================================================================
// HEALTH STATUS
// =============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheck {
  status: HealthStatus;
  metrics: HealthMetrics;
  checks: {
    latency: { status: HealthStatus; value: number; threshold: number };
    errorRate: { status: HealthStatus; value: number; threshold: number };
    throughput: { status: HealthStatus; value: number; minExpected: number };
  };
  timestamp: string;
  instanceId: string;
}

// Generate a unique instance ID for this function instance
const INSTANCE_ID = `fn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Get overall health check with status
 */
export function getHealthCheck(thresholds?: {
  maxLatencyMs?: number;
  maxErrorRate?: number;
  minRequestsPerSecond?: number;
}): HealthCheck {
  const defaults = {
    maxLatencyMs: 1000, // 1 second
    maxErrorRate: 0.05, // 5%
    minRequestsPerSecond: 0, // No minimum by default
  };
  const t = { ...defaults, ...thresholds };

  const metrics = getGlobalMetrics();

  // Determine individual check statuses
  const latencyStatus: HealthStatus =
    metrics.avgLatencyMs > t.maxLatencyMs * 2 ? 'unhealthy' :
    metrics.avgLatencyMs > t.maxLatencyMs ? 'degraded' : 'healthy';

  const errorStatus: HealthStatus =
    metrics.errorRate > t.maxErrorRate * 2 ? 'unhealthy' :
    metrics.errorRate > t.maxErrorRate ? 'degraded' : 'healthy';

  const throughputStatus: HealthStatus =
    t.minRequestsPerSecond > 0 && metrics.requestsPerSecond < t.minRequestsPerSecond * 0.5 ? 'unhealthy' :
    t.minRequestsPerSecond > 0 && metrics.requestsPerSecond < t.minRequestsPerSecond ? 'degraded' : 'healthy';

  // Overall status is worst of individual checks
  const statuses = [latencyStatus, errorStatus, throughputStatus];
  const overallStatus: HealthStatus =
    statuses.includes('unhealthy') ? 'unhealthy' :
    statuses.includes('degraded') ? 'degraded' : 'healthy';

  return {
    status: overallStatus,
    metrics,
    checks: {
      latency: { status: latencyStatus, value: metrics.avgLatencyMs, threshold: t.maxLatencyMs },
      errorRate: { status: errorStatus, value: metrics.errorRate, threshold: t.maxErrorRate },
      throughput: { status: throughputStatus, value: metrics.requestsPerSecond, minExpected: t.minRequestsPerSecond },
    },
    timestamp: new Date().toISOString(),
    instanceId: INSTANCE_ID,
  };
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
  endpointMetrics.clear();
  globalMetrics = createEmptyMetrics();
}
