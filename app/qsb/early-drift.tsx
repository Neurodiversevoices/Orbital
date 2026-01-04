/**
 * Early Drift Detector Screen
 *
 * Shows:
 * - Overall risk level (Low/Moderate/Elevated)
 * - Detected warning signals with confidence levels
 * - Trend direction
 * - Days until potential issue (predictive)
 * - Recommendations
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
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Activity,
  ArrowDownRight,
  Shuffle,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { ScopeSelectorCompact, DemoBadge, InsufficientSignalsWarning } from '../../components/qsb';
import { useEarlyDrift, QSBScope, DriftSignalType, ConfidenceLevel } from '../../lib/qsb';

const SIGNAL_ICONS: Record<DriftSignalType, React.ComponentType<{ color: string; size: number }>> = {
  recovery_lag: Clock,
  volatility_increase: Activity,
  downward_slope: ArrowDownRight,
  pattern_break: Shuffle,
};

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high: '#00D7FF',
  medium: '#F5B700',
  low: 'rgba(255,255,255,0.5)',
};

export default function EarlyDriftScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<QSBScope>('personal');
  const { data: result, isLoading } = useEarlyDrift(scope);

  const data = result?.success ? result.data : null;
  const error = result && !result.success ? result.error : null;

  const getRiskColor = (risk: 'low' | 'moderate' | 'elevated') => {
    switch (risk) {
      case 'low': return '#00D7FF';
      case 'moderate': return '#F5B700';
      case 'elevated': return '#FF3B30';
    }
  };

  const getRiskLabel = (risk: 'low' | 'moderate' | 'elevated') => {
    switch (risk) {
      case 'low': return 'Low Risk';
      case 'moderate': return 'Moderate Risk';
      case 'elevated': return 'Elevated Risk';
    }
  };

  const TrendIcon = data?.trendDirection === 'improving' ? TrendingUp : data?.trendDirection === 'declining' ? TrendingDown : Minus;
  const trendColor = data?.trendDirection === 'improving' ? '#00D7FF' : data?.trendDirection === 'declining' ? '#FF3B30' : 'rgba(255,255,255,0.5)';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="rgba(255,255,255,0.7)" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Early Drift Detector</Text>
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
            {/* Risk Level Card */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(400)}
              style={[
                styles.riskCard,
                { borderColor: `${getRiskColor(data.overallRisk)}40` },
              ]}
            >
              <View style={[styles.riskIndicator, { backgroundColor: getRiskColor(data.overallRisk) }]} />
              <View style={styles.riskContent}>
                <Text style={styles.riskLabel}>Overall Status</Text>
                <Text style={[styles.riskValue, { color: getRiskColor(data.overallRisk) }]}>
                  {getRiskLabel(data.overallRisk)}
                </Text>
              </View>
              <View style={styles.trendContainer}>
                <TrendIcon color={trendColor} size={18} />
                <Text style={[styles.trendLabel, { color: trendColor }]}>
                  {data.trendDirection === 'improving' ? 'Improving' : data.trendDirection === 'declining' ? 'Declining' : 'Stable'}
                </Text>
              </View>
            </Animated.View>

            {/* Predictive Warning */}
            {data.daysUntilPotentialIssue && (
              <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.warningCard}>
                <AlertTriangle color="#F5B700" size={20} />
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Predictive Alert</Text>
                  <Text style={styles.warningText}>
                    Based on current trends, potential capacity issues in ~{data.daysUntilPotentialIssue} days
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Detected Signals */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.card}>
              <Text style={styles.cardTitle}>Detected Signals</Text>
              {data.signals.length === 0 ? (
                <View style={styles.noSignals}>
                  <CheckCircle color="#00D7FF" size={24} />
                  <Text style={styles.noSignalsText}>No warning signals detected</Text>
                  <Text style={styles.noSignalsSubtext}>Your capacity patterns look healthy</Text>
                </View>
              ) : (
                <View style={styles.signalsList}>
                  {data.signals.map((signal, index) => {
                    const SignalIcon = SIGNAL_ICONS[signal.type];
                    const severityColor = signal.severity > 60 ? '#FF3B30' : signal.severity > 30 ? '#F5B700' : '#00D7FF';

                    return (
                      <View key={index} style={styles.signalItem}>
                        <View style={styles.signalHeader}>
                          <View style={styles.signalIconContainer}>
                            <SignalIcon color={severityColor} size={18} />
                          </View>
                          <View style={styles.signalInfo}>
                            <Text style={styles.signalLabel}>{signal.label}</Text>
                            <View style={styles.signalMeta}>
                              <View style={[styles.confidenceBadge, { borderColor: CONFIDENCE_COLORS[signal.confidence] }]}>
                                <Text style={[styles.confidenceText, { color: CONFIDENCE_COLORS[signal.confidence] }]}>
                                  {signal.confidence} confidence
                                </Text>
                              </View>
                              <Text style={styles.dataPoints}>{signal.dataPoints} data points</Text>
                            </View>
                          </View>
                          <View style={styles.severityBadge}>
                            <Text style={[styles.severityText, { color: severityColor }]}>
                              {signal.severity}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.signalDescription}>{signal.description}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </Animated.View>

            {/* Recommendations */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.card}>
              <Text style={styles.cardTitle}>Recommendations</Text>
              <View style={styles.recommendationsList}>
                {data.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <View style={styles.recommendationDot} />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* How It Works */}
            <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.infoCard}>
              <Text style={styles.infoTitle}>How Early Detection Works</Text>
              <Text style={styles.infoText}>
                The drift detector analyzes multiple signals to identify potential
                issues before they become problems:{'\n\n'}
                <Text style={{ fontWeight: '600' }}>• Recovery Lag:</Text> Increasing time to bounce back{'\n'}
                <Text style={{ fontWeight: '600' }}>• Volatility:</Text> Growing day-to-day variation{'\n'}
                <Text style={{ fontWeight: '600' }}>• Downward Slope:</Text> Gradual capacity decline{'\n'}
                <Text style={{ fontWeight: '600' }}>• Pattern Breaks:</Text> Changes in typical rhythms{'\n\n'}
                Confidence levels indicate how much data supports each signal.
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
  riskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  riskIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  riskContent: {
    flex: 1,
  },
  riskLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
  },
  riskValue: {
    fontSize: 22,
    fontWeight: '500',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245,183,0,0.08)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245,183,0,0.2)',
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5B700',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  card: {
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
    marginBottom: spacing.md,
  },
  noSignals: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  noSignalsText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.sm,
  },
  noSignalsSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  signalsList: {
    gap: spacing.md,
  },
  signalItem: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  signalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  signalIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  signalInfo: {
    flex: 1,
  },
  signalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  signalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  confidenceBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  dataPoints: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  severityBadge: {
    width: 36,
    alignItems: 'center',
  },
  severityText: {
    fontSize: 18,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  signalDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  recommendationsList: {
    gap: spacing.sm,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  recommendationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D7FF',
    marginTop: 6,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
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
