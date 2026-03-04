/**
 * CCI Clinical Artifact v1 — PDF Export
 *
 * Generates a PDF from CCIV1Data using expo-print and expo-sharing.
 * Follows the same pipeline pattern as generateCCIPdf.ts:
 *  1. Build HTML via buildCCIV1HTML (shared with FHIR serializer)
 *  2. Render to PDF via expo-print
 *  3. Move to meaningful filename
 *  4. Share via expo-sharing
 *
 * No new dependencies required.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import type { CCIV1Data } from './generateCCIV1Data';
import { buildCCIV1HTML } from './cciV1HTML';

// =============================================================================
// TYPES
// =============================================================================

export interface CCIV1PdfResult {
  success: boolean;
  error?: string;
  /** File URI if generated successfully */
  fileUri?: string;
}

export interface CCIV1PdfOptions {
  /** Skip the sharing dialog (useful for testing) */
  skipShare?: boolean;
}

// =============================================================================
// MAIN PIPELINE
// =============================================================================

/**
 * Generate and export a PDF of the CCI Clinical Artifact v1.
 *
 * @param data - The computed CCIV1Data
 * @param options - Optional configuration
 * @returns Result with success status and file URI
 */
export async function generateCCIV1Pdf(
  data: CCIV1Data,
  options: CCIV1PdfOptions = {},
): Promise<CCIV1PdfResult> {
  try {
    // Step 1: Build HTML
    const html = buildCCIV1HTML(data);

    // Step 2: Render to PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Step 3: Move to meaningful filename
    const sanitizedId = data.reportId.replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `CCI_V1_${sanitizedId}_${Date.now()}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    // Step 4: Share
    if (!options.skipShare) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Clinical Capacity Instrument — ${data.periodStart} to ${data.periodEnd}`,
          UTI: 'com.adobe.pdf',
        });
      } else if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      }
    }

    return { success: true, fileUri: newUri };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error during CCI V1 PDF generation';
    if (__DEV__) console.error('[CCI V1 PDF]', message, error);
    return { success: false, error: message };
  }
}
