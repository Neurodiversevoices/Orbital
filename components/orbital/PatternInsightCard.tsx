// PatternInsightCard — Build 132 detected-pattern card.
// Replaces ad-hoc pattern UI with the design-ref bordered surface + glow base.
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

interface Props {
  eyebrow: string;        // e.g. "PATTERN INSIGHT"
  body: string;           // single sentence insight
  accent?: string;
  onPress?: () => void;
}

export function PatternInsightCard({ eyebrow, body, accent = '#5DD9D4', onPress }: Props) {
  const Wrap: any = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress} style={[s.card, { borderColor: `${accent}33` }]}>
      <View style={[s.spark, { borderColor: `${accent}66` }]}>
        <View style={[s.sparkInner, { backgroundColor: accent }]} />
      </View>
      <View style={s.col}>
        <Text style={[s.eyebrow, { color: accent }]}>{eyebrow}</Text>
        <Text style={s.body}>{body}</Text>
      </View>
      {onPress ? <ChevronRight color={accent} size={18} /> : null}
    </Wrap>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(94,234,212,0.04)',
  },
  spark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  col: { flex: 1 },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  body: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 20,
  },
});
