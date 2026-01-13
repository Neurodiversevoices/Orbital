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
import {
  setPaymentScope,
  updatePaymentStage,
  clearPaymentScope,
  capturePaymentError,
  isUserCancellation,
} from '../observability';

// Dynamic import for RevenueCat to handle web gracefully
let Purchases: typeof import('react-native-purchases').default | null = null;
let PurchasesPackage: typeof import('react-native-purchases').PurchasesPackage | null = null;

// RevenueCat API keys from environment variables
// Falls back gracefully to free mode if not configured
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

interface SubscriptionContextType extends SubscriptionState {
  /** Purchase the Pro subscription */
  purchase: (productId?: string) => Promise<boolean>;
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

      // Skip if API key not configured (empty or placeholder)
      if (!apiKey || apiKey.includes('REPLACE_WITH')) {
        if (__DEV__) console.log('[Subscription] RevenueCat API key not configured, running in free mode');
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
      if (__DEV__) console.error('[Subscription] Failed to initialize RevenueCat:', error);
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
      if (__DEV__) console.error('[Subscription] Failed to check status:', error);
      // Don't crash, just assume free
      setState(prev => ({
        ...prev,
        status: 'free',
        isPro: false,
        error: 'Failed to check subscription status',
      }));
    }
  };

  const purchase = useCallback(async (productId?: string): Promise<boolean> => {
    if (!Purchases || !state.isAvailable) {
      if (__DEV__) console.log('[Subscription] Purchase not available');
      return false;
    }

    const targetProductId = productId || PRODUCT_ID_MONTHLY;

    // Set payment scope for Sentry zero-tolerance alerting
    setPaymentScope({
      provider: 'revenuecat',
      flow: 'purchase',
      productId: targetProductId,
      stage: 'start',
    });

    try {
      // Get available packages
      updatePaymentStage('offerings_fetch');
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;

      if (!currentOffering) {
        if (__DEV__) console.error('[Subscription] No offerings available');
        clearPaymentScope();
        return false;
      }

      // Find the requested package or default to monthly
      updatePaymentStage('package_select');
      const targetPackage = currentOffering.availablePackages.find(
        pkg => pkg.product.identifier === targetProductId ||
               pkg.identifier === '$rc_monthly' && !productId
      );

      if (!targetPackage) {
        if (__DEV__) console.error('[Subscription] Package not found:', targetProductId);
        clearPaymentScope();
        return false;
      }

      // Make purchase
      updatePaymentStage('confirm');
      const { customerInfo } = await Purchases.purchasePackage(targetPackage);
      const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_ID];

      if (isPro) {
        updatePaymentStage('complete');
        clearPaymentScope();
        await checkSubscriptionStatus();
        return true;
      }

      clearPaymentScope();
      return false;
    } catch (error: any) {
      // User cancelled is NOT an error - do not report to Sentry
      if (isUserCancellation(error)) {
        clearPaymentScope();
        return false;
      }

      // Payment failure - capture for zero-tolerance alerting
      capturePaymentError(error, {
        stage: 'failed',
        productId: targetProductId,
        errorCode: error.code,
        additionalContext: {
          userMessage: error.message,
          underlyingError: error.underlyingErrorMessage,
        },
      });

      if (__DEV__) console.error('[Subscription] Purchase failed:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Purchase failed',
      }));
      clearPaymentScope();
      return false;
    }
  }, [state.isAvailable]);

  const restore = useCallback(async (): Promise<boolean> => {
    if (!Purchases || !state.isAvailable) {
      if (__DEV__) console.log('[Subscription] Restore not available');
      return false;
    }

    // Set payment scope for Sentry zero-tolerance alerting
    setPaymentScope({
      provider: 'revenuecat',
      flow: 'restore',
      stage: 'start',
    });

    try {
      updatePaymentStage('restore');
      const customerInfo = await Purchases.restorePurchases();
      const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_ID];

      if (isPro) {
        updatePaymentStage('complete');
        clearPaymentScope();
        await checkSubscriptionStatus();
        return true;
      }

      clearPaymentScope();
      return false;
    } catch (error: any) {
      // Restore failure - capture for alerting
      capturePaymentError(error, {
        stage: 'failed',
        errorCode: error.code,
        additionalContext: {
          userMessage: error.message,
          flow: 'restore',
        },
      });

      if (__DEV__) console.error('[Subscription] Restore failed:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Restore failed',
      }));
      clearPaymentScope();
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
      purchase: async (_productId?: string) => false,
      restore: async () => false,
      refresh: async () => {},
      hasAccess: () => true, // Default to allowing access
      currentMonthSignals: 0,
      setCurrentMonthSignals: () => {},
    };
  }
  return context;
}
