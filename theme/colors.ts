export const colors = {
  background: '#05060A',

  // Capacity states
  resourced: '#00FFFF',   // Cyan - full capacity
  stretched: '#FFB020',   // Amber - moderate capacity
  depleted: '#FF2D55',    // Crimson - low capacity

  // Legacy aliases
  good: '#00FFFF',
  strained: '#FFB020',
  low: '#FF2D55',

  // UI elements
  card: '#0A0B10',
  cardBorder: 'rgba(255, 255, 255, 0.1)',

  // Text (minimal use)
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',

  // Accents
  accent: '#00FFFF',
  accentDim: 'rgba(0, 255, 255, 0.3)',
} as const;

export type CapacityColor = typeof colors.resourced | typeof colors.stretched | typeof colors.depleted;

// Legacy alias
export type EnergyColor = CapacityColor;

export const stateColors = {
  resourced: colors.resourced,
  stretched: colors.stretched,
  depleted: colors.depleted,
  // Legacy aliases
  good: colors.good,
  strained: colors.strained,
  low: colors.low,
} as const;

/**
 * CANONICAL DASHBOARD STATE COLORS
 *
 * Single source of truth for all dashboard/institutional UI.
 * Use this mapping EVERYWHERE for state distribution, cards, charts.
 *
 * HIGH    / Strong    / Resourced = Cyan/Teal  #00D7FF
 * STABLE  / Moderate  / Stretched = Amber/Gold #F5B700
 * LOW     / At Risk   / Depleted  = Red        #FF3B30
 */
export const DASHBOARD_STATE_COLORS = {
  // Primary semantic names (use these)
  high: '#00D7FF',      // Cyan - High capacity / Strong / Resourced
  stable: '#F5B700',    // Amber - Stable / Moderate / Stretched
  low: '#FF3B30',       // Red - Low / At Risk / Depleted

  // Capacity state aliases (maps to same colors)
  resourced: '#00D7FF',
  stretched: '#F5B700',
  depleted: '#FF3B30',

  // Risk level aliases (maps to same colors)
  strong: '#00D7FF',
  moderate: '#F5B700',
  atRisk: '#FF3B30',
} as const;

/**
 * Runtime assertion to prevent color mapping bugs.
 * Call this in __DEV__ to verify correct color usage.
 */
export function assertStateColor(state: string, color: string): void {
  const lowStates = ['low', 'depleted', 'atRisk', 'at_risk', 'at-risk'];
  const highStates = ['high', 'resourced', 'strong'];

  const isLowState = lowStates.includes(state.toLowerCase());
  const isHighState = highStates.includes(state.toLowerCase());

  // LOW states should NEVER be cyan
  if (isLowState && (color === '#00D7FF' || color === '#00E5FF' || color === '#00FFFF')) {
    console.error(`[COLOR BUG] State "${state}" is LOW but rendered with cyan (${color}). Should be ${DASHBOARD_STATE_COLORS.low}`);
  }

  // HIGH states should NEVER be red
  if (isHighState && (color === '#FF3B30' || color === '#F44336' || color === '#FF2D55')) {
    console.error(`[COLOR BUG] State "${state}" is HIGH but rendered with red (${color}). Should be ${DASHBOARD_STATE_COLORS.high}`);
  }
}

/**
 * Get the correct dashboard color for a state.
 * Always use this helper instead of hardcoding colors.
 */
export function getDashboardStateColor(state: 'high' | 'stable' | 'low' | 'resourced' | 'stretched' | 'depleted'): string {
  const color = DASHBOARD_STATE_COLORS[state];
  if (__DEV__) {
    assertStateColor(state, color);
  }
  return color;
}
