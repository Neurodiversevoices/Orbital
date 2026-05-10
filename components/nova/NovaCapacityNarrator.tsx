// NovaCapacityNarrator — Nova narrates capacity-state transitions
// (RESOURCED · ELEVATED · DEPLETED). Silent on mount, speaks on change.
// Video plays once per transition (no loop) via expo-video.
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { CapacityState } from '../../lib/capacity/types';

const WARDROBE_BASE = 'https://nova-wardrobe.ericparrish133.workers.dev/combo';

// Pre-rendered combo hashes per Nova-as-presenter spec.
//   RESOURCED → athletic_workout · gym_modern · stretching · ecstatic · morning
//   ELEVATED  → jeans_white_tee · home_kitchen · sitting_thoughtful · contemplative · midday  (a.k.a. "STEADY")
//   DEPLETED  → robe_silk · bedroom_evening · sitting_thoughtful · tender · night
const STATE_SLUGS: Record<CapacityState, string> = {
  RESOURCED: 'state_resourced',
  ELEVATED:  'state_steady',
  DEPLETED:  'state_depleted',
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

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReducedMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (v: boolean) => setReducedMotion(v),
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  // Resolve URLs even when activeState is null so hook order is stable.
  const slug = activeState ? STATE_SLUGS[activeState] : STATE_SLUGS.ELEVATED;
  const videoUrl = `${WARDROBE_BASE}/${slug}.mp4`;
  const posterUrl = `${WARDROBE_BASE}/${slug}.png`;

  // Plays once per transition · no loop · low volume.
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.muted = false;
    p.volume = 0.6;
    // Don't auto-play on mount; we trigger play() on transition below.
  });

  // Trigger play whenever activeState changes (i.e., a new transition).
  useEffect(() => {
    if (activeState === null || reducedMotion) return;
    try {
      player.currentTime = 0;
      player.play();
    } catch {
      // Player may not be ready instantly; safe to ignore.
    }
  }, [activeState, player, reducedMotion]);

  // Initial mount: Nova is silent. She narrates transitions, not arrivals.
  if (activeState === null) return null;

  const phrase = STATE_PHRASE[activeState];
  const label = STATE_LABEL[activeState];

  return (
    <View
      style={s.card}
      accessibilityRole="summary"
      accessibilityLabel={`Nova · ${label} · ${phrase}`}
    >
      {reducedMotion ? (
        <Image
          source={{ uri: posterUrl }}
          style={s.hero}
          resizeMode="cover"
          accessible
          accessibilityLabel={`Nova · ${label}`}
        />
      ) : (
        <VideoView
          player={player}
          style={s.hero}
          contentFit="cover"
          nativeControls={false}
          accessibilityLabel={`Nova · ${label}`}
        />
      )}
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