/**
 * useQCR Hook
 *
 * Manages QCR entitlement checking, generation, and state.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Platform } from 'react-native';
import { CapacityLog } from '../../types';
import { QuarterlyCapacityReport, QCRGenerationConfig, getCurrentQuarterId } from './types';
import { generateQCR } from './generateQCR';
import { getDemoQCR } from './demoData';
import { ENTITLEMENTS } from '../subscription/pricing';
import { useDemoMode, FOUNDER_DEMO_ENABLED } from '../hooks/useDemoMode';
import {
  setPaymentScope,
  updatePaymentStage,
  clearPaymentScope,
  capturePaymentError,
  isUserCancellation,
} from '../observability';

// Dynamic import for RevenueCat
let Purchases: typeof import('react-native-purchases').default | null = null;

interface UseQCROptions {
  logs: CapacityLog[];
}

interface UseQCRReturn {
  /** Whether user has QCR entitlement (or is in founder demo) */
  hasQCRAccess: boolean;
  /** Whether currently checking entitlement */
  isCheckingAccess: boolean;
  /** Generated QCR report (null if not generated) */
  report: QuarterlyCapacityReport | null;
  /** Whether currently generating report */
  isGenerating: boolean;
  /** Generate QCR for a specific quarter */
  generateReport: (quarterId?: string) => Promise<QuarterlyCapacityReport | null>;
  /** Available quarters based on log data */
  availableQuarters: string[];
  /** Current quarter ID */
  currentQuarter: string;
  /** Error message if any */
  error: string | null;
  /** Purchase QCR entitlement (institutional tier only) */
  purchaseQCR: (productId: 'quarterly') => Promise<boolean>;
  /** Restore QCR purchase */
  restoreQCR: () => Promise<boolean>;
  /** Is this a demo report? */
  isDemoReport: boolean;
}

export function useQCR({ logs }: UseQCROptions): UseQCRReturn {
  const { isDemoMode } = useDemoMode();
  const [hasQCRAccess, setHasQCRAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [report, setReport] = useState<QuarterlyCapacityReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check QCR entitlement on mount (BUG FIX: was useState, must be useEffect)
  useEffect(() => {
    checkQCREntitlement();
  }, [isDemoMode]);

  async function checkQCREntitlement() {
    // Founder demo mode always has access
    if (FOUNDER_DEMO_ENABLED && isDemoMode) {
      setHasQCRAccess(true);
      setIsCheckingAccess(false);
      return;
    }

    // Skip on web
    if (Platform.OS === 'web') {
      setIsCheckingAccess(false);
      return;
    }

    try {
      const PurchasesModule = await import('react-native-purchases');
      Purchases = PurchasesModule.default;

      const customerInfo = await Purchases.getCustomerInfo();
      const hasAccess = !!customerInfo.entitlements.active[ENTITLEMENTS.QCR];
      setHasQCRAccess(hasAccess);
    } catch (e) {
      // RevenueCat unavailable - no access
      if (__DEV__) console.log('[QCR] RevenueCat unavailable');
    }
    setIsCheckingAccess(false);
  }

  // Compute available quarters from logs
  const availableQuarters = useMemo(() => {
    if (logs.length === 0) return [];

    const quarters = new Set<string>();
    logs.forEach(log => {
      const date = new Date(log.timestamp);
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      const quarterId = `${date.getFullYear()}-Q${quarter}`;
      quarters.add(quarterId);
    });

    return Array.from(quarters).sort().reverse();
  }, [logs]);

  const currentQuarter = getCurrentQuarterId();

  // Generate report
  const generateReport = useCallback(async (quarterId?: string): Promise<QuarterlyCapacityReport | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      // In demo mode, use canonical 10-year demo data
      if (FOUNDER_DEMO_ENABLED && isDemoMode) {
        const demoReport = getDemoQCR(quarterId);
        setReport(demoReport);
        setIsGenerating(false);
        return demoReport;
      }

      // Normal mode: generate from actual logs
      const config: QCRGenerationConfig = {
        quarter: quarterId || 'current',
        includeClinicalNotes: true,
        includePreviousComparison: true,
      };

      const qcr = generateQCR(logs, config);

      if (!qcr) {
        setError('Insufficient data for this quarter. At least 7 observations required.');
        setReport(null);
        setIsGenerating(false);
        return null;
      }

      setReport(qcr);
      setIsGenerating(false);
      return qcr;
    } catch (e) {
      setError('Failed to generate report');
      setIsGenerating(false);
      return null;
    }
  }, [logs, isDemoMode]);

  // Purchase QCR (institutional tier — quarterly only)
  const purchaseQCR = useCallback(async (_productId: 'quarterly'): Promise<boolean> => {
    if (Platform.OS === 'web') {
      setError('Purchases not available on web');
      return false;
    }

    const targetProductId = 'orbital_qcr_quarterly';

    // Set payment scope for Sentry zero-tolerance alerting
    setPaymentScope({
      provider: 'revenuecat',
      flow: 'qcr_purchase',
      productId: targetProductId,
      stage: 'start',
    });

    try {
      if (!Purchases) {
        const PurchasesModule = await import('react-native-purchases');
        Purchases = PurchasesModule.default;
      }

      updatePaymentStage('offerings_fetch');
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;

      if (!currentOffering) {
        setError('No offerings available');
        clearPaymentScope();
        return false;
      }

      // Find QCR quarterly package (institutional tier only)
      updatePaymentStage('package_select');
      const targetPackage = currentOffering.availablePackages.find(
        pkg => pkg.product.identifier === targetProductId
      );

      if (!targetPackage) {
        setError('QCR package not found');
        clearPaymentScope();
        return false;
      }

      updatePaymentStage('confirm');
      const { customerInfo } = await Purchases.purchasePackage(targetPackage);
      const hasAccess = !!customerInfo.entitlements.active[ENTITLEMENTS.QCR];

      if (hasAccess) {
        updatePaymentStage('complete');
        clearPaymentScope();
        setHasQCRAccess(true);
        return true;
      }

      clearPaymentScope();
      return false;
    } catch (e: any) {
      // User cancelled is NOT an error
      if (isUserCancellation(e)) {
        clearPaymentScope();
        return false;
      }

      // Payment failure - capture for zero-tolerance alerting
      capturePaymentError(e, {
        stage: 'failed',
        productId: targetProductId,
        errorCode: e.code,
        additionalContext: {
          userMessage: e.message,
          flow: 'qcr_purchase',
        },
      });

      setError(e.message || 'Purchase failed');
      clearPaymentScope();
      return false;
    }
  }, []);

  // Restore QCR purchase
  const restoreQCR = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      setError('Restore not available on web');
      return false;
    }

    // Set payment scope for Sentry zero-tolerance alerting
    setPaymentScope({
      provider: 'revenuecat',
      flow: 'restore',
      productId: 'orbital_qcr_quarterly',
      stage: 'start',
    });

    try {
      if (!Purchases) {
        const PurchasesModule = await import('react-native-purchases');
        Purchases = PurchasesModule.default;
      }

      updatePaymentStage('restore');
      const customerInfo = await Purchases.restorePurchases();
      const hasAccess = !!customerInfo.entitlements.active[ENTITLEMENTS.QCR];

      if (hasAccess) {
        updatePaymentStage('complete');
        clearPaymentScope();
        setHasQCRAccess(true);
        return true;
      }

      setError('No QCR purchase found to restore');
      clearPaymentScope();
      return false;
    } catch (e: any) {
      // Restore failure - capture for alerting
      capturePaymentError(e, {
        stage: 'failed',
        productId: 'orbital_qcr_quarterly',
        errorCode: e.code,
        additionalContext: {
          userMessage: e.message,
          flow: 'qcr_restore',
        },
      });

      setError(e.message || 'Restore failed');
      clearPaymentScope();
      return false;
    }
  }, []);

  return {
    hasQCRAccess: hasQCRAccess || (FOUNDER_DEMO_ENABLED && isDemoMode),
    isCheckingAccess,
    report,
    isGenerating,
    generateReport,
    availableQuarters,
    currentQuarter,
    error,
    purchaseQCR,
    restoreQCR,
    isDemoReport: report?.isDemoReport || false,
  };
}
