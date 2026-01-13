/**
 * Recovery Elasticity Score Screen
 *
 * Shows:
 * - Recovery score (0-100)
 * - Average recovery time after dips
 * - Recovery completeness
 * - Recent recovery events
 * - Historical comparison
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
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Target,
  History,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { ScopeSelectorCompact, DemoBadge, InsufficientSignalsWarning } from '../../components/qsb';
import { useRecoveryElasticity, QSBScope } from '../../lib/qsb';

export default function RecoveryElasticityScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<QSBScope>('personal');
  const { data: result, isLoading } = useRecoveryElasticity(scope);

  const data = result?.success ? result.data : null;
  const error = result && !result.success ? result.error : null;

  const TrendIcon = data?.trend === 'improving' ? TrendingUp : data?.trend === 'declining' ? TrendingDown : Minus;
  const trendColor = data?.trend === 'improving' ? '#00D7FF' : data?.trend === 'declining' ? '#FF3B30' : 'rgba(255,255,255,0.5)';
  const trendText = data?.trend === 'improving' ? 'Improving' : data?.trend === 'declining' ? 'Declining' : 'Stable';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="rgba(255,255,255,0.7)" size={24} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>Recovery Elasticity</Text>
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
            {/* Main Score */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.mainScoreCard}>
              <View style={styles.mainScoreHeader}>
                <Text style={styles.mainScoreLabel}>Elasticity Score</Text>
                <View style={styles.trendBadge}>
                  <TrendIcon color={trendColor} size={14} />
                  <Text style={[styles.trendText, { color: trendColor }]}>{trendText}</Text>
                </View>
              </View>
              <Text style={styles.mainScoreValue}>{data.score}</Text>
              <Text style={styles.mainScoreSubtext}>
                Higher = faster, more complete recovery
              </Text>
            </Animated.View>

            {/* Key Metrics */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Clock color="rgba(255,255,255,0.5)" size={18} />
                <Text style={styles.metricValue}>{data.avgRecoveryHours}h</Text>
                <Text style={styles.metricLabel}>Avg Recovery Time</Text>
              </View>
              <View style={styles.metricCard}>
                <Target color="rgba(255,255,255,0.5)" size={18} />
                <Text style={styles.metricValue}>{data.avgRecoveryCompleteness}%</Text>
                <Text style={styles.metricLabel}>Avg Completeness</Text>
              </View>
            </Animated.View>

            {/* Historical Comparison */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.card}>
              <View style={styles.cardHeader}>
                <History color="rgba(255,255,255,0.5)" size={18} />
                <Text style={styles.cardTitle}>30-Day Comparison</Text>
              </View>
              <View style={styles.comparisonContainer}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Last 30 Days</Text>
                  <Text style={styles.comparisonValue}>{data.historicalComparison.last30Days}</Text>
                </View>
                <View style={styles.comparisonArrow}>
                  <Text style={[
                    styles.changeText,
                    { color: data.historicalComparison.changePercent > 0 ? '#00D7FF' : data.historicalComparison.changePercent < 0 ? '#FF3B30' : 'rgba(255,255,255,0.5)' }
                  ]}>
                    {data.historicalComparison.changePercent > 0 ? '+' : ''}{data.historicalComparison.changePercent.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Previous 30 Days</Text>
                  <Text style={styles.comparisonValue}>{data.historicalComparison.previous30Days}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Recent Recovery Events */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.card}>
              <Text style={styles.cardTitle}>Recent Recovery Events</Text>
              <Text style={styles.cardSubtitle}>
                How you bounced back from recent capacity dips
              </Text>
              <View style={styles.eventsList}>
                {data.recentEvents.map((event, index) => {
                  const date = new Date(event.date);
                  const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <View key={index} style={styles.eventItem}>
                      <View style={styles.eventHeader}>
                        <Text style={styles.eventDate}>
                          {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}
                        </Text>
                        <Text style={[
                          styles.eventCompleteness,
                          { color: event.recoveryCompleteness >= 85 ? '#00D7FF' : event.recoveryCompleteness >= 70 ? '#F5B700' : '#FF3B30' }
                        ]}>
                          {event.recoveryCompleteness}% recovered
                        </Text>
                      </View>
                      <View style={styles.eventDetails}>
                        <View style={styles.eventDetail}>
                          <Text style={styles.eventDetailLabel}>Dip Depth</Text>
                          <Text style={styles.eventDetailValue}>{event.dipDepth}</Text>
                        </View>
                        <View style={styles.eventDetail}>
                          <Text style={styles.eventDetailLabel}>Recovery Time</Text>
                          <Text style={styles.eventDetailValue}>{event.recoveryTime}h</Text>
                        </View>
                      </View>
                      {/* Visual recovery bar */}
                      <View style={styles.recoveryBar}>
                        <View style={styles.recoveryBarBg}>
                          <View
                            style={[
                              styles.recoveryBarFill,
                              { width: `${event.recoveryCompleteness}%` },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Animated.View>

            {/* Explanation */}
            <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.infoCard}>
              <Text style={styles.infoTitle}>What is Recovery Elasticity?</Text>
              <Text style={styles.infoText}>
                Recovery Elasticity measures how quickly and completely you bounce back
                after periods of low capacity. A high score means you recover faster and
                return closer to your baseline capacity.{'\n\n'}
                Factors that influence recovery:{'\n'}
                • Sleep quality and duration{'\n'}
                • Rest periods between high-load activities{'\n'}
                • Support systems and resources{'\n'}
                • Overall load management
              </Text>
            </Animated.View>

            {/* Cohort Info */}
            {data.cohortSize && (
              <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.cohortInfo}>
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
    flexShrink: 0,
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
  mainScoreCard: {
    backgroundColor: 'rgba(0,215,255,0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,215,255,0.2)',
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mainScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mainScoreLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  mainScoreValue: {
    fontSize: 72,
    fontWeight: '200',
    color: '#00D7FF',
    fontVariant: ['tabular-nums'],
    marginVertical: spacing.sm,
  },
  mainScoreSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.95)',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
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
    marginBottom: spacing.sm,
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
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  comparisonValue: {
    fontSize: 28,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.95)',
    fontVariant: ['tabular-nums'],
  },
  comparisonArrow: {
    paddingHorizontal: spacing.md,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  eventsList: {
    gap: spacing.md,
  },
  eventItem: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eventDate: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  eventCompleteness: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDetailLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  eventDetailValue: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontVariant: ['tabular-nums'],
  },
  recoveryBar: {
    height: 4,
  },
  recoveryBarBg: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  recoveryBarFill: {
    height: '100%',
    backgroundColor: '#00D7FF',
    borderRadius: 2,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
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
