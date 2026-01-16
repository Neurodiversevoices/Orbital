/**
 * CCI-Q4 Issuance Types
 *
 * Clinical Capacity Instrument (CCI-Q4) is an IMMUTABLE ARTIFACT.
 * These types define the issuance interface only.
 * The visual representation is locked and must not be modified.
 */

export interface CCIIssuanceMetadata {
  /** Timestamp when artifact was generated (ISO 8601) */
  generatedAt: string;
  /** Protocol version */
  protocol: string;
  /** Observation window start (YYYY-MM-DD) */
  observationStart: string;
  /** Observation window end (YYYY-MM-DD) */
  observationEnd: string;
  /** Integrity hash */
  integrityHash: string;
}

export interface CCIArtifact {
  /** Artifact ID */
  id: string;
  /** Version of the CCI instrument */
  version: 'Q4-2025';
  /** Issuance metadata */
  metadata: CCIIssuanceMetadata;
  /** Raw HTML content (immutable, matches golden master) */
  html: string;
}

/**
 * Machine-readable JSON export of CCI artifact.
 *
 * DOCTRINE: CCI Artifact vs. Raw Data
 * This provides a structured, signed document format for clinical integrations
 * while maintaining the defensible value of the artifact.
 */
export interface CCIArtifactJSON {
  /** JSON Schema identifier */
  $schema: 'https://orbital.health/schemas/cci-q4-2025.json';
  /** Artifact type identifier */
  type: 'CCI-Q4';
  /** Artifact ID (matches HTML artifact) */
  id: string;
  /** Version of the CCI instrument */
  version: 'Q4-2025';
  /** Issuance metadata */
  metadata: CCIIssuanceMetadata;
  /** Capacity summary data */
  summary: {
    /** Patient identifier (anonymized) */
    patientId: string;
    /** Observation period */
    observationPeriod: {
      start: string;
      end: string;
      status: 'closed' | 'open';
    };
    /** Reporting quality metrics */
    reportingQuality: {
      trackingContinuity: number;
      trackingContinuityRating: 'high' | 'moderate' | 'low';
      responseTimingMeanMs: number;
      patternStability: number;
      verdict: string;
    };
    /** Monthly breakdown */
    monthlyBreakdown: Array<{
      month: string;
      stability: number;
      volatility: number;
    }>;
  };
  /** Legal and compliance metadata */
  legal: {
    confidential: true;
    copyright: string;
    disclaimer: string;
  };
  /** Digital signature for verification */
  signature: {
    algorithm: 'sha256';
    hash: string;
    signedAt: string;
  };
}

/**
 * GOLDEN MASTER REFERENCE
 *
 * The authoritative rendering is: output/CCI_Q4_2025_Ultra_PatternReadable.pdf
 * Any deviation from this PDF is a BREAKING CHANGE.
 *
 * Dynamic fields (allowed to change between issuances):
 * - Generated timestamp
 * - Integrity hash
 *
 * All other content is LOCKED.
 */
export const CCI_GOLDEN_MASTER_PATH = 'output/CCI_Q4_2025_Ultra_PatternReadable.pdf';

// =============================================================================
// CCI PRICING TYPES (re-exported from pricing.ts)
// =============================================================================

export type {
  CCITierId,
  CCIScope,
  CCIPricingTier,
  CCIPricingResult,
} from './pricing';
