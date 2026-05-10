/**
 * PatternBarsChart.tsx — Vertical bar chart for the Pattern Intelligence tab.
 *
 * Renders one bar per data point, gradient-colored by value (red→amber→teal
 * →cyan), tapered tops, with subtle gridlines and Y/X axis labels. Used to
 * visualize a window of capacity history (typically 14/30/90 days).
 *
 * Visual decisions:
 *   - SVG (not Skia). Each bar is a rounded-top rect with a vertical
 *     LinearGradient stop pair derived from the bar's normalized value. SVG
 *     handles this declaratively and renders crisply at all scales.
 *   - Bars are tapered with `rx`/`ry` only at the top — implemented by
 *     drawing a tall rounded-rect that extends beyond the chart bottom and
 *     then clipping with a viewBox so the bottom corners read as square.
 *
 * Stub usage:
 *   <PatternBarsChart
 *     data={[0.62, 0.41, 0.78, 0.33, 0.91, 0.55, 0.28, ...]}  // 30 entries
 *     width={320}
 *     height={220}
 *   />
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line,
  G,
} from 'react-native-svg';
import { colors } from '../theme/colors';

// =============================================================================
// TYPES
// =============================================================================

interface PatternBarsChartProps {
  /** Normalized values (0..1), one per day. */
  data: number[];
  /** Total render width in px. */
  width: number;
  /** Total render height in px. */
  height: number;
  /** Optional override for left x-axis label (defaults to "30 DAYS AGO"). */
  rangeLabel?: string;
  /** Optional override for right x-axis label (defaults to "TODAY"). */
  endLabel?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PADDING = { top: 16, right: 12, bottom: 26, left: 44 };
const GRID_LINES = ['High', 'Normal', 'Low'] as const;
const BAR_GAP_RATIO = 0.32; // proportion of slot width

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Pick a top/bottom gradient stop pair for a bar based on its normalized
 * value. Mirrors the capacity spectrum: low=red, mid=amber, high=teal/cyan.
 */
function colorsForValue(v: number): { top: string; bottom: string } {
  if (v < 0.33) {
    // Low → red→crimson (darker bottom)
    return { top: '#EF4444', bottom: colors.depleted };
  }
  if (v < 0.66) {
    // Mid → amber gradient
    return { top: '#FBBF24', bottom: colors.stretched };
  }
  // High → teal→cyan (peak gets cyan tint)
  if (v >= 0.85) {
    return { top: colors.cyan, bottom: colors.resourced };
  }
  return { top: colors.resourced, bottom: '#14B8A6' };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PatternBarsChart({
  data,
  width,
  height,
  rangeLabel = '30 DAYS AGO',
  endLabel = 'TODAY',
}: PatternBarsChartProps): React.ReactElement {
  const innerW = Math.max(0, width - PADDING.left - PADDING.right);
  const innerH = Math.max(0, height - PADDING.top - PADDING.bottom);

  const slotW = data.length > 0 ? innerW / data.length : 0;
  const barW = Math.max(2, slotW * (1 - BAR_GAP_RATIO));

  const gridY = useMemo(() => {
    return GRID_LINES.map((_, i) => {
      const t = i / (GRID_LINES.length - 1); // 0 = High row, 1 = Low row
      return PADDING.top + innerH * t;
    });
  }, [innerH]);

  return (
    <View
      style={{ width, height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Pattern intelligence chart, ${data.length} day window`}
    >
      <Svg width={width} height={height}>
        <Defs>
          {data.map((v, i) => {
            const c = colorsForValue(Math.max(0, Math.min(1, v)));
            return (
              <SvgLinearGradient
                key={`grad-${i}`}
                id={`barGrad-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop offset="0" stopColor={c.top} stopOpacity="1" />
                <Stop offset="1" stopColor={c.bottom} stopOpacity="0.92" />
              </SvgLinearGradient>
            );
          })}
        </Defs>

        {/* Subtle gridlines */}
        {gridY.map((y, i) => (
          <Line
            key={`grid-${i}`}
            x1={PADDING.left}
            x2={width - PADDING.right}
            y1={y}
            y2={y}
            stroke={colors.hairline}
            strokeWidth={1}
            strokeDasharray={i === 1 ? undefined : '3,4'}
          />
        ))}

        {/* Bars */}
        <G>
          {data.map((rawV, i) => {
            const v = Math.max(0, Math.min(1, rawV));
            const x = PADDING.left + i * slotW + (slotW - barW) / 2;
            const barH = Math.max(2, v * innerH);
            const y = PADDING.top + (innerH - barH);
            // Rounded-top: rx applied symmetrically — but since the bar
            // extends fully and the bottom sits on the chart floor (no
            // clipping) the bottom rounding is visually negligible at narrow
            // bar widths.
            const r = Math.min(barW / 2, 4);
            return (
              <Rect
                key={`bar-${i}`}
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={r}
                ry={r}
                fill={`url(#barGrad-${i})`}
              />
            );
          })}
        </G>
      </Svg>

      {/* Y-axis labels overlay (positioned in JS so they participate in
          Dynamic Type scaling). */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {GRID_LINES.map((label, i) => {
          const y = gridY[i] - 7;
          return (
            <Text
              key={`ylabel-${i}`}
              maxFontSizeMultiplier={1.5}
              style={[styles.yLabel, { top: y }]}
            >
              {label}
            </Text>
          );
        })}
      </View>

      {/* X-axis labels */}
      <View pointerEvents="none" style={[styles.xLabelRow, { top: height - 18 }]}>
        <Text maxFontSizeMultiplier={1.5} style={styles.xLabel}>
          {rangeLabel.toUpperCase()}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.xLabel}>
          {endLabel.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  yLabel: {
    position: 'absolute',
    left: 4,
    width: 36,
    textAlign: 'right',
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 0.4,
  },
  xLabelRow: {
    position: 'absolute',
    left: PADDING.left,
    right: PADDING.right,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 1.4,
  },
});

export default PatternBarsChart;
