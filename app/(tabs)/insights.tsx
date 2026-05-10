/**
 * Insights Tab — "Reservoir × Demand"
 *
 * Window-tabbed view of reservoir vs demand with crossover analysis.
 * Skeleton-only chart (mocked data) — TODO wire to live data.
 *
 * TODO (data wiring):
 *  - Real reservoir signal from `lib/health` recovery aggregate
 *  - Real demand from logged demand events + biometric drift
 *  - Replace inline mock chart with `PatternBarsChart` dual-line variant
 *    once components/PatternBarsChart.tsx ships in this branch.
 *  - Replace inline insight cards with `DetectedPatternCard` once available.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, BarChart2 } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { EmptyState } from '../../components';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';

// =============================================================================
// LIGHT THEME TOKENS
// =============================================================================
const LIGHT = {
  background: '#FFFFFF',
  textPrimary: '#0F1624',
  textSecondary: 'rgba(15, 22, 36, 0.62)',
  textTertiary: 'rgba(15, 22, 36, 0.38)',
  hairline: 'rgba(15, 22, 36, 0.10)',
  cardShadow: 'rgba(15, 22, 36, 0.06)',
  accent: '#2DD4BF',
  amber: '#F59E0B',
  crimson: '#DC2626',
  cyan: '#06B6D4',
};

// CLAUDE.md prefers JetBrains Mono; only Space Mono is loaded in the app.
const MONO_FONT = 'SpaceMono_400Regular';
const SANS_FONT = 'DMSans_700Bold';

type Window = 14 | 30 | 90;

// =============================================================================
// MOCK DATA — TODO replace with real reservoir/demand series
// =============================================================================
function generateMockSeries(days: number): { reservoir: number[]; demand: number[] } {
  const reservoir: number[] = [];
  const demand: number[] = [];
  let r = 70;
  let d = 50;
  for (let i = 0; i < days; i++) {
    r = Math.max(20, Math.min(95, r + (Math.random() - 0.5) * 12));
    d = Math.max(15, Math.min(95, d + (Math.random() - 0.5) * 14));
    reservoir.push(Math.round(r));
    demand.push(Math.round(d));
  }
  return { reservoir, demand };
}

interface CrossoverInsights {
  crossoverDays: number;
  recoveryRateDays: number;
  bestStreakDays: number;
}

function deriveInsights(
  reservoir: number[],
  demand: number[]
): CrossoverInsights {
  let crossoverDays = 0;
  let bestStreakDays = 0;
  let curStreak = 0;
  const recoveryGaps: number[] = [];
  let lastCrossover: number | null = null;

  for (let i = 0; i < reservoir.length; i++) {
    const isCrossover = demand[i] > reservoir[i];
    if (isCrossover) {
      crossoverDays += 1;
      if (lastCrossover !== null) {
        // ongoing crossover, no recovery measure
      }
      lastCrossover = i;
      curStreak = 0;
    } else {
      // recovered from crossover
      if (lastCrossover !== null) {
        recoveryGaps.push(i - lastCrossover);
        lastCrossover = null;
      }
      // streak with reservoir > demand × 1.2
      if (reservoir[i] > demand[i] * 1.2) {
        curStreak += 1;
        bestStreakDays = Math.max(bestStreakDays, curStreak);
      } else {
        curStreak = 0;
      }
    }
  }

  const recoveryRateDays =
    recoveryGaps.length > 0
      ? Math.round(
          recoveryGaps.reduce((a, b) => a + b, 0) / recoveryGaps.length
        )
      : 0;

  return { crossoverDays, recoveryRateDays, bestStreakDays };
}

// =============================================================================
// MAIN
// =============================================================================
export default function InsightsScreen() {
  const router = useRouter();
  const { logs } = useEnergyLogs();
  const [window, setWindow] = useState<Window>(30);

  // TODO: replace mock with real data
  const series = useMemo(() => generateMockSeries(window), [window]);
  const insights = useMemo(
    () => deriveInsights(series.reservoir, series.demand),
    [series]
  );

  const hasData = logs.length > 0;

  const goBrief = () => router.push('/sentinel-brief');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.5}>
            {`INSIGHTS · ${window}D`}
          </Text>
          <Text
            style={styles.headline}
            maxFontSizeMultiplier={1.5}
            accessibilityRole="header"
          >
            Where reservoir meets demand.
          </Text>
        </Animated.View>

        {/* Window tabs */}
        <View style={styles.tabRow} accessibilityRole="tablist">
          {([14, 30, 90] as const).map((w) => {
            const isActive = window === w;
            return (
              <Pressable
                key={w}
                onPress={() => setWindow(w)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${w} day window`}
                style={({ pressed }) => [
                  styles.tab,
                  isActive && styles.tabActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                  maxFontSizeMultiplier={1.5}
                >
                  {w}D
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Chart card */}
        {hasData ? (
          <View style={styles.card}>
            <Text style={styles.cardEyebrow} maxFontSizeMultiplier={1.5}>
              RESERVOIR vs DEMAND
            </Text>
            {/* TODO: replace with PatternBarsChart dual-line variant */}
            <DualLineChart
              reservoir={series.reservoir}
              demand={series.demand}
            />
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendSwatch, { backgroundColor: LIGHT.cyan }]}
                />
                <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>
                  Reservoir
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: LIGHT.crimson },
                  ]}
                />
                <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>
                  Demand
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    {
                      backgroundColor: 'rgba(220,38,38,0.18)',
                      borderColor: LIGHT.crimson,
                      borderWidth: 1,
                    },
                  ]}
                />
                <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>
                  Crossover
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <EmptyState
              icon={BarChart2}
              title="Not enough data yet"
              description="Log a few days of capacity signals to unlock the reservoir x demand view."
              size="standard"
            />
          </View>
        )}

        {/* Insight cards (DetectedPatternCard skeleton) */}
        <InsightCard
          eyebrow="CROSSOVER EVENTS"
          value={`${insights.crossoverDays} day${insights.crossoverDays === 1 ? '' : 's'}`}
          description="Days demand exceeded reservoir in this window."
          onPress={goBrief}
        />
        <InsightCard
          eyebrow="RECOVERY RATE"
          value={
            insights.recoveryRateDays > 0
              ? `${insights.recoveryRateDays}d avg`
              : '—'
          }
          description="Average days to recover after a crossover."
          onPress={goBrief}
        />
        <InsightCard
          eyebrow="BEST WINDOW"
          value={`${insights.bestStreakDays} day${insights.bestStreakDays === 1 ? '' : 's'}`}
          description="Longest streak with reservoir > demand × 1.2."
          onPress={goBrief}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// INSIGHT CARD — placeholder for DetectedPatternCard
// =============================================================================
function InsightCard({
  eyebrow,
  value,
  description,
  onPress,
}: {
  eyebrow: string;
  value: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${eyebrow}: ${value}. ${description} Tap to open the brief.`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.insightHeader}>
        <Text style={styles.cardEyebrow} maxFontSizeMultiplier={1.5}>
          {eyebrow}
        </Text>
        <ChevronRight color={LIGHT.textTertiary} size={18} />
      </View>
      <Text style={styles.insightValue} maxFontSizeMultiplier={1.5}>
        {value}
      </Text>
      <Text style={styles.insightDesc} maxFontSizeMultiplier={1.5}>
        {description}
      </Text>
    </Pressable>
  );
}

// =============================================================================
// DUAL-LINE CHART (skeleton — pure RN, no SVG dep)
// =============================================================================
function DualLineChart({
  reservoir,
  demand,
}: {
  reservoir: number[];
  demand: number[];
}) {
  const max = 100;
  const height = 160;
  const barCount = reservoir.length;

  return (
    <View
      style={{ height, flexDirection: 'row', alignItems: 'flex-end' }}
      accessibilityLabel="Reservoir versus demand chart"
    >
      {reservoir.map((r, i) => {
        const d = demand[i];
        const isCrossover = d > r;
        const rH = (r / max) * height;
        const dH = (d / max) * height;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height,
              marginHorizontal: 1,
              justifyContent: 'flex-end',
              backgroundColor: isCrossover ? 'rgba(220,38,38,0.10)' : 'transparent',
            }}
          >
            {/* Reservoir bar (cyan) */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: rH,
                backgroundColor: LIGHT.cyan,
                opacity: 0.55,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
              }}
            />
            {/* Demand bar (crimson) */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: barCount > 30 ? 0 : 4,
                right: barCount > 30 ? 0 : 4,
                height: dH,
                backgroundColor: LIGHT.crimson,
                opacity: 0.7,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LIGHT.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 48,
  },
  header: { marginBottom: 20 },
  eyebrow: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    letterSpacing: 1.76,
    textTransform: 'uppercase',
    color: LIGHT.textSecondary,
    marginBottom: 8,
  },
  headline: {
    fontFamily: SANS_FONT,
    fontSize: 28,
    fontWeight: '700',
    color: LIGHT.textPrimary,
    lineHeight: 34,
  },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15,22,36,0.04)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: LIGHT.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    letterSpacing: 1.76,
    color: LIGHT.textSecondary,
  },
  tabTextActive: { color: LIGHT.textPrimary },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LIGHT.hairline,
    padding: 16,
    marginBottom: 16,
    shadowColor: LIGHT.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardEyebrow: {
    fontFamily: MONO_FONT,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: LIGHT.textSecondary,
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: LIGHT.hairline,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: LIGHT.textSecondary,
  },

  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightValue: {
    fontFamily: SANS_FONT,
    fontSize: 24,
    fontWeight: '700',
    color: LIGHT.textPrimary,
    marginVertical: 4,
  },
  insightDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: LIGHT.textSecondary,
    lineHeight: 18,
  },
});
