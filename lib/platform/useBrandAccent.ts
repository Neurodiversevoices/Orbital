/**
 * Orbital Platform — useBrandAccent
 *
 * Convenience hook that returns the active sub-brand's themeAccent hex
 * value, falling back to the canonical Orbital teal (#2DD4BF) when:
 *
 *   - the SubBrandProvider is unavailable in the current React tree
 *     (e.g. a screen rendered above the provider, a unit test, etc.), OR
 *   - the active brand has no themeAccent (defensive — shouldn't happen
 *     given the static configs in subBrandConfig.ts).
 *
 * Use this hook anywhere you want a single accent color that follows the
 * user's brand selection. The capacity spectrum (crimson → amber → teal →
 * cyan) is the SOURCE for these accents — primary teal stays teal across
 * brands; only the *accent* shifts.
 *
 * Example:
 *   const accent = useBrandAccent();
 *   <View style={{ borderColor: accent }} />
 *
 * Falls back gracefully so callers never need to null-check.
 */

import { useOptionalSubBrand } from './SubBrandProvider';

/**
 * Default accent — the canonical Orbital teal, drawn from the capacity
 * spectrum. Used whenever the SubBrandProvider context is unavailable.
 */
export const DEFAULT_BRAND_ACCENT = '#2DD4BF';

/**
 * Read the current brand's theme accent. Always returns a usable hex
 * string; callers do NOT need to handle undefined.
 */
export function useBrandAccent(): string {
  const ctx = useOptionalSubBrand();
  if (!ctx) return DEFAULT_BRAND_ACCENT;
  return ctx.themeAccent || DEFAULT_BRAND_ACCENT;
}
