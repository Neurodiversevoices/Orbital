/**
 * ClinicalGauge.web.tsx — SVG web shadow for the Skia ClinicalGauge.
 * Metro resolves this file on web builds; native keeps the Skia version.
 * SharedValue on web is a plain object — reads .value synchronously.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

interface SharedValueLike<T> { value: T; }

interface ClinicalGaugeProps {
  width?: number;
  height?: number;
  capacity: SharedValueLike<number>;
}

const GW = 280, GH = 48, GX = 20, GY = 10;
const TICK_COUNT = 40, MAJOR_INTERVAL = 10;

function capacityToColor(v: number): string {
  if (v <= 0.5) {
    const t = v / 0.5;
    return `rgb(${Math.round(220+(245-220)*t)},${Math.round(38+(158-38)*t)},${Math.round(38+(11-38)*t)})`;
  } else if (v <= 0.75) {
    const t = (v - 0.5) / 0.25;
    return `rgb(${Math.round(245+(45-245)*t)},${Math.round(158+(212-158)*t)},${Math.round(11+(191-11)*t)})`;
  } else {
    const t = (v - 0.75) / 0.25;
    return `rgb(${Math.round(45+(6-45)*t)},${Math.round(212+(182-212)*t)},${Math.round(191+(212-191)*t)})`;
  }
}

export const ClinicalGauge: React.FC<ClinicalGaugeProps> = ({
  width = GW, height = GH, capacity,
}) => {
  const [cap, setCap] = useState(() => capacity.value);

  useEffect(() => {
    let rafId: number;
    const poll = () => {
      const v = capacity.value;
      setCap(prev => (Math.abs(prev - v) > 0.001 ? v : prev));
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [capacity]);

  const canvasW = width + 40, canvasH = height + 28;
  const gW = width, gH = height;
  const needleX = GX + cap * gW;
  const needleColor = capacityToColor(cap);

  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= TICK_COUNT; i++) {
    const x = GX + (i / TICK_COUNT) * gW;
    const isMajor = i % MAJOR_INTERVAL === 0;
    ticks.push(
      <line key={`cg${i}`} x1={x} y1={GY + gH * 0.52} x2={x} y2={GY + gH * (isMajor ? 0.78 : 0.66)}
        stroke={`rgba(255,255,255,${isMajor ? 0.14 : 0.05})`} strokeWidth={isMajor ? 1 : 0.5} />
    );
  }

  return (
    <View style={{ width: canvasW, height: canvasH }}>
      <svg width={canvasW} height={canvasH} style={{ display: 'block', overflow: 'visible' }}
        aria-label={`Capacity gauge: ${Math.round(cap * 100)}%`}>
        <defs>
          <linearGradient id="cg_scale" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#DC2626" stopOpacity="0.6" />
            <stop offset="50%"  stopColor="#F59E0B" stopOpacity="0.6" />
            <stop offset="75%"  stopColor="#2DD4BF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="cg_glass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.08" />
            <stop offset="30%"  stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <rect x={GX-3} y={GY-3} width={gW+6} height={gH+6} rx={9} fill="#0D0E12" />
        <rect x={GX-1} y={GY-1} width={gW+2} height={gH+2} rx={7} fill="#060710" />
        <rect x={GX} y={GY} width={gW} height={gH} rx={6} fill="#08090D" />
        <rect x={GX+4} y={GY+gH*0.30} width={gW-8} height={gH*0.14} rx={2} fill="url(#cg_scale)" />
        {ticks}
        <line x1={needleX+1.5} y1={GY+3} x2={needleX+1.5} y2={GY+gH-3}
          stroke="rgba(0,0,0,0.5)" strokeWidth={5.5} strokeLinecap="round" />
        <line x1={needleX} y1={GY+2} x2={needleX} y2={GY+gH-2}
          stroke={needleColor} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={needleX} cy={GY+2}      r={2.5} fill="rgba(255,255,255,0.18)" />
        <circle cx={needleX} cy={GY+gH-2}   r={1.5} fill="rgba(255,255,255,0.08)" />
        <rect x={GX} y={GY} width={gW} height={gH} rx={6} fill="url(#cg_glass)" />
        <line x1={GX+8} y1={GY+1} x2={GX+gW-8} y2={GY+1}
          stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
        <line x1={GX} y1={GY+gH+8} x2={GX+28} y2={GY+gH+8}
          stroke="rgba(0,255,200,0.18)" strokeWidth={0.5} />
        <line x1={GX+gW-28} y1={GY+gH+8} x2={GX+gW} y2={GY+gH+8}
          stroke="rgba(255,60,60,0.18)" strokeWidth={0.5} />
      </svg>
    </View>
  );
};

export default ClinicalGauge;
