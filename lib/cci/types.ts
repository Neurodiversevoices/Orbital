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
