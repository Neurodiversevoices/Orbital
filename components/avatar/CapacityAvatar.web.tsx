// CapacityAvatar — web shadow. Metro picks .web.tsx on web platform.
// Uses dangerouslySetInnerHTML for inline SVG on web.

import React, { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { shapes } from '@dicebear/collection';

export type Capacity = 'RESOURCED' | 'ELEVATED' | 'DEPLETED' | 'UNKNOWN';

const STATE_COLORS: Record<Capacity, { fg: string; bg: string }> = {
  RESOURCED: { fg: '#4FD1E8', bg: '#0a2832' },
  ELEVATED:  { fg: '#F2B134', bg: '#2a1f0a' },
  DEPLETED:  { fg: '#E5484D', bg: '#2a0d0e' },
  UNKNOWN:   { fg: '#8A94AA', bg: 'rgba(20,24,38,0.5)' },
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

  const svgString = useMemo(() => {
    const avatar = createAvatar(shapes, {
      seed: userId,
      backgroundColor: [colors.bg.replace('#', '').replace('rgba(20,24,38,0.5)', '141826')],
      shape1Color: [colors.fg.replace('#', '')],
      shape2Color: [colors.fg.replace('#', '')],
      shape3Color: [colors.fg.replace('#', '')],
      size: 96,
    });
    return avatar.toString();
  }, [userId, capacity]);

  return (
    <div
      data-testid="capacity-avatar"
      style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}
    >
      {/* Glow halo */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        boxShadow: `0 0 ${size * 0.5}px ${haloPulse ? '6px' : '0px'} ${colors.fg}55`,
        transition: 'box-shadow 0.6s cubic-bezier(0.16,1,0.3,1)',
        pointerEvents: 'none',
      }} />
      {/* SVG avatar */}
      <div
        style={{
          width: size, height: size, borderRadius: '50%',
          overflow: 'hidden', background: '#01020A',
        }}
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
      {/* Capacity ring */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `1.5px solid ${colors.fg}`,
        opacity: 0.4, pointerEvents: 'none',
      }} />
    </div>
  );
}
