/**
 * CCI Power PDF Generation Pipeline
 *
 * Client-side pipeline using expo-print, identical to how QCR works.
 * No server infrastructure. All computation happens in the React Native runtime.
 *
 * Pipeline:
 * 1. Fetch logs from local storage
 * 2. computeCCIDynamicData(logs, config)
 * 3. computeProjection(logs)
 * 4. generateNarrative(computedData, projection)
 * 5. mapFunctionalImpact(computedData, projection)
 * 6. formatCCIDynamicData(data)
 * 7. assertGovernanceCompliance(strings)
 * 8. generateCCIPowerHTML(input)
 * 9. Print.printToFileAsync({ html })
 * 10. FileSystem.moveAsync to proper path
 * 11. Sharing.shareAsync
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { CapacityLog, Category } from '../../types';
import { computeCCIDynamicData, formatCCIDynamicData, assertGovernanceCompliance } from './dynamic';
import { computeProjection } from './dynamic/projection';
import { generateNarrative } from './dynamic/narrative';
import { mapFunctionalImpact } from './dynamic/impact';
import { generateCCIArtifactHTML } from './artifact';
import type { CCIWindowDays, CCIArtifactRenderOptions } from './artifact';
import { CCIIssuanceMetadata } from './types';
import type { CCIComputeConfig, CCIDynamicData } from './dynamic/types';

// =============================================================================
// TYPES
// =============================================================================

export interface CCIPdfResult {
  success: boolean;
  error?: string;
  /** File URI if generated successfully */
  fileUri?: string;
}

export interface CCIPdfOptions {
  /**
   * Observation window length in days. Drives both `windowStart` and the
   * "minimum days" gate (unless overridden) and is passed to the HTML
   * template so it can render the correct period label.
   *
   * Allowed: 30 | 60 | 90. Default: 90 (back-compat).
   */
  windowDays?: CCIWindowDays;
  /** Override observation window start (takes precedence over windowDays). */
  windowStart?: string;
  /** Override observation window end (default: today). */
  windowEnd?: string;
  /**
   * Minimum unique days with at least one entry required.
   * If omitted, defaults scale with `windowDays`:
   *   30 → 14, 60 → 30, 90 → 60.
   */
  minimumDays?: number;
  /** Seed for patient ID generation */
  patientIdSeed?: string;
  /** Skip sharing dialog (useful for testing) */
  skipShare?: boolean;
  /**
   * Optional therapist / provider recipient name. When supplied it is rendered
   * in the "Prepared for:" line of the recipient header on the PDF.
   */
  recipientName?: string;
}

/**
 * Default minimumDays threshold for a given window length.
 * 30 → 14, 60 → 30, 90 → 60. These are the "enough data" floors used when
 * the caller does not provide an explicit override.
 */
function defaultMinimumDaysFor(windowDays: CCIWindowDays): number {
  switch (windowDays) {
    case 30: return 14;
    case 60: return 30;
    case 90:
    default: return 60;
  }
}

// =============================================================================
// DRIVER STATS COMPUTATION
// =============================================================================

/**
 * Compute driver correlation percentages from logs.
 * For each category, calculates what % of entries with that tag
 * resulted in stretched or depleted states.
 */
function computeDriverStats(
  logs: CapacityLog[],
): { sensory: number; demand: number; social: number } {
  const categories: Category[] = ['sensory', 'demand', 'social'];
  const result: Record<string, number> = {};

  for (const cat of categories) {
    const withTag = logs.filter(log =>
      log.tags?.includes(cat) || log.category === cat,
    );
    if (withTag.length === 0) {
      result[cat] = 0;
      continue;
    }
    const strained = withTag.filter(
      log => log.state === 'stretched' || log.state === 'depleted',
    );
    result[cat] = Math.round((strained.length / withTag.length) * 100);
  }

  return {
    sensory: result.sensory,
    demand: result.demand,
    social: result.social,
  };
}

// =============================================================================
// INTEGRITY HASH
// =============================================================================

/**
 * Compute a deterministic djb2 hash for integrity verification.
 */
function computeIntegrityHash(data: CCIDynamicData, timestamp: string): string {
  const input = `${data.patientId}|${data.observationStart}|${data.observationEnd}|${data.totalSignals}|${data.patternStabilityPercent}|${timestamp}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// =============================================================================
// MAIN PIPELINE
// =============================================================================

/**
 * Generate CCI Power PDF from capacity logs.
 *
 * This is the full end-to-end pipeline. Caller is responsible for:
 * - Entitlement check (cci_purchased)
 * - Legal confirmation gate
 * - Loading logs from storage
 *
 * @param logs Array of capacity logs (must have >=90 signals)
 * @param options Optional configuration overrides
 */
export async function generateCCIPdf(
  logs: CapacityLog[],
  options: CCIPdfOptions = {},
): Promise<CCIPdfResult> {
  try {
    // =========================================================================
    // Step 1: Build compute config
    // =========================================================================
    const now = new Date();
    const windowDays: CCIWindowDays = options.windowDays ?? 90;
    const windowEnd = options.windowEnd || formatDate(now);
    const windowStartDate = new Date(now);
    windowStartDate.setDate(windowStartDate.getDate() - windowDays);
    const windowStart = options.windowStart || formatDate(windowStartDate);

    const config: CCIComputeConfig = {
      windowStart,
      windowEnd,
      minimumDays: options.minimumDays ?? defaultMinimumDaysFor(windowDays),
      patientIdSeed: options.patientIdSeed,
    };

    // =========================================================================
    // Step 2: Compute CCI dynamic data
    // =========================================================================
    const dynamicData = computeCCIDynamicData(logs, config);
    if (!dynamicData) {
      return {
        success: false,
        error: `Insufficient logging days. Need at least ${config.minimumDays} unique days with entries within the observation window.`,
      };
    }

    // =========================================================================
    // Step 3: Compute projection
    // =========================================================================
    const projection = computeProjection(logs, windowEnd);

    // =========================================================================
    // Step 4: Compute driver stats
    // =========================================================================
    const driverStats = computeDriverStats(logs);

    // Determine top driver label for narrative
    const maxDriver = Math.max(driverStats.sensory, driverStats.demand, driverStats.social);
    let topDriverLabel: string | undefined;
    if (maxDriver > 0) {
      if (driverStats.sensory === maxDriver) topDriverLabel = 'sensory load';
      else if (driverStats.demand === maxDriver) topDriverLabel = 'demand load';
      else topDriverLabel = 'social load';
    }

    // =========================================================================
    // Step 5: Generate narrative
    // =========================================================================
    const narrative = generateNarrative(dynamicData, projection, topDriverLabel);

    // =========================================================================
    // Step 6: Map functional impact
    // =========================================================================
    const impact = mapFunctionalImpact(dynamicData, projection, driverStats);

    // =========================================================================
    // Step 7: Format strings + governance check
    // =========================================================================
    const formatted = formatCCIDynamicData(dynamicData);
    assertGovernanceCompliance(formatted);

    // =========================================================================
    // Step 8: Build metadata
    // =========================================================================
    const generatedAt = now.toISOString();
    const integrityHash = computeIntegrityHash(dynamicData, generatedAt);

    const metadata: CCIIssuanceMetadata = {
      generatedAt,
      protocol: 'CCI-Power-v1',
      observationStart: dynamicData.observationStart,
      observationEnd: dynamicData.observationEnd,
      integrityHash,
    };

    // =========================================================================
    // Step 9: Generate HTML — therapist-facing CCI artifact
    //
    // Uses generateCCIArtifactHTML (artifact.ts) so the rendered PDF includes:
    //   - Recipient header (Prepared for / Date generated / Window N days)
    //   - Signature line for therapist sign-off
    //   - Parameterized window label (30 / 60 / 90 days)
    //
    // generateCCIPowerHTML remains available via the public API export for
    // callers that want the powerTemplate variant.
    // =========================================================================
    const renderOptions: CCIArtifactRenderOptions = {
      windowDays,
      recipientName: options.recipientName,
    };

    const html = generateCCIArtifactHTML(
      metadata,
      dynamicData,
      projection,
      narrative,
      impact,
      driverStats,
      renderOptions,
    );

    // =========================================================================
    // Step 10: HTML → PDF via expo-print
    // =========================================================================
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // =========================================================================
    // Step 11: Rename to meaningful filename
    // =========================================================================
    const filename = `CCI_${dynamicData.patientId}_${Date.now()}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    // =========================================================================
    // Step 12: Share
    // =========================================================================
    if (!options.skipShare) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Capacity Clinical Summary — ${formatted.observationWindowDisplay}`,
          UTI: 'com.adobe.pdf',
        });
      } else if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      }
    }

    return { success: true, fileUri: newUri };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during CCI PDF generation';
    if (__DEV__) console.error('[CCI PDF]', message, error);
    return { success: false, error: message };
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
