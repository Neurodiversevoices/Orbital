// Rule 2.1: View+Text only, no HTML elements. Rule 2.2: no CSS shorthand strings.
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Gauge } from '../../components/instrument/Gauge';
import { TypicalRangeChip } from '../../components/instrument/TypicalRangeChip';
import { SignalCard } from '../../components/instrument/SignalCard';
import { MetricCard } from '../../components/instrument/MetricCard';
import { calculateCapacity } from '../../lib/capacity/calculateCapacity';
import { typicalRange } from '../../lib/capacity/typical';
import { generateInsight } from '../../lib/capacity/insight';
import { stateOfUppercase } from '../../lib/capacity/gaugeMath';
import { DEMO_INPUT } from '../../lib/capacity/demoData';

const demoReading = (() => { try { return calculateCapacity(DEMO_INPUT); } catch { return null; } })();
const DEMO_SCORE = demoReading?.capacityScore ?? 60;
const DEMO_V1_STATE = demoReading?.state ?? 'Stable';
const DEMO_STATE = (DEMO_V1_STATE === 'Low' ? 'DEPLETED' : DEMO_V1_STATE === 'Near Limit' || DEMO_V1_STATE === 'Elevated' ? 'RESOURCED' : 'ELEVATED') as import('../../lib/capacity/types').CapacityState;

const BASELINE_DAY = 3;
const BASELINE_TARGET = 14;

export default function TodayWeb() {
  const router = useRouter();
  const [liveScore, setLiveScore] = useState(DEMO_SCORE);
  const liveState = stateOfUppercase(liveScore);

  const range = typicalRange([58, 62, 60, 64, 61, 63, 59, 65, 60, 62], BASELINE_DAY, BASELINE_TARGET);
  const insight = generateInsight({ value: liveScore, state: liveState, computedAt: new Date().toISOString() });

  const handleScoreChange = useCallback((v: number) => setLiveScore(v), []);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text testID="screen-today" style={s.eyebrow}>YOUR CAPACITY · LIVE</Text>
      <Text style={s.headline}>Capacity intelligence that moves with you.</Text>
      <Text style={s.body}>Drag the gauge to explore. Sign in to log your real capacity.</Text>

      {/* Gauge — same component as iOS */}
      <View style={s.gaugeWrap}>
        <Gauge
          score={DEMO_SCORE}
          state={DEMO_STATE}
          onScoreChange={handleScoreChange}
        />
        <TypicalRangeChip range={range} />
      </View>

      {/* Metric cards */}
      <View style={s.metricsRow}>
        {(['Sleep', 'HRV', 'RHR'] as const).map((label) => (
          <MetricCard
            key={label}
            label={label}
            value={null}
            trend={null}
            baselineDay={BASELINE_DAY}
            baselineTarget={BASELINE_TARGET}
          />
        ))}
      </View>

      {/* Insight */}
      <View style={s.signalWrap}>
        <SignalCard insight={insight} />
      </View>

      <View style={s.ctaRow}>
        <Pressable
          testID="cta-signin"
          accessibilityRole="button"
          style={s.btnPrimary}
          onPress={() => router.push('/signin' as any)}
        >
          <Text style={s.btnPrimaryText}>Sign In</Text>
        </Pressable>
        <Pressable
          testID="cta-patterns"
          accessibilityRole="button"
          style={s.btnGhost}
          onPress={() => router.push('/(tabs)/patterns' as any)}
        >
          <Text style={s.btnGhostText}>See Patterns →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#01020A',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 100,
  },
  eyebrow: {
    color: '#8A94AA',
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: '600',
    marginBottom: 16,
  },
  headline: {
    color: '#E9EEF8',
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 480,
    lineHeight: 34,
    marginBottom: 12,
  },
  body: {
    color: '#8A94AA',
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 24,
    marginBottom: 24,
  },
  gaugeWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    maxWidth: 480,
    marginBottom: 12,
  },
  signalWrap: {
    width: '100%',
    maxWidth: 480,
    marginBottom: 32,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#4FD1E8',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  btnPrimaryText: {
    color: '#01020A',
    fontSize: 16,
    fontWeight: '600',
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: 'rgba(150,175,220,0.20)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  btnGhostText: {
    color: '#E9EEF8',
    fontSize: 16,
    fontWeight: '500',
  },
});
