/**
 * DetectedPatternCard.tsx — Single "Detected Pattern" tile (light theme).
 *
 * Used in the Pattern Intelligence tab beneath the big chart. Same shape as
 * `HealthMetricCard` but tuned for narrative patterns: bigger value, prose
 * description below, and a gradient accent bar fading from `iconColor` to
 * transparent across the bottom edge.
 *
 * Stub usage:
 *   import { CalendarDays } from 'lucide-react-native';
 *   <DetectedPatternCard
 *     icon={CalendarDays}
 *     iconColor={colors.depleted}
 *     eyebrow="Monday Pattern"
 *     value="66"
 *     valueColor={colors.depleted}
 *     description="Capacity usually drops on Mondays."
 *   />
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { colors } from '../theme/colors';

// =============================================================================
// TYPES
// =============================================================================

interface DetectedPatternCardProps {
  /** Lucide icon component (or `{size, color}`-shaped). */
  icon: React.ComponentType<{ size: number; color: string }>;
  /** Icon tint, also used for the bottom accent gradient. */
  iconColor: string;
  /** Uppercase mono caption (e.g., "MONDAY PATTERN"). */
  eyebrow: string;
  /** Display value (e.g., "66", "5.1h", "↓ 33.4"). */
  value: string;
  /** Color for the value — usually matches iconColor or a state color. */
  valueColor: string;
  /** One-line prose explanation below the value. */
  description: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ACCENT_HEIGHT = 3;

// =============================================================================
// COMPONENT
// =============================================================================

export function DetectedPatternCard({
  icon: Icon,
  iconColor,
  eyebrow,
  value,
  valueColor,
  description,
}: DetectedPatternCardProps): React.ReactElement {
  const a11yLabel = `${eyebrow}, ${value}. ${description}`;
  const accentGradId = `accent-${eyebrow.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.iconRow}>
        <Icon size={22} color={iconColor} />
      </View>

      <Text
        maxFontSizeMultiplier={1.5}
        numberOfLines={1}
        style={styles.eyebrow}
      >
        {eyebrow.toUpperCase()}
      </Text>

      <Text
        maxFontSizeMultiplier={1.5}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.value, { color: valueColor }]}
      >
        {value}
      </Text>

      <Text
        maxFontSizeMultiplier={1.5}
        numberOfLines={2}
        style={styles.description}
      >
        {description}
      </Text>

      {/* Bottom accent gradient — iconColor → transparent (left → right). */}
      <View pointerEvents="none" style={styles.accentWrap}>
        <Svg width="100%" height={ACCENT_HEIGHT}>
          <Defs>
            <SvgLinearGradient id={accentGradId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={iconColor} stopOpacity="0.85" />
              <Stop offset="1" stopColor={iconColor} stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height={ACCENT_HEIGHT} fill={`url(#${accentGradId})`} />
        </Svg>
      </View>
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
    minHeight: 156,
    overflow: 'hidden',
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  iconRow: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrow: {
    marginTop: 8,
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.textSecondary,
  },
  value: {
    marginTop: 8,
    fontFamily: 'DMSans_700Bold',
    fontSize: 30,
    lineHeight: 34,
  },
  description: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  accentWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: ACCENT_HEIGHT,
  },
});

export default DetectedPatternCard;
