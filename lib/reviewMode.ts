/**
 * Review Mode — Presentation-only assist for App Store Review
 *
 * DOES NOT bypass any gating, unlock features, or inject data.
 * Only surfaces inline guidance text to help reviewers navigate.
 *
 * Enabled via EXPO_PUBLIC_APP_STORE_REVIEW=1 in the review build profile.
 */

export const IS_REVIEW_MODE =
  !__DEV__ && process.env.EXPO_PUBLIC_APP_STORE_REVIEW === '1';
