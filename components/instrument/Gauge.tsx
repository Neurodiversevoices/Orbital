// Rule 2.1: no <div>. Rule 2.2: no CSS shorthand strings.
// Rule 2.3: v4.1 testIDs gauge-root/gauge-value/gauge-state preserved verbatim.
// New testID gauge-canvas added (lives in GaugeArc.tsx).
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  AccessibilityActionEvent,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { GaugeArc, GAUGE_SIZE } from './gauge/GaugeArc';
import { useGaugeGesture } from './gauge/useGaugeGesture';
import { useGaugeHaptics } from './gauge/useGaugeHaptics';
import { stateOf } from '../../lib/capacity/gaugeMath';
import type { CapacityState } from '../../lib/capacity/types';

export interface GaugeProps {
  score: number;
  state: CapacityState;
  accent?: string;
  motion?: 'subtle' | 'bold' | 'off';
  onScoreChange?: (score: number) => void;
}

const C = GAUGE_SIZE / 2;

const stateColor = (s: CapacityState): string =>
  s === 'RESOURCED' ? '#5DD9D4' : s === 'ELEVATED' ? '#F5B547' : '#E5484D';

export function Gauge({ score: initialScore, onScoreChange }: GaugeProps) {
  const [displayScore, setDisplayScore] = useState(Math.round(initialScore));
  const displayState = stateOf(displayScore);
  const haptics = useGaugeHaptics();

  const handleScoreChange = (v: number) => {
    setDisplayScore(v);
    onScoreChange?.(v);
  };

  const { gesture, score, incrementByA11y, decrementByA11y } = useGaugeGesture({
    initialScore: Math.round(initialScore),
    centerX: C,
    centerY: C,
    onScoreChange: handleScoreChange,
    onDetentCross: haptics.onDetentCross,
    onStateCross: haptics.onStateCross,
    onSettle: haptics.onSettle,
  });

  const onA11yAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') incrementByA11y();
    else if (e.nativeEvent.actionName === 'decrement') decrementByA11y();
  };

  return (
    <View
      style={styles.root}
      testID="gauge-root"
      accessible
      accessibilityRole={Platform.OS === 'ios' ? ('adjustable' as const) : 'none'}
      accessibilityLabel="Capacity gauge"
      accessibilityValue={{ now: displayScore, min: 0, max: 100, text: displayState }}
      accessibilityActions={[
        { name: 'increment', label: 'Increase capacity' },
        { name: 'decrement', label: 'Decrease capacity' },
      ]}
      onAccessibilityAction={onA11yAction}
    >
      <GestureDetector gesture={gesture}>
        <View style={styles.canvasWrap} pointerEvents="box-only">
          <GaugeArc score={score} />
          <View pointerEvents="none" style={styles.centerStack}>
            <Text style={styles.value} testID="gauge-value">{displayScore}</Text>
            <Text
              style={[styles.state, { color: stateColor(displayState) }]}
              testID="gauge-state"
            >
              {displayState}
            </Text>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  canvasWrap: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStack: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'DMSans-Bold',
    fontSize: 88,
    lineHeight: 92,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  state: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 11,
    letterSpacing: 2.5,
    marginTop: 6,
    textTransform: 'uppercase',
  },
});
