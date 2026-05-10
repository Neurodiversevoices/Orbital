/**
 * Clinical Copy System (v1)
 * -------------------------------------------------------------------
 * Single source of truth for status / metric / insight strings used
 * across the Personal flow.  Voice: instrument, not coach.  Style
 * benchmarks: ICU patient monitor, aviation HUD, audio mastering plugin.
 *
 * See `docs/COPY_SYSTEM_v1.md` for the full spec, copy laws, and
 * approved/forbidden vocabulary.
 *
 * Path A (medical-credible):
 * - Medical-adjacent vocabulary is OK (capacity, reservoir, sample).
 * - Forbidden in UI: diagnose, treat, cure, heal, therapy (verb),
 *   prescribe, dose, symptom, condition, disorder, illness, disease,
 *   "patient" (in UI).  See `lib/copy/words.ts`.
 *
 * NOTE: This module is content-only. Do NOT import React Native APIs
 * here — these helpers must be safe to use from tests, scripts, and
 * any rendering context.
 */

// ---------------------------------------------------------------------------
// Field status
// ---------------------------------------------------------------------------

/**
 * Discrete field-state band.  Ordered loosely by severity (left = best).
 * Consumers should only ever receive values from this union — see
 * `getFieldStatus`.
 */
export type FieldStateBand =
  | 'NOMINAL'
  | 'STEADY'
  | 'CAUTION'
  | 'ELEVATED'
  | 'CRITICAL';

export interface FieldStatusCopy {
  /** Mono uppercase letterspaced — e.g. "FIELD STATUS · NOMINAL · 14:32". */
  eyebrow: string;
  /** Sans-serif sentence-case headline — e.g. "Your capacity is flowing.". */
  headline: string;
  /** Secondary sub-headline, single line — e.g. "All systems within range.". */
  subline: string;
  /** Discrete band (mirrors the eyebrow). */
  band: FieldStateBand;
}

interface FieldStatusOptions {
  /** Override "now" for tests / deterministic snapshots. */
  now?: Date;
  /**
   * For the CRITICAL band only — number of consecutive hours the
   * reservoir has been below demand. Default 0.  Rendered as integer.
   */
  criticalHours?: number;
}

interface BandTemplate {
  band: FieldStateBand;
  headline: string;
  /** May contain `{N}` placeholder for criticalHours (CRITICAL only). */
  subline: string;
}

const BAND_TEMPLATES: Record<FieldStateBand, BandTemplate> = {
  NOMINAL: {
    band: 'NOMINAL',
    headline: 'Your capacity is flowing.',
    subline: 'All systems within range.',
  },
  STEADY: {
    band: 'STEADY',
    headline: 'Capacity holds the line.',
    subline: 'Demand within reservoir.',
  },
  CAUTION: {
    band: 'CAUTION',
    headline: 'Capacity is matched.',
    subline: 'Reservoir tracking demand.',
  },
  ELEVATED: {
    band: 'ELEVATED',
    headline: 'Capacity is slipping.',
    subline: 'Demand exceeds reservoir.',
  },
  CRITICAL: {
    band: 'CRITICAL',
    headline: 'Reduce optional load.',
    subline: 'Reservoir below demand for {N}h.',
  },
};

function clamp01(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function pad2(n: number): string {
  const v = Math.max(0, Math.min(99, Math.floor(n)));
  return v < 10 ? `0${v}` : `${v}`;
}

function formatTime24(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Map a (reserves, demand) pair to a discrete field-state band.
 *
 * Thresholds (see `docs/COPY_SYSTEM_v1.md`):
 * - reserves > demand × 1.4              → NOMINAL
 * - reserves > demand × 1.1              → STEADY
 * - 0.9 ≤ reserves / demand ≤ 1.1        → CAUTION
 * - demand > reserves × 1.1              → ELEVATED
 * - demand > reserves × 1.4              → CRITICAL
 *
 * Edge cases:
 * - demand = 0 → NOMINAL (no load to track).
 * - reserves = 0 with demand > 0 → CRITICAL (worst-case fallback).
 */
function classify(reserves: number, demand: number): FieldStateBand {
  const r = clamp01(reserves);
  const d = clamp01(demand);

  if (d <= 0) return 'NOMINAL';
  if (r <= 0) return 'CRITICAL';

  // Order matters — check CRITICAL before ELEVATED, NOMINAL before STEADY.
  if (d > r * 1.4) return 'CRITICAL';
  if (r > d * 1.4) return 'NOMINAL';
  if (d > r * 1.1) return 'ELEVATED';
  if (r > d * 1.1) return 'STEADY';
  return 'CAUTION';
}

/**
 * Resolve the current field-status copy block.
 *
 * @param reserves  Normalised 0..1 capacity reservoir.
 * @param demand    Normalised 0..1 demand load.
 * @param opts      Optional `now` / `criticalHours` overrides.
 */
export function getFieldStatus(
  reserves: number,
  demand: number,
  opts?: FieldStatusOptions,
): FieldStatusCopy {
  const band = classify(reserves, demand);
  const template = BAND_TEMPLATES[band];
  const now = opts?.now ?? new Date();
  const criticalHours = Math.max(0, Math.floor(opts?.criticalHours ?? 0));

  const subline =
    band === 'CRITICAL'
      ? template.subline.replace('{N}', String(criticalHours))
      : template.subline;

  return {
    eyebrow: `FIELD STATUS · ${band} · ${formatTime24(now)}`,
    headline: template.headline,
    subline,
    band,
  };
}

// ---------------------------------------------------------------------------
// Metric cards
// ---------------------------------------------------------------------------

export type TrendDirection = 'up' | 'down' | 'steady';

export interface MetricCardCopy {
  /** Mono uppercase letterspaced — e.g. "RECOVERY". */
  label: string;
  /** Numeric value as a display string — e.g. "6.6". */
  value: string;
  /** Unit (may be empty) — e.g. "h", "ms", "bpm". */
  unit: string;
  /** Trend direction. */
  trend: TrendDirection;
  /** Arrow + one word — e.g. "↑ rising", "→ steady", "↓ falling". */
  trendLabel: string;
  /** Mono uppercase qualitative state — e.g. "BALANCED", "LOW", "DRIFTING". */
  state: string;
}

const TREND_GLYPHS: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  steady: '→',
};

function trendLabel(trend: TrendDirection, words: {
  up: string;
  down: string;
  steady: string;
}): string {
  return `${TREND_GLYPHS[trend]} ${words[trend]}`;
}

function fmt1(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(1);
}

function fmt0(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toString();
}

/**
 * Recovery (sleep duration) metric card.
 * @param hours Last-night sleep duration in hours.
 */
export function recoveryCard(
  hours: number,
  trend: TrendDirection,
): MetricCardCopy {
  let state = 'BALANCED';
  if (Number.isFinite(hours)) {
    if (hours < 6) state = 'LOW';
    else if (hours < 7) state = 'BELOW RANGE';
    else if (hours < 9) state = 'BALANCED';
    else state = 'EXTENDED';
  } else {
    state = 'NO SAMPLE';
  }

  return {
    label: 'RECOVERY',
    value: fmt1(hours),
    unit: 'h',
    trend,
    trendLabel: trendLabel(trend, {
      up: 'rising',
      down: 'falling',
      steady: 'steady',
    }),
    state,
  };
}

/**
 * Nervous System Load — derived from HRV SDNN (ms).
 * Lower SDNN ⇒ higher load.
 */
export function nslCard(
  sdnnMs: number,
  trend: TrendDirection,
): MetricCardCopy {
  let state = 'BALANCED';
  if (Number.isFinite(sdnnMs)) {
    if (sdnnMs < 30) state = 'HIGH LOAD';
    else if (sdnnMs < 50) state = 'ELEVATED';
    else if (sdnnMs < 80) state = 'BALANCED';
    else state = 'LOW LOAD';
  } else {
    state = 'NO SAMPLE';
  }

  return {
    label: 'NERVOUS SYSTEM LOAD',
    value: fmt0(sdnnMs),
    unit: 'ms',
    trend,
    trendLabel: trendLabel(trend, {
      up: 'rising',
      down: 'easing',
      steady: 'steady',
    }),
    state,
  };
}

/**
 * Cardiac Drift — resting heart-rate delta from baseline (bpm).
 * `bpm` is the raw RHR reading.  State qualifies the absolute reading.
 */
export function cardiacDriftCard(
  bpm: number,
  trend: TrendDirection,
): MetricCardCopy {
  let state = 'BALANCED';
  if (Number.isFinite(bpm)) {
    if (bpm < 50) state = 'LOW';
    else if (bpm < 70) state = 'BALANCED';
    else if (bpm < 85) state = 'DRIFTING';
    else state = 'HIGH';
  } else {
    state = 'NO SAMPLE';
  }

  return {
    label: 'CARDIAC DRIFT',
    value: fmt0(bpm),
    unit: 'bpm',
    trend,
    trendLabel: trendLabel(trend, {
      up: 'rising',
      down: 'easing',
      steady: 'steady',
    }),
    state,
  };
}

// ---------------------------------------------------------------------------
// Insight cards
// ---------------------------------------------------------------------------

export type InsightKind =
  | 'monday-pattern'
  | 'sleep-correlation'
  | 'trend'
  | 'default';

export interface InsightCopy {
  /** Mono uppercase letterspaced — e.g. "PATTERN INSIGHT · n=42 · CI ±0.08". */
  eyebrow: string;
  /** Declarative body — never advisory. */
  body: string;
  /** Optional small mono footnote — e.g. "Window 30d · last sample 22:14". */
  sample?: string;
}

interface PatternInsightArgs {
  kind: InsightKind;
  /** Sample count `n` for the insight. */
  samples: number;
  /** Optional confidence interval half-width (display as ±value). */
  ci?: number;
  /** Insight-specific values rendered into the body template. */
  details?: Record<string, string | number>;
  /** Sampling window for the footnote. */
  window?: { days: number; lastSample?: Date };
}

const INSIGHT_LABEL: Record<InsightKind, string> = {
  'monday-pattern': 'PATTERN INSIGHT',
  'sleep-correlation': 'SLEEP CORRELATION',
  trend: 'TREND',
  default: 'PATTERN INSIGHT',
};

function fmtCi(ci: number): string {
  if (!Number.isFinite(ci)) return '';
  // Show 2dp for small CIs, 1dp otherwise, drop trailing zero.
  const rounded = Math.abs(ci) < 1 ? ci.toFixed(2) : ci.toFixed(1);
  return rounded;
}

function bodyFor(args: PatternInsightArgs): string {
  const d = args.details ?? {};
  switch (args.kind) {
    case 'monday-pattern': {
      const drop = d.dropPct ?? d.delta ?? '—';
      return `Capacity drops ${drop}% on Mondays vs the 30-day baseline.`;
    }
    case 'sleep-correlation': {
      const r = d.r ?? d.coefficient ?? '—';
      return `Sleep duration tracks next-day capacity at r=${r}.`;
    }
    case 'trend': {
      const direction = String(d.direction ?? 'steady');
      const slope = d.slope ?? d.deltaPerWeek ?? '—';
      return `Capacity ${direction} ${slope}/wk over the sampling window.`;
    }
    case 'default':
    default: {
      const summary = String(d.summary ?? 'Pattern detected within window.');
      return summary;
    }
  }
}

/**
 * Build a typed insight copy block for a Pattern Intelligence card.
 *
 * The body is declarative — no instructions, no advice.  Sample size and
 * (when provided) confidence interval are surfaced in the eyebrow so the
 * reading is auditable at a glance.
 */
export function patternInsight(args: PatternInsightArgs): InsightCopy {
  const label = INSIGHT_LABEL[args.kind] ?? INSIGHT_LABEL.default;
  const n = Math.max(0, Math.floor(args.samples));
  const parts = [label, `n=${n}`];
  if (args.ci !== undefined && Number.isFinite(args.ci)) {
    parts.push(`CI ±${fmtCi(args.ci)}`);
  }
  const eyebrow = parts.join(' · ');

  let sample: string | undefined;
  if (args.window) {
    const segments: string[] = [`Window ${Math.max(0, Math.floor(args.window.days))}d`];
    if (args.window.lastSample) {
      segments.push(`last sample ${formatTime24(args.window.lastSample)}`);
    }
    sample = segments.join(' · ');
  }

  return {
    eyebrow,
    body: bodyFor(args),
    sample,
  };
}

// ---------------------------------------------------------------------------
// Disclaimer
// ---------------------------------------------------------------------------

/**
 * Standard non-diagnostic disclaimer.  Render in mono uppercase with
 * letterspacing 0.16–0.22em.  Required at the foot of any view that
 * surfaces medical-adjacent telemetry.
 */
export const DISCLAIMER =
  'NON-DIAGNOSTIC · SELF-TRACKING INSTRUMENT · NOT MEDICAL ADVICE';
