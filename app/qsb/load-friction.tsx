/**
 * Load Friction Map Screen
 *
 * Shows a heatmap of when capacity dips most:
 * - Day of week (Mon-Sun) on Y axis
 * - Time of day (Morning, Midday, Afternoon, Evening, Night) on X axis
 * - Color intensity shows capacity level (darker = lower)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, AlertTriangle, Zap } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { ScopeSelectorCompact, DemoBadge, InsufficientSignalsWarning } from '../../components/qsb';
import { useLoadFriction, QSBScope, DayOfWeek, TimeBlock } from '../../lib/qsb';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES: TimeBlock[] = ['Morning', 'Midday', 'Afternoon', 'Evening', 'Night'];
const TIME_LABELS = ['6-10', '10-14', '14-18', '18-22', '22-6'];

// Color interpolation for heatmap (capacity spectrum on light surface)
function getHeatmapColor(value: number): string {
  // 0-40: Crimson #DC2626 (low capacity / high friction)
  // 40-60: Amber #F59E0B (moderate)
  // 60-100: Teal #2DD4BF (high capacity / low friction)
  if (value < 40) {
    const intensity = value / 40;
    return `rgba(220, 38, 38, ${0.25 + (1 - intensity) * 0.45})`;
  } else if (value < 60) {
    const intensity = (value - 40) / 20;
    return `rgba(245, 158, 11, ${0.25 + (1 - intensity) * 0.35})`;
  } else {
    const intensity = (value - 60) / 40;
    return `rgba(45, 212, 191, ${0.20 + intensity * 0.45})`;
  }
}

export default function LoadFrictionScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<QSBScope>('personal');
  const { data: result, isLoading } = useLoadFriction(scope);

  const data = result?.success ? result.data : null;
  const error = result && !result.success ? result.error : null;

  // Get cell value from heatmap
  const getCellValue = (day: DayOfWeek, time: TimeBlock): number => {
    const cell = data?.heatmap.find(c => c.day === day && c.time === time);
    return cell?.value ?? 50;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </Pressable>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.5}>Load Friction Map</Text>
        <View style={styles.headerRight}>
          <ScopeSelectorCompact scope={scope} onScopeChange={setScope} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Demo Badge */}
        {data?.isDemo && (
          <Animated.View entering={FadeIn.duration(300)}>
            <DemoBadge variant="banner" />
          </Animated.View>
        )}

        {/* Error State */}
        {error && (
          <InsufficientSignalsWarning
            required={error.required}
            actual={error.actual}
          />
        )}

        {data && (
          <>
            {/* Summary Stats */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue} maxFontSizeMultiplier={1.5}>{data.weekdayAvg}</Text>
                <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>Weekday Avg</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue} maxFontSizeMultiplier={1.5}>{data.weekendAvg}</Text>
                <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>Weekend Avg</Text>
              </View>
            </Animated.View>

            {/* Heatmap */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.heatmapCard}>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>Capacity by Day & Time</Text>
              <Text style={styles.cardSubtitle} maxFontSizeMultiplier={1.5}>
                Darker = lower capacity (more friction)
              </Text>

              {/* Time Header */}
              <View style={styles.heatmapHeader}>
                <View style={styles.dayLabelSpacer} />
                {TIME_LABELS.map((label, i) => (
                  <View key={i} style={styles.timeLabel}>
                    <Text style={styles.timeLabelText} maxFontSizeMultiplier={1.5}>{label}</Text>
                  </View>
                ))}
              </View>

              {/* Grid */}
              <View style={styles.heatmapGrid}>
                {DAYS.map((day, dayIndex) => (
                  <View key={day} style={styles.heatmapRow}>
                    <Text style={styles.dayLabel} maxFontSizeMultiplier={1.5}>{day}</Text>
                    {TIMES.map((time, timeIndex) => {
                      const value = getCellValue(day, time);
                      return (
                        <View
                          key={`${day}-${time}`}
                          style={[
                            styles.heatmapCell,
                            { backgroundColor: getHeatmapColor(value) },
                          ]}
                        >
                          <Text style={styles.cellValue} maxFontSizeMultiplier={1.5}>{value}</Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(220,38,38,0.6)' }]} />
                  <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>Low capacity</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(245,158,11,0.55)' }]} />
                  <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>Moderate</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(45,212,191,0.55)' }]} />
                  <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>High capacity</Text>
                </View>
              </View>
            </Animated.View>

            {/* Peak Friction Times */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.card}>
              <View style={styles.cardHeader}>
                <AlertTriangle color="#DC2626" size={18} />
                <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>Peak Friction Times</Text>
              </View>
              <Text style={styles.cardDescription} maxFontSizeMultiplier={1.5}>
                When capacity tends to dip the most
              </Text>
              <View style={styles.timesList}>
                {data.peakFrictionTimes.map((item, index) => (
                  <View key={index} style={styles.timeItem}>
                    <View style={[styles.timeDot, { backgroundColor: '#DC2626' }]} />
                    <Text style={styles.timeItemText} maxFontSizeMultiplier={1.5}>
                      {item.day} {item.time}
                    </Text>
                    <Text style={styles.timeItemSeverity} maxFontSizeMultiplier={1.5}>
                      {item.severity}% friction
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Low Friction Times */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Zap color={colors.primary} size={18} />
                <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>Best Performance Windows</Text>
              </View>
              <Text style={styles.cardDescription} maxFontSizeMultiplier={1.5}>
                When capacity tends to be highest
              </Text>
              <View style={styles.timesList}>
                {data.lowFrictionTimes.map((item, index) => (
                  <View key={index} style={styles.timeItem}>
                    <View style={[styles.timeDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.timeItemText} maxFontSizeMultiplier={1.5}>
                      {item.day} {item.time}
                    </Text>
                    <Text style={[styles.timeItemSeverity, { color: '#0E8C7B' }]} maxFontSizeMultiplier={1.5}>
                      {item.score} capacity
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Cohort Info */}
            {data.cohortSize && (
              <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.cohortInfo}>
                <Text style={styles.cohortText} maxFontSizeMultiplier={1.5}>
                  Based on {data.cohortSize.toLocaleString()} participants
                </Text>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  headerRight: {
    marginRight: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '300',
    color: '#0E8C7B',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  heatmapCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  heatmapHeader: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  dayLabelSpacer: {
    width: 36,
  },
  timeLabel: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabelText: {
    fontSize: 9,
    color: colors.textTertiary,
  },
  heatmapGrid: {
    gap: 3,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dayLabel: {
    width: 33,
    fontSize: 11,
    color: colors.textSecondary,
  },
  heatmapCell: {
    flex: 1,
    aspectRatio: 1.2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellValue: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  timesList: {
    gap: spacing.sm,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeItemText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  timeItemSeverity: {
    fontSize: 12,
    color: '#DC2626',
    fontVariant: ['tabular-nums'],
  },
  cohortInfo: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cohortText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
});
