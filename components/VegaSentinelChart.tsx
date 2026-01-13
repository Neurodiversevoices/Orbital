/**
 * Vega-Lite Sentinel Chart Component
 *
 * Renders Sentinel volatility charts using Vega-Lite.
 * Designed for executive briefing visual language.
 *
 * WEB ONLY: This component uses vega-embed which is web-specific.
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
  /** Volatility data points */
  points: VolatilityDataPoint[];
  /** Baseline threshold value */
  baseline: number;
  /** Current system state */
  systemState: SystemState;
  /** Consecutive days above baseline */
  consecutiveDays: number;
  /** Cohort label for display */
  cohortLabel: string;
  /** Sample size N */
  sampleSize: number;
  /** Optional title override */
  title?: string;
}

// =============================================================================
// SYSTEM STATE PANEL
// =============================================================================

function SystemStatePanel({
  systemState,
  consecutiveDays,
  sampleSize,
}: {
  systemState: SystemState;
  consecutiveDays: number;
  sampleSize: number;
}) {
  const stateText = useMemo(() => {
    switch (systemState) {
      case 'critical':
        return 'Critical threshold exceeded';
      case 'sustained_volatility':
        return 'Sustained volatility detected';
      case 'elevated':
        return 'Elevated activity observed';
      default:
        return 'Within normal parameters';
    }
  }, [systemState]);

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>System State</Text>
      <Text style={styles.panelSubtext}>{stateText}</Text>
      <Text style={styles.panelSubtext}>{consecutiveDays} days above baseline</Text>
      <Text style={styles.panelSubtext}>n={sampleSize.toLocaleString()}</Text>
    </View>
  );
}

// =============================================================================
// ASSESSMENT PANEL
// =============================================================================

function AssessmentPanel({ systemState }: { systemState: SystemState }) {
  const bullets = useMemo(() => {
    switch (systemState) {
      case 'critical':
      case 'sustained_volatility':
        return [
          'Sustained deviation from historical baseline',
          'Increased probability of downstream disruption',
          'Signal is aggregate and non-identifying',
        ];
      case 'elevated':
        return [
          'Activity above typical range',
          'Monitoring for sustained patterns',
          'Signal is aggregate and non-identifying',
        ];
      default:
        return [
          'Activity within expected range',
          'No action required at this time',
          'Signal is aggregate and non-identifying',
        ];
    }
  }, [systemState]);

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>ASSESSMENT</Text>
      {bullets.map((bullet, idx) => (
        <Text key={idx} style={styles.bulletText}>
          • {bullet}
        </Text>
      ))}
    </View>
  );
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
  title,
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

  // Render Vega chart (web only)
  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    // Dynamic import vega-embed for web only
    import('vega-embed').then(({ default: vegaEmbed }) => {
      vegaEmbed(containerRef.current!, spec as any, {
        actions: false,
        renderer: 'svg',
        theme: 'dark',
      }).catch(console.error);
    });
  }, [spec]);

  return (
    <View style={styles.container}>
      {/* Header — quiet, institutional */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orbital Sentinel</Text>
        <Text style={styles.headerSubtitle}>Capacity Volatility Early Warning</Text>
      </View>

      {/* Cohort selector info */}
      <View style={styles.cohortRow}>
        <Text style={styles.cohortLabel}>{cohortLabel}</Text>
      </View>

      {/* Chart container */}
      <View style={styles.chartContainer}>
        {Platform.OS === 'web' ? (
          <div ref={containerRef} style={{ width: '100%', minHeight: 260 }} />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>Chart available on web only</Text>
          </View>
        )}
      </View>

      {/* Bottom panels */}
      <View style={styles.panelsRow}>
        <SystemStatePanel systemState={systemState} consecutiveDays={consecutiveDays} sampleSize={sampleSize} />
        <AssessmentPanel systemState={systemState} />
      </View>

      {/* Footer disclaimer */}
      <Text style={styles.footerDisclaimer}>
        Illustrative aggregate-level capacity intelligence view. No personal data is tracked or collected.
      </Text>
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
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
    marginTop: 2,
    opacity: 0.7,
  },
  cohortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cohortLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  chartContainer: {
    backgroundColor: COLORS.bgMid,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    minHeight: 260,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 260,
  },
  fallbackText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  panelsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  panel: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: spacing.sm,
  },
  panelTitle: {
    fontSize: 9,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  panelSubtext: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
    opacity: 0.7,
  },
  bulletText: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
    lineHeight: 13,
    opacity: 0.8,
  },
  footerDisclaimer: {
    fontSize: 8,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    opacity: 0.5,
  },
});

export default VegaSentinelChart;
