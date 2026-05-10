// InterpretiveCallout — Build 132 design language.
// Single-glance directive: icon + headline + sub-line. Read like an instrument.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react-native';

export type Trend = 'down' | 'up' | 'flat';

interface Props {
  trend: Trend;
  headline: string;       // e.g. "Capacity is slipping."
  subline: string;        // e.g. "Reduce optional load."
  accent?: string;        // override the trend color
}

const TREND_COLOR: Record<Trend, string> = {
  down: '#E5484D',
  flat: '#F5B547',
  up: '#5DD9D4',
};

const ICONS: Record<Trend, typeof ArrowDown> = {
  down: ArrowDown,
  flat: Minus,
  up: ArrowUp,
};

export function InterpretiveCallout({ trend, headline, subline, accent }: Props) {
  const color = accent ?? TREND_COLOR[trend];
  const Icon = ICONS[trend];
  return (
    <View style={s.row}>
      <View style={[s.iconRing, { borderColor: `${color}80` }]}>
        <Icon color={color} size={20} strokeWidth={2} />
      </View>
      <View style={s.textCol}>
        <Text style={s.headline}>{headline}</Text>
        <Text style={s.subline}>{subline}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 6 },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  headline: {
    fontFamily: 'DMSans-Bold',
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  subline: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#7A8593',
    marginTop: 2,
  },
});
