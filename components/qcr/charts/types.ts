/**
 * QCR Chart Types
 *
 * Type definitions for clinical-grade capacity visualization.
 * No gamification. Institutional styling only.
 */

export interface DailyCapacityPoint {
  date: Date;
  /** Normalized capacity index 0-100 */
  capacityIndex: number;
  /** Number of observations that day */
  observationCount: number;
}

export interface WeeklyMeanPoint {
  weekStart: Date;
  weekEnd: Date;
  /** Mean capacity for the week 0-100 */
  meanCapacity: number;
  /** Standard deviation */
  stdDev: number;
  /** Number of observations */
  observationCount: number;
}

export interface DriverFrequencyData {
  driver: 'sensory' | 'demand' | 'social';
  /** Total occurrences */
  count: number;
  /** Percentage of total tagged observations */
  percentage: number;
  /** Strain rate when this driver present */
  strainRate: number;
}

export interface StateDistributionData {
  state: 'resourced' | 'stretched' | 'depleted';
  count: number;
  percentage: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
}

export const DEFAULT_CHART_DIMENSIONS: ChartDimensions = {
  width: 320,
  height: 180,
  paddingLeft: 40,
  paddingRight: 16,
  paddingTop: 16,
  paddingBottom: 32,
};

/** Clinical color palette - muted, institutional */
export const CHART_COLORS = {
  /** Primary data line */
  primary: '#5C7A8A',
  /** Secondary/comparison line */
  secondary: '#8BA3B0',
  /** Grid lines */
  grid: 'rgba(255,255,255,0.08)',
  /** Axis labels */
  axisLabel: 'rgba(255,255,255,0.5)',
  /** Axis lines */
  axis: 'rgba(255,255,255,0.15)',
  /** Resourced state */
  resourced: '#4A7C6F',
  /** Stretched state */
  stretched: '#8A7A4A',
  /** Depleted state */
  depleted: '#7A4A4A',
  /** Sensory driver */
  sensory: '#5A6A7A',
  /** Demand driver */
  demand: '#6A5A7A',
  /** Social driver */
  social: '#7A6A5A',
  /** Background fill for data area */
  areaFill: 'rgba(92, 122, 138, 0.15)',
  /** Trend line */
  trend: '#7A9AAA',
} as const;

/** Chart title styling */
export const CHART_TITLE_STYLE = {
  fontSize: 11,
  fontWeight: '600' as const,
  color: 'rgba(255,255,255,0.7)',
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
};
