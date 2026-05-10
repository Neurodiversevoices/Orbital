# Build 132 · Orbital Design System

**Status:** Foundation shipped. Tabs + screens still on v1 components — wire-in PR next.

## What this PR adds

Six surgical files, zero existing code touched:

| File | Purpose |
|---|---|
| `components/orbital/CapacityWave.tsx` | Pulse focal: horizontal gradient wave (Overloaded → Tight → Ready) with animated state dot. |
| `components/orbital/InterpretiveCallout.tsx` | "Capacity is slipping. Reduce optional load." — icon + headline + subline single-glance directive. |
| `components/orbital/PatternBars.tsx` | Trend bar chart matching design ref: red/amber/teal gradient bars. |
| `components/orbital/PatternInsightCard.tsx` | Single insight callout (eyebrow + sentence + spark icon + chevron). |
| `components/orbital/DetectedPatternCard.tsx` | Grid tile (Monday Pattern / Sleep Average / 30D Trend) with bottom glow. |
| `lib/orbital/brand.ts` | 6-SKU brand registry — Personal · Workspace · Enterprise · Health · Edu · Gov, each w/ compliance posture pack. |

## Compliance posture inherited per brand

- **EU AI Act** — full applicability Aug 2 2026; GPAI obligations live since Aug 2025
- **NIST AI RMF + GenAI profile** — Workspace+
- **OWASP LLM Top 10** — all brands
- **HIPAA + BAA + FDA SaMD-aware** — Health only
- **FERPA + COPPA** — Edu (COPPA also Personal)
- **FedRAMP + Section 508** — Gov
- **SOC 2 Type II** — Workspace, Enterprise, Health, Gov · target Q4-2026
- **ISO 27001 + ISO/IEC 42001** — Enterprise, Gov · target Q4-2026

## Health mode invariant

`isInstrumentMode()` returns `true` for Health + Gov. UI must never use advisory phrasing in those modes — only instrument readouts. Approved vocabulary preserved: capacity, signal, pattern detection, provider-compatible.

## Next PR (wire-in)

Replace `app/(tabs)/index.tsx` Gauge → CapacityWave + InterpretiveCallout, replace `app/(tabs)/patterns.tsx` HeroSparkline → PatternBars, swap PatternCard → PatternInsightCard + DetectedPatternCard. Brand provider hooked into root layout, gates language mode + telemetry.
