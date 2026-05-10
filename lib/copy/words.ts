/**
 * Clinical Copy — vocabulary management.
 * -------------------------------------------------------------------
 * Approved tone words, forbidden words (Path A), and a scanner helper
 * used by `scripts/copy-lint.js`.
 *
 * IMPORTANT: This module is content-only.  Do not import RN APIs.
 *
 * "Forbidden in UI" means the word must not appear in any user-facing
 * string in `app/` or `components/`.  The terms are still permitted in
 * code identifiers, comments, doc strings, schemas, and inside
 * `lib/cci/` (Path A keeps "patient" in the CCI codebase).
 */

// ---------------------------------------------------------------------------
// Word lists
// ---------------------------------------------------------------------------

/**
 * Approved tone vocabulary — instrument voice.  Use these (and their
 * inflections) in headlines, sublines, eyebrows, and insight bodies.
 */
export const APPROVED_WORDS: ReadonlyArray<string> = Object.freeze([
  // Nouns — measurement primitives
  'capacity',
  'demand',
  'reservoir',
  'signal',
  'sample',
  'range',
  'drift',
  'baseline',
  'threshold',
  'window',
  'log',
  'reading',
  'instrument',
  'telemetry',
  'calibration',
  'throughput',
  'headroom',
  'tracking',

  // Bands
  'nominal',
  'steady',
  'caution',
  'elevated',
  'critical',

  // Verbs — declarative motion
  'holds',
  'drifts',
  'slips',
  'stabilizes',
  'recovers',
  'exceeds',

  // Phrases
  'within range',
]);

/**
 * Forbidden in UI strings.  Stored in a single canonical lowercase form;
 * the matcher is case-insensitive and word-boundary aware.
 *
 * Notes:
 * - "diagnostic" is forbidden in UI but allowed in code (ok in `lib/`).
 * - "therapy" only the *verb* form is forbidden; the noun appears in
 *   medical-history references occasionally.  Path A treats the bare
 *   word as forbidden in UI to be safe — adjust via the allowlist on a
 *   case-by-case basis.
 * - "patient" forbidden in UI; allowed inside `lib/cci/`.
 */
export const FORBIDDEN_WORDS: ReadonlyArray<string> = Object.freeze([
  'diagnose',
  'diagnosis',
  'diagnostic',
  'treat',
  'treatment',
  'cure',
  'heal',
  'therapy',
  'therapist',
  'prescribe',
  'prescription',
  'dose',
  'dosage',
  'symptom',
  'condition',
  'disorder',
  'illness',
  'disease',
  'patient',
]);

/**
 * Tone benchmarks — referenced by `docs/COPY_SYSTEM_v1.md`.  Used by
 * design / writing reviews when calibrating new copy.
 */
export const TONE_BENCHMARKS: ReadonlyArray<{ source: string; example: string }> =
  Object.freeze([
    {
      source: 'ICU patient monitor',
      example: 'HR 72  SpO2 98  RESP 16  · NORMAL SINUS RHYTHM',
    },
    {
      source: 'Aviation HUD',
      example: 'ALT 32,000 FT · IAS 280 KT · TRK 091° · NOMINAL',
    },
    {
      source: 'Audio mastering plugin',
      example: 'LUFS −14.0 · TRUE PEAK −1.0 dBTP · DR 9 · WITHIN RANGE',
    },
    {
      source: 'Whoop',
      example: 'Recovery 67% · Strain 11.3 · HRV 58ms',
    },
    {
      source: 'Oura',
      example: 'Readiness 84 · Sleep 7h 42m · Resting HR 56',
    },
    {
      source: 'Apple Health',
      example: 'Cardio Fitness 42.0 VO₂max · Above average for your age',
    },
    {
      source: 'Orbital',
      example: 'FIELD STATUS · NOMINAL · 14:32 — Your capacity is flowing.',
    },
  ]);

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

export interface ForbiddenHit {
  /** The forbidden word (lowercase form from `FORBIDDEN_WORDS`). */
  word: string;
  /** Character index of the match within `text`. */
  index: number;
}

// Pre-compute one big regex for efficiency.  Word-boundary aware,
// case-insensitive.  Sorted longest-first so e.g. "diagnostic" matches
// before "diagnose" inside the alternation.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SORTED_FORBIDDEN = [...FORBIDDEN_WORDS].sort(
  (a, b) => b.length - a.length,
);

const FORBIDDEN_RE = new RegExp(
  `\\b(${SORTED_FORBIDDEN.map(escapeRegex).join('|')})\\b`,
  'gi',
);

/**
 * Scan `text` for forbidden vocabulary.  Returns one hit per match,
 * each with the canonical lowercase word and the source-relative
 * character index.  An empty array means the text is clean.
 *
 * The matcher is intentionally simple — it does not understand JSX.
 * Higher-level filtering (skip imports, comments, identifiers vs.
 * user-facing strings) happens in `scripts/copy-lint.js`.
 */
export function findForbiddenWords(text: string): ForbiddenHit[] {
  if (!text) return [];
  const hits: ForbiddenHit[] = [];
  // Reset state — RegExp with /g is stateful across calls.
  FORBIDDEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FORBIDDEN_RE.exec(text)) !== null) {
    hits.push({ word: match[1].toLowerCase(), index: match.index });
    // Defensive: avoid infinite loop on zero-length matches.
    if (match.index === FORBIDDEN_RE.lastIndex) {
      FORBIDDEN_RE.lastIndex += 1;
    }
  }
  return hits;
}
