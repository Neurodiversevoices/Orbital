/**
 * Brief Tab - QSB (Quarterly Strategic Brief) Overview
 *
 * Shows 5 QSB feature cards with navigation to detail screens:
 * 1. Capacity Index (QSI)
 * 2. Load Friction Map
 * 3. Recovery Elasticity Score
 * 4. Early Drift Detector
 * 5. Intervention Sensitivity Layer
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  Gauge,
  Grid3X3,
  Activity,
  AlertTriangle,
  Layers,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { ScopeSelector } from '../../components/qsb';
import { DemoBadge } from '../../components/qsb/DemoBadge';
import { useQSBData, QSBScope } from '../../lib/qsb';

interface BriefCardProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  value?: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  color?: string;
  onPress: () => void;
  delay: number;
  isDemo?: boolean;
}

function BriefCard({
  title,
  subtitle,
  icon: Icon,
  value,
  trend,
  trendLabel,
  color = '#00D7FF',
  onPress,
  delay,
  isDemo,
}: BriefCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#00D7FF' : trend === 'down' ? '#FF3B30' : 'rgba(255,255,255,0.5)';

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
            <Icon color={color} size={22} />
          </View>
          <ChevronRight color="rgba(255,255,255,0.3)" size={20} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{title}</Text>
            {isDemo && <DemoBadge />}
          </View>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>

        {value !== undefined && (
          <View style={styles.cardFooter}>
            <Text style={[styles.cardValue, { color }]}>{value}</Text>
            {trend && (
              <View style={styles.trendContainer}>
                <TrendIcon color={trendColor} size={14} />
                {trendLabel && (
                  <Text style={[styles.trendLabel, { color: trendColor }]}>
                    {trendLabel}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function BriefScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<QSBScope>('personal');
  const { overview, isLoading, refresh } = useQSBData({ scope });
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 500);
  }, [refresh]);

  // Extract data for cards
  const data = overview?.success ? overview.data : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00D7FF"
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={styles.headerTitle}>Strategic Brief</Text>
          <Text style={styles.headerSubtitle}>
            Quarterly insights into your capacity patterns
          </Text>
        </Animated.View>

        {/* Scope Selector */}
        <ScopeSelector scope={scope} onScopeChange={setScope} />

        {/* Demo Banner */}
        {data?.isDemo && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>
              Viewing demo data. Real insights appear as you log capacity signals.
            </Text>
          </View>
        )}

        {/* Brief Cards */}
        <View style={styles.cardsContainer}>
          {/* 1. Capacity Index */}
          <BriefCard
            title="Capacity Index"
            subtitle="Your composite capacity score with sub-indices"
            icon={Gauge}
            value={data?.qsi.headline ?? '--'}
            trend={data?.qsi.headlineTrend}
            trendLabel={data?.qsi.headlineTrend === 'up' ? 'Improving' : data?.qsi.headlineTrend === 'down' ? 'Declining' : 'Stable'}
            color="#00D7FF"
            onPress={() => router.push('/qsb/capacity-index')}
            delay={100}
            isDemo={data?.isDemo}
          />

          {/* 2. Load Friction Map */}
          <BriefCard
            title="Load Friction Map"
            subtitle="When capacity dips most—by day and time"
            icon={Grid3X3}
            value={`${data?.loadFriction.weekdayAvg ?? '--'} weekday avg`}
            color="#F5B700"
            onPress={() => router.push('/qsb/load-friction')}
            delay={200}
            isDemo={data?.isDemo}
          />

          {/* 3. Recovery Elasticity */}
          <BriefCard
            title="Recovery Elasticity"
            subtitle="How quickly you bounce back from dips"
            icon={Activity}
            value={data?.recoveryElasticity.score ?? '--'}
            trend={data?.recoveryElasticity.trend === 'improving' ? 'up' : data?.recoveryElasticity.trend === 'declining' ? 'down' : 'stable'}
            trendLabel={`${data?.recoveryElasticity.avgRecoveryHours ?? '--'}h avg`}
            color="#00D7FF"
            onPress={() => router.push('/qsb/recovery-elasticity')}
            delay={300}
            isDemo={data?.isDemo}
          />

          {/* 4. Early Drift Detector */}
          <BriefCard
            title="Early Drift Detector"
            subtitle="Warning signals before capacity issues"
            icon={AlertTriangle}
            value={data?.earlyDrift.overallRisk === 'low' ? 'Low Risk' : data?.earlyDrift.overallRisk === 'moderate' ? 'Moderate' : 'Elevated'}
            color={
              data?.earlyDrift.overallRisk === 'low'
                ? '#00D7FF'
                : data?.earlyDrift.overallRisk === 'moderate'
                ? '#F5B700'
                : '#FF3B30'
            }
            onPress={() => router.push('/qsb/early-drift')}
            delay={400}
            isDemo={data?.isDemo}
          />

          {/* 5. Intervention Sensitivity */}
          <BriefCard
            title="Intervention Sensitivity"
            subtitle="Track what changes help your capacity"
            icon={Layers}
            value={`${data?.interventionSensitivity.activeInterventions.length ?? 0} active`}
            color="#00D7FF"
            onPress={() => router.push('/qsb/intervention-sensitivity')}
            delay={500}
            isDemo={data?.isDemo}
          />
        </View>

        {/* Footer Note */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.footer}>
          <Text style={styles.footerText}>
            Data is computed from your capacity signals.{'\n'}
            More signals = more accurate insights.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  demoBanner: {
    backgroundColor: 'rgba(245,183,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,183,0,0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  demoBannerText: {
    fontSize: 12,
    color: '#F5B700',
    textAlign: 'center',
  },
  cardsContainer: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
  },
  cardPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
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
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
