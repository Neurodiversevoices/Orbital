/**
 * Capacity Index (QSI) Detail Screen
 *
 * Shows:
 * - Headline composite score (0-100)
 * - Sub-indices: Capacity Level, Volatility, Recovery Velocity
 * - 90-day trend sparkline
 * - Scope toggle (Personal/Org/Global)
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
  Info,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { ScopeSelectorCompact, DemoBadge, InsufficientSignalsWarning } from '../../components/qsb';
import { useQSI, QSBScope } from '../../lib/qsb';

export default function CapacityIndexScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<QSBScope>('personal');
  const { data: result, isLoading } = useQSI(scope);

  const data = result?.success ? result.data : null;
  const error = result && !result.success ? result.error : null;

  // Render sparkline manually
  const renderSparkline = (sparklineData: number[]) => {
    if (!sparklineData?.length) return null;

    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const height = 60;
    const width = 280;

    return (
      <View style={styles.sparklineContainer}>
        <View style={[styles.sparkline, { height, width }]}>
          {sparklineData.slice(0, -1).map((value, index) => {
            const nextValue = sparklineData[index + 1];
            const x1 = (index / (sparklineData.length - 1)) * width;
            const x2 = ((index + 1) / (sparklineData.length - 1)) * width;
            const y1 = height - ((value - min) / range) * (height - 8) - 4;
            const y2 = height - ((nextValue - min) / range) * (height - 8) - 4;

            const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

            return (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  width: length,
                  height: 2,
                  backgroundColor: colors.primary,
                  borderRadius: 1,
                  left: x1,
                  top: y1,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            );
          })}
        </View>
        <View style={styles.sparklineLabels}>
          <Text style={styles.sparklineLabel} maxFontSizeMultiplier={1.5}>90 days ago</Text>
          <Text style={styles.sparklineLabel} maxFontSizeMultiplier={1.5}>Today</Text>
        </View>
      </View>
    );
  };

  const TrendIcon = (trend: 'up' | 'down' | 'stable') => {
    const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const color = trend === 'up' ? colors.primary : trend === 'down' ? '#DC2626' : colors.textTertiary;
    return <Icon color={color} size={16} />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </Pressable>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.5}>Capacity Index</Text>
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

        {/* Main Score */}
        {data && (
          <>
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.mainScoreCard}>
              <View style={styles.mainScoreHeader}>
                <Text style={styles.mainScoreLabel} maxFontSizeMultiplier={1.5}>QSI Score</Text>
                {TrendIcon(data.headlineTrend)}
              </View>
              <Text style={styles.mainScoreValue} maxFontSizeMultiplier={1.5}>{data.headline}</Text>
              <Text style={styles.mainScoreSubtext} maxFontSizeMultiplier={1.5}>
                Composite capacity score (0-100)
              </Text>
            </Animated.View>

            {/* Sparkline */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.card}>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>90-Day Trend</Text>
              {renderSparkline(data.sparkline)}
            </Animated.View>

            {/* Sub-Indices */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.card}>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>Sub-Indices</Text>
              <View style={styles.subIndices}>
                {/* Capacity Level */}
                <View style={styles.subIndex}>
                  <View style={styles.subIndexHeader}>
                    <Text style={styles.subIndexLabel} maxFontSizeMultiplier={1.5}>
                      {data.subIndices.capacityLevel.label}
                    </Text>
                    {TrendIcon(data.subIndices.capacityLevel.trend)}
                  </View>
                  <Text style={styles.subIndexValue} maxFontSizeMultiplier={1.5}>
                    {data.subIndices.capacityLevel.value}
                  </Text>
                  <Text style={styles.subIndexDescription} maxFontSizeMultiplier={1.5}>
                    {data.subIndices.capacityLevel.description}
                  </Text>
                </View>

                {/* Volatility */}
                <View style={styles.subIndex}>
                  <View style={styles.subIndexHeader}>
                    <Text style={styles.subIndexLabel} maxFontSizeMultiplier={1.5}>
                      {data.subIndices.volatility.label}
                    </Text>
                    {TrendIcon(data.subIndices.volatility.trend)}
                  </View>
                  <Text style={styles.subIndexValue} maxFontSizeMultiplier={1.5}>
                    {data.subIndices.volatility.value}
                  </Text>
                  <Text style={styles.subIndexDescription} maxFontSizeMultiplier={1.5}>
                    {data.subIndices.volatility.description}
                  </Text>
                </View>

                {/* Recovery Velocity */}
                <View style={styles.subIndex}>
                  <View style={styles.subIndexHeader}>
                    <Text style={styles.subIndexLabel} maxFontSizeMultiplier={1.5}>
                      {data.subIndices.recoveryVelocity.label}
                    </Text>
                    {TrendIcon(data.subIndices.recoveryVelocity.trend)}
                  </View>
                  <Text style={styles.subIndexValue} maxFontSizeMultiplier={1.5}>
                    {data.subIndices.recoveryVelocity.value}
                  </Text>
                  <Text style={styles.subIndexDescription} maxFontSizeMultiplier={1.5}>
                    {data.subIndices.recoveryVelocity.description}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* How It's Calculated */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Info color={colors.textSecondary} size={16} />
                <Text style={styles.infoTitle} maxFontSizeMultiplier={1.5}>How QSI is Calculated</Text>
              </View>
              <Text style={styles.infoText} maxFontSizeMultiplier={1.5}>
                The Capacity Index combines three sub-indices weighted by their impact
                on sustainable performance:{'\n\n'}
                • Capacity Level (40%): Average reported capacity{'\n'}
                • Volatility (30%): Day-to-day consistency (lower is better){'\n'}
                • Recovery Velocity (30%): Speed of bounce-back after dips
              </Text>
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
  mainScoreCard: {
    backgroundColor: 'rgba(45,212,191,0.10)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.30)',
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
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainScoreValue: {
    fontSize: 72,
    fontWeight: '200',
    color: '#0E8C7B',
    fontVariant: ['tabular-nums'],
    marginVertical: spacing.sm,
  },
  mainScoreSubtext: {
    fontSize: 12,
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sparklineContainer: {
    alignItems: 'center',
  },
  sparkline: {
    position: 'relative',
    overflow: 'hidden',
  },
  sparklineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 280,
    marginTop: spacing.sm,
  },
  sparklineLabel: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  subIndices: {
    gap: spacing.md,
  },
  subIndex: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  subIndexHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  subIndexLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  subIndexValue: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  subIndexDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
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
