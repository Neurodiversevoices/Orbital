// NovaPatternInsight — Patterns tab insight card.
// Nova reflects on the user's data; hero matches the pattern category.
// Looping VideoView at low volume via expo-video.
import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { GlassCard } from '../GlassCard';

const WARDROBE_BASE = 'https://nova-wardrobe.ericparrish133.workers.dev/combo';

export type NovaPattern =
  | 'weekday_pattern'
  | 'weekend_recovery'
  | 'trending_up'
  | 'trending_down';

const PATTERN_SLUGS: Record<NovaPattern, string> = {
  weekday_pattern:  'pattern_contemplative',
  weekend_recovery: 'pattern_athletic',
  trending_up:      'pattern_victorious',
  trending_down:    'pattern_serious',
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
  const slug = PATTERN_SLUGS[pattern];
  const videoUrl = `${WARDROBE_BASE}/${slug}.mp4`;
  const posterUrl = `${WARDROBE_BASE}/${slug}.png`;
  const label = PATTERN_LABEL[pattern];

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

  // Loop on low volume so it feels ambient · not announcing.
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = false;
    p.volume = 0.25;
    p.play();
  });

  return (
    <GlassCard style={s.card} padding={0}>
      <View style={s.row}>
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