// Rule 2.1: View+Text only, no HTML elements. Rule 2.2: no CSS shorthand strings.
// Rule 2.12: no <Image> in focal area. Rule 2.13: no orphan instruction text.
import React, { useMemo } from 'react';
import { Gauge } from '../../components/instrument/Gauge';
import { TypicalRangeChip } from '../../components/instrument/TypicalRangeChip';
import { MetricCard } from '../../components/instrument/MetricCard';
import { SignalCard } from '../../components/instrument/SignalCard';
import { typicalRange } from '../../lib/capacity/typical';
import { generateInsight } from '../../lib/capacity/insight';
import { calculateCapacity } from '../../lib/capacity/calculateCapacity';
import { DEMO_INPUT } from '../../lib/capacity/demoData';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter, Redirect } from 'expo-router';
import { Settings, Sparkles } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ModeInsightsPanel,
  OrgRoleBanner,
} from '../../components';
import { colors, spacing } from '../../theme';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';
import { useLocale } from '../../lib/hooks/useLocale';
import { useAppMode } from '../../lib/hooks/useAppMode';
import { useTutorial } from '../../lib/hooks/useTutorial';
import { Locale } from '../../locales';

function formatDate(locale: Locale): string {
  const localeCode = locale === 'es' ? 'es-MX' : 'en-US';
  return new Date().toLocaleDateString(localeCode, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// Baseline day counter — will eventually come from user_capacity_baseline table
const BASELINE_DAY = 3;
const BASELINE_TARGET = 14;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { hasSeenTutorial, isLoading: tutorialLoading } = useTutorial();
  const { logs } = useEnergyLogs();
  const { t, locale } = useLocale();
  const { modeConfig, currentMode } = useAppMode();

  // ─── Capacity reading ─────────────────────────────────────────────
  const reading = useMemo(() => {
    try {
      return calculateCapacity(DEMO_INPUT);
    } catch {
      return null;
    }
  }, []);

  const capacityScore = useMemo((): import('../../lib/capacity/types').CapacityScore => {
    if (reading) {
      const v1State = reading.state;
      const mappedState =
        v1State === 'Low'
          ? 'DEPLETED'
          : v1State === 'Near Limit' || v1State === 'Elevated'
            ? 'RESOURCED'
            : 'ELEVATED';
      return {
        value: reading.capacityScore,
        state: mappedState as import('../../lib/capacity/types').CapacityState,
        computedAt: reading.timestamp,
      };
    }
    return { value: 60, state: 'ELEVATED', computedAt: new Date().toISOString() };
  }, [reading]);

  const range = useMemo(
    () =>
      typicalRange(
        [58, 62, 60, 64, 61, 63, 59, 65, 60, 62],
        BASELINE_DAY,
        BASELINE_TARGET,
      ),
    [],
  );

  const insight = useMemo(() => generateInsight(capacityScore), [capacityScore]);

  // Health metrics — stubs until HealthKit/Apple Health integration
  const healthMetrics = useMemo(
    () => [
      { label: 'Sleep', value: null as string | null, trend: null as 'up' | 'down' | 'flat' | null },
      { label: 'HRV', value: null as string | null, trend: null as 'up' | 'down' | 'flat' | null },
      { label: 'RHR', value: null as string | null, trend: null as 'up' | 'down' | 'flat' | null },
    ],
    [],
  );

  // ─── Loading / Tutorial gates ──────────────────────────────────────
  if (tutorialLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ActivityIndicator color="#00E5FF" size="large" />
      </SafeAreaView>
    );
  }

  if (hasSeenTutorial === false) {
    return <Redirect href="/tutorial" />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.root} testID="today-screen" collapsable={false}>
        {/* ─── HEADER ─── */}
        <Animated.View style={styles.header}>
          <Pressable
            onPress={() => router.push('/upgrade')}
            style={styles.iconButton}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Plans"
            testID="open-plans"
          >
            <View accessibilityElementsHidden>
              <Sparkles color="#FFD700" size={22} />
            </View>
          </Pressable>
          <Text style={[styles.title, { color: `${modeConfig.accentColor}CC` }]}>Orbital</Text>
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.iconButton}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Settings"
            testID="open-settings"
          >
            <View accessibilityElementsHidden>
              <Settings color={colors.textSecondary} size={24} />
            </View>
          </Pressable>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Pattern 7: date header */}
          <Animated.View
            entering={FadeIn.delay(60).duration(350)}
            style={styles.welcomeSection}
          >
            <Text style={styles.welcomeText}>{t.home.title}</Text>
            <Text style={styles.dateText}>{formatDate(locale)}</Text>
          </Animated.View>

          <OrgRoleBanner mode={currentMode} compact />
          {currentMode !== 'personal' && <ModeInsightsPanel logs={logs} />}

          {/* Pattern 1: Focal gauge */}
          <Animated.View
            entering={FadeIn.delay(150).duration(400)}
            style={styles.focalSection}
            testID="focal-section"
          >
            <Gauge score={capacityScore.value} state={capacityScore.state} />
            {/* Pattern 2: Typical range chip */}
            <TypicalRangeChip range={range} />
          </Animated.View>

          {/* Pattern 3: Metric card row */}
          <Animated.View
            entering={FadeIn.delay(200).duration(400)}
            style={styles.metricsRow}
            testID="metrics-row"
          >
            {healthMetrics.map((m) => (
              <MetricCard
                key={m.label}
                label={m.label}
                value={m.value}
                trend={m.trend}
                baselineDay={BASELINE_DAY}
                baselineTarget={BASELINE_TARGET}
              />
            ))}
          </Animated.View>

          {/* Pattern 4: Signal / insight card */}
          <Animated.View
            entering={FadeIn.delay(250).duration(400)}
            style={styles.signalCardWrap}
          >
            <SignalCard insight={insight} />
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#01020A',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 0,
    paddingBottom: 0,
  },
  iconButton: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '200',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  focalSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  signalCardWrap: {
    marginTop: 4,
    marginBottom: 8,
  },
});
