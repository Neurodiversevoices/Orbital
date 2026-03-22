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
export { computeCCIDynamicData, formatCCIDynamicData } from './dynamic';
export { computeProjection } from './dynamic/projection';
export { generateNarrative } from './dynamic/narrative';
export { mapFunctionalImpact } from './dynamic/impact';
export { generateCCIPowerHTML } from './powerTemplate';
export { generateCCIPdf } from './generateCCIPdf';
export type { CCIDynamicData, CCIFormattedStrings, CCIComputeConfig } from './dynamic';
export type { CCIProjectionResult } from './dynamic/projection';
export type { CCINarrativeResult } from './dynamic/narrative';
export type { CCIFunctionalImpact, SeverityLevel } from './dynamic/impact';
export type { CCIPowerTemplateInput } from './powerTemplate';
export type { CCIPdfResult, CCIPdfOptions } from './generateCCIPdf';

// CCI Clinical Artifact v1
export { generateCCIV1Data, getDriverLabel, classifyBaseline, computeDirection, computeAreasOfChange } from './generateCCIV1Data';
export type { CCIV1Data, BaselineClassification, DirectionClassification, AreaChangeDirection, AreaOfChange } from './generateCCIV1Data';
export { buildCCIV1HTML } from './cciV1HTML';
export { serializeCCIV1ToFHIR } from './cciToFHIR';
export type { CCIV1FHIRDocumentReference } from './cciToFHIR';
export { generateCCIV1Pdf } from './cciToPDF';
export type { CCIV1PdfResult, CCIV1PdfOptions } from './cciToPDF';
