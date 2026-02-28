/**
 * Supabase Edge Function: generate-cci
 *
 * Computes the Capacity Composite Index (CCI) for a user within a date range.
 * Returns structured JSON — no PDF rendering here.
 *
 * Request body:
 *   { user_id: string, date_start?: string, date_end?: string }
 *
 * Entitlement gate: user must hold one of:
 *   cci_purchased | cci_circle_purchased | cci_bundle_purchased | pro_access
 *
 * Returns 200 with CCI payload or 403 if not entitled.
 * Writes audit_events on every invocation (success or denied).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.0";

// =============================================================================
// CORS
// =============================================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// TYPES
// =============================================================================

interface CCIRequest {
  user_id: string;
  date_start?: string; // ISO date, default 30 days ago
  date_end?: string; // ISO date, default now
}

interface CapacityLog {
  id: string;
  occurred_at: string;
  capacity_value: number | null;
  driver_data: Record<string, number> | null;
  confidence_flags: Record<string, boolean> | null;
  state: string;
}

interface BaselineRow {
  id: string;
  baseline_capacity: number | null;
  variability_index: number | null;
  sensory_tolerance: number | null;
  cognitive_resilience: number | null;
  recovery_pattern: {
    avg_recovery_days: number | null;
    fastest: number | null;
    slowest: number | null;
  } | null;
  dominant_drivers: Record<string, number> | null;
  confidence_score: number | null;
  data_window_start: string;
  data_window_end: string;
  log_count: number;
  computed_at: string;
}

interface DailyMetric {
  date: string;
  green_count: number;
  yellow_count: number;
  red_count: number;
  black_count: number;
  total_signals: number;
  dominant_state: string | null;
}

interface DriverRanking {
  driver: string;
  count: number;
  pct: number;
}

interface ForecastPoint {
  day_offset: number;
  date: string;
  predicted_capacity: number;
}

interface RecoveryLag {
  avg_recovery_days: number | null;
  fastest: number | null;
  slowest: number | null;
  episodes_in_window: number;
  measured_from: "raw_logs" | "baseline" | "none";
}

interface CCIPayload {
  meta: {
    user_id: string;
    generated_at: string;
    date_start: string;
    date_end: string;
    window_days: number;
    total_signals: number;
    unique_days: number;
    data_quality_score: number;
  };
  scores: {
    current_capacity: number | null;
    baseline_capacity: number | null;
    delta_from_baseline: number | null;
    stability_score: number | null;
    trend_direction: "improving" | "declining" | "stable";
    trend_delta: number;
  };
  drivers: {
    top_5: DriverRanking[];
    total_attributions: number;
  };
  overload: {
    event_count: number;
    dates: string[];
  };
  recovery: RecoveryLag;
  forecast: {
    method: "weighted_linear_regression";
    window_days: number;
    points: ForecastPoint[];
    slope_per_day: number;
    r_squared: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CCI_ENTITLEMENTS = [
  "cci_purchased",
  "cci_circle_purchased",
  "cci_bundle_purchased",
  "pro_access",
];

const DEFAULT_WINDOW_DAYS = 30;
const FORECAST_DAYS = 42; // 6 weeks
const MIN_REGRESSION_POINTS = 7;

/** Capacity below this with a prior-day above DROP_FROM = overload event. */
const OVERLOAD_THRESHOLD = 0.2;
const DROP_FROM_THRESHOLD = 0.4;

/** Confidence weight multipliers. */
const WEIGHT_BASE = 1.0;
const WEIGHT_CONSISTENT = 0.3;
const WEIGHT_REGULAR = 0.2;

// =============================================================================
// HELPERS
// =============================================================================

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function toDateKey(iso: string): string {
  return iso.split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Compute confidence weight for a single log entry.
 * consistent_pattern + regular_logger boost weight.
 */
function logWeight(flags: Record<string, boolean> | null): number {
  if (!flags) return WEIGHT_BASE;
  let w = WEIGHT_BASE;
  if (flags.consistent_pattern) w += WEIGHT_CONSISTENT;
  if (flags.regular_logger) w += WEIGHT_REGULAR;
  return w;
}

/**
 * Weighted linear regression.
 *
 * Each point (x, y) has a weight w.
 * Returns { slope, intercept, rSquared }.
 */
function weightedLinearRegression(
  points: Array<{ x: number; y: number; w: number }>
): { slope: number; intercept: number; rSquared: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, rSquared: 0 };

  let sumW = 0;
  let sumWX = 0;
  let sumWY = 0;
  let sumWXX = 0;
  let sumWXY = 0;

  for (const { x, y, w } of points) {
    sumW += w;
    sumWX += w * x;
    sumWY += w * y;
    sumWXX += w * x * x;
    sumWXY += w * x * y;
  }

  const denom = sumW * sumWXX - sumWX * sumWX;
  if (Math.abs(denom) < 1e-12) {
    return { slope: 0, intercept: sumWY / sumW, rSquared: 0 };
  }

  const slope = (sumW * sumWXY - sumWX * sumWY) / denom;
  const intercept = (sumWY - slope * sumWX) / sumW;

  // Weighted R²
  const yMean = sumWY / sumW;
  let ssTot = 0;
  let ssRes = 0;
  for (const { x, y, w } of points) {
    const predicted = slope * x + intercept;
    ssRes += w * (y - predicted) ** 2;
    ssTot += w * (y - yMean) ** 2;
  }

  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared: Math.max(0, rSquared) };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // -------------------------------------------------------------------------
    // Parse request
    // -------------------------------------------------------------------------
    const body: CCIRequest = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const dateEnd = body.date_end ? new Date(body.date_end) : new Date();
    const dateStart = body.date_start
      ? new Date(body.date_start)
      : addDays(dateEnd, -DEFAULT_WINDOW_DAYS);

    const windowDays = Math.round(
      (dateEnd.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    // -------------------------------------------------------------------------
    // Create Supabase client with service role (bypasses RLS)
    // -------------------------------------------------------------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // -------------------------------------------------------------------------
    // ENTITLEMENT GATE
    // -------------------------------------------------------------------------
    const { data: entitlements, error: entErr } = await supabase
      .from("user_entitlements")
      .select("entitlement_id, expires_at")
      .eq("user_id", user_id)
      .in("entitlement_id", CCI_ENTITLEMENTS);

    if (entErr) {
      console.error("[generate-cci] Entitlement check failed:", entErr);
      return new Response(
        JSON.stringify({ error: "Failed to verify entitlements" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const validEntitlement = (entitlements || []).find(
      (e: any) => !e.expires_at || e.expires_at > now
    );

    // Audit: log regardless of outcome
    const auditBase = {
      user_id,
      actor_type: "system",
      resource_type: "cci_report",
      details: {
        date_start: dateStart.toISOString(),
        date_end: dateEnd.toISOString(),
        window_days: windowDays,
        timestamp: now,
        source: "edge_function",
      },
    };

    if (!validEntitlement) {
      // Audit: denied
      await supabase.from("audit_events").insert({
        ...auditBase,
        action: "cci_generation_denied",
        details: {
          ...auditBase.details,
          reason: "no_valid_entitlement",
          checked_entitlements: CCI_ENTITLEMENTS,
        },
      });

      return new Response(
        JSON.stringify({
          error: "CCI report requires an active subscription or purchase",
          code: "ENTITLEMENT_REQUIRED",
          valid_entitlements: CCI_ENTITLEMENTS,
        }),
        { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // FETCH DATA — parallel queries
    // -------------------------------------------------------------------------
    const [logsResult, baselineResult, metricsResult] = await Promise.all([
      // Raw capacity logs in the window
      supabase
        .from("capacity_logs")
        .select(
          "id, occurred_at, capacity_value, driver_data, confidence_flags, state"
        )
        .eq("user_id", user_id)
        .is("deleted_at", null)
        .eq("is_demo", false)
        .gte("occurred_at", dateStart.toISOString())
        .lte("occurred_at", dateEnd.toISOString())
        .order("occurred_at", { ascending: true }),

      // Latest baseline
      supabase
        .from("capacity_baselines")
        .select("*")
        .eq("user_id", user_id)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Daily metrics in window
      supabase
        .from("user_daily_metrics")
        .select("date, green_count, yellow_count, red_count, black_count, total_signals, dominant_state")
        .eq("user_id", user_id)
        .gte("date", toDateKey(dateStart.toISOString()))
        .lte("date", toDateKey(dateEnd.toISOString()))
        .order("date", { ascending: true }),
    ]);

    if (logsResult.error) {
      console.error("[generate-cci] Logs fetch failed:", logsResult.error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch capacity logs" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const logs: CapacityLog[] = (logsResult.data || []) as CapacityLog[];
    const baseline: BaselineRow | null = (baselineResult.data as BaselineRow) || null;
    const dailyMetrics: DailyMetric[] = (metricsResult.data || []) as DailyMetric[];

    // Filter to logs with numeric capacity_value
    const validLogs = logs.filter((l) => l.capacity_value != null);

    // Unique days
    const uniqueDays = new Set<string>();
    for (const log of logs) {
      uniqueDays.add(toDateKey(log.occurred_at));
    }

    // -------------------------------------------------------------------------
    // CURRENT CAPACITY — weighted mean of last 7 days
    // -------------------------------------------------------------------------
    const sevenDaysAgo = addDays(dateEnd, -7).toISOString();
    const recentLogs = validLogs.filter((l) => l.occurred_at >= sevenDaysAgo);

    let currentCapacity: number | null = null;
    if (recentLogs.length > 0) {
      let sumWV = 0;
      let sumW = 0;
      for (const log of recentLogs) {
        const w = logWeight(log.confidence_flags);
        sumWV += w * log.capacity_value!;
        sumW += w;
      }
      currentCapacity = round3(sumWV / sumW);
    }

    // -------------------------------------------------------------------------
    // BASELINE + DELTA
    // -------------------------------------------------------------------------
    const baselineCapacity = baseline?.baseline_capacity ?? null;
    let deltaFromBaseline: number | null = null;
    if (currentCapacity != null && baselineCapacity != null) {
      deltaFromBaseline = round3(currentCapacity - baselineCapacity);
    }

    // -------------------------------------------------------------------------
    // STABILITY SCORE — inverse of variability_index, normalized 0–100
    //
    // variability_index is std dev of capacity (0–1 range), so max ~0.5.
    // stability = (1 - min(variability / 0.5, 1)) * 100
    // -------------------------------------------------------------------------
    let stabilityScore: number | null = null;
    if (baseline?.variability_index != null) {
      const normalized = Math.min(baseline.variability_index / 0.5, 1);
      stabilityScore = round3((1 - normalized) * 100);
    }

    // -------------------------------------------------------------------------
    // TREND DIRECTION — 7d vs prior 7d from daily metrics
    // -------------------------------------------------------------------------
    const fourteenDaysAgo = addDays(dateEnd, -14);

    const current7dMetrics = dailyMetrics.filter(
      (m) => m.date >= toDateKey(sevenDaysAgo)
    );
    const prev7dMetrics = dailyMetrics.filter(
      (m) =>
        m.date >= toDateKey(fourteenDaysAgo.toISOString()) &&
        m.date < toDateKey(sevenDaysAgo)
    );

    // Use green_count proportion as capacity proxy from daily metrics
    function metricAvgCapacity(metrics: DailyMetric[]): number | null {
      if (metrics.length === 0) return null;
      let totalWeighted = 0;
      let totalSignals = 0;
      for (const m of metrics) {
        // Map state counts to capacity: green=1.0, yellow=0.6, red=0.3, black=0.1
        totalWeighted +=
          m.green_count * 1.0 +
          m.yellow_count * 0.6 +
          m.red_count * 0.3 +
          m.black_count * 0.1;
        totalSignals += m.total_signals;
      }
      return totalSignals > 0 ? round3(totalWeighted / totalSignals) : null;
    }

    const current7dAvg = metricAvgCapacity(current7dMetrics);
    const prev7dAvg = metricAvgCapacity(prev7dMetrics);

    let trendDirection: "improving" | "declining" | "stable" = "stable";
    let trendDelta = 0;
    if (current7dAvg != null && prev7dAvg != null) {
      trendDelta = round3(current7dAvg - prev7dAvg);
      if (trendDelta > 0.05) trendDirection = "improving";
      else if (trendDelta < -0.05) trendDirection = "declining";
    }

    // -------------------------------------------------------------------------
    // DRIVER RANKINGS — aggregate driver_data, top 5
    // -------------------------------------------------------------------------
    const driverCounts: Record<string, number> = {};
    let totalAttributions = 0;

    for (const log of logs) {
      if (log.driver_data && typeof log.driver_data === "object") {
        for (const [key, value] of Object.entries(log.driver_data)) {
          if (typeof value === "number" && value > 0) {
            driverCounts[key] = (driverCounts[key] || 0) + 1;
            totalAttributions++;
          }
        }
      }
    }

    const top5Drivers: DriverRanking[] = Object.entries(driverCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([driver, count]) => ({
        driver,
        count,
        pct: totalAttributions > 0 ? round3((count / totalAttributions) * 100) : 0,
      }));

    // -------------------------------------------------------------------------
    // OVERLOAD EVENTS — sharp drops: day N capacity < 0.2 AND day N-1 > 0.4
    // -------------------------------------------------------------------------
    // Group valid logs by date, take daily avg
    const dailyCapMap = new Map<string, number[]>();
    for (const log of validLogs) {
      const day = toDateKey(log.occurred_at);
      if (!dailyCapMap.has(day)) dailyCapMap.set(day, []);
      dailyCapMap.get(day)!.push(log.capacity_value!);
    }

    const dailyAvgs: Array<{ date: string; avg: number }> = [];
    for (const [date, values] of dailyCapMap) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      dailyAvgs.push({ date, avg });
    }
    dailyAvgs.sort((a, b) => a.date.localeCompare(b.date));

    const overloadDates: string[] = [];
    for (let i = 1; i < dailyAvgs.length; i++) {
      const prev = dailyAvgs[i - 1];
      const curr = dailyAvgs[i];
      if (curr.avg < OVERLOAD_THRESHOLD && prev.avg > DROP_FROM_THRESHOLD) {
        overloadDates.push(curr.date);
      }
    }

    // -------------------------------------------------------------------------
    // RECOVERY LAG — from baseline first, supplement with raw log measurement
    // -------------------------------------------------------------------------
    const recovery: RecoveryLag = {
      avg_recovery_days: null,
      fastest: null,
      slowest: null,
      episodes_in_window: 0,
      measured_from: "none",
    };

    // Measure from raw logs in this window
    const DEPLETED = 0.3;
    const RECOVERED = 0.6;
    const recoveryEpisodes: number[] = [];
    let episodeStart: string | null = null;

    for (const log of validLogs) {
      const cv = log.capacity_value!;
      const day = toDateKey(log.occurred_at);

      if (episodeStart === null) {
        if (cv < DEPLETED) episodeStart = day;
      } else {
        if (cv > RECOVERED) {
          const startMs = new Date(episodeStart).getTime();
          const endMs = new Date(day).getTime();
          const daysDiff = Math.max(
            1,
            Math.round((endMs - startMs) / (1000 * 60 * 60 * 24))
          );
          recoveryEpisodes.push(daysDiff);
          episodeStart = null;
        }
      }
    }

    if (recoveryEpisodes.length > 0) {
      // Use raw measurement from this window
      const sum = recoveryEpisodes.reduce((a, b) => a + b, 0);
      recovery.avg_recovery_days = round3(sum / recoveryEpisodes.length);
      recovery.fastest = Math.min(...recoveryEpisodes);
      recovery.slowest = Math.max(...recoveryEpisodes);
      recovery.episodes_in_window = recoveryEpisodes.length;
      recovery.measured_from = "raw_logs";
    } else if (baseline?.recovery_pattern) {
      // Fall back to baseline's pre-computed recovery pattern
      const rp = baseline.recovery_pattern;
      recovery.avg_recovery_days = rp.avg_recovery_days;
      recovery.fastest = rp.fastest;
      recovery.slowest = rp.slowest;
      recovery.episodes_in_window = 0;
      recovery.measured_from = "baseline";
    }

    // -------------------------------------------------------------------------
    // FORECAST — weighted linear regression on daily averages, 6-week projection
    // -------------------------------------------------------------------------
    // Build regression points: x = day offset from window start, y = daily avg capacity
    const regressionPoints: Array<{ x: number; y: number; w: number }> = [];

    // Use last 21–30 days for regression (prefer more data if available)
    const regressionStart = addDays(dateEnd, -Math.min(windowDays, 30));

    for (const { date, avg } of dailyAvgs) {
      if (date < toDateKey(regressionStart.toISOString())) continue;

      const dayOffset = Math.round(
        (new Date(date).getTime() - regressionStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Weight: avg confidence of logs on this date
      const dayLogs = logs.filter(
        (l) => toDateKey(l.occurred_at) === date
      );
      let avgWeight = WEIGHT_BASE;
      if (dayLogs.length > 0) {
        const totalW = dayLogs.reduce(
          (s, l) => s + logWeight(l.confidence_flags),
          0
        );
        avgWeight = totalW / dayLogs.length;
      }

      regressionPoints.push({ x: dayOffset, y: avg, w: avgWeight });
    }

    const forecastPoints: ForecastPoint[] = [];
    let slopePerDay = 0;
    let rSquared = 0;

    if (regressionPoints.length >= MIN_REGRESSION_POINTS) {
      const reg = weightedLinearRegression(regressionPoints);
      slopePerDay = round3(reg.slope);
      rSquared = round3(reg.rSquared);

      // Last x value is the end of the regression window
      const lastX = regressionPoints[regressionPoints.length - 1].x;

      for (let d = 1; d <= FORECAST_DAYS; d++) {
        const futureX = lastX + d;
        const predicted = clamp01(reg.slope * futureX + reg.intercept);
        const futureDate = addDays(dateEnd, d);

        forecastPoints.push({
          day_offset: d,
          date: toDateKey(futureDate.toISOString()),
          predicted_capacity: round3(predicted),
        });
      }
    }

    // -------------------------------------------------------------------------
    // DATA QUALITY SCORE — proportion of logs with good confidence flags
    // -------------------------------------------------------------------------
    let dataQuality = 0;
    if (logs.length > 0) {
      let qualitySum = 0;
      for (const log of logs) {
        const f = log.confidence_flags;
        if (!f) continue;
        let score = 0;
        if (f.consistent_pattern) score += 0.4;
        if (f.regular_logger) score += 0.3;
        if (f.time_consistent) score += 0.3;
        qualitySum += score;
      }
      dataQuality = round3(qualitySum / logs.length);
    }

    // -------------------------------------------------------------------------
    // ASSEMBLE PAYLOAD
    // -------------------------------------------------------------------------
    const payload: CCIPayload = {
      meta: {
        user_id,
        generated_at: now,
        date_start: dateStart.toISOString(),
        date_end: dateEnd.toISOString(),
        window_days: windowDays,
        total_signals: logs.length,
        unique_days: uniqueDays.size,
        data_quality_score: dataQuality,
      },
      scores: {
        current_capacity: currentCapacity,
        baseline_capacity: baselineCapacity,
        delta_from_baseline: deltaFromBaseline,
        stability_score: stabilityScore,
        trend_direction: trendDirection,
        trend_delta: trendDelta,
      },
      drivers: {
        top_5: top5Drivers,
        total_attributions: totalAttributions,
      },
      overload: {
        event_count: overloadDates.length,
        dates: overloadDates,
      },
      recovery,
      forecast: {
        method: "weighted_linear_regression",
        window_days: Math.min(windowDays, 30),
        points: forecastPoints,
        slope_per_day: slopePerDay,
        r_squared: rSquared,
      },
    };

    // -------------------------------------------------------------------------
    // AUDIT: success
    // -------------------------------------------------------------------------
    await supabase.from("audit_events").insert({
      ...auditBase,
      action: "cci_generation_success",
      details: {
        ...auditBase.details,
        entitlement_used: validEntitlement.entitlement_id,
        total_signals: logs.length,
        unique_days: uniqueDays.size,
        current_capacity: currentCapacity,
        baseline_capacity: baselineCapacity,
        stability_score: stabilityScore,
        forecast_points: forecastPoints.length,
        overload_events: overloadDates.length,
      },
    });

    // -------------------------------------------------------------------------
    // RETURN
    // -------------------------------------------------------------------------
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-cci] Unhandled error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
