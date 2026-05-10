// NovaGreeter — home-screen welcome card. Time-aware Nova hero + phrase.
// Still-image surface (no expo-av · CLAUDE.md "no package.json changes");
// reduce-motion accessibility comes free.
import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, useWindowDimensions } from 'react-native';

const WARDROBE_BASE = 'https://nova-wardrobe.ericparrish133.workers.dev/combo';

// Pre-rendered combo hashes seeded by the wardrobe seeder agent.
// Each URL resolves to the still hero frame for the time-of-day clip.
const GREETING_HEROS = {
  morning:   `${WARDROBE_BASE}/greeter_morning`,
  afternoon: `${WARDROBE_BASE}/greeter_afternoon`,
  evening:   `${WARDROBE_BASE}/greeter_evening`,
  night:     `${WARDROBE_BASE}/greeter_night`,
} as const;

type TimeOfDay = keyof typeof GREETING_HEROS;

function timeOfDayKey(now: Date = new Date()): TimeOfDay {
  const h = now.getHours();
  if (h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

interface NovaGreeterProps {
  userName: string;
}

export function NovaGreeter({ userName }: NovaGreeterProps) {
  const { width } = useWindowDimensions();
  const tod = useMemo(() => timeOfDayKey(), []);
  const heroUrl = GREETING_HEROS[tod];

  const phrase = useMemo(() => {
    const phrases: Record<TimeOfDay, string> = {
      morning:   `Morning, ${userName}. Let's see what today is for.`,
      afternoon: `${userName}. Mid-day check-in.`,
      evening:   `${userName}. How did today actually feel?`,
      night:     `Late one, ${userName}. Sleep well.`,
    };
    return phrases[tod];
  }, [tod, userName]);

  // Card width respects 16px horizontal margin · matches CLAUDE.md horizontal padding.
  const heroHeight = Math.min(180, Math.round((width - 32) * 0.45));

  return (
    <View
      style={s.card}
      accessibilityRole="summary"
      accessibilityLabel={`Nova greeting · ${phrase}`}
    >
      <Image
        source={{ uri: heroUrl }}
        style={[s.hero, { height: heroHeight }]}
        accessible
        accessibilityLabel={`Nova · ${tod}`}
        resizeMode="cover"
      />
      <Text style={s.phrase}>{phrase}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  hero: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  phrase: {
    color: '#F8F4E9',
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    lineHeight: 22,
    padding: 16,
  },
});
