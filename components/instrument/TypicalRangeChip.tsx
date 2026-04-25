// Rule 2.1: View+Text only. Rule 2.2: no CSS shorthand. Rule 2.11: no em-dash.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ContextualRange } from '../../lib/capacity/types';

interface Props {
  range: ContextualRange;
}

export function TypicalRangeChip({ range }: Props) {
  return (
    <View style={styles.chip} testID="typical-range-chip">
      {range.ready ? (
        <Text style={styles.text}>
          Your typical: {range.low}{'–'}{range.high}
        </Text>
      ) : (
        <Text style={styles.text}>
          Building your baseline {'·'} day {range.baselineDay} of {range.baselineTarget}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  text: {
    fontSize: 13,
    color: '#B8C0CC',
  },
});
