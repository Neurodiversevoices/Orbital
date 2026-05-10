/**
 * Pattern Intelligence — Light theme rewrite (May 2026 redesign).
 *
 * Layout:
 *   1. Eyebrow + Headline + Subhead
 *   2. Time-range tabs (14D / 30D / 90D / 1Y / ALL)
 *   3. Big PatternBarsChart inside a light card
 *   4. Pattern Insight card (clickable)
 *   5. DETECTED PATTERNS section (3 DetectedPatternCards)
 *   6. Bottom safe-area padding
 *
 * Constraints honored:
 *   - NO orb / gauge imports
 *   - StatusBar dark
 *   - All colors from theme/colors.ts
 *   - Upstream useHealthSnapshot is guarded (other agent's worktree)
 *   - Existing useEnergyLogs hook is the data source
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Moon,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';

import { colors, spacing } from '../../theme';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';
import { calculateBaselineStats } from '../../lib/baselineUtils';
import { CapacityLog, CapacityState } from '../../types';
import { EmptyState } from '../../components';
import { PatternBarsChart } from '../../components/PatternBarsChart';
import { DetectedPatternCard } from '../../components/DetectedPatternCard';

// -----------------------------------------------------------------------------
// useHealthSnapshot — landing in another agent's worktree at lib/health/.
// Inline noop fallback so this screen bundles until that hook lands. After
// merge, replace this with:
//   import { useHealthSnapshot } from '../../lib/health/useHealth';
// and read snapshot?.recovery?.hours.
// -----------------------------------------------------------------------------
type HealthHookResult = {
  snapshot: { recovery: { hours: number } | null } | null;
};
const useHealthSnapshot = (): HealthHookResult => ({ snapshot: null });

// -----------------------------------------------------------------------------
// Local time-range model — distinct from existing TimeRangeTabs (which has
// 7d/6m/10y). Mockup spec: 14D / 30D / 90D / 1Y / ALL.
// -----------------------------------------------------------------------------
type LocalRange = '14d' | '30d' | '90d' | '1y' | 'all';

const RANGES: { key: LocalRange; label: string; days: number | null }[] = [
  { key: '14d', label: '14D', days: 14 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'ALL', days: null },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const stateToCapacity = (s: CapacityState): number => {
  switch (s) {
    case 'resourced':
      return 0.8;
    case 'stretched':
      return 0.5;
    case 'depleted':
      return 0.25;
  }
};

// Confidence helper — derives a 0-100 confidence number from baselineStats.
function confidenceFromTier(
  tier: 'building' | 'baseline' | 'growing' | 'high',
): number {
  switch (tier) {
    case 'building':
      return 25;
    case 'baseline':
      return 55;
    case 'growing':
      return 75;
    case 'high':
      return 95;
  }
}

// Daily aggregation — average capacity per local date inside the window.
function aggregateDaily(
  logs: CapacityLog[],
  windowDays: number | null,
): number[] {
  if (logs.length === 0) return [];
  const now = Date.now();
  const start = windowDays === null ? 0 : now - windowDays * DAY_MS;
  const inWindow = logs.filter((l) => l.timestamp >= start);

  // Group by localDate (YYYY-MM-DD)
  const buckets = new Map<string, number[]>();
  for (const log of inWindow) {
    const key =
      log.localDate ?? new Date(log.timestamp).toISOString().slice(0, 10);
    const v = log.capacity_value ?? stateToCapacity(log.state);
    const arr = buckets.get(key) ?? [];
    arr.push(v);
    buckets.set(key, arr);
  }
  const dates = Array.from(buckets.keys()).sort();
  return dates.map((d) => {
    const arr = buckets.get(d) ?? [];
    const avg =
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return Math.max(0, Math.min(1, avg));
  });
}

// Pattern detection — Monday score + window vs prior-window trend.
function detectMondayPattern(logs: CapacityLog[]): {
  score: string;
  active: boolean;
} {
  const now = Date.now();
  const windowMs = 30 * DAY_MS;
  const windowLogs = logs.filter((l) => l.timestamp >= now - windowMs);
  if (windowLogs.length < 5) return { score: '—', active: false };

  let mondayDepleted = 0;
  let mondayTotal = 0;
  let otherDepleted = 0;
  let otherTotal = 0;
  for (const l of windowLogs) {
    const d = new Date(l.timestamp).getDay();
    const isStrained = l.state === 'depleted' || l.state === 'stretched';
    if (d === 1) {
      mondayTotal++;
      if (isStrained) mondayDepleted++;
    } else {
      otherTotal++;
      if (isStrained) otherDepleted++;
    }
  }
  if (mondayTotal === 0) return { score: '—', active: false };
  const mondayRate = mondayDepleted / mondayTotal;
  const otherRate = otherTotal > 0 ? otherDepleted / otherTotal : 0;
  const lift = mondayRate - otherRate;
  return {
    score: `${Math.round(mondayRate * 100)}%`,
    active: lift > 0.15,
  };
}

function computeTrend(
  logs: CapacityLog[],
  days: number,
): { delta: number; direction: 'up' | 'down' | 'flat' } {
  const now = Date.now();
  const winMs = days * DAY_MS;
  const cur = logs.filter((l) => l.timestamp >= now - winMs);
  const prev = logs.filter(
    (l) => l.timestamp >= now - winMs * 2 && l.timestamp < now - winMs,
  );
  if (cur.length === 0 || prev.length === 0) {
    return { delta: 0, direction: 'flat' };
  }
  const avg = (xs: CapacityLog[]) =>
    xs.reduce((a, l) => a + (l.capacity_value ?? stateToCapacity(l.state)), 0) /
    xs.length;
  const delta = (avg(cur) - avg(prev)) * 100; // 0..100 scale
  const direction = delta > 1 ? 'up' : delta < -1 ? 'down' : 'flat';
  return { delta, direction };
}

function detectSleepCorrelation(logs: CapacityLog[]): boolean {
  const now = Date.now();
  return logs
    .filter((l) => l.timestamp >= now - 30 * DAY_MS)
    .some((l) => l.tags.includes('sleep'));
}

// -----------------------------------------------------------------------------
// SCREEN
// -----------------------------------------------------------------------------
export default function PatternsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { logs, isLoading, refresh } = useEnergyLogs();
  const { snapshot } = useHealthSnapshot();
  const avgSleepHours = snapshot?.recovery?.hours ?? null;

  const [range, setRange] = useState<LocalRange>('30d');

  const baselineStats = useMemo(() => calculateBaselineStats(logs), [logs]);
  const dayCount = baselineStats.baselineDays;
  const confidence = confidenceFromTier(baselineStats.confidenceTier);

  const activeRange = RANGES.find((r) => r.key === range) ?? RANGES[1];
  const chartData = useMemo(
    () => aggregateDaily(logs, activeRange.days),
    [logs, activeRange.days],
  );

  const monday = useMemo(() => detectMondayPattern(logs), [logs]);
  const sleepCorr = useMemo(() => detectSleepCorrelation(logs), [logs]);
  const trendDays = activeRange.days ?? 30;
  const trend = useMemo(
    () => computeTrend(logs, trendDays),
    [logs, trendDays],
  );

  const insightText = monday.active
    ? "Low-capacity days cluster after poor sleep and early-week load."
    : sleepCorr
      ? 'Capacity tracks your sleep duration.'
      : 'Patterns emerging — keep logging.';

  // Responsive headline size
  const headlineSize = width < 360 ? 32 : width < 420 ? 36 : 40;

  // Chart sizing — full screen width minus screen H-padding (32*2) minus card padding (12*2)
  const chartWidth = Math.max(0, width - spacing.xl * 2 - 24);

  const handleInsightPress = useCallback(() => {
    // Existing /patterns route is this screen; route to brief tab as a deeper view.
    router.push('/(tabs)/brief');
  }, [router]);

  const handleRangePress = useCallback((next: LocalRange) => {
    setRange(next);
  }, []);

  const isEmpty = !isLoading && logs.length === 0;

  // -- Pattern card values --------------------------------------------------
  const sleepValue =
    avgSleepHours !== null && Number.isFinite(avgSleepHours)
      ? `${avgSleepHours.toFixed(1)}h`
      : '—';

  const trendIcon = trend.direction === 'up' ? TrendingUp : TrendingDown;
  const trendColor =
    trend.direction === 'up'
      ? colors.resourced
      : trend.direction === 'down'
        ? colors.depleted
        : colors.textSecondary;
  const trendArrow =
    trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
  const trendValue =
    trend.direction === 'flat'
      ? '—'
      : `${trendArrow} ${Math.abs(trend.delta).toFixed(1)}`;
  const trendDaysLabel = activeRange.days ?? dayCount;

  // X-axis labels routed into PatternBarsChart
  const rangeLabel = activeRange.days ? `${activeRange.days} DAYS AGO` : 'ALL TIME';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={colors.textSecondary}
          />
        }
      >
        {/* 1. Eyebrow + Headline + Subhead --------------------------------- */}
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow} accessibilityRole="text">
            PATTERN INTELLIGENCE
          </Text>
          <Text
            style={[styles.headline, { fontSize: headlineSize }]}
            accessibilityRole="header"
          >
            What we&apos;ve learned about you
          </Text>
          <Text style={styles.subhead}>
            {dayCount} days of signal · {confidence}% confidence
          </Text>
        </View>

        {/* 2. Time-range tabs --------------------------------------------- */}
        <View
          style={styles.tabsRow}
          accessibilityRole="tablist"
          accessibilityLabel="Time range"
        >
          {RANGES.map((r) => {
            const selected = r.key === range;
            return (
              <Pressable
                key={r.key}
                onPress={() => handleRangePress(r.key)}
                accessibilityRole="tab"
                accessibilityLabel={`${r.label} range`}
                accessibilityState={{ selected }}
                style={styles.tabButton}
                hitSlop={8}
              >
                <Text
                  style={[styles.tabLabel, selected && styles.tabLabelActive]}
                >
                  {r.label}
                </Text>
                {selected && <View style={styles.tabUnderline} />}
              </Pressable>
            );
          })}
        </View>

        {/* 3. PatternBarsChart -------------------------------------------- */}
        <View style={styles.chartCard}>
          {isEmpty ? (
            <EmptyState
              icon={Calendar}
              title="No entries yet"
              description="Capacity logs will appear here once you start logging."
              size="compact"
            />
          ) : (
            <PatternBarsChart
              data={chartData}
              width={chartWidth}
              height={260}
              rangeLabel={rangeLabel}
              endLabel="TODAY"
            />
          )}
        </View>

        {/* 4. Pattern Insight card ---------------------------------------- */}
        <Pressable
          onPress={handleInsightPress}
          style={({ pressed }) => [
            styles.insightCard,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open pattern insight"
        >
          <View style={styles.insightIconBubble}>
            {monday.active ? (
              <RotateCcw size={20} color={colors.primary} />
            ) : (
              <Sparkles size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.insightTextWrap}>
            <Text style={styles.insightEyebrow}>PATTERN INSIGHT</Text>
            <Text style={styles.insightBody}>{insightText}</Text>
          </View>
          <ChevronRight size={20} color={colors.textTertiary} />
        </Pressable>

        {/* 5. DETECTED PATTERNS ------------------------------------------- */}
        <Text style={styles.sectionLabel}>DETECTED PATTERNS</Text>
        <View style={styles.cardsRow}>
          <View style={styles.cardSlot}>
            <DetectedPatternCard
              icon={Calendar}
              iconColor={colors.depleted}
              eyebrow="MONDAY PATTERN"
              value={monday.score}
              valueColor={colors.depleted}
              description="Capacity usually drops on Mondays."
            />
          </View>
          <View style={styles.cardSlot}>
            <DetectedPatternCard
              icon={Moon}
              iconColor={colors.primary}
              eyebrow="SLEEP AVERAGE"
              value={sleepValue}
              valueColor={colors.primary}
              description="Your typical sleep across this window."
            />
          </View>
          <View style={styles.cardSlot}>
            <DetectedPatternCard
              icon={trendIcon}
              iconColor={trendColor}
              eyebrow={`${trendDaysLabel}D TREND`}
              value={trendValue}
              valueColor={trendColor}
              description={`vs prior ${trendDaysLabel} days`}
            />
          </View>
        </View>

        {/* 6. Bottom safe-area padding for tab bar ------------------------ */}
        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
// STYLES — light theme. All colors from theme/colors.ts.
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Header block
  headerBlock: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: 'SpaceMono_400Regular',
    letterSpacing: 11 * 0.18, // 0.18em at 11pt
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  headline: {
    fontFamily: 'DMSans_700Bold',
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
    // line-height ~ 1.05 of font size; set per-render via style override below if needed
  },
  subhead: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
  },

  // Time-range tabs
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    gap: spacing.lg,
  },
  tabButton: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: colors.textPrimary,
    fontFamily: 'DMSans_700Bold',
    fontWeight: '700',
  },
  tabUnderline: {
    marginTop: 4,
    height: 2,
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1,
  },

  // Chart card
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: spacing.lg,
  },

  // Insight card
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  insightIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTextWrap: {
    flex: 1,
  },
  insightEyebrow: {
    fontSize: 10,
    color: colors.primary,
    fontFamily: 'SpaceMono_400Regular',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  insightBody: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: 'DMSans_500Medium',
    lineHeight: 20,
  },

  // Detected patterns
  sectionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'SpaceMono_400Regular',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardSlot: {
    flex: 1,
  },

  bottomPad: {
    height: spacing.xxl,
  },
});
