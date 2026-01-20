/**
 * Health Check & Metrics API
 *
 * GET /api/health
 *
 * Returns health status and performance metrics for monitoring.
 * Use for:
 * - Load balancer health checks
 * - Capacity monitoring dashboards
 * - Alerting on degradation
 *
 * Response:
 * {
 *   status: 'healthy' | 'degraded' | 'unhealthy',
 *   metrics: { requestsPerSecond, errorRate, avgLatencyMs, ... },
 *   cache: { hits, misses, hitRate, ... },
 *   database: { connected, latencyMs },
 *   timestamp: ISO string
 * }
 *
 * Query params:
 * - ?detailed=true: Include per-endpoint metrics
 * - ?check=db: Include database connectivity check (slower)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getHealthCheck,
  getAllEndpointMetrics,
  HealthCheck,
  EndpointHealthMetrics,
} from '../_lib/metrics';
import { getAllCacheMetrics, CacheMetrics } from '../_lib/cache';
import { checkConnectionHealth, ConnectionHealth } from '../_lib/supabaseClient';

// =============================================================================
// TYPES
// =============================================================================

interface HealthResponse extends HealthCheck {
  cache: CacheMetrics[];
  database?: ConnectionHealth;
  endpoints?: EndpointHealthMetrics[];
}

// =============================================================================
// HANDLER
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const detailed = req.query.detailed === 'true';
  const checkDb = req.query.check === 'db';

  try {
    // Get core health check
    const health = getHealthCheck({
      maxLatencyMs: 500, // 500ms threshold for API routes
      maxErrorRate: 0.05, // 5% error rate threshold
    });

    // Get cache metrics
    const cache = getAllCacheMetrics();

    // Build response
    const response: HealthResponse = {
      ...health,
      cache,
    };

    // Optional: Include database health check (adds latency)
    if (checkDb) {
      response.database = await checkConnectionHealth();

      // Update overall status if DB is unhealthy
      if (!response.database.dataClient) {
        response.status = 'unhealthy';
      }
    }

    // Optional: Include per-endpoint metrics
    if (detailed) {
      response.endpoints = getAllEndpointMetrics();
    }

    // Set appropriate status code based on health
    const statusCode = response.status === 'unhealthy' ? 503 :
                       response.status === 'degraded' ? 200 : 200;

    // Cache health endpoint for 5 seconds (reduce load)
    res.setHeader('Cache-Control', 'public, max-age=5');
    res.status(statusCode).json(response);
  } catch (error) {
    console.error('[health] Error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
}
