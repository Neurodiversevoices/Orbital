/**
 * Vega-Lite Sentinel Chart Component
 *
 * STATE FIRST. RENDER MODE CONTRACT.
 *
 * EXECUTIVE SAFETY-CRITICAL:
 * 1. Derive SentinelState BEFORE render
 * 2. Get RenderMode from state
 * 3. Apply render contract to all visual elements
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
import {
  VolatilityDataPoint,
  SystemState,
  SentinelState,
  SentinelRenderMode,
  RENDER_MODES,
  deriveSentinelState,
} from '../lib/sentinel/types';
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
// THRESHOLD CONDITION TEXT (NO BANNED WORDS)
// =============================================================================

function getThresholdCondition(sentinelState: SentinelState): string {
  switch (sentinelState) {
    case 'BREACH_CONFIRMED':
      return 'Active';
    case 'DEGRADED':
      return 'Elevated';
    case 'RECOVERING':
      return 'Recovering';
    case 'CALM':
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

  // =========================================================================
  // STEP 1: DERIVE SENTINEL STATE (BEFORE RENDER)
  // =========================================================================
  const sentinelState: SentinelState = useMemo(() => {
    return deriveSentinelState(systemState, consecutiveDays);
  }, [systemState, consecutiveDays]);

  // =========================================================================
  // STEP 2: GET RENDER MODE FROM STATE
  // =========================================================================
  const renderMode: SentinelRenderMode = RENDER_MODES[sentinelState];

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

  // Generate spec with renderMode
  const spec = useMemo(() => {
    const chartData: SentinelChartData = {
      points: vegaData,
      triggerDay,
      triggerAnnotation,
      baseline,
      cohortLabel,
      sampleSize,
      renderMode,
    };
    return generateSentinelSpec(chartData);
  }, [vegaData, triggerDay, triggerAnnotation, baseline, cohortLabel, sampleSize, renderMode]);

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

  const conditionText = getThresholdCondition(sentinelState);

  // =========================================================================
  // STEP 3: RENDER WITH STATE-DRIVEN STYLING
  // =========================================================================
  return (
    <View style={styles.container}>
      {/* ============================================================= */}
      {/* 1. SYSTEM STATE BANNER — TOP 20%, FULL WIDTH, NON-INTERACTIVE */}
      {/* Format: "SYSTEM STATE: <renderMode.bannerLabel>"              */}
      {/* ============================================================= */}
      <View style={[styles.systemStateBanner, { backgroundColor: renderMode.bannerBg }]}>
        <Text style={styles.systemStateLabel}>SYSTEM STATE</Text>
        <Text style={[styles.systemStateValue, { color: renderMode.bannerText }]}>
          {renderMode.bannerLabel}
        </Text>
        <Text style={styles.systemStateMeta}>DEMO / SIMULATED / AGGREGATE</Text>
      </View>

      {/* ============================================================= */}
      {/* 2. THRESHOLD STATUS PANEL — TEXTUAL CERTAINTY (2-3 lines max) */}
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
      {/* 3. VOLATILITY CONDITION GRAPH — SUPPORTING EVIDENCE           */}
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
      {/* 4. SIGNAL INTEGRITY FOOTNOTE — BOTTOM (3 short lines)         */}
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
    backgroundColor: 'rgba(20, 35, 55, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.10)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  systemStateLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  systemStateValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textHeading,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  systemStateMeta: {
    fontSize: 9,
    fontWeight: '400',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 8,
  },

  // =========================================================================
  // 2. THRESHOLD STATUS PANEL
  // =========================================================================
  thresholdPanel: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(20, 35, 55, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  thresholdTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  thresholdLine: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },

  // =========================================================================
  // 3. VOLATILITY CONDITION GRAPH
  // =========================================================================
  chartSection: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  cohortLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  chartContainer: {
    backgroundColor: COLORS.bgMid,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: COLORS.textSecondary,
    fontSize: 12,
  },

  // =========================================================================
  // 4. SIGNAL INTEGRITY FOOTNOTE
  // =========================================================================
  signalIntegrityPanel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(20, 35, 55, 0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: spacing.sm,
  },
  signalIntegrityTitle: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  signalIntegrityLine: {
    fontSize: 10,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
});

export default VegaSentinelChart;
