import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gauge } from './Gauge';
import type { CapacityState } from '../../lib/capacity/types';

interface Props {
  score: number;
  state: CapacityState;
  typicalLow: number;
  typicalHigh: number;
  accent?: string;
}

export function OrbitalCapacityInstrument({ score, state, typicalLow, typicalHigh, accent }: Props) {
  return (
    <View style={styles.root}>
      <Gauge score={score} state={state} accent={accent} motion="subtle" />
      <View style={styles.typicalChip}>
        <Text style={styles.typicalText}>
          Your typical: {typicalLow}–{typicalHigh}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  typicalChip: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  typicalText: {
    fontSize: 13,
    color: '#B8C0CC',
  },
});
