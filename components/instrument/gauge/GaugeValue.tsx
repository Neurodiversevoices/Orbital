import React from 'react';
import { View, Text, Platform } from 'react-native';
import { stateOf, scoreToFontWeight, STATE_COLOR, type State } from '@/lib/capacity/gaugeMath';

const FONT_VARIABLE = false;

export function GaugeValue({ score, state }: { score: number; state: State }) {
  const rounded = Math.round(score);
  const weight = scoreToFontWeight(score);
  const stateColor = STATE_COLOR[state];

  return (
    <View testID="gauge-readout" accessibilityRole="text"
      accessibilityLabel={`Capacity ${rounded}, ${state}`}>
      <Text testID="gauge-value"
        style={[
          {
            fontFamily: 'DM Sans',
            fontSize: 72,
            color: '#fff',
            textAlign: 'center',
            letterSpacing: -2,
            lineHeight: 76,
          },
          FONT_VARIABLE && Platform.OS !== 'web'
            ? ({ fontVariationSettings: [{ axis: 'wght', value: weight }] } as any)
            : { fontWeight: '700' },
        ]}>
        {rounded}
      </Text>
      <Text testID="gauge-state"
        style={{
          fontFamily: 'Space Mono', fontSize: 11, letterSpacing: 2.5,
          color: stateColor, textAlign: 'center', marginTop: 8,
          textTransform: 'uppercase',
        }}>
        {state}
      </Text>
    </View>
  );
}
