// NovaGreeter — home-screen welcome card. Time-aware Nova hero + phrase.
// Video surface via expo-video (Apple-supported · SDK 54). Reduce-motion
// users see a still poster image at the same URL with a .png extension.
import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

const WARDROBE_BASE = 'https://nova-wardrobe.ericparrish133.workers.dev/combo';

// Pre-rendered combo hashes seeded by the wardrobe seeder agent.
// `${slug}.mp4` → looping clip · `${slug}.png` → reduce-motion poster.
const GREETING_SLUGS = {
  morning:   'greeter_morning',
  afternoon: 'greeter_afternoon',
  evening:   'greeter_evening',
  night:     'greeter_night',
} as const;

type TimeOfDay = keyof typeof GREETING_SLUGS;

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
  const slug = GREETING_SLUGS[tod];
  const videoUrl = `${WARDROBE_BASE}/${slug}.mp4`;
  const posterUrl = `${WARDROBE_BASE}/${slug}.png`;

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

  // Always create the player so hooks order is stable. We just don't render
  // the VideoView when reduce-motion is on.
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

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
      {reducedMotion ? (
        <Image
          source={{ uri: posterUrl }}
          style={[s.hero, { height: heroHeight }]}
          accessible
          accessibilityLabel={`Nova · ${tod}`}
          resizeMode="cover"
        />
      ) : (
        <VideoView
          player={player}
          style={[s.hero, { height: heroHeight }]}
          contentFit="cover"
          nativeControls={false}
          accessibilityLabel={`Nova · ${tod}`}
        />
      )}
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