// CapacityAvatar — deterministic SVG avatar, tinted by current capacity state.
// Privacy-first (no photo upload, no biometric). Same userId → same avatar always.
// Tints to cyan (RESOURCED), amber (ELEVATED), crimson (DEPLETED) — visual capacity state.

import React, { useMemo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { createAvatar } from '@dicebear/core';
import { shapes } from '@dicebear/collection';

export type Capacity = 'RESOURCED' | 'ELEVATED' | 'DEPLETED' | 'UNKNOWN';

const STATE_COLORS: Record<Capacity, { fg: string; bg: string }> = {
  RESOURCED: { fg: '4FD1E8', bg: '0a2832' },
  ELEVATED:  { fg: 'F2B134', bg: '2a1f0a' },
  DEPLETED:  { fg: 'E5484D', bg: '2a0d0e' },
  UNKNOWN:   { fg: '8A94AA', bg: '141826' },
};

export function capacityFromValue(v: number | undefined): Capacity {
  if (v === undefined || isNaN(v)) return 'UNKNOWN';
  if (v < 0.40) return 'DEPLETED';
  if (v > 0.70) return 'RESOURCED';
  return 'ELEVATED';
}

interface Props {
  userId: string;
  capacity?: Capacity;
  size?: number;
  haloPulse?: boolean;
}

export default function CapacityAvatar({ userId, capacity = 'UNKNOWN', size = 56, haloPulse = false }: Props) {
  const colors = STATE_COLORS[capacity];

  const dataUri = useMemo(() => {
    const avatar = createAvatar(shapes, {
      seed: userId,
      backgroundColor: [colors.bg],
      backgroundType: ['solid'],
      shape1Color: [colors.fg],
      shape2Color: [colors.fg],
      shape3Color: [colors.fg],
      size: 96,
    });
    return `data:image/svg+xml;utf8,${encodeURIComponent(avatar.toString())}`;
  }, [userId, capacity]);

  return (
    <View testID="capacity-avatar" style={[styles.wrap, { width: size, height: size }]}>
      <View style={[styles.halo, {
        width: size, height: size,
        shadowColor: `#${colors.fg}`,
        shadowOpacity: haloPulse ? 0.45 : 0.25,
        shadowRadius: size * 0.35,
      }]} />
      <Image source={{ uri: dataUri }} style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]} />
      <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: `#${colors.fg}` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  halo: { position: 'absolute', borderRadius: 999, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  img: { backgroundColor: '#01020A' },
  ring: { position: 'absolute', borderWidth: 1.5, opacity: 0.4 },
});
