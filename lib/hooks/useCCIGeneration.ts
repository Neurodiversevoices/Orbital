/**
 * useCCIGeneration — React Hook for CCI Power PDF Generation
 *
 * Orchestrates the full pipeline:
 * 1. Entitlement gate (cci_purchased required)
 * 2. Legal confirmation gate
 * 3. Signal count validation (90 minimum)
 * 4. Full CCI PDF generation via generateCCIPdf
 *
 * Returns { generate, isGenerating, error, canGenerate }.
 */

import { useState, useCallback } from 'react';
import { getLogs } from '../storage';
import { generateCCIPdf, CCIPdfOptions, CCIPdfResult } from '../cci/generateCCIPdf';
import { hasCCIConfirmation } from '../legal/cciConfirmation';
import { canPurchaseCCI } from '../entitlements';

// =============================================================================
// TYPES
// =============================================================================

export interface UseCCIGenerationReturn {
  /** Trigger CCI PDF generation (full pipeline) */
  generate: (options?: CCIPdfOptions) => Promise<CCIPdfResult>;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Last error message (null if none) */
  error: string | null;
  /** Clear the error state */
  clearError: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN_SIGNALS = 90;

// =============================================================================
// HOOK
// =============================================================================

export function useCCIGeneration(): UseCCIGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (options: CCIPdfOptions = {}): Promise<CCIPdfResult> => {
      setIsGenerating(true);
      setError(null);

      try {
        // =====================================================================
        // Gate 1: Entitlement check
        // =====================================================================
        const entitlement = await canPurchaseCCI();
        if (!entitlement.eligible) {
          const msg = 'CCI purchase required. Please purchase a CCI to generate your Capacity Clinical Summary.';
          setError(msg);
          return { success: false, error: msg };
        }

        // =====================================================================
        // Gate 2: Legal confirmation check
        // =====================================================================
        // We use a generic purchase ID for individual CCI
        const hasConfirmation = await hasCCIConfirmation('cci_individual');
        if (!hasConfirmation) {
          const msg = 'Legal confirmation required before generating CCI. Please confirm the usage declaration.';
          setError(msg);
          return { success: false, error: msg };
        }

        // =====================================================================
        // Gate 3: Load logs and check signal count
        // =====================================================================
        const logs = await getLogs();
        if (logs.length < MIN_SIGNALS) {
          const msg = `Insufficient data. You have ${logs.length} capacity signals but need at least ${MIN_SIGNALS} to generate a CCI.`;
          setError(msg);
          return { success: false, error: msg };
        }

        // =====================================================================
        // Gate 4: Generate PDF
        // =====================================================================
        const result = await generateCCIPdf(logs, {
          minimumSignals: MIN_SIGNALS,
          ...options,
        });

        if (!result.success) {
          setError(result.error || 'CCI generation failed.');
        }

        return result;
      } catch (err) {
        const message = err instanceof Error
          ? err.message
          : 'An unexpected error occurred during CCI generation.';
        setError(message);
        if (__DEV__) console.error('[useCCIGeneration]', message, err);
        return { success: false, error: message };
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generate,
    isGenerating,
    error,
    clearError,
  };
}
