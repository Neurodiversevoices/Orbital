/**
 * QSB Card Component
 *
 * Base card component for QSB briefing screens.
 * Provides consistent styling across all QSB features.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../../theme';
import { DemoBadge } from './DemoBadge';

interface QSBCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onPress?: () => void;
  showDemo?: boolean;
  delay?: number;
  rightElement?: React.ReactNode;
}

export function QSBCard({
  title,
  subtitle,
  children,
  onPress,
  showDemo,
  delay = 0,
  rightElement,
}: QSBCardProps) {
  const content = (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {showDemo && <DemoBadge />}
          </View>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rightElement && <View style={styles.headerRight}>{rightElement}</View>}
        {onPress && !rightElement && (
          <ChevronRight color="rgba(255,255,255,0.3)" size={20} />
        )}
      </View>
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
}

// Metric display for QSB cards
interface QSBMetricProps {
  value: string | number;
  label: string;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

export function QSBMetric({ value, label, trend, color, size = 'medium' }: QSBMetricProps) {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendColor = trend === 'up' ? '#00D7FF' : trend === 'down' ? '#FF3B30' : 'rgba(255,255,255,0.5)';

  const valueSizes = {
    small: 20,
    medium: 32,
    large: 48,
  };

  return (
    <View style={styles.metric}>
      <View style={styles.metricValueRow}>
        <Text
          style={[
            styles.metricValue,
            { fontSize: valueSizes[size] },
            color && { color },
          ]}
        >
          {value}
        </Text>
        {trend && (
          <Text style={[styles.trendIcon, { color: trendColor }]}>{trendIcon}</Text>
        )}
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// Sparkline component for trends
interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function Sparkline({ data, color = '#00D7FF', height = 40, width = 120 }: SparklineProps) {
  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={[styles.sparkline, { height, width }]}>
      <View style={styles.sparklineInner}>
        {/* Simple line visualization using views */}
        {data.slice(0, -1).map((value, index) => {
          const nextValue = data[index + 1];
          const x1 = (index / (data.length - 1)) * width;
          const x2 = ((index + 1) / (data.length - 1)) * width;
          const y1 = height - ((value - min) / range) * (height - 4);
          const y2 = height - ((nextValue - min) / range) * (height - 4);

          const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

          return (
            <View
              key={index}
              style={[
                styles.sparklineLine,
                {
                  width: length,
                  backgroundColor: color,
                  left: x1,
                  top: y1,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  content: {
    // Content styles
  },
  metric: {
    alignItems: 'center',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  metricValue: {
    fontWeight: '300',
    color: 'rgba(255,255,255,0.95)',
    fontVariant: ['tabular-nums'],
  },
  trendIcon: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sparkline: {
    overflow: 'hidden',
  },
  sparklineInner: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  sparklineLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    transformOrigin: 'left center',
  },
});

export default QSBCard;
