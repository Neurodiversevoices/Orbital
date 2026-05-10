// DetectedPatternCard — Build 132 detected-pattern grid card.
// Single tile inside the "DETECTED PATTERNS" row on Trend.
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

interface Props {
  icon: React.ReactNode;
  eyebrow: string;        // e.g. "MONDAY PATTERN"
  value: string;          // e.g. "66" or "5.1h"
  body: string;           // sentence under value
  accent?: string;
  onPress?: () => void;
}

export function DetectedPatternCard({ icon, eyebrow, value, body, accent = '#5DD9D4', onPress }: Props) {
  const Wrap: any = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress} style={s.card}>
      <View style={s.iconRow}>{icon}</View>
      <Text style={[s.eyebrow, { color: accent }]}>{eyebrow}</Text>
      <Text style={[s.value, { color: accent }]}>{value}</Text>
      <Text style={s.body}>{body}</Text>
      <View style={[s.glow, { backgroundColor: accent, shadowColor: accent }]} />
    </Wrap>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 140,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  iconRow: { marginBottom: 8 },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 6,
  },
  value: {
    fontFamily: 'DMSans-Bold',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  body: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  glow: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 24,
    opacity: 0.55,
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -10 },
    borderRadius: 999,
  },
});
