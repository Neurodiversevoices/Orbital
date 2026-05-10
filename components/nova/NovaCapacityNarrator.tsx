// NovaCapacityNarrator — Nova narrates capacity-state transitions
// (RESOURCED · ELEVATED · DEPLETED). Silent on mount, speaks on change.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { CapacityState } from '../../lib/capacity/types';

const WARDROBE_BASE = 'https://nova-wardrobe.ericparrish133.workers.dev/combo';

// Pre-rendered combo hashes per Nova-as-presenter spec.
//   RESOURCED → athletic_workout · gym_modern · stretching · ecstatic · morning
//   ELEVATED  → jeans_white_tee · home_kitchen · sitting_thoughtful · contemplative · midday  (a.k.a. "STEADY")
//   DEPLETED  → robe_silk · bedroom_evening · sitting_thoughtful · tender · night
const STATE_HEROS: Record<CapacityState, string> = {
  RESOURCED: `${WARDROBE_BASE}/state_resourced`,
  ELEVATED:  `${WARDROBE_BASE}/state_steady`,
  DEPLETED:  `${WARDROBE_BASE}/state_depleted`,
};

const STATE_PHRASE: Record<CapacityState, string> = {
  RESOURCED: 'Capacity is open. Spend it on what matters.',
  ELEVATED:  'Holding steady. The middle is a real place too.',
  DEPLETED:  'Tank is low. Less today, not nothing.',
};

const STATE_LABEL: Record<CapacityState, string> = {
  RESOURCED: 'RESOURCED',
  ELEVATED:  'STEADY',
  DEPLETED:  'DEPLETED',
};

interface NovaCapacityNarratorProps {
  state: CapacityState;
}

export function NovaCapacityNarrator({ state }: NovaCapacityNarratorProps) {
  // Only render once we have observed a real state transition. Mount = silent.
  const prevRef = useRef<CapacityState | null>(null);
  const [activeState, setActiveState] = useState<CapacityState | null>(null);

  useEffect(() => {
    if (prevRef.current === null) {
      prevRef.current = state;
      return;
    }
    if (prevRef.current !== state) {
      prevRef.current = state;
      setActiveState(state);
    }
  }, [state]);

  // Initial mount: Nova is silent. She narrates transitions, not arrivals.
  if (activeState === null) return null;

  const heroUrl = STATE_HEROS[activeState];
  const phrase = STATE_PHRASE[activeState];
  const label = STATE_LABEL[activeState];

  return (
    <View style={s.card} accessibilityRole="summary" accessibilityLabel={`Nova · ${label} · ${phrase}`}>
      <Image source={{ uri: heroUrl }} style={s.hero} resizeMode="cover" accessible accessibilityLabel={`Nova · ${label}`} />
      <View style={s.body}>
        <Text style={s.eyebrow}>NOVA · {label}</Text>
        <Text style={s.phrase}>{phrase}</Text>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  hero: {
    width: 96,
    height: 96,
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
  phrase: {
    color: '#F8F4E9',
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
});
