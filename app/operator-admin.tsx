/**
 * Operator Admin View
 *
 * FOUNDER-ONLY: Aggregate-only system state console.
 *
 * HARD CONSTRAINTS (non-negotiable):
 * - Aggregate-only (cohort-level summaries)
 * - NO user list
 * - NO identities
 * - NO drill-down from cohort to person
 * - NO raw logs table
 * - NO exports
 *
 * This is a "states" console, not analytics.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  Users,
  Activity,
  Moon,
  Zap,
  Brain,
  Radio,
  UserCheck,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Minus,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import { FOUNDER_DEMO_ENABLED } from '../lib/hooks/useDemoMode';

// =============================================================================
// TYPES
// =============================================================================

type TimeWindow = '30d' | '90d';

type SystemState = 'baseline' | 'elevated' | 'sustained_volatility';

interface MarkerContribution {
  marker: string;
  icon: React.ComponentType<any>;
  percentage: number;
  color: string;
}

interface CohortData {
  label: string;
  ageRange: string;
  participantCount: number;
  systemState: SystemState;
  topMarkers: MarkerContribution[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AGE_COHORTS = [
  { label: '13-17', min: 13, max: 17 },
  { label: '18-24', min: 18, max: 24 },
  { label: '25-34', min: 25, max: 34 },
  { label: '35-44', min: 35, max: 44 },
  { label: '45-54', min: 45, max: 54 },
  { label: '55-64', min: 55, max: 64 },
  { label: '65+', min: 65, max: 999 },
];

const SYSTEM_STATE_CONFIG: Record<SystemState, { label: string; color: string; bgColor: string }> = {
  baseline: { label: 'Baseline', color: '#4CAF50', bgColor: 'rgba(76,175,80,0.15)' },
  elevated: { label: 'Elevated', color: '#FF9800', bgColor: 'rgba(255,152,0,0.15)' },
  sustained_volatility: { label: 'Sustained Volatility', color: '#F44336', bgColor: 'rgba(244,67,54,0.15)' },
};

const MARKER_CONFIG = {
  sleep: { icon: Moon, color: '#5C6BC0', label: 'Sleep' },
  energy: { icon: Zap, color: '#FFD700', label: 'Energy' },
  brain: { icon: Brain, color: '#9C27B0', label: 'Brain' },
  sensory: { icon: Radio, color: '#00BCD4', label: 'Sensory' },
  social: { icon: UserCheck, color: '#4CAF50', label: 'Social' },
  demand: { icon: ClipboardList, color: '#FF5722', label: 'Demand' },
};

// =============================================================================
// SYNTHETIC AGGREGATE DATA
// Placeholder data for founder demo. Interfaces are identical for future swap.
// =============================================================================

function generateSyntheticCohortData(timeWindow: TimeWindow): CohortData[] {
  const seed = timeWindow === '30d' ? 42 : 137;
  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  return AGE_COHORTS.map((cohort, idx) => {
    const baseParticipants = Math.floor(seededRandom(idx) * 150) + 20;
    const participantCount = timeWindow === '90d'
      ? Math.floor(baseParticipants * 1.8)
      : baseParticipants;

    // Determine system state based on cohort and random
    const stateRoll = seededRandom(idx * 3 + 7);
    let systemState: SystemState;
    if (cohort.label === '13-17' || cohort.label === '18-24') {
      // Younger cohorts more likely to be elevated
      systemState = stateRoll < 0.3 ? 'baseline' : stateRoll < 0.7 ? 'elevated' : 'sustained_volatility';
    } else if (cohort.label === '65+') {
      // Older cohort more stable
      systemState = stateRoll < 0.6 ? 'baseline' : stateRoll < 0.9 ? 'elevated' : 'sustained_volatility';
    } else {
      systemState = stateRoll < 0.4 ? 'baseline' : stateRoll < 0.8 ? 'elevated' : 'sustained_volatility';
    }

    // Generate top 3 markers
    const markers = Object.keys(MARKER_CONFIG) as (keyof typeof MARKER_CONFIG)[];
    const shuffled = markers
      .map((m, i) => ({ marker: m, sort: seededRandom(idx * 10 + i) }))
      .sort((a, b) => b.sort - a.sort);

    const topMarkers: MarkerContribution[] = shuffled.slice(0, 3).map((item, i) => {
      const config = MARKER_CONFIG[item.marker];
      const basePercentage = 35 - i * 10 + Math.floor(seededRandom(idx * 20 + i) * 15);
      return {
        marker: config.label,
        icon: config.icon,
        percentage: Math.max(15, Math.min(45, basePercentage)),
        color: config.color,
      };
    });

    return {
      label: cohort.label,
      ageRange: cohort.label,
      participantCount,
      systemState,
      topMarkers,
    };
  });
}

// =============================================================================
// COHORT CARD COMPONENT
// =============================================================================

interface CohortCardProps {
  cohort: CohortData;
  index: number;
}

function CohortCard({ cohort, index }: CohortCardProps) {
  const stateConfig = SYSTEM_STATE_CONFIG[cohort.systemState];

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 50).duration(400)}
      style={styles.cohortCard}
    >
      <View style={styles.cohortHeader}>
        <View style={styles.cohortAgeContainer}>
          <Users size={16} color="rgba(255,255,255,0.5)" />
          <Text style={styles.cohortAgeLabel}>{cohort.ageRange}</Text>
        </View>
        <View style={styles.participantBadge}>
          <Text style={styles.participantCount}>{cohort.participantCount}</Text>
          <Text style={styles.participantLabel}>participants</Text>
        </View>
      </View>

      <View style={[styles.systemStateContainer, { backgroundColor: stateConfig.bgColor }]}>
        {cohort.systemState === 'baseline' && <TrendingUp size={16} color={stateConfig.color} />}
        {cohort.systemState === 'elevated' && <AlertTriangle size={16} color={stateConfig.color} />}
        {cohort.systemState === 'sustained_volatility' && <Activity size={16} color={stateConfig.color} />}
        <Text style={[styles.systemStateLabel, { color: stateConfig.color }]}>
          {stateConfig.label}
        </Text>
      </View>

      <View style={styles.markersContainer}>
        <Text style={styles.markersTitle}>Top Drivers</Text>
        {cohort.topMarkers.map((marker, i) => (
          <View key={i} style={styles.markerRow}>
            <marker.icon size={14} color={marker.color} />
            <Text style={styles.markerLabel}>{marker.marker}</Text>
            <View style={styles.markerBarContainer}>
              <View
                style={[
                  styles.markerBar,
                  { width: `${marker.percentage}%`, backgroundColor: marker.color },
                ]}
              />
            </View>
            <Text style={styles.markerPercentage}>{marker.percentage}%</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function OperatorAdminScreen() {
  const router = useRouter();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30d');
  const [isLoading, setIsLoading] = useState(true);

  // Founder-only guard
  if (!FOUNDER_DEMO_ENABLED) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.blockedContainer}>
          <AlertTriangle size={48} color="#F44336" />
          <Text style={styles.blockedTitle}>Access Denied</Text>
          <Text style={styles.blockedText}>
            This screen is only available in founder mode.
          </Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [timeWindow]);

  // Generate cohort data based on time window
  const cohortData = useMemo(() => {
    return generateSyntheticCohortData(timeWindow);
  }, [timeWindow]);

  // Aggregate summary
  const summary = useMemo(() => {
    const totalParticipants = cohortData.reduce((sum, c) => sum + c.participantCount, 0);
    const stateBreakdown = {
      baseline: cohortData.filter(c => c.systemState === 'baseline').length,
      elevated: cohortData.filter(c => c.systemState === 'elevated').length,
      sustained_volatility: cohortData.filter(c => c.systemState === 'sustained_volatility').length,
    };
    return { totalParticipants, stateBreakdown };
  }, [cohortData]);

  const handleTimeWindowChange = (window: TimeWindow) => {
    setIsLoading(true);
    setTimeWindow(window);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>OPERATOR ADMIN</Text>
          <Text style={styles.subtitle}>AGGREGATE / NON-IDENTIFYING / OPERATOR VIEW</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      {/* Time Window Toggle */}
      <View style={styles.timeWindowContainer}>
        <Pressable
          style={[styles.timeWindowButton, timeWindow === '30d' && styles.timeWindowButtonActive]}
          onPress={() => handleTimeWindowChange('30d')}
        >
          <Text style={[styles.timeWindowText, timeWindow === '30d' && styles.timeWindowTextActive]}>
            30 Days
          </Text>
        </Pressable>
        <Pressable
          style={[styles.timeWindowButton, timeWindow === '90d' && styles.timeWindowButtonActive]}
          onPress={() => handleTimeWindowChange('90d')}
        >
          <Text style={[styles.timeWindowText, timeWindow === '90d' && styles.timeWindowTextActive]}>
            90 Days
          </Text>
        </Pressable>
      </View>

      {/* Aggregate Notice */}
      <View style={styles.aggregateNotice}>
        <Minus size={14} color="#7A9AAA" />
        <Text style={styles.aggregateNoticeText}>
          All data shown is aggregate. No individual identities or drill-down available.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00E5FF" />
          <Text style={styles.loadingText}>Loading aggregate data...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Summary Card */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.totalParticipants}</Text>
                <Text style={styles.summaryLabel}>Total Participants</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <View style={styles.stateBreakdown}>
                  <View style={styles.stateBreakdownItem}>
                    <View style={[styles.stateBreakdownDot, { backgroundColor: SYSTEM_STATE_CONFIG.baseline.color }]} />
                    <Text style={styles.stateBreakdownValue}>{summary.stateBreakdown.baseline}</Text>
                  </View>
                  <View style={styles.stateBreakdownItem}>
                    <View style={[styles.stateBreakdownDot, { backgroundColor: SYSTEM_STATE_CONFIG.elevated.color }]} />
                    <Text style={styles.stateBreakdownValue}>{summary.stateBreakdown.elevated}</Text>
                  </View>
                  <View style={styles.stateBreakdownItem}>
                    <View style={[styles.stateBreakdownDot, { backgroundColor: SYSTEM_STATE_CONFIG.sustained_volatility.color }]} />
                    <Text style={styles.stateBreakdownValue}>{summary.stateBreakdown.sustained_volatility}</Text>
                  </View>
                </View>
                <Text style={styles.summaryLabel}>Cohort States</Text>
              </View>
            </View>
          </Animated.View>

          {/* Cohort Cards */}
          <Text style={styles.sectionTitle}>AGE COHORTS</Text>
          {cohortData.map((cohort, index) => (
            <CohortCard key={cohort.label} cohort={cohort} index={index} />
          ))}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Data reflects {timeWindow === '30d' ? '30-day' : '90-day'} rolling window.
            </Text>
            <Text style={styles.footerText}>
              Updated: {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 9,
    color: '#7A9AAA',
    marginTop: 4,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.sm,
  },

  // Time Window Toggle
  timeWindowContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    padding: 4,
  },
  timeWindowButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  timeWindowButtonActive: {
    backgroundColor: '#00E5FF',
  },
  timeWindowText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  timeWindowTextActive: {
    color: '#000',
  },

  // Aggregate Notice
  aggregateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(122,154,170,0.1)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(122,154,170,0.2)',
  },
  aggregateNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#7A9AAA',
    fontStyle: 'italic',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },

  // Scroll
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: spacing.md,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.95)',
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stateBreakdown: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stateBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stateBreakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stateBreakdownValue: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },

  // Section Title
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  // Cohort Card
  cohortCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cohortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cohortAgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cohortAgeLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  participantBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  participantCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00E5FF',
  },
  participantLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },

  // System State
  systemStateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  systemStateLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Markers
  markersContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: spacing.sm,
  },
  markersTitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  markerLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    width: 60,
  },
  markerBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  markerBar: {
    height: '100%',
    borderRadius: 3,
  },
  markerPercentage: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    width: 32,
    textAlign: 'right',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 4,
  },

  // Blocked State
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F44336',
    marginTop: spacing.md,
  },
  blockedText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  backButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
});
