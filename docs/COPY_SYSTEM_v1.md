# Orbital Copy System v1

> Single source of truth for status / metric / insight strings used in
> the Personal flow.  Voice: **instrument, not coach.**
> Style benchmarks: ICU patient monitor, aviation HUD, audio mastering plugin.

The runtime modules live in `lib/copy/`:

- `lib/copy/clinical.ts` — typed copy patterns (field status, metric
  cards, insight cards, disclaimer).
- `lib/copy/words.ts` — approved + forbidden vocabulary, scanner helper.
- `scripts/copy-lint.js` — repo-wide lint (`npm run copy:lint`).

This doc is the **spec**. The TypeScript modules implement it.  Both
must stay in sync.

---

## 1. The 10 Copy Laws

1. **Every value carries a unit.**  `6.6h`, `58 ms`, `72 bpm` — never a
   bare scalar.  Unitless values violate the instrument illusion.
2. **Numerals dominate.**  Numbers are the loudest element on a card.
   Words are scaffolding around them.
3. **Trend = arrow + one word.**  `↑ rising`, `→ steady`, `↓ falling`.
   Two-word trends are forbidden.
4. **Eyebrows are mono uppercase letterspaced**, sentence-case headlines
   below.  Never the reverse — uppercase is for labels, not paragraphs.
5. **No imperatives outside CRITICAL.**  Below CRITICAL, copy describes
   what the instrument sees.  At CRITICAL we permit one declarative
   action ("Reduce optional load.").
6. **No second-person motivation.**  No "you can do it", no "great job",
   no "keep going".
7. **Sample size + window are first-class.**  Insight eyebrows always
   carry `n=…` (and `CI ±…` when available).  Footnote carries window.
8. **Forbidden vocabulary is forbidden.**  See §6.  The lint script
   enforces this on `app/` and `components/`.
9. **Approved vocabulary is preferred.**  See §6.  When in doubt, reach
   for the instrument word (`reservoir` over `energy`, `signal` over
   `vibe`, `drift` over `change`).
10. **Disclaimer is non-optional on telemetry views.**  Render
    `DISCLAIMER` from `lib/copy/clinical.ts` at the foot of any view
    surfacing medical-adjacent values.

---

## 2. Field Status — state table

`getFieldStatus(reserves, demand, opts?)` produces a copy block with an
eyebrow, headline, subline, and discrete band.

| Condition (reserves vs demand)    | Band       | Headline                       | Subline                                    |
| --------------------------------- | ---------- | ------------------------------ | ------------------------------------------ |
| `reserves > demand × 1.4`         | NOMINAL    | Your capacity is flowing.      | All systems within range.                  |
| `reserves > demand × 1.1`         | STEADY     | Capacity holds the line.       | Demand within reservoir.                   |
| `0.9 ≤ reserves / demand ≤ 1.1`   | CAUTION    | Capacity is matched.           | Reservoir tracking demand.                 |
| `demand > reserves × 1.1`         | ELEVATED   | Capacity is slipping.          | Demand exceeds reservoir.                  |
| `demand > reserves × 1.4`         | CRITICAL   | Reduce optional load.          | Reservoir below demand for **{N}h**.       |

Edge cases:

- `demand == 0` resolves to **NOMINAL** (no load = no risk).
- `reserves == 0` with `demand > 0` resolves to **CRITICAL**.
- `{N}` is the `criticalHours` option (default `0`), rendered as integer.

**Eyebrow format:**

```
FIELD STATUS · ${BAND} · ${HH:MM}
```

Time is 24-hour, zero-padded, from `opts.now ?? new Date()`.

### Example

```ts
import { getFieldStatus } from '@/lib/copy/clinical';

const status = getFieldStatus(0.62, 0.41, { now: new Date('2026-05-10T14:32:00') });
// {
//   eyebrow: 'FIELD STATUS · NOMINAL · 14:32',
//   headline: 'Your capacity is flowing.',
//   subline: 'All systems within range.',
//   band: 'NOMINAL',
// }
```

---

## 3. Metric Card pattern

`MetricCardCopy` describes one telemetry card. Three concrete builders
ship in `lib/copy/clinical.ts`:

- `recoveryCard(hours, trend)` → label `RECOVERY`, unit `h`.
- `nslCard(sdnnMs, trend)` → label `NERVOUS SYSTEM LOAD`, unit `ms`.
- `cardiacDriftCard(bpm, trend)` → label `CARDIAC DRIFT`, unit `bpm`.

### Anatomy

```
┌─────────────────────────────────────┐
│ RECOVERY                          ↑ │   ← label (mono UPPER) + trend glyph
│                                     │
│ 6.6 h                               │   ← value + unit (DM Sans bold)
│                                     │
│ ↑ rising      BALANCED              │   ← trendLabel + state (mono UPPER)
└─────────────────────────────────────┘
```

### State qualifiers

| Card           | LOW / NO SAMPLE      | BELOW RANGE | BALANCED        | EXTENDED / DRIFTING / HIGH |
| -------------- | -------------------- | ----------- | --------------- | -------------------------- |
| Recovery       | `< 6h` → LOW         | `< 7h`      | `7–9h`          | `≥ 9h` → EXTENDED          |
| NSL (SDNN)     | `< 30ms` → HIGH LOAD | `< 50ms` → ELEVATED | `50–80ms`       | `≥ 80ms` → LOW LOAD        |
| Cardiac Drift  | `< 50bpm` → LOW      | n/a         | `50–70bpm`      | `70–85bpm` DRIFTING / `≥ 85bpm` HIGH |

`NaN` / `Infinity` always resolve to `state = 'NO SAMPLE'`, value `—`.

### Example

```ts
recoveryCard(6.6, 'steady');
// {
//   label: 'RECOVERY',
//   value: '6.6',
//   unit: 'h',
//   trend: 'steady',
//   trendLabel: '→ steady',
//   state: 'LOW',
// }
```

---

## 4. Insight Card pattern

`patternInsight()` produces an `InsightCopy { eyebrow, body, sample? }`.

### Anatomy

```
PATTERN INSIGHT · n=42 · CI ±0.08            ← eyebrow (mono UPPER)
Capacity drops 12% on Mondays vs the         ← body (declarative,
30-day baseline.                                no advice)
Window 30d · last sample 22:14               ← sample (mono small)
```

### Kinds

| Kind                | Body template                                                |
| ------------------- | ------------------------------------------------------------ |
| `monday-pattern`    | `Capacity drops {dropPct}% on Mondays vs the 30-day baseline.` |
| `sleep-correlation` | `Sleep duration tracks next-day capacity at r={r}.`          |
| `trend`             | `Capacity {direction} {slope}/wk over the sampling window.`   |
| `default`           | `{summary}` — verbatim, never advisory.                       |

### Example

```ts
patternInsight({
  kind: 'monday-pattern',
  samples: 42,
  ci: 0.08,
  details: { dropPct: 12 },
  window: { days: 30, lastSample: new Date('2026-05-09T22:14:00') },
});
// {
//   eyebrow: 'PATTERN INSIGHT · n=42 · CI ±0.08',
//   body:    'Capacity drops 12% on Mondays vs the 30-day baseline.',
//   sample:  'Window 30d · last sample 22:14',
// }
```

---

## 5. Disclaimer

```ts
export const DISCLAIMER =
  'NON-DIAGNOSTIC · SELF-TRACKING INSTRUMENT · NOT MEDICAL ADVICE';
```

Rendered in mono UPPERCASE, letterspacing 0.16–0.22 em, `text tertiary`
color (`rgba(15, 22, 36, 0.38)`), at the foot of any view that surfaces
medical-adjacent telemetry (Field, Trends, Insights, Load tabs; CCI
report).

---

## 6. Vocabulary

### 6.1 Approved tone words

Stored in `lib/copy/words.ts → APPROVED_WORDS`.

> `capacity`, `demand`, `reservoir`, `signal`, `sample`, `range`,
> `drift`, `baseline`, `threshold`, `window`, `log`, `reading`,
> `instrument`, `telemetry`, `calibration`, `throughput`, `headroom`,
> `tracking`, `nominal`, `steady`, `caution`, `elevated`, `critical`,
> `holds`, `drifts`, `slips`, `stabilizes`, `recovers`, `exceeds`,
> `within range`.

### 6.2 Forbidden in UI (Path A)

Stored in `lib/copy/words.ts → FORBIDDEN_WORDS`.

> `diagnose`, `diagnosis`, `diagnostic`, `treat`, `treatment`, `cure`,
> `heal`, `therapy`, `therapist`, `prescribe`, `prescription`, `dose`,
> `dosage`, `symptom`, `condition`, `disorder`, `illness`, `disease`,
> `patient`.

Notes:

- These terms remain legal in code identifiers, comments, doc strings,
  schemas, and inside `lib/cci/` (Path A keeps `patient` in CCI code).
- "therapy" / "therapist" are permitted only as references to a
  third-party history field; never as a verb the app does.
- Add known-safe occurrences to `scripts/copy-allowlist.json` rather
  than weakening the list.

### 6.3 Lint

```bash
npm run copy:lint
```

Walks `app/` and `components/`, scans JSX text and props named one of
`label · title · text · headline · subtitle · subline · placeholder ·
accessibilityLabel · message · body · eyebrow`.  Skips imports,
comments, and `lib/cci/`.  Exit `0` clean, `1` on hits, `2` on error.

---

## 7. Tone benchmarks

`lib/copy/words.ts → TONE_BENCHMARKS`.

| Source                  | Example                                                       |
| ----------------------- | ------------------------------------------------------------- |
| ICU patient monitor     | `HR 72  SpO2 98  RESP 16  · NORMAL SINUS RHYTHM`              |
| Aviation HUD            | `ALT 32,000 FT · IAS 280 KT · TRK 091° · NOMINAL`             |
| Audio mastering plugin  | `LUFS −14.0 · TRUE PEAK −1.0 dBTP · DR 9 · WITHIN RANGE`      |
| Whoop                   | `Recovery 67% · Strain 11.3 · HRV 58ms`                       |
| Oura                    | `Readiness 84 · Sleep 7h 42m · Resting HR 56`                 |
| Apple Health            | `Cardio Fitness 42.0 VO₂max · Above average for your age`     |
| Orbital                 | `FIELD STATUS · NOMINAL · 14:32 — Your capacity is flowing.`  |

When new copy is drafted, hold it next to these examples.  If it sounds
like a coaching app, it fails.  If it sounds like a panel of needles
you can read at a glance, it passes.

---

## 8. Consumption (sequential follow-up — not yet wired)

The following screens still ship ad-hoc strings.  A subsequent task
will replace them with calls into `lib/copy/clinical.ts`:

- `app/(tabs)/index.tsx` — Field status block.
- `app/(tabs)/patterns.tsx` — Pattern Intelligence header + insight cards.
- `app/cci.tsx`, `app/cci-report.tsx` — header eyebrows + action labels
  (excluding `lib/cci/` internals — those keep `patient`).
- `app/upgrade.tsx` — upgrade headline + body.
- New `app/(tabs)/load.tsx` and `app/(tabs)/insights.tsx` (Block D).

Until those are wired, `npm run copy:lint` is the trip-wire keeping
forbidden vocabulary out of new code.
