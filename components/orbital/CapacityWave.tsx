// CapacityWave — Build 132 design language.
// Horizontal gradient wave (Overloaded ← Tight ← Ready) with a glowing
// state marker. Replaces the v1 Gauge as the focal element on Pulse.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, RadialGradient } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

export type WaveState = 'overloaded' | 'tight' | 'ready';

interface Props {
  /** 0..100 capacity score; <40 = overloaded, 40..69 = tight, ≥70 = ready */
  score: number;
  state?: WaveState;
}

const WAVE_W = 320;
const WAVE_H = 140;

function scoreToX(score: number): number {
  // Clamp + map to wave canvas. 0 → far left (overloaded), 100 → far right (ready).
  const clamped = Math.max(0, Math.min(100, score));
  return 24 + (clamped / 100) * (WAVE_W - 48);
}

function stateFromScore(score: number): WaveState {
  if (score >= 70) return 'ready';
  if (score >= 40) return 'tight';
  return 'overloaded';
}

const STATE_COLOR: Record<WaveState, string> = {
  overloaded: '#E5484D',
  tight: '#F5B547',
  ready: '#5DD9D4',
};

export function CapacityWave({ score, state }: Props) {
  const resolvedState = state ?? stateFromScore(score);
  const dotX = scoreToX(score);
  const color = STATE_COLOR[resolvedState];

  // Subtle pulse on the state dot.
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  // Subtle wave drift for life.
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 6500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [drift]);
  const driftStyle = useAnimatedStyle(() => ({
    opacity: 0.85 + drift.value * 0.15,
  }));

  return (
    <View style={s.wrap}>
      <View style={s.svgWrap}>
        <Animated.View style={driftStyle}>
          <Svg width={WAVE_W} height={WAVE_H} viewBox={`0 0 ${WAVE_W} ${WAVE_H}`}>
            <Defs>
              <LinearGradient id="capacityGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#E5484D" stopOpacity="1" />
                <Stop offset="0.45" stopColor="#F5B547" stopOpacity="1" />
                <Stop offset="1" stopColor="#5DD9D4" stopOpacity="1" />
              </LinearGradient>
              <RadialGradient id="dotGlow" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
                <Stop offset="0" stopColor={color} stopOpacity="0.55" />
                <Stop offset="1" stopColor={color} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {/* Main wave path: gentle dip on overloaded side, lift on ready side. */}
            <Path
              d={`M 24 ${WAVE_H * 0.62}
                  Q ${WAVE_W * 0.2} ${WAVE_H * 0.85},
                    ${WAVE_W * 0.4} ${WAVE_H * 0.55}
                  Q ${WAVE_W * 0.6} ${WAVE_H * 0.32},
                    ${WAVE_W * 0.85} ${WAVE_H * 0.18}
                  L ${WAVE_W - 20} ${WAVE_H * 0.16}`}
              stroke="url(#capacityGrad)"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
            />
            {/* Dotted zone separators */}
            <Path
              d={`M ${WAVE_W * 0.4} 8 L ${WAVE_W * 0.4} ${WAVE_H - 28}`}
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={1}
              strokeDasharray="2 4"
              fill="none"
            />
            <Path
              d={`M ${WAVE_W * 0.7} 8 L ${WAVE_W * 0.7} ${WAVE_H - 28}`}
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={1}
              strokeDasharray="2 4"
              fill="none"
            />
            {/* State glow halo */}
            <Circle cx={dotX} cy={WAVE_H * 0.62} r={36} fill="url(#dotGlow)" />
          </Svg>
        </Animated.View>

        {/* State dot — animated separately on top */}
        <Animated.View style={[s.dotWrap, { left: dotX - 14, top: WAVE_H * 0.62 - 14 }, pulseStyle]}>
          <View style={[s.dotInner, { backgroundColor: color, shadowColor: color }]} />
        </Animated.View>
      </View>

      {/* Zone labels */}
      <View style={s.labelRow}>
        <Text style={[s.label, { color: resolvedState === 'overloaded' ? STATE_COLOR.overloaded : '#6B7280' }]}>Overloaded</Text>
        <Text style={[s.label, { color: resolvedState === 'tight' ? STATE_COLOR.tight : '#6B7280' }]}>Tight</Text>
        <Text style={[s.label, { color: resolvedState === 'ready' ? STATE_COLOR.ready : '#6B7280' }]}>Ready</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8 },
  svgWrap: { width: WAVE_W, height: WAVE_H, position: 'relative' },
  dotWrap: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  dotInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    shadowOpacity: 0.85,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  labelRow: {
    width: WAVE_W,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 4,
  },
  label: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
