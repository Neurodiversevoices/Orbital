import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { CapacityState } from '../types';

interface GlassOrbProps {
  state: CapacityState | null;
  onStateChange?: (state: CapacityState) => void;
  onSave?: () => void;
}

const STATE_ORDER: CapacityState[] = ['resourced', 'stretched', 'depleted'];

function stateToCapacity(state: CapacityState | null): number {
  switch (state) {
    case 'resourced': return 0.85;
    case 'stretched': return 0.50;
    case 'depleted':  return 0.15;
    default:          return 0.50;
  }
}

function capacityToColor(v: number): string {
  // 0.0 → crimson, 0.5 → amber, 0.75 → teal, 1.0 → cyan
  if (v <= 0.5) {
    const t = v / 0.5;
    const r = Math.round(220 + (245 - 220) * t);
    const g = Math.round(38  + (158 - 38)  * t);
    const b = Math.round(38  + (11  - 38)  * t);
    return `rgb(${r},${g},${b})`;
  } else if (v <= 0.75) {
    const t = (v - 0.5) / 0.25;
    const r = Math.round(245 + (45  - 245) * t);
    const g = Math.round(158 + (212 - 158) * t);
    const b = Math.round(11  + (191 - 11)  * t);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (v - 0.75) / 0.25;
    const r = Math.round(45  + (6   - 45)  * t);
    const g = Math.round(212 + (182 - 212) * t);
    const b = Math.round(191 + (212 - 191) * t);
    return `rgb(${r},${g},${b})`;
  }
}

// Gauge dimensions matching ClinicalGauge native defaults
const GW = 280;
const GH = 48;
const GX = 20;
const GY = 10;
const CANVAS_W = GW + 40;
const CANVAS_H = GH + 28;
const TICK_COUNT = 40;
const MAJOR_INTERVAL = 10;

function GaugeSVG({ capacity }: { capacity: number }) {
  const needleX = GX + capacity * GW;
  const needleColor = capacityToColor(capacity);

  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= TICK_COUNT; i++) {
    const x = GX + (i / TICK_COUNT) * GW;
    const isMajor = i % MAJOR_INTERVAL === 0;
    ticks.push(
      <line
        key={`t${i}`}
        x1={x} y1={GY + GH * 0.52}
        x2={x} y2={GY + GH * (isMajor ? 0.78 : 0.66)}
        stroke={`rgba(255,255,255,${isMajor ? 0.14 : 0.05})`}
        strokeWidth={isMajor ? 1 : 0.5}
      />
    );
  }

  return (
    <svg
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: 'block', overflow: 'visible' }}
      aria-label={`Capacity gauge: ${Math.round(capacity * 100)}%`}
    >
      <defs>
        <linearGradient id="scaleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#DC2626" stopOpacity="0.6" />
          <stop offset="50%"  stopColor="#F59E0B" stopOpacity="0.6" />
          <stop offset="75%"  stopColor="#2DD4BF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.6" />
        </linearGradient>
        <filter id="needleShadow">
          <feDropShadow dx="1.5" dy="0" stdDeviation="3" floodColor="rgba(0,0,0,0.5)" />
        </filter>
        <filter id="outerShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.35)" />
        </filter>
      </defs>

      {/* Outer drop shadow */}
      <rect
        x={GX - 7} y={GY - 6}
        width={GW + 14} height={GH + 14}
        rx={10}
        fill="rgba(0,0,0,0.35)"
        filter="url(#outerShadow)"
      />

      {/* Housing body */}
      <rect x={GX - 3} y={GY - 3} width={GW + 6} height={GH + 6} rx={9} fill="#0D0E12" />

      {/* Inner recess */}
      <rect x={GX - 1} y={GY - 1} width={GW + 2} height={GH + 2} rx={7} fill="#060710" />

      {/* Scale background */}
      <rect x={GX} y={GY} width={GW} height={GH} rx={6} fill="#08090D" />

      {/* Color gradient strip */}
      <rect
        x={GX + 4} y={GY + GH * 0.30}
        width={GW - 8} height={GH * 0.14}
        rx={2}
        fill="url(#scaleGrad)"
      />

      {/* Ticks */}
      {ticks}

      {/* Needle shadow */}
      <line
        x1={needleX + 1.5} y1={GY + 3}
        x2={needleX + 1.5} y2={GY + GH - 3}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={5.5}
        strokeLinecap="round"
        filter="url(#needleShadow)"
      />

      {/* Needle */}
      <line
        x1={needleX} y1={GY + 2}
        x2={needleX} y2={GY + GH - 2}
        stroke={needleColor}
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      {/* Needle caps */}
      <circle cx={needleX} cy={GY + 2}      r={2.5} fill="rgba(255,255,255,0.18)" />
      <circle cx={needleX} cy={GY + GH - 2} r={1.5} fill="rgba(255,255,255,0.08)" />

      {/* Glass highlight */}
      <rect x={GX} y={GY} width={GW} height={GH} rx={6}
        fill="url(#glassGrad)"
        opacity={0.08}
      />
      <defs>
        <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="white" stopOpacity="1" />
          <stop offset="30%"  stopColor="white" stopOpacity="0" />
          <stop offset="70%"  stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <line
        x1={GX + 8} y1={GY + 1} x2={GX + GW - 8} y2={GY + 1}
        stroke="rgba(255,255,255,0.06)" strokeWidth={0.5}
      />

      {/* Endpoint markers */}
      <line x1={GX} y1={GY + GH + 8} x2={GX + 28} y2={GY + GH + 8}
        stroke="rgba(0,255,200,0.18)" strokeWidth={0.5} />
      <line x1={GX + GW - 28} y1={GY + GH + 8} x2={GX + GW} y2={GY + GH + 8}
        stroke="rgba(255,60,60,0.18)" strokeWidth={0.5} />
    </svg>
  );
}

export function GlassOrb({ state, onStateChange, onSave }: GlassOrbProps) {
  const capacity = stateToCapacity(state);

  const handlePress = useCallback(() => {
    if (!onStateChange || !state) return;
    const idx = STATE_ORDER.indexOf(state);
    const next = STATE_ORDER[(idx + 1) % STATE_ORDER.length];
    onStateChange(next);
  }, [state, onStateChange]);

  const handleLongPress = useCallback(() => {
    onSave?.();
  }, [onSave]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`Capacity: ${state ?? 'unknown'}. Tap to change, hold to save.`}
    >
      <View style={styles.gauge}>
        <GaugeSVG capacity={capacity} />
      </View>
    </Pressable>
  );
}

export default GlassOrb;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  gauge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
