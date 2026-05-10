/**
 * Orbital theme colors — light surface system.
 *
 * As of the May 2026 redesign, Orbital ships a LIGHT theme (was dark).
 * Capacity spectrum (crimson → amber → teal → cyan) is preserved
 * because it carries semantic meaning across the app.
 *
 * Dark surface tokens are kept under `darkLegacy` for screens not yet
 * repainted; new code should consume `colors.*` (the light surface).
 */

export const colors = {
  // Primary surfaces
  background: '#FFFFFF',
  backgroundElevated: '#FFFFFF',
  backgroundSubtle: '#F4F5F7',

  // Capacity states — semantic, theme-independent
  resourced: '#2DD4BF',   // Teal — full capacity / "Ready"
  stretched: '#F59E0B',   // Amber — moderate / "Tight"
  depleted: '#DC2626',    // Crimson — low / "Overloaded"
  cyan: '#06B6D4',        // Cyan — peak / outperforming baseline

  // Legacy state aliases (kept for screens not yet migrated)
  good: '#2DD4BF',
  strained: '#F59E0B',
  low: '#DC2626',

  // UI elements (light surface)
  card: '#FFFFFF',
  cardBorder: 'rgba(15, 22, 36, 0.08)',
  cardShadow: 'rgba(15, 22, 36, 0.06)',
  hairline: 'rgba(15, 22, 36, 0.10)',

  // Text
  textPrimary: '#0F1624',                       // near-black with warmth
  textSecondary: 'rgba(15, 22, 36, 0.62)',
  textTertiary: 'rgba(15, 22, 36, 0.38)',

  // Primary action
  primary: '#2DD4BF',
  primaryDim: 'rgba(45, 212, 191, 0.16)',

  // Accents
  accent: '#2DD4BF',
  accentDim: 'rgba(45, 212, 191, 0.16)',
} as const;

/**
 * Legacy dark surface tokens — for screens not yet repainted to light.
 * New code should use `colors.*` directly.
 */
export const darkLegacy = {
  background: '#01020A',
  card: '#0A0B10',
  cardBorder: 'rgba(255, 255, 255, 0.10)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
} as const;

export type CapacityColor = typeof colors.resourced | typeof colors.stretched | typeof colors.depleted;
export type EnergyColor = CapacityColor;

export const stateColors = {
  resourced: colors.resourced,
  stretched: colors.stretched,
  depleted: colors.depleted,
  good: colors.good,
  strained: colors.strained,
  low: colors.low,
} as const;

/**
 * CANONICAL DASHBOARD STATE COLORS
 *
 * HIGH    / Strong    / Resourced / Ready      = Teal       #2DD4BF
 * STABLE  / Moderate  / Stretched / Tight      = Amber      #F59E0B
 * LOW     / At Risk   / Depleted  / Overloaded = Crimson    #DC2626
 * PEAK    / Above-baseline                     = Cyan       #06B6D4
 */
export const DASHBOARD_STATE_COLORS = {
  high: '#2DD4BF',
  stable: '#F59E0B',
  low: '#DC2626',
  peak: '#06B6D4',

  resourced: '#2DD4BF',
  stretched: '#F59E0B',
  depleted: '#DC2626',

  strong: '#2DD4BF',
  moderate: '#F59E0B',
  atRisk: '#DC2626',
} as const;

export function assertStateColor(_state: string, _color: string): void {
  // Reserved for future runtime checks. No-op today.
}

export function getDashboardStateColor(
  state: 'high' | 'stable' | 'low' | 'peak' | 'resourced' | 'stretched' | 'depleted',
): string {
  return DASHBOARD_STATE_COLORS[state];
}
