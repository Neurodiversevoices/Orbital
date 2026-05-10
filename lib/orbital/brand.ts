// Orbital brand registry — 6 sub-brand SKUs each inheriting a compliance posture.
// Build 132 directive: treat compliance as configuration; each brand is a config.
//
// This file is the single source of truth. UI tier-gating + paywall + privacy
// + telemetry decisions read from here.

export type BrandKey =
  | 'personal'
  | 'workspace'
  | 'enterprise'
  | 'health'
  | 'edu'
  | 'gov';

export interface CompliancePosture {
  /** EU AI Act applicability (full Aug 2 2026; GPAI obligations active since Aug 2025). */
  eu_ai_act: boolean;
  nist_ai_rmf: boolean;
  owasp_llm_top10: boolean;
  hipaa: boolean;
  baa_required: boolean;
  fda_saMD_aware: boolean;
  ferpa: boolean;
  coppa: boolean;
  fedramp: boolean;
  section_508: boolean;
  /** SOC 2 Type II readiness target. */
  soc2_type2_target: 'Q4-2026' | 'Q1-2027' | null;
  iso_27001_target: 'Q4-2026' | null;
  iso_42001_target: 'Q4-2026' | null;
}

export interface BrandConfig {
  key: BrandKey;
  display: string;
  audience: string;
  /** Marketing one-liner. */
  tagline: string;
  /** Whether end users may customize Nova (face/voice/wardrobe). */
  nova_customization: 'full' | 'roster' | 'silent' | 'none';
  /** Whether Nova may speak in interpretive language (e.g. "capacity is slipping").
   *  Health uses instrument mode — never advisory phrasing. */
  language_mode: 'interpretive' | 'instrument';
  /** Posture inherited at brand boot. */
  compliance: CompliancePosture;
  /** Default theme accent — drives the focal-state ready color. */
  accent: string;
}

const ZERO: CompliancePosture = {
  eu_ai_act: true,
  nist_ai_rmf: false,
  owasp_llm_top10: true,
  hipaa: false,
  baa_required: false,
  fda_saMD_aware: false,
  ferpa: false,
  coppa: false,
  fedramp: false,
  section_508: false,
  soc2_type2_target: null,
  iso_27001_target: null,
  iso_42001_target: null,
};

export const BRANDS: Record<BrandKey, BrandConfig> = {
  personal: {
    key: 'personal',
    display: 'Orbital Personal',
    audience: 'individuals',
    tagline: 'Your capacity, made legible.',
    nova_customization: 'full',
    language_mode: 'interpretive',
    accent: '#5DD9D4',
    compliance: { ...ZERO, coppa: true /* state-privacy + COPPA gating */ },
  },
  workspace: {
    key: 'workspace',
    display: 'Orbital Workspace',
    audience: 'SMB / teams',
    tagline: 'Team capacity, instrumented.',
    nova_customization: 'roster',
    language_mode: 'interpretive',
    accent: '#5DD9D4',
    compliance: { ...ZERO, soc2_type2_target: 'Q4-2026', nist_ai_rmf: true },
  },
  enterprise: {
    key: 'enterprise',
    display: 'Orbital Enterprise',
    audience: 'corporate IT',
    tagline: 'Audit-grade workforce telemetry.',
    nova_customization: 'roster',
    language_mode: 'interpretive',
    accent: '#5DD9D4',
    compliance: {
      ...ZERO,
      soc2_type2_target: 'Q4-2026',
      iso_27001_target: 'Q4-2026',
      iso_42001_target: 'Q4-2026',
      nist_ai_rmf: true,
    },
  },
  health: {
    key: 'health',
    display: 'Orbital Health',
    audience: 'clinicians, AuDHD adults, allied health',
    tagline: 'A capacity instrument for clinical practice.',
    nova_customization: 'silent',
    language_mode: 'instrument',
    accent: '#5DD9D4',
    compliance: {
      ...ZERO,
      hipaa: true,
      baa_required: true,
      fda_saMD_aware: true,
      soc2_type2_target: 'Q4-2026',
      nist_ai_rmf: true,
    },
  },
  edu: {
    key: 'edu',
    display: 'Orbital Edu',
    audience: 'K-12 + higher education',
    tagline: 'Capacity literacy, classroom-ready.',
    nova_customization: 'roster',
    language_mode: 'interpretive',
    accent: '#5DD9D4',
    compliance: { ...ZERO, ferpa: true, coppa: true },
  },
  gov: {
    key: 'gov',
    display: 'Orbital Gov',
    audience: 'federal/state agencies',
    tagline: 'Mission-grade capacity at agency scale.',
    nova_customization: 'none',
    language_mode: 'instrument',
    accent: '#5DD9D4',
    compliance: {
      ...ZERO,
      fedramp: true,
      section_508: true,
      nist_ai_rmf: true,
      soc2_type2_target: 'Q4-2026',
      iso_27001_target: 'Q4-2026',
    },
  },
};

export const DEFAULT_BRAND: BrandKey = 'personal';

export function getBrand(key: BrandKey | null | undefined): BrandConfig {
  return BRANDS[key ?? DEFAULT_BRAND] ?? BRANDS[DEFAULT_BRAND];
}

/** Health mode forbids advisory language — Nova never says "you should". */
export function isInstrumentMode(brand: BrandKey | null | undefined): boolean {
  return getBrand(brand).language_mode === 'instrument';
}
