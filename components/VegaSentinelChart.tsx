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
        return 'Critical volatility threshold exceeded';
      case 'sustained_volatility':
        return 'Sustained volatility detected';
      case 'elevated':
        return 'Elevated activity observed';
      default:
        return 'Within normal parameters';
    }
  }, [systemState]);

  const stateColor =
    systemState === 'critical'
      ? '#ef4444'
      : systemState === 'sustained_volatility' || systemState === 'elevated'
        ? '#f59e0b'
        : '#22c55e';

  return (
    <View style={styles.panel}>
      <Text style={[styles.panelTitle, { color: stateColor }]}>SYSTEM STATE: {stateText}</Text>
      <Text style={styles.panelSubtext}>{consecutiveDays} consecutive days above baseline</Text>
      <Text style={styles.panelSubtext}>Sample size: n={sampleSize.toLocaleString()}</Text>
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

  // Trigger callout
  const showTriggerCallout = systemState === 'sustained_volatility' || systemState === 'critical';
  const triggerColor = systemState === 'critical' ? '#ef4444' : '#f59e0b';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ORBITAL SENTINEL™</Text>
        <Text style={styles.headerSubtitle}>CAPACITY VOLATILITY EARLY WARNING SYSTEM</Text>
      </View>

      {/* Cohort selector info */}
      <View style={styles.cohortRow}>
        <Text style={styles.cohortLabel}>Cohort: {cohortLabel}</Text>
      </View>

      {/* Trigger callout */}
      {showTriggerCallout && triggerAnnotation && (
        <View style={[styles.triggerCallout, { borderColor: triggerColor }]}>
          <View style={[styles.triggerDot, { backgroundColor: triggerColor }]} />
          <Text style={[styles.triggerText, { color: triggerColor }]}>{triggerAnnotation}</Text>
        </View>
      )}

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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cohortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cohortLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  triggerCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  triggerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  triggerText: {
    fontSize: 12,
    fontWeight: '600',
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
    gap: spacing.md,
    marginTop: spacing.md,
  },
  panel: {
    flex: 1,
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  panelSubtext: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  footerDisclaimer: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});

export default VegaSentinelChart;
