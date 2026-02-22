/**
 * K-Anonymity Enforcement (Rule of 5)
 *
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  NON-NEGOTIABLE SECURITY CONTROL — RULE OF 5 (K-ANONYMITY)                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  This threshold is a PRIVACY COMPLIANCE FLOOR, not a tunable parameter.     ║
 * ║  Lowering K_ANONYMITY_THRESHOLD exposes individual behavior and violates    ║
 * ║  GDPR/privacy commitments. ANY change requires LEGAL REVIEW.                ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * CRITICAL: Privacy overrides completeness.
 *
 * If any unit or filtered view contains < 5 active signals:
 * - Return "Insufficient Data"
 * - Render neutral/grey UI
 * - Do NOT show red/green
 * - Do NOT show percentages
 *
 * This rule applies to:
 * - Dashboards
 * - Drill-downs
 * - Exports
 * - Any filtered view
 */

import {
  K_ANONYMITY_THRESHOLD,
  AggregatedValue,
  AggregatedUnitMetrics,
  TrendDirection,
  FreshnessLevel,
  SIGNAL_DELAY_SECONDS,
  FRESHNESS_WINDOW_HOURS,
} from './types';

// Re-export AggregatedUnitMetrics for external use
export type { AggregatedUnitMetrics } from './types';

// =============================================================================
// K-ANONYMITY CORE ENFORCEMENT — NON-NEGOTIABLE
// =============================================================================

/**
 * NON-NEGOTIABLE: Check if a signal count meets K-anonymity threshold.
 * This function is the CANONICAL enforcement point for the Rule of 5.
 *
 * DO NOT bypass this check. DO NOT lower the threshold.
 * Any view returning false MUST show "Insufficient Data" in grey.
 */
export function meetsKAnonymity(signalCount: number): boolean {
  return signalCount >= K_ANONYMITY_THRESHOLD;
}

/**
 * Create a suppressed value (for UI rendering).
 */
export function createSuppressedValue(): AggregatedValue {
  return {
    value: null,
    isSuppressed: true,
    suppressionReason: 'insufficient_data',
  };
}

/**
 * Create a visible value (meets K-anonymity).
 */
export function createVisibleValue(value: number): AggregatedValue {
  return {
    value,
    isSuppressed: false,
    suppressionReason: null,
  };
}

/**
 * Apply K-anonymity to a raw value.
 */
export function applyKAnonymity(
  rawValue: number,
  signalCount: number
): AggregatedValue {
  if (!meetsKAnonymity(signalCount)) {
    return createSuppressedValue();
  }
  return createVisibleValue(rawValue);
}

// =============================================================================
// METRICS AGGREGATION WITH K-ANONYMITY
// =============================================================================

export interface RawUnitSignals {
  unitId: string;
  unitName: string;
  signals: Array<{
    state: 'resourced' | 'stretched' | 'depleted';
    timestamp: string;
  }>;
}

/**
 * Calculate aggregated metrics with K-anonymity enforcement.
 * This is the ONLY way to get unit metrics in Class B.
 */
export function calculateAggregatedMetrics(
  raw: RawUnitSignals
): AggregatedUnitMetrics {
  const signalCount = raw.signals.length;
  const isSuppressed = !meetsKAnonymity(signalCount);

  if (isSuppressed) {
    // Return fully suppressed metrics
    return {
      unitId: raw.unitId,
      unitName: raw.unitName,
      load: createSuppressedValue(),
      risk: createSuppressedValue(),
      velocity: 'suppressed',
      freshness: 'suppressed',
      signalCount,
      isSuppressed: true,
    };
  }

  // Calculate actual metrics (K-anonymity threshold met)
  const load = calculateLoad(raw.signals);
  const risk = calculateRisk(raw.signals);
  const velocity = calculateVelocity(raw.signals);
  const freshness = calculateFreshness(raw.signals);

  return {
    unitId: raw.unitId,
    unitName: raw.unitName,
    load: createVisibleValue(load),
    risk: createVisibleValue(risk),
    velocity,
    freshness,
    signalCount,
    isSuppressed: false,
  };
}

/**
 * Calculate load (% capacity = % resourced signals).
 */
function calculateLoad(
  signals: Array<{ state: 'resourced' | 'stretched' | 'depleted' }>
): number {
  if (signals.length === 0) return 0;
  const resourced = signals.filter(s => s.state === 'resourced').length;
  return Math.round((resourced / signals.length) * 100);
}

/**
 * Calculate risk (% depleted signals).
 */
function calculateRisk(
  signals: Array<{ state: 'resourced' | 'stretched' | 'depleted' }>
): number {
  if (signals.length === 0) return 0;
  const depleted = signals.filter(s => s.state === 'depleted').length;
  return Math.round((depleted / signals.length) * 100);
}

/**
 * Calculate velocity (trend direction).
 * Compares recent week to previous week.
 */
function calculateVelocity(
  signals: Array<{ state: 'resourced' | 'stretched' | 'depleted'; timestamp: string }>
): TrendDirection {
  if (signals.length < 2) return 'stable';

  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

  const recentSignals = signals.filter(s => new Date(s.timestamp).getTime() > oneWeekAgo);
  const previousSignals = signals.filter(s => {
    const t = new Date(s.timestamp).getTime();
    return t > twoWeeksAgo && t <= oneWeekAgo;
  });

  if (recentSignals.length < K_ANONYMITY_THRESHOLD || previousSignals.length < K_ANONYMITY_THRESHOLD) {
    return 'stable'; // Not enough data for trend
  }

  const recentLoad = calculateLoad(recentSignals);
  const previousLoad = calculateLoad(previousSignals);

  const delta = recentLoad - previousLoad;

  if (delta > 5) return 'improving';
  if (delta < -5) return 'declining';
  return 'stable';
}

/**
 * Calculate freshness (signal recency).
 */
function calculateFreshness(
  signals: Array<{ timestamp: string }>
): FreshnessLevel {
  if (signals.length === 0) return 'dormant';

  const mostRecent = Math.max(...signals.map(s => new Date(s.timestamp).getTime()));
  const hoursSinceLastSignal = (Date.now() - mostRecent) / (1000 * 60 * 60);

  if (hoursSinceLastSignal <= FRESHNESS_WINDOW_HOURS) return 'fresh';
  if (hoursSinceLastSignal <= FRESHNESS_WINDOW_HOURS * 3) return 'stale';
  return 'dormant';
}

// =============================================================================
// FILTERED VIEW ENFORCEMENT
// =============================================================================

export interface FilteredViewRequest {
  unitIds?: string[];
  dateRange?: { start: string; end: string };
  stateFilter?: ('resourced' | 'stretched' | 'depleted')[];
}

/**
 * Validate that a filtered view meets K-anonymity before allowing it.
 */
export function validateFilteredView(
  allSignals: RawUnitSignals[],
  filter: FilteredViewRequest
): { allowed: boolean; reason: string; resultingSignalCount: number } {
  // Apply filters
  let filteredSignals = allSignals;

  if (filter.unitIds && filter.unitIds.length > 0) {
    filteredSignals = filteredSignals.filter(u => filter.unitIds!.includes(u.unitId));
  }

  // Count total signals after filter
  let totalSignalCount = 0;
  for (const unit of filteredSignals) {
    let unitSignals = unit.signals;

    if (filter.dateRange) {
      const start = new Date(filter.dateRange.start).getTime();
      const end = new Date(filter.dateRange.end).getTime();
      unitSignals = unitSignals.filter(s => {
        const t = new Date(s.timestamp).getTime();
        return t >= start && t <= end;
      });
    }

    if (filter.stateFilter && filter.stateFilter.length > 0) {
      unitSignals = unitSignals.filter(s => filter.stateFilter!.includes(s.state));
    }

    totalSignalCount += unitSignals.length;
  }

  if (!meetsKAnonymity(totalSignalCount)) {
    return {
      allowed: false,
      reason: `Filtered view contains only ${totalSignalCount} signals. Minimum ${K_ANONYMITY_THRESHOLD} required.`,
      resultingSignalCount: totalSignalCount,
    };
  }

  return {
    allowed: true,
    reason: 'K-anonymity threshold met',
    resultingSignalCount: totalSignalCount,
  };
}

// =============================================================================
// EXPORT ENFORCEMENT
// =============================================================================

export interface ExportRequest {
  format: 'csv' | 'json' | 'pdf';
  includeUnits: string[];
  dateRange?: { start: string; end: string };
}

/**
 * Validate export request against K-anonymity.
 */
export function validateExportRequest(
  allSignals: RawUnitSignals[],
  request: ExportRequest
): { allowed: boolean; reason: string; blockedUnits: string[] } {
  const blockedUnits: string[] = [];

  for (const unitId of request.includeUnits) {
    const unit = allSignals.find(u => u.unitId === unitId);
    if (!unit) continue;

    let signals = unit.signals;

    if (request.dateRange) {
      const start = new Date(request.dateRange.start).getTime();
      const end = new Date(request.dateRange.end).getTime();
      signals = signals.filter(s => {
        const t = new Date(s.timestamp).getTime();
        return t >= start && t <= end;
      });
    }

    if (!meetsKAnonymity(signals.length)) {
      blockedUnits.push(unitId);
    }
  }

  if (blockedUnits.length > 0) {
    return {
      allowed: false,
      reason: `${blockedUnits.length} unit(s) do not meet K-anonymity threshold and will be excluded from export.`,
      blockedUnits,
    };
  }

  return {
    allowed: true,
    reason: 'All units meet K-anonymity threshold',
    blockedUnits: [],
  };
}

// =============================================================================
// DRILL-DOWN ENFORCEMENT
// =============================================================================

/**
 * Validate drill-down request (e.g., clicking on a unit row).
 */
export function validateDrillDown(
  unit: RawUnitSignals,
  drillDownType: 'time_series' | 'state_breakdown' | 'subunit_view'
): { allowed: boolean; reason: string } {
  if (!meetsKAnonymity(unit.signals.length)) {
    return {
      allowed: false,
      reason: 'Insufficient data for drill-down. Unit does not meet privacy threshold.',
    };
  }

  // For subunit view, check if we have enough subunits with enough signals
  // This prevents inferring individual data from small subunits
  if (drillDownType === 'subunit_view') {
    // Additional check would go here if we had subunit data
    // For now, we just verify the parent unit
  }

  return {
    allowed: true,
    reason: 'Drill-down permitted',
  };
}

// =============================================================================
// SIGNAL DELAY ENFORCEMENT
// =============================================================================

/**
 * Apply temporal delay to signals to break inference attacks.
 * Signals are not visible until SIGNAL_DELAY_SECONDS have passed.
 */
export function applySignalDelay<T extends { timestamp: string }>(
  signals: T[]
): T[] {
  const cutoff = Date.now() - SIGNAL_DELAY_SECONDS * 1000;

  return signals.filter(s => {
    const signalTime = new Date(s.timestamp).getTime();
    return signalTime < cutoff;
  });
}

/**
 * Get the delay window for UI display.
 */
export function getDelayWindowMessage(): string {
  const minutes = Math.round(SIGNAL_DELAY_SECONDS / 60);
  return `Data is delayed by ${minutes} minutes to protect privacy.`;
}

// =============================================================================
// UI RENDERING HELPERS
// =============================================================================

/**
 * Get CSS class for a suppressed value.
 */
export function getSuppressedDisplayClass(): string {
  return 'text-gray-500 bg-gray-100';
}

/**
 * Get display text for suppressed data.
 *
 * DOCTRINE: Privacy by Architecture, K-Anonymity
 * When data is suppressed due to K-anonymity threshold (min 5),
 * we show a clear privacy message, not just "insufficient data".
 */
export function getSuppressedDisplayText(): string {
  return 'Privacy Protected';
}

/**
 * Get explanatory message for suppressed data.
 * Use this in tooltips or detail views.
 */
export function getSuppressedExplanation(): string {
  return `Data suppressed for privacy (minimum ${K_ANONYMITY_THRESHOLD} signals required)`;
}

/**
 * Check if a value should render with color (red/green).
 * Returns false for suppressed values.
 */
export function shouldRenderWithColor(value: AggregatedValue): boolean {
  return !value.isSuppressed && value.value !== null;
}

/**
 * Get the appropriate color for a load value.
 * Returns grey for suppressed values.
 */
export function getLoadColor(value: AggregatedValue): string {
  if (value.isSuppressed || value.value === null) {
    return '#888888'; // Grey
  }

  // Green → Yellow → Red gradient based on inverse (lower load = more concern)
  const load = value.value;
  if (load >= 70) return '#22C55E'; // Green
  if (load >= 40) return '#EAB308'; // Yellow
  return '#EF4444'; // Red
}

/**
 * Get the appropriate color for a risk value.
 * Returns grey for suppressed values.
 */
export function getRiskColor(value: AggregatedValue): string {
  if (value.isSuppressed || value.value === null) {
    return '#888888'; // Grey
  }

  // Lower risk is better (green), higher risk is worse (red)
  const risk = value.value;
  if (risk <= 10) return '#22C55E'; // Green
  if (risk <= 30) return '#EAB308'; // Yellow
  return '#EF4444'; // Red
}

/**
 * Get trend arrow for velocity.
 */
export function getVelocityArrow(velocity: TrendDirection): string {
  switch (velocity) {
    case 'improving':
      return '↑';
    case 'declining':
      return '↓';
    case 'stable':
      return '→';
    case 'suppressed':
      return '—';
  }
}

/**
 * Get freshness indicator.
 */
export function getFreshnessIndicator(freshness: FreshnessLevel): string {
  switch (freshness) {
    case 'fresh':
      return '●'; // Solid dot
    case 'stale':
      return '○'; // Empty dot
    case 'dormant':
      return '◌'; // Dashed dot
    case 'suppressed':
      return '—';
  }
}
