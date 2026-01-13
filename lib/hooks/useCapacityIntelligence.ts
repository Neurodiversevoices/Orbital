/**
 * useCapacityIntelligence Hook
 *
 * Manages Capacity Intelligence feature gating.
 *
 * Behavior:
 * - Pro users: Full access, never see interstitial
 * - Core users: See interstitial when attempting Pro features
 *
 * Pro features (trigger interstitial for Core):
 * - Tap a data point to ask "why"
 * - Open correlations
 * - Access composition breakdown
 * - Attempt to view interpretation text
 */

import { useState, useCallback, useMemo } from 'react';
import { useSubscription } from '../subscription';
import { useDemoMode, FOUNDER_DEMO_ENABLED } from './useDemoMode';

export type ProFeature =
  | 'data_point_why'
  | 'correlations'
  | 'composition_breakdown'
  | 'interpretation_text';

interface UseCapacityIntelligenceReturn {
  /** Whether user has full Capacity Intelligence access */
  hasIntelligenceAccess: boolean;
  /** Whether the interstitial should be shown */
  showInterstitial: boolean;
  /** Attempt to access a Pro feature (triggers interstitial for Core users) */
  attemptProFeature: (feature: ProFeature) => boolean;
  /** Dismiss interstitial without upgrading */
  dismissInterstitial: () => void;
  /** Navigate to upgrade flow */
  requestUpgrade: () => void;
  /** Feature that triggered the current interstitial */
  triggeredFeature: ProFeature | null;
}

export function useCapacityIntelligence(): UseCapacityIntelligenceReturn {
  const { isPro } = useSubscription();
  const { isDemoMode } = useDemoMode();

  const [showInterstitial, setShowInterstitial] = useState(false);
  const [triggeredFeature, setTriggeredFeature] = useState<ProFeature | null>(null);
  const [upgradeRequested, setUpgradeRequested] = useState(false);

  // Pro users and demo mode users have full access
  const hasIntelligenceAccess = useMemo(() => {
    // Pro subscription always has access
    if (isPro) return true;

    // Demo mode (founder) has access for testing
    if (FOUNDER_DEMO_ENABLED && isDemoMode) return true;

    return false;
  }, [isPro, isDemoMode]);

  /**
   * Attempt to access a Pro feature.
   * Returns true if access granted, false if blocked (interstitial shown).
   */
  const attemptProFeature = useCallback(
    (feature: ProFeature): boolean => {
      // Pro users: immediate access
      if (hasIntelligenceAccess) {
        return true;
      }

      // Core users: show interstitial
      setTriggeredFeature(feature);
      setShowInterstitial(true);
      return false;
    },
    [hasIntelligenceAccess]
  );

  /**
   * Dismiss interstitial without upgrading.
   * User chose "Continue without analysis".
   */
  const dismissInterstitial = useCallback(() => {
    setShowInterstitial(false);
    setTriggeredFeature(null);
  }, []);

  /**
   * User chose "Enable Capacity Intelligence".
   * Navigate to upgrade/purchase flow.
   */
  const requestUpgrade = useCallback(() => {
    setShowInterstitial(false);
    setUpgradeRequested(true);
    // The consuming component should handle navigation to paywall
    // This is signaled via the upgradeRequested state or can be
    // handled by the onEnableIntelligence callback in the interstitial
  }, []);

  return {
    hasIntelligenceAccess,
    showInterstitial,
    attemptProFeature,
    dismissInterstitial,
    requestUpgrade,
    triggeredFeature,
  };
}

export default useCapacityIntelligence;
