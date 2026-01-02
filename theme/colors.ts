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
