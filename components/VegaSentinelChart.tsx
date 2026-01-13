/**
 * Vega-Lite Sentinel Chart Component
 *
 * STATE FIRST. DATA SECOND.
 *
 * MANDATORY SCREEN ORDER:
 * 1. SYSTEM STATE BANNER (top 20%, full width, non-interactive)
 * 2. THRESHOLD STATUS PANEL (textual certainty)
 * 3. VOLATILITY CONDITION GRAPH (supporting evidence)
 * 4. SIGNAL INTEGRITY FOOTNOTE (bottom)
 *
 * WEB ONLY.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { generateSentinelSpec, convertToVegaData, COLORS } from '../lib/vega/sentinelSpec';
import type { SentinelChartData } from '../lib/vega/sentinelSpec';
import { VolatilityDataPoint, SystemState } from '../lib/sentinel/types';
import { spacing, borderRadius } from '../theme';

// =============================================================================
// TYPES
// =============================================================================

interface VegaSentinelChartProps {
  points: VolatilityDataPoint[];
  baseline: number;
  systemState: SystemState;
  consecutiveDays: number;
  cohortLabel: string;
  sampleSize: number;
}

// =============================================================================
// SYSTEM STATE MAPPING (NO BANNED WORDS)
// =============================================================================

function getSystemStateText(state: SystemState): string {
  switch (state) {
    case 'critical':
      return 'BASELINE BREACH CONFIRMED';
    case 'sustained_volatility':
      return 'SUSTAINED VOLATILITY';
    case 'elevated':
      return 'SENTINEL ACTIVE';
    default:
      return 'MONITORING';
  }
}

function getThresholdCondition(state: SystemState): string {
  switch (state) {
    case 'critical':
    case 'sustained_volatility':
      return 'Active';
    case 'elevated':
      return 'Elevated';
    default:
      return 'Normal';
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VegaSentinelChart({
  points,
  baseline,
  systemState,
  consecutiveDays,
  cohortLabel,
  sampleSize,
}: VegaSentinelChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert points to Vega format
  const vegaData = useMemo(() => convertToVegaData(points), [points]);

  // Find trigger day
  const triggerDay = useMemo(() => {
    let consecutive = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i].exceedsBaseline) {
        consecutive++;
        if (consecutive >= 3) {
          return points[i].dayOffset;
        }
      } else {
        consecutive = 0;
      }
    }
    return null;
  }, [points]);

  const triggerAnnotation = triggerDay !== null ? `Sentinel Triggered — Day ${Math.abs(triggerDay)}` : null;

  // Generate spec
  const spec = useMemo(() => {
    const chartData: SentinelChartData = {
      points: vegaData,
      triggerDay,
      triggerAnnotation,
      baseline,
      cohortLabel,
      sampleSize,
    };
    return generateSentinelSpec(chartData);
  }, [vegaData, triggerDay, triggerAnnotation, baseline, cohortLabel, sampleSize]);

  // Render Vega chart (web only) — SVG, actions off, tooltips off
  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    import('vega-embed').then(({ default: vegaEmbed }) => {
      vegaEmbed(containerRef.current!, spec as any, {
        actions: false,
        renderer: 'svg',
        tooltip: false,
      }).catch(console.error);
    });
  }, [spec]);

  const stateText = getSystemStateText(systemState);
  const conditionText = getThresholdCondition(systemState);

  return (
    <View style={styles.container}>
      {/* ============================================================= */}
      {/* 1. SYSTEM STATE BANNER — TOP 20%, FULL WIDTH, NON-INTERACTIVE */}
      {/* ============================================================= */}
      <View style={styles.systemStateBanner}>
        <Text style={styles.systemStateLabel}>SYSTEM STATE</Text>
        <Text style={styles.systemStateValue}>{stateText}</Text>
        <Text style={styles.systemStateMeta}>DEMO / SIMULATED / AGGREGATE</Text>
      </View>

      {/* ============================================================= */}
      {/* 2. THRESHOLD STATUS PANEL — TEXTUAL CERTAINTY */}
      {/* ============================================================= */}
      <View style={styles.thresholdPanel}>
        <Text style={styles.thresholdTitle}>THRESHOLD STATUS</Text>
        <Text style={styles.thresholdLine}>
          Baseline exceeded for {consecutiveDays} consecutive days
        </Text>
        {triggerDay !== null && (
          <Text style={styles.thresholdLine}>
            Trigger condition met on Day {Math.abs(triggerDay)}
          </Text>
        )}
        <Text style={styles.thresholdLine}>Condition: {conditionText}</Text>
      </View>

      {/* ============================================================= */}
      {/* 3. VOLATILITY CONDITION GRAPH — SUPPORTING EVIDENCE */}
      {/* ============================================================= */}
      <View style={styles.chartSection}>
        <Text style={styles.cohortLabel}>{cohortLabel} · n={sampleSize.toLocaleString()}</Text>
        <View style={styles.chartContainer}>
          {Platform.OS === 'web' ? (
            <div ref={containerRef} style={{ width: '100%', minHeight: 180 }} />
          ) : (
            <View style={styles.fallback}>
              <Text style={styles.fallbackText}>Chart available on web only</Text>
            </View>
          )}
        </View>
      </View>

      {/* ============================================================= */}
      {/* 4. SIGNAL INTEGRITY FOOTNOTE — BOTTOM */}
      {/* ============================================================= */}
      <View style={styles.signalIntegrityPanel}>
        <Text style={styles.signalIntegrityTitle}>SIGNAL INTEGRITY</Text>
        <Text style={styles.signalIntegrityLine}>Aggregate signal (cohort-level)</Text>
        <Text style={styles.signalIntegrityLine}>Non-identifying</Text>
        <Text style={styles.signalIntegrityLine}>Monitoring-only (non-operational demo)</Text>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.bgDark,
    borderRadius: borderRadius.md,
  },

  // =========================================================================
  // 1. SYSTEM STATE BANNER — dominates top ~20%
  // =========================================================================
  systemStateBanner: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  systemStateLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  systemStateValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  systemStateMeta: {
    fontSize: 8,
    fontWeight: '400',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 8,
    opacity: 0.6,
  },

  // =========================================================================
  // 2. THRESHOLD STATUS PANEL
  // =========================================================================
  thresholdPanel: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  thresholdTitle: {
    fontSize: 9,
    fontWeight: '500',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  thresholdLine: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  // =========================================================================
  // 3. VOLATILITY CONDITION GRAPH
  // =========================================================================
  chartSection: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  cohortLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  chartContainer: {
    backgroundColor: COLORS.bgMid,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
    minHeight: 180,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 180,
  },
  fallbackText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },

  // =========================================================================
  // 4. SIGNAL INTEGRITY FOOTNOTE
  // =========================================================================
  signalIntegrityPanel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    marginTop: spacing.sm,
  },
  signalIntegrityTitle: {
    fontSize: 8,
    fontWeight: '500',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
    opacity: 0.7,
  },
  signalIntegrityLine: {
    fontSize: 8,
    color: COLORS.textMuted,
    lineHeight: 12,
    opacity: 0.6,
  },
});

export default VegaSentinelChart;
