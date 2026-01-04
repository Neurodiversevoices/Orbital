/**
 * Orbital Subscription Hook
 *
 * Manages RevenueCat subscription state with graceful fallbacks.
 *
 * Key behaviors:
 * - If RevenueCat unavailable → app continues in free mode (no crashes)
 * - Org modes bypass subscription checks entirely
 * - Single entitlement: individual_pro
 *
 * Usage:
 *   const { isPro, isLoading, purchase, restore } = useSubscription();
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import {
  SubscriptionState,
  DEFAULT_SUBSCRIPTION_STATE,
  ENTITLEMENT_ID,
  PRODUCT_ID_MONTHLY,
  shouldBypassSubscription,
} from './types';
import { useAppMode } from '../hooks/useAppMode';

// Dynamic import for RevenueCat to handle web gracefully
let Purchases: typeof import('react-native-purchases').default | null = null;
let PurchasesPackage: typeof import('react-native-purchases').PurchasesPackage | null = null;

// RevenueCat API keys - replace with actual keys
const REVENUECAT_API_KEY_IOS = 'appl_REPLACE_WITH_REVENUECAT_IOS_KEY';
const REVENUECAT_API_KEY_ANDROID = 'goog_REPLACE_WITH_REVENUECAT_ANDROID_KEY';

interface SubscriptionContextType extends SubscriptionState {
  /** Purchase the Pro subscription */
  purchase: () => Promise<boolean>;
  /** Restore previous purchases */
  restore: () => Promise<boolean>;
  /** Refresh subscription status */
  refresh: () => Promise<void>;
  /** Check if feature is available (considers mode bypass) */
  hasAccess: (feature: 'unlimited_signals' | 'full_history') => boolean;
  /** Current month's signal count for gating */
  currentMonthSignals: number;
  /** Set current month signal count (called by useEnergyLogs) */
  setCurrentMonthSignals: (count: number) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [state, setState] = useState<SubscriptionState>(DEFAULT_SUBSCRIPTION_STATE);
  const [currentMonthSignals, setCurrentMonthSignals] = useState(0);
  const { currentMode } = useAppMode();

  // Initialize RevenueCat
  useEffect(() => {
    initializePurchases();
  }, []);

  const initializePurchases = async () => {
    // Skip on web
    if (Platform.OS === 'web') {
      setState({
        ...DEFAULT_SUBSCRIPTION_STATE,
        isLoading: false,
        isAvailable: false,
        status: 'free',
      });
      return;
    }

    try {
      // Dynamic import
      const PurchasesModule = await import('react-native-purchases');
      Purchases = PurchasesModule.default;

      const apiKey = Platform.OS === 'ios'
        ? REVENUECAT_API_KEY_IOS
        : REVENUECAT_API_KEY_ANDROID;

      // Skip if API key not configured
      if (apiKey.includes('REPLACE_WITH')) {
        console.log('[Subscription] RevenueCat API key not configured, running in free mode');
        setState({
          ...DEFAULT_SUBSCRIPTION_STATE,
          isLoading: false,
          isAvailable: false,
          status: 'free',
        });
        return;
      }

      await Purchases.configure({ apiKey });

      // Check current subscription status
      await checkSubscriptionStatus();

      setState(prev => ({
        ...prev,
        isAvailable: true,
        isLoading: false,
      }));
    } catch (error) {
      console.error('[Subscription] Failed to initialize RevenueCat:', error);
      // Fallback to free mode - app continues working
      setState({
        ...DEFAULT_SUBSCRIPTION_STATE,
        isLoading: false,
        isAvailable: false,
        status: 'free',
        error: 'Subscription service unavailable',
      });
    }
  };

  const checkSubscriptionStatus = async () => {
    if (!Purchases) return;

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

      if (entitlement) {
        setState(prev => ({
          ...prev,
          status: 'pro',
          isPro: true,
          expirationDate: entitlement.expirationDate
            ? new Date(entitlement.expirationDate)
            : null,
          isInTrial: entitlement.periodType === 'TRIAL',
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          status: 'free',
          isPro: false,
          expirationDate: null,
          isInTrial: false,
          error: null,
        }));
      }
    } catch (error) {
      console.error('[Subscription] Failed to check status:', error);
      // Don't crash, just assume free
      setState(prev => ({
        ...prev,
        status: 'free',
        isPro: false,
        error: 'Failed to check subscription status',
      }));
    }
  };

  const purchase = useCallback(async (): Promise<boolean> => {
    if (!Purchases || !state.isAvailable) {
      console.log('[Subscription] Purchase not available');
      return false;
    }

    try {
      // Get available packages
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;

      if (!currentOffering) {
        console.error('[Subscription] No offerings available');
        return false;
      }

      // Find the monthly package
      const monthlyPackage = currentOffering.availablePackages.find(
        pkg => pkg.identifier === '$rc_monthly' || pkg.product.identifier === PRODUCT_ID_MONTHLY
      );

      if (!monthlyPackage) {
        console.error('[Subscription] Monthly package not found');
        return false;
      }

      // Make purchase
      const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
      const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_ID];

      if (isPro) {
        await checkSubscriptionStatus();
        return true;
      }

      return false;
    } catch (error: any) {
      // User cancelled is not an error
      if (error.userCancelled) {
        return false;
      }
      console.error('[Subscription] Purchase failed:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Purchase failed',
      }));
      return false;
    }
  }, [state.isAvailable]);

  const restore = useCallback(async (): Promise<boolean> => {
    if (!Purchases || !state.isAvailable) {
      console.log('[Subscription] Restore not available');
      return false;
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_ID];

      if (isPro) {
        await checkSubscriptionStatus();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('[Subscription] Restore failed:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Restore failed',
      }));
      return false;
    }
  }, [state.isAvailable]);

  const refresh = useCallback(async () => {
    if (state.isAvailable) {
      await checkSubscriptionStatus();
    }
  }, [state.isAvailable]);

  // Check if feature is available (considers mode bypass)
  const hasAccess = useCallback(
    (feature: 'unlimited_signals' | 'full_history'): boolean => {
      // Org modes always have access
      if (shouldBypassSubscription(currentMode)) {
        return true;
      }

      // Pro users have access
      if (state.isPro) {
        return true;
      }

      // Demo mode has access for testing
      if (currentMode === 'demo') {
        return true;
      }

      // Free tier
      return false;
    },
    [currentMode, state.isPro]
  );

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        purchase,
        restore,
        refresh,
        hasAccess,
        currentMonthSignals,
        setCurrentMonthSignals,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (!context) {
    // Return a safe default if used outside provider
    return {
      ...DEFAULT_SUBSCRIPTION_STATE,
      isLoading: false,
      purchase: async () => false,
      restore: async () => false,
      refresh: async () => {},
      hasAccess: () => true, // Default to allowing access
      currentMonthSignals: 0,
      setCurrentMonthSignals: () => {},
    };
  }
  return context;
}
