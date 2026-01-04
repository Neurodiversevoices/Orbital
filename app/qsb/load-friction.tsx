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

// Color interpolation for heatmap
function getHeatmapColor(value: number): string {
  // 0-40: Red (low capacity/high friction)
  // 40-60: Amber (moderate)
  // 60-100: Cyan/Green (high capacity/low friction)
  if (value < 40) {
    const intensity = value / 40;
    return `rgba(255, 59, 48, ${0.3 + (1 - intensity) * 0.4})`;
  } else if (value < 60) {
    const intensity = (value - 40) / 20;
    return `rgba(245, 183, 0, ${0.3 + (1 - intensity) * 0.3})`;
  } else {
    const intensity = (value - 60) / 40;
    return `rgba(0, 215, 255, ${0.2 + intensity * 0.3})`;
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
          <ChevronLeft color="rgba(255,255,255,0.7)" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Load Friction Map</Text>
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
                <Text style={styles.summaryValue}>{data.weekdayAvg}</Text>
                <Text style={styles.summaryLabel}>Weekday Avg</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{data.weekendAvg}</Text>
                <Text style={styles.summaryLabel}>Weekend Avg</Text>
              </View>
            </Animated.View>

            {/* Heatmap */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.heatmapCard}>
              <Text style={styles.cardTitle}>Capacity by Day & Time</Text>
              <Text style={styles.cardSubtitle}>
                Darker = lower capacity (more friction)
              </Text>

              {/* Time Header */}
              <View style={styles.heatmapHeader}>
                <View style={styles.dayLabelSpacer} />
                {TIME_LABELS.map((label, i) => (
                  <View key={i} style={styles.timeLabel}>
                    <Text style={styles.timeLabelText}>{label}</Text>
                  </View>
                ))}
              </View>

              {/* Grid */}
              <View style={styles.heatmapGrid}>
                {DAYS.map((day, dayIndex) => (
                  <View key={day} style={styles.heatmapRow}>
                    <Text style={styles.dayLabel}>{day}</Text>
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
                          <Text style={styles.cellValue}>{value}</Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(255,59,48,0.6)' }]} />
                  <Text style={styles.legendText}>Low capacity</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(245,183,0,0.5)' }]} />
                  <Text style={styles.legendText}>Moderate</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(0,215,255,0.4)' }]} />
                  <Text style={styles.legendText}>High capacity</Text>
                </View>
              </View>
            </Animated.View>

            {/* Peak Friction Times */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.card}>
              <View style={styles.cardHeader}>
                <AlertTriangle color="#FF3B30" size={18} />
                <Text style={styles.cardTitle}>Peak Friction Times</Text>
              </View>
              <Text style={styles.cardDescription}>
                When capacity tends to dip the most
              </Text>
              <View style={styles.timesList}>
                {data.peakFrictionTimes.map((item, index) => (
                  <View key={index} style={styles.timeItem}>
                    <View style={[styles.timeDot, { backgroundColor: '#FF3B30' }]} />
                    <Text style={styles.timeItemText}>
                      {item.day} {item.time}
                    </Text>
                    <Text style={styles.timeItemSeverity}>
                      {item.severity}% friction
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Low Friction Times */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Zap color="#00D7FF" size={18} />
                <Text style={styles.cardTitle}>Best Performance Windows</Text>
              </View>
              <Text style={styles.cardDescription}>
                When capacity tends to be highest
              </Text>
              <View style={styles.timesList}>
                {data.lowFrictionTimes.map((item, index) => (
                  <View key={index} style={styles.timeItem}>
                    <View style={[styles.timeDot, { backgroundColor: '#00D7FF' }]} />
                    <Text style={styles.timeItemText}>
                      {item.day} {item.time}
                    </Text>
                    <Text style={[styles.timeItemSeverity, { color: '#00D7FF' }]}>
                      {item.score} capacity
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Cohort Info */}
            {data.cohortSize && (
              <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.cohortInfo}>
                <Text style={styles.cohortText}>
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
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '300',
    color: '#00D7FF',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  heatmapCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
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
    color: 'rgba(255,255,255,0.4)',
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
    color: 'rgba(255,255,255,0.5)',
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
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
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
    color: 'rgba(255,255,255,0.5)',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    color: 'rgba(255,255,255,0.5)',
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
    color: 'rgba(255,255,255,0.8)',
  },
  timeItemSeverity: {
    fontSize: 12,
    color: '#FF3B30',
    fontVariant: ['tabular-nums'],
  },
  cohortInfo: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cohortText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
});
