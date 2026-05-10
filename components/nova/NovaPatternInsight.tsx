// NovaPatternInsight — Patterns tab insight card.
// Nova reflects on the user's data; hero matches the pattern category.
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { GlassCard } from '../GlassCard';

const WARDROBE_BASE = 'https://nova-wardrobe.ericparrish133.workers.dev/combo';

export type NovaPattern =
  | 'weekday_pattern'
  | 'weekend_recovery'
  | 'trending_up'
  | 'trending_down';

const PATTERN_HEROS: Record<NovaPattern, string> = {
  weekday_pattern:  `${WARDROBE_BASE}/pattern_contemplative`,
  weekend_recovery: `${WARDROBE_BASE}/pattern_athletic`,
  trending_up:      `${WARDROBE_BASE}/pattern_victorious`,
  trending_down:    `${WARDROBE_BASE}/pattern_serious`,
};

const PATTERN_LABEL: Record<NovaPattern, string> = {
  weekday_pattern:  'WEEKDAY PATTERN',
  weekend_recovery: 'WEEKEND RECOVERY',
  trending_up:      'TRENDING UP',
  trending_down:    'TRENDING DOWN',
};

interface NovaPatternInsightProps {
  pattern: NovaPattern;
  message: string;
}

export function NovaPatternInsight({ pattern, message }: NovaPatternInsightProps) {
  const heroUrl = PATTERN_HEROS[pattern];
  const label = PATTERN_LABEL[pattern];

  return (
    <GlassCard style={s.card} padding={0}>
      <View style={s.row}>
        <Image
          source={{ uri: heroUrl }}
          style={s.hero}
          resizeMode="cover"
          accessible
          accessibilityLabel={`Nova · ${label}`}
        />
        <View style={s.body}>
          <Text style={s.eyebrow}>NOVA · {label}</Text>
          <Text style={s.message}>{message}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const s = StyleSheet.create({
  card: {
    overflow: 'hidden',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hero: {
    width: 88,
    height: 88,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10,
    letterSpacing: 2.5,
    color: '#5DD9D4',
    marginBottom: 6,
  },
  message: {
    color: '#F8F4E9',
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
});
