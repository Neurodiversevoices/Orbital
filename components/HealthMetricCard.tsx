/**
 * HealthMetricCard.tsx — Apple-Health-style metric card (light theme).
 *
 * Vertical card showing a single biometric reading: icon + uppercase mono
 * label + large bold value (with optional unit) + optional trend label.
 * Designed to flex 1/3 inside a 3-card row on the home screen.
 *
 * Stub usage:
 *   import { HeartPulse } from 'lucide-react-native';
 *   <HealthMetricCard
 *     icon={HeartPulse}
 *     iconColor={colors.depleted}
 *     label="Recovery"
 *     value="6.6"
 *     valueUnit="h"
 *     trend="steady"
 *     trendLabel="steady"
 *     trendColor={colors.stretched}
 *   />
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

// =============================================================================
// TYPES
// =============================================================================

export type MetricTrend = 'up' | 'down' | 'steady';

interface HealthMetricCardProps {
  /** Lucide icon component (or anything with `{size, color}` props). */
  icon: React.ComponentType<{ size: number; color: string }>;
  /** Icon tint — usually drawn from the capacity spectrum. */
  iconColor: string;
  /** Uppercase mono caption (e.g., "RECOVERY"). */
  label: string;
  /** Primary numeric reading (e.g., "6.6"). */
  value: string;
  /** Optional unit suffix (e.g., "h", "ms", "bpm"). */
  valueUnit?: string;
  /** Optional trend direction — informs default arrow glyph if no label. */
  trend?: MetricTrend;
  /** Optional trend caption (e.g., "steady", "↓ low"). */
  trendLabel?: string;
  /** Optional trend color — defaults to text-secondary. */
  trendColor?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function HealthMetricCard({
  icon: Icon,
  iconColor,
  label,
  value,
  valueUnit,
  trend,
  trendLabel,
  trendColor,
}: HealthMetricCardProps): React.ReactElement {
  const composedTrend = trendLabel ?? (trend ? trend : undefined);
  const trendTextColor = trendColor ?? colors.textSecondary;

  // Build a flat a11y label combining label + value + optional trend.
  const a11y = [
    label,
    `${value}${valueUnit ?? ''}`,
    composedTrend ? `trend ${composedTrend}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11y}
    >
      <View style={styles.iconRow}>
        <Icon size={20} color={iconColor} />
      </View>

      <Text
        maxFontSizeMultiplier={1.5}
        numberOfLines={1}
        style={styles.label}
      >
        {label.toUpperCase()}
      </Text>

      <View style={styles.valueRow}>
        <Text
          maxFontSizeMultiplier={1.5}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.value}
        >
          {value}
        </Text>
        {valueUnit ? (
          <Text
            maxFontSizeMultiplier={1.5}
            numberOfLines={1}
            style={styles.valueUnit}
          >
            {valueUnit}
          </Text>
        ) : null}
      </View>

      {composedTrend ? (
        <Text
          maxFontSizeMultiplier={1.5}
          numberOfLines={1}
          style={[styles.trend, { color: trendTextColor }]}
        >
          {composedTrend}
        </Text>
      ) : null}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 16,
    paddingHorizontal: 14,
    minHeight: 116,
    // Subtle shadow for separation against light background
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  iconRow: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    marginTop: 10,
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.textSecondary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  value: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  valueUnit: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 3,
  },
  trend: {
    marginTop: 6,
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    letterSpacing: 0.4,
  },
});

export default HealthMetricCard;
