/**
 * BundleCCIPreview — Bundle Seat Grid with Charts
 *
 * Visual preview for bundle CCI showing:
 * - Grid of avatar icons (5 per row)
 * - Mini summary charts visible by default
 * - Modal with full chart on avatar tap
 * - Combined aggregate chart for all seats
 *
 * All charts use lib/cci/summaryChart.ts for visual consistency.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { BundleSeatAvatar } from './BundleSeatAvatar';
import { CCISummaryChart } from './CCISummaryChart';
import {
  generateBundleSeatData,
  calculateAggregateCapacity,
  getBundleStats,
  getSeatCapacityState,
  type BundleSeatData,
} from '../lib/cci/bundleDemoData';
import { CAPACITY_COLORS } from '../lib/cci/summaryChart';
import { colors, spacing, borderRadius } from '../theme';

// =============================================================================
// TYPES
// =============================================================================

export interface BundleCCIPreviewProps {
  /** Number of seats in bundle */
  seatCount: 10 | 15 | 20;
}

// =============================================================================
// MINI CHART CARD
// =============================================================================

interface MiniChartCardProps {
  seat: BundleSeatData;
  onPress: () => void;
}

function MiniChartCard({ seat, onPress }: MiniChartCardProps) {
  const state = getSeatCapacityState(seat);
  const stateColor = CAPACITY_COLORS[state];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniChartCard,
        pressed && styles.miniChartCardPressed,
      ]}
    >
      {/* Avatar indicator */}
      <View style={styles.miniChartHeader}>
        <BundleSeatAvatar seat={seat} size={24} />
        <View style={[styles.stateIndicator, { backgroundColor: stateColor }]} />
      </View>
      {/* Mini chart */}
      <View style={styles.miniChartContainer}>
        <CCISummaryChart
          values={seat.capacityHistory}
          width={140}
          chartId={seat.id}
        />
      </View>
    </Pressable>
  );
}

// =============================================================================
// SEAT DETAIL MODAL
// =============================================================================

interface SeatDetailModalProps {
  seat: BundleSeatData | null;
  visible: boolean;
  onClose: () => void;
}

function SeatDetailModal({ seat, visible, onClose }: SeatDetailModalProps) {
  const { width } = useWindowDimensions();

  if (!seat) return null;

  const state = getSeatCapacityState(seat);
  const stateLabel = {
    resourced: 'Resourced',
    stretched: 'Stretched',
    depleted: 'Depleted',
  }[state];
  const stateColor = CAPACITY_COLORS[state];
  const currentValue = seat.capacityHistory[seat.capacityHistory.length - 1];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <BundleSeatAvatar seat={seat} size={40} />
              <View style={styles.modalTitleText}>
                <Text style={styles.modalTitle}>Seat {seat.seatIndex + 1}</Text>
                <View style={styles.modalStateRow}>
                  <View style={[styles.modalStateDot, { backgroundColor: stateColor }]} />
                  <Text style={[styles.modalStateText, { color: stateColor }]}>
                    {stateLabel} ({currentValue}%)
                  </Text>
                </View>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <X size={20} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Full Chart */}
          <View style={styles.modalChartContainer}>
            <CCISummaryChart
              values={seat.capacityHistory}
              width={Math.min(width - 80, 320)}
              chartId={`modal-${seat.id}`}
            />
          </View>

          {/* Stats */}
          <View style={styles.modalStats}>
            <Text style={styles.modalStatsLabel}>90-Day Pattern</Text>
            <Text style={styles.modalStatsValue}>
              {seat.pattern.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// =============================================================================
// AGGREGATE CHART SECTION
// =============================================================================

interface AggregateChartProps {
  seats: BundleSeatData[];
}

function AggregateChart({ seats }: AggregateChartProps) {
  const { width } = useWindowDimensions();
  const aggregateHistory = useMemo(() => calculateAggregateCapacity(seats), [seats]);
  const stats = useMemo(() => getBundleStats(seats), [seats]);

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.aggregateSection}>
      <Text style={styles.aggregateTitle}>Combined Aggregate</Text>
      <Text style={styles.aggregateSubtitle}>
        Average capacity across all {seats.length} seats
      </Text>

      {/* Aggregate Chart */}
      <View style={styles.aggregateChartContainer}>
        <CCISummaryChart
          values={aggregateHistory}
          width={Math.min(width - 64, 320)}
          chartId="aggregate"
        />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: CAPACITY_COLORS.resourced }]} />
          <Text style={styles.statValue}>{stats.resourcedCount}</Text>
          <Text style={styles.statLabel}>Resourced</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: CAPACITY_COLORS.stretched }]} />
          <Text style={styles.statValue}>{stats.stretchedCount}</Text>
          <Text style={styles.statLabel}>Stretched</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: CAPACITY_COLORS.depleted }]} />
          <Text style={styles.statValue}>{stats.depletedCount}</Text>
          <Text style={styles.statLabel}>Depleted</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.avgValue]}>{stats.averageCapacity}%</Text>
          <Text style={styles.statLabel}>Avg</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BundleCCIPreview({ seatCount }: BundleCCIPreviewProps) {
  const [selectedSeat, setSelectedSeat] = useState<BundleSeatData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Generate seat data (memoized by seat count)
  const seats = useMemo(() => generateBundleSeatData(seatCount), [seatCount]);

  // Split into rows of 5
  const rows: BundleSeatData[][] = [];
  for (let i = 0; i < seats.length; i += 5) {
    rows.push(seats.slice(i, i + 5));
  }

  const handleSeatPress = (seat: BundleSeatData) => {
    setSelectedSeat(seat);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedSeat(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <View>
          <Text style={styles.title}>{seatCount} Seats</Text>
          <Text style={styles.subtitle}>Tap any seat to view full chart</Text>
        </View>
      </Animated.View>

      {/* Mini Chart Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gridScrollContent}
      >
        <View style={styles.gridContainer}>
          {rows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.gridRow}>
              {row.map((seat, seatIndex) => (
                <Animated.View
                  key={seat.id}
                  entering={FadeInDown.delay((rowIndex * 5 + seatIndex) * 30).duration(300)}
                >
                  <MiniChartCard
                    seat={seat}
                    onPress={() => handleSeatPress(seat)}
                  />
                </Animated.View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Aggregate Chart */}
      <AggregateChart seats={seats} />

      {/* Detail Modal */}
      <SeatDetailModal
        seat={selectedSeat}
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  // Grid
  gridScrollContent: {
    paddingHorizontal: spacing.sm,
  },
  gridContainer: {
    gap: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Mini Chart Card
  miniChartCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.sm,
    width: 160,
  },
  miniChartCardPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  miniChartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  stateIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniChartContainer: {
    overflow: 'hidden',
    borderRadius: 4,
  },

  // Aggregate Section
  aggregateSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  aggregateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.sm,
  },
  aggregateSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  aggregateChartContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  avgValue: {
    color: '#9C27B0',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modalTitleText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  modalStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  modalStateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalStateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalChartContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalStats: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  modalStatsLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalStatsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});

export default BundleCCIPreview;
