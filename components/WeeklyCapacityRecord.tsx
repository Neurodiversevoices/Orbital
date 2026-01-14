/**
 * WeeklyCapacityRecord Component
 *
 * Calendar view for capacity entries with week-based navigation.
 * - "Week of Jan 13" header with < > navigation
 * - Day-of-week tabs with entry counts
 * - "This Week" / "Last Week" quick navigation buttons
 * - Shows entries for selected day when clicked
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { ChevronLeft, ChevronRight, Trash2, Circle } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import { CapacityLog, CapacityState } from '../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// State colors matching the graph
const stateColors: Record<CapacityState, string> = {
  resourced: '#00E5FF',
  stretched: '#E8A830',
  depleted: '#F44336',
};

const stateLabels: Record<CapacityState, string> = {
  resourced: 'Resourced',
  stretched: 'Stretched',
  depleted: 'Depleted',
};

interface Props {
  logs: CapacityLog[];
  onDelete: (id: string) => void;
  onWeekChange?: (weekStart: Date, weekEnd: Date) => void;
}

// Get the Sunday of a given week (start of week)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Format "Week of Jan 13" header
function formatWeekHeader(weekStart: Date): string {
  return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

// Format time
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Format date below time
function formatDateShort(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function WeeklyCapacityRecord({ logs, onDelete, onWeekChange }: Props) {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = last week, etc.
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay()); // 0-6

  // Calculate current week's start date based on offset
  const currentWeekStart = useMemo(() => {
    const now = new Date();
    const thisWeekStart = getWeekStart(now);
    const offsetMs = weekOffset * 7 * 24 * 60 * 60 * 1000;
    return new Date(thisWeekStart.getTime() + offsetMs);
  }, [weekOffset]);

  // Notify parent when week changes
  useEffect(() => {
    if (onWeekChange) {
      const weekEnd = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      onWeekChange(currentWeekStart, weekEnd);
    }
  }, [currentWeekStart, onWeekChange]);

  // Filter logs for the selected week and group by day of week
  const { logsByDay, totalInWeek } = useMemo(() => {
    const weekStartMs = currentWeekStart.getTime();
    const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;

    // Filter to selected week
    const weekLogs = logs.filter(log => log.timestamp >= weekStartMs && log.timestamp < weekEndMs);

    // Group by day of week (0-6)
    const byDay: CapacityLog[][] = [[], [], [], [], [], [], []];
    weekLogs.forEach(log => {
      const dayIndex = new Date(log.timestamp).getDay();
      byDay[dayIndex].push(log);
    });

    // Sort each day's logs by time (newest first)
    byDay.forEach(dayLogs => {
      dayLogs.sort((a, b) => b.timestamp - a.timestamp);
    });

    return {
      logsByDay: byDay,
      totalInWeek: weekLogs.length,
    };
  }, [logs, currentWeekStart]);

  // Get entries for selected day
  const selectedDayLogs = logsByDay[selectedDayIndex];

  // Get the actual date for the selected day in current week
  const selectedDayDate = useMemo(() => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + selectedDayIndex);
    return d;
  }, [currentWeekStart, selectedDayIndex]);

  // Format selected day header: "Tuesday, Jan 14"
  const selectedDayHeader = useMemo(() => {
    return `${FULL_DAYS[selectedDayIndex]}, ${selectedDayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [selectedDayIndex, selectedDayDate]);

  // Navigation handlers
  const goToPrevWeek = useCallback(() => setWeekOffset(w => w - 1), []);
  const goToNextWeek = useCallback(() => setWeekOffset(w => Math.min(w + 1, 0)), []);
  const goToThisWeek = useCallback(() => {
    setWeekOffset(0);
    setSelectedDayIndex(new Date().getDay());
  }, []);
  const goToLastWeek = useCallback(() => setWeekOffset(-1), []);

  // Check if we're on this week
  const isThisWeek = weekOffset === 0;
  const isLastWeek = weekOffset === -1;

  return (
    <View style={styles.container}>
      {/* Week Header with Navigation */}
      <View style={styles.weekHeader}>
        <Pressable onPress={goToPrevWeek} style={styles.navButton} hitSlop={8}>
          <ChevronLeft size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>

        <View style={styles.weekTitleContainer}>
          <Text style={styles.weekTitle}>{formatWeekHeader(currentWeekStart)}</Text>
          <Pressable onPress={goToNextWeek} disabled={isThisWeek} hitSlop={8}>
            <ChevronRight size={16} color={isThisWeek ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)'} />
          </Pressable>
        </View>

        <Pressable onPress={goToNextWeek} style={styles.navButton} disabled={isThisWeek} hitSlop={8}>
          <ChevronRight size={20} color={isThisWeek ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)'} />
        </Pressable>
      </View>

      {/* Day of Week Tabs + Quick Navigation */}
      <View style={styles.daysContainer}>
        <View style={styles.daysRow}>
          {DAYS.map((day, index) => {
            const count = logsByDay[index].length;
            const isSelected = selectedDayIndex === index;
            const isToday = isThisWeek && index === new Date().getDay();

            return (
              <Pressable
                key={day}
                style={[styles.dayTab, isSelected && styles.dayTabSelected]}
                onPress={() => setSelectedDayIndex(index)}
              >
                <Text style={[
                  styles.dayLabel,
                  isSelected && styles.dayLabelSelected,
                  isToday && styles.dayLabelToday,
                ]}>
                  {day}
                </Text>
                <Text style={[
                  styles.dayCount,
                  isSelected && styles.dayCountSelected,
                  count > 0 && styles.dayCountHasData,
                ]}>
                  {count}
                </Text>
                {isSelected && <View style={styles.dayUnderline} />}
              </Pressable>
            );
          })}
        </View>

        {/* This Week / Last Week Quick Buttons */}
        <View style={styles.quickNavContainer}>
          <Pressable
            style={[styles.quickNavButton, isThisWeek && styles.quickNavButtonActive]}
            onPress={goToThisWeek}
          >
            <Text style={[styles.quickNavText, isThisWeek && styles.quickNavTextActive]}>This Week</Text>
          </Pressable>
          <Pressable
            style={[styles.quickNavButton, isLastWeek && styles.quickNavButtonActive]}
            onPress={goToLastWeek}
          >
            <Text style={[styles.quickNavText, isLastWeek && styles.quickNavTextActive]}>Last Week</Text>
          </Pressable>
        </View>
      </View>

      {/* CAPACITY RECORD Section */}
      <View style={styles.recordSection}>
        <Text style={styles.recordSectionTitle}>CAPACITY RECORD</Text>

        {/* Selected Day Header with Chevron */}
        <Pressable style={styles.selectedDayHeader}>
          <View style={styles.selectedDayTitleRow}>
            <Text style={styles.selectedDayTitle}>{selectedDayHeader}</Text>
            <ChevronRight size={16} color="rgba(255,255,255,0.5)" />
          </View>
          <Text style={styles.selectedDayCount}>{selectedDayLogs.length} entries</Text>
        </Pressable>

        {/* Entries for Selected Day */}
        {selectedDayLogs.length === 0 ? (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayText}>No entries for this day</Text>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {selectedDayLogs.map((log, index) => {
              const state = log.state;
              const stateColor = stateColors[state];
              const stateLabel = stateLabels[state];
              return (
                <Animated.View
                  key={log.id}
                  entering={FadeIn.delay(index * 50).duration(200)}
                  style={[styles.entryRow, { borderLeftColor: stateColor, borderLeftWidth: 3 }]}
                >
                  <View style={styles.entryTime}>
                    <Text style={styles.entryTimeText}>{formatTime(log.timestamp)}</Text>
                    <Text style={styles.entryDateText}>{formatDateShort(log.timestamp)}</Text>
                  </View>

                  <View style={styles.entryContent}>
                    <View style={[styles.stateBadge, { backgroundColor: `${stateColor}15` }]}>
                      <Circle size={10} color={stateColor} fill={stateColor} />
                      <Text style={[styles.stateBadgeText, { color: stateColor }]}>{stateLabel}</Text>
                    </View>
                    {log.note && (
                      <Text style={styles.entryNote} numberOfLines={2}>
                        {log.note}
                      </Text>
                    )}
                  </View>

                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => onDelete(log.id)}
                    hitSlop={8}
                  >
                    <Trash2 size={16} color="rgba(255,255,255,0.3)" />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },

  // Week Header with Navigation
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.xs,
  },
  weekTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },

  // Days Container (tabs + quick nav)
  daysContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: spacing.xs,
  },

  // Days Row
  daysRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },

  // Quick Navigation Buttons
  quickNavContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  quickNavButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  quickNavButtonActive: {
    // Active state handled by text color
  },
  quickNavText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  quickNavTextActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  dayTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  dayTabSelected: {
    // Selected styling handled by children
  },
  dayLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  dayLabelSelected: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  dayLabelToday: {
    color: '#00E5FF',
  },
  dayCount: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
  },
  dayCountSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  dayCountHasData: {
    color: '#00E5FF',
  },
  dayUnderline: {
    position: 'absolute',
    bottom: -1,
    left: '25%',
    right: '25%',
    height: 2,
    backgroundColor: '#00E5FF',
    borderRadius: 1,
  },

  // Record Section
  recordSection: {
    marginTop: spacing.lg,
  },
  recordSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectedDayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedDayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  selectedDayCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },

  // Empty State
  emptyDay: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  },

  // Entries List
  entriesList: {
    gap: spacing.xs,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  entryTime: {
    width: 70,
    marginRight: spacing.md,
  },
  entryTimeText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  entryDateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  entryContent: {
    flex: 1,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  stateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  entryNote: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});

export default WeeklyCapacityRecord;
