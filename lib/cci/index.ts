/**
 * CCI-Q4 Issuance Module
 *
 * Clinical Capacity Instrument (CCI-Q4) Artifact Issuance
 *
 * GOLDEN MASTER: output/CCI_Q4_2025_Ultra_PatternReadable.pdf
 * This module provides wiring ONLY - visual output is LOCKED.
 */

export { generateCCIArtifactHTML, createCCIArtifact, getGoldenMasterHTML, generateCircleCCIArtifactHTML, getCircleGoldenMasterHTML } from './artifact';
export { generateBundleCCIArtifactHTML, getBundleGoldenMasterHTML, createBundleCCIArtifact } from './bundleArtifact';
export { CCIArtifact, CCIIssuanceMetadata, CCI_GOLDEN_MASTER_PATH } from './types';
