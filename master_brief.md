# ORBITAL — MASTER BRIEF (Single Source of Truth)

**Classification:** Internal / Investor / Auditor Ready
**Last Updated:** April 2026
**Maintainer:** Eric Parrish, Founder

> All other project docs (CLAUDE.md, memory_bank/, TECHNICAL_HANDOVER.md, etc.)
> reference this file. If there is a conflict, **this file wins**.

---

## 1. IDENTITY

Orbital is a **capacity intelligence platform** for individuals and organizations
to track, understand, and communicate human capacity states over time.

- **Founded by:** Eric Parrish (AuDHD, solo founder)
- **Entity:** Orbital Health Intelligence Inc.
- **Website:** orbitalhealth.app (Vercel)
- **Repo:** github.com/Neurodiversevoices/Orbital
- **Budget:** $500 bootstrap
- **Scale Target:** $50M ARR enterprise infrastructure (long-term)
- **Horizon:** 10-year patient-capital play

### What Orbital IS
- A capacity signal logger
- A longitudinal record builder
- A privacy-first infrastructure
- Clinical-grade capacity intelligence

### What Orbital is NOT
- A wellness app, mood tracker, or mental health platform
- A productivity tool or social network
- A gamified experience or diagnostic tool

---

## 2. CORE PHILOSOPHY

- **Boring Reliability** — no engagement optimization
- **Privacy by Structure** — not by policy
- **Sleep-Proof Ops** — automated, minimal founder load
- **Absence as Signal** — missing data is meaningful
- **Compound Value** — time cannot be compressed or replicated

---

## 3. TECH STACK (Canonical)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native | 0.81.5 |
| Platform | Expo SDK | 54 |
| Router | expo-router | v6 |
| Animation | react-native-reanimated | 4.1.x |
| Worklets | react-native-worklets | 0.5.1 |
| Language | TypeScript | 5.9.2 |
| React | React | 19.1.0 |
| JS Engine | Hermes | (production) |
| Architecture | New Architecture | enabled |
| Local Storage | AsyncStorage | 2.2.0 |
| Backend | Supabase | (auth + postgres + realtime) |
| Payments (mobile) | RevenueCat | 8.12.0 |
| Payments (web) | Stripe | live mode |
| Monitoring | Sentry | 7.8.0 |
| Icons | Lucide React Native | 0.562.0 |
| Charts | Vega / Vega-Lite | 6.x |
| Hosting | Vercel | (web) |
| Email | Resend | |
| Outreach | Apollo | |

**LOCKED:** NO dependency changes without explicit founder approval.

---

## 4. DESIGN SYSTEM (Canonical)

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#01020A` | App background |
| Card | `#0A0B10` | Card surfaces |
| Primary / Teal | `#2DD4BF` | Primary accent |
| Resourced / Cyan | `#00D7FF` | High capacity state |
| Stretched / Amber | `#F5B700` | Moderate capacity state |
| Depleted / Red | `#FF3B30` | Low capacity state |
| Text Primary | `#FFFFFF` | Main text |
| Text Secondary | `#9CA3AF` | Subdued text |

### Capacity Spectrum (orb transitions only)
Crimson (`#DC2626`) -> Amber (`#F59E0B`) -> Teal (`#2DD4BF`) -> Cyan (`#06B6D4`)

**NO orange in UI** (only in orb capacity spectrum transitions).

### Typography
- **Headings/Buttons:** DM Sans
- **Labels/Monospace:** Space Mono

### Surfaces
- Glass: `rgba(255,255,255,0.07)` bg, `rgba(255,255,255,0.15)` border
- Border radius: 14px buttons, 12px inputs, 10px cards
- Button height: 54px
- Horizontal padding: 32px

### Accessibility
- Colorblind modes: Protanopia, Deuteranopia, Tritanopia, Monochrome
- Text scaling: 1x, 1.25x, 1.5x
- Button scaling: 1x, 1.3x, 1.6x
- Haptics: Configurable (off/light/medium/strong)
- High contrast mode
- Simple mode (hides advanced features)
- 8 languages: EN, ES, FR, DE, IT, JA, PT-BR

---

## 5. CAPACITY MODEL (Frozen)

### Three States
| State | Color | Meaning |
|-------|-------|---------|
| Resourced | Cyan | Full tank, ready to engage |
| Stretched | Amber | Managing, running low |
| Depleted | Red | Need recovery |

### Capacity Drivers (Categories)
- **Sensory** — environmental factors
- **Demand** — workload, cognitive load
- **Social** — interpersonal interactions

### Prohibited Language (enforced via ESLint at CI/CD)
Cannot use: "wellness," "mental health," "mood," "stress," "anxiety,"
"depression," "diagnosis," "therapy," "symptoms," "check-in," "streak,"
"reminder," "notification"

---

## 6. ARCHITECTURE — THE HARD SPLIT

Two deployment classes with **zero overlap paths** (schema-level, not permissions).

### Class A — Relational (Self-Serve)
- Named individuals with explicit, logged consent
- Bundles: 5 / 10 / 20 / 50 seats
- Full individual-level: notes, timelines, signals
- Terms: `1.0-relational`
- **Poison Pill consent gate** required before group creation

### Class B — Institutional (Contract-Only)
- Minimum 25 seats, annual contract
- Aggregated and anonymized only
- Individual fields **do not exist** in schema (not hidden — absent)
- K-anonymity: minimum 5 signals per cohort view
- 5-minute signal delay (temporal privacy)
- Terms: `1.0-institutional`
- Non-dismissible dashboard header: "Individual identities are never visible."

### Domain Gatekeeping
Enterprise email domains blocked from Class A purchases.
Enforcement: signup flow, checkout, API, backend provisioning.

---

## 7. PRICING (Canonical)

### Class A — Self-Serve (Stripe lookup keys)
| Tier | Monthly | Annual | Stripe Key |
|------|---------|--------|------------|
| Free | $0 | — | — |
| Pro | $29 | $290 | `orbital_pro_monthly` / `orbital_pro_annual` |
| Family | $49 | $490 | `orbital_family_monthly` / `orbital_family_annual` |
| Family+ | $69 | $690 | `orbital_family_plus_monthly` / `orbital_family_plus_annual` |

### CCI Reports (one-time)
| Report | Price | Stripe Key |
|--------|-------|------------|
| 30-day | $99 | `orbital_cci_30` |
| 60-day | $149 | `orbital_cci_60` |
| 90-day | $199 | `orbital_cci_90` |
| Bundle | $349 | `orbital_cci_bundle` |

### Therapist Plans
| Tier | Price/mo | Seats |
|------|----------|-------|
| Solo | $39 | 5 |
| Practice | $89 | 15 |
| Group | $159 | 30 |
| Clinic | $279 | 60 |

### Revenue Model
Free app -> therapist-led groups -> CCI report upsell.
Revenue: Therapist subscriptions + CCI reports + Group marketplace (20% cut).

---

## 8. CIRCLES (Frozen — Six Laws)

Show your current capacity color to up to 25 trusted people. Color only. No history.

1. **NO AGGREGATION** — max 25 connections, no analytics
2. **NO HISTORY** — signals expire in 90 minutes
3. **BIDIRECTIONAL CONSENT** — both accept, either revokes
4. **NO HIERARCHY** — peer-to-peer only
5. **SOCIAL FIREWALL** — isolated from all other data
6. **NEVER INSTITUTION-OWNED** — organizations cannot require Circles

---

## 9. DATA TRUST POSITION (Binding)

### Absolute Prohibitions
- NEVER sell individual user data
- NEVER sell aggregate data as standalone product
- NEVER license data for advertising or data brokers
- NEVER provide individual-level monitoring to employers
- NEVER provide clinical diagnoses or screening
- NEVER generate risk scores or predict behavior
- NEVER contribute to insurance underwriting

### Privacy Architecture
- Local-first: all data on device by default
- Cloud sync: opt-in only (Supabase, RLS enforced)
- Age: year-of-birth mapped to 10-year cohort, then discarded
- Deletion: immediate for signals, 30-day for account; de-identified pattern history preserved
- Acquisition: data stays with users, 90-day notice, opt-out right

---

## 10. SUPABASE TABLES (15)

```
capacity_logs, user_daily_metrics, org_memberships, org_aggregate_snapshots,
audit_events, user_preferences, user_entitlements, restricted_domains,
purchase_history, circles, circle_members, circle_invites, user_push_tokens,
proof_events, capacity_baselines
```

---

## 11. KEY FILES

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout, all providers |
| `app/auth/index.tsx` | Auth screen |
| `app/(tabs)/index.tsx` | Home screen with orb |
| `app/(tabs)/patterns.tsx` | Patterns/history tab |
| `app/(tabs)/brief.tsx` | QSB strategic metrics |
| `components/GlassOrb.tsx` | Interactive orb (240px, pan gesture) |
| `lib/hooks/useEnergyLogs.ts` | Log management hook |
| `lib/storage.ts` | AsyncStorage wrapper |
| `lib/supabase/types.ts` | All database types |
| `lib/supabase/sync.ts` | Sync engine |
| `lib/supabase/auth.ts` | Auth helpers |
| `lib/patternHistory.ts` | Pattern retention (soft-delete, de-ID) |
| `types/index.ts` | All TypeScript definitions |
| `theme/colors.ts` | Color system with runtime assertions |

---

## 12. LOCKED FILES — DO NOT TOUCH

- `app/(tabs)/index.tsx`
- `components/GlassOrb.tsx`
- Any theme file

If a fix requires touching a locked file, find another way.

---

## 13. DEVELOPMENT RULES

1. Never change `package.json` dependencies
2. Never modify the orb component without explicit approval
3. Always run `npx tsc --noEmit` before committing
4. Always commit and push after completing tasks
5. Backend-only tasks = no UI changes
6. Test in simulator when UI changes are made
7. ONE branch per session; branch name must end with session ID
8. Update ORBITAL_TASK_BOARD.md with what was done

---

## 14. OPERATIONAL SAFETY ("Sleep-Proof Ops")

### Safe Healer Bot
- Automated incident response
- 5-minute cooldown, SHA-256 dedup, path allowlist
- Never touches dirty repos or active work
- Safety gates: path allowlist, `tsc --noEmit`, `build:web`

### Sentry Configuration
- Production only (disabled in `__DEV__`)
- Error/fatal only — drops warning/info/debug
- Payment failures: zero-tolerance alerting
- 5% trace sample rate

---

## 15. CLINICAL CLAIM (Governance-Level)

> "Sustained capacity volatility predicts near-term functional failure
> independent of diagnosis, self-report, or biometrics."

Validation phases: Correlation -> Prospective -> External Replication -> Actuarial Integration.
Reference cohort: K-12 Special Education Staff.

---

## 16. LONGITUDINAL PHASES

| Phase | Signals | Features Unlocked |
|-------|---------|-------------------|
| 0: Capture | 1-6 | Raw signal storage only |
| 1: Baseline | 7-29 | 7-day graph, basic stats |
| 2: Pattern | 30-89 | 30-day graph, trends |
| 3: Longitudinal | 90+ | Full suite, artifacts |

---

## 17. QUARTERLY ARTIFACTS

- **QSB:** Capacity Index, Recovery Elasticity, Load Friction, Intervention Sensitivity, Early Drift
- **QCR:** Premium PDF ($149-199/quarter) — Why Analysis, Resilience Metrics, Trend Viz, Clinical Notes. Air-gapped (client-side only).
- **CCI:** Clinical Capacity Instrument — formal quarterly record for clinician sharing

---

## 18. DEPLOYMENT STATUS

| Component | Status |
|-----------|--------|
| Web (Vercel) | Live — orbitalhealth.app |
| iOS (TestFlight) | Ready — Build 44 |
| Android | EAS configured |
| Supabase | Live — RLS enabled |
| RevenueCat | Configured |
| Sentry | Production alerts enabled |
| Stripe | Live mode |

---

## 19. GOVERNANCE DOCUMENTS (Frozen)

| Document | Status |
|----------|--------|
| `governance/ORBITAL_CANON.md` | Frozen |
| `governance/PROHIBITED_FEATURES.md` | Append-only |
| `governance/CIRCLES_DOCTRINE.md` | Frozen |
| `governance/SILENT_ONBOARDING.md` | Frozen |
| `governance/IRREVERSIBILITY_SPEC.md` | Frozen |
| `governance/LONGITUDINAL_PHASES.md` | Locked |
| `governance/DATA_TRUST_POSITION.md` | Binding |
| `governance/INSURER_CLAIM.md` | Frozen |
| `governance/ENGINEERING_ENFORCEMENT_PLAN.md` | Active |
| `governance/REFERENCE_IMPLEMENTATION.md` | Active |
| `governance/FOUNDER_OPERATING_SYSTEM.md` | Active |

Amendment requires board + legal review.

---

## 20. MODULES STATUS

### Existing Modules
All modules under `lib/` — see Section 11 for key files.

### Not Yet Implemented
- **nova-intelligence.ts** — Does not exist in codebase. No Nova intelligence module has been created.
- **CFO module** — No CFO/financial module exists in the codebase. Revenue forecasting is manual (see ORBITAL_TASK_BOARD.md).

> If these modules are planned, they need to be spec'd and built. This section
> will be updated when they are implemented.

---

## 21. CROSS-REFERENCE INDEX

| Topic | Master Brief Section | Also Referenced In |
|-------|---------------------|-------------------|
| Tech Stack | Section 3 | CLAUDE.md, TECHNICAL_HANDOVER.md |
| Design System | Section 4 | CLAUDE.md |
| Pricing | Section 7 | ORBITAL_CLAUDE_CODE_CONTEXT.md |
| Architecture | Section 6 | ORBITAL_PRODUCT_MASTERFILE_v1.0.md |
| Data Trust | Section 9 | governance/DATA_TRUST_POSITION.md |
| Circles | Section 8 | governance/CIRCLES_DOCTRINE.md |
| Dev Rules | Section 13 | CLAUDE.md |
| Founder Ops | Section 14 | governance/FOUNDER_OPERATING_SYSTEM.md |
| Current Tasks | — | ORBITAL_TASK_BOARD.md |

---

*This is the single source of truth for the Orbital project.*
*All other documentation files should reference sections here.*
