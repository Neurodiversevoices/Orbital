# Forbidden Terms Sweep — 2026-03-03

**Scope:** locales/, app/, components/, public/, docs/PLAY_STORE_LISTING_DRAFT.md

---

## CRITICAL — User-Facing Violations

### `diagnosis` (HIGH PRIORITY)

| File | Line | Context | Suggested Fix |
|------|------|---------|---------------|
| `locales/en.ts` | 282 | `"...does not constitute clinical evaluation or diagnosis."` | Replace with: `"...does not constitute clinical evaluation or diagnostic assessment."` — OR remove "diagnosis" entirely: `"...does not provide clinical evaluation."` |
| `app/legal.tsx` | 110 | `"Orbital does not provide medical advice, diagnosis, or treatment."` | Replace with: `"Orbital does not provide medical advice or clinical assessments."` |
| `app/about.tsx` | 192 | `"...does not provide diagnosis, treatment recommendations..."` | Replace with: `"...does not provide clinical assessments or care recommendations..."` |
| `app/(tabs)/patterns.tsx` | 629 | `"This is not a diagnosis."` | Replace with: `"This is not a clinical assessment."` |
| `app/upgrade.tsx` | 239 | `"I understand this is documentation, not diagnosis."` | Replace with: `"I understand this is documentation, not a clinical assessment."` |
| `app/(tabs)/brief.tsx` | 255 | `"No diagnoses. No symptom scoring"` | Replace with: `"Non-diagnostic. No severity scoring."` |
| `public/privacy.html` | 208 | `"...does not provide medical advice, diagnosis, or treatment."` | Replace with: `"...does not provide medical advice or clinical assessments."` |
| `public/therapists.html` | 505 | `"...does not provide medical advice, diagnosis, or treatment."` | Same fix as above |
| `public/landing.html` | 905 | `"...does not provide medical advice, diagnosis, or treatment."` | Same fix as above |
| `public/support.html` | 147 | `"...does not provide medical advice, diagnosis, or treatment."` | Same fix as above |
| `public/support.html` | 162 | `"...does not provide medical advice, diagnosis, or treatment."` | Same fix as above |
| `public/coach.html` | 452 | `"...does not provide medical advice, diagnosis, or treatment."` | Same fix as above |
| `docs/PLAY_STORE_LISTING_DRAFT.md` | 65 | `"Orbital is not a diagnosis tool."` | Replace with: `"Orbital is not a diagnostic instrument."` |

### `treatment` (HIGH PRIORITY)

| File | Line | Context |
|------|------|---------|
| `app/legal.tsx` | 110 | Same line as diagnosis above |
| `app/about.tsx` | 192 | Same line as diagnosis above |
| `public/privacy.html` | 208 | Same line as diagnosis above |
| `public/therapists.html` | 505 | Same line as diagnosis above |
| `public/landing.html` | 905 | Same line as diagnosis above |
| `public/support.html` | 147, 162 | Same lines as above |
| `public/coach.html` | 452 | Same line as above |
| `docs/PLAY_STORE_LISTING_DRAFT.md` | 65 | `"...treatment recommendations..."` |

### `symptom` (HIGH PRIORITY)

| File | Line | Context |
|------|------|---------|
| `components/CCI90DayChart.tsx` | 17, 226 | `"Not symptom scoring."` → Replace with `"Not severity scoring."` |
| `components/CCIChart.tsx` | 25, 411 | Same as above |
| `app/(tabs)/brief.tsx` | 255 | `"No symptom scoring"` → Replace with `"No severity scoring"` |
| `app/(tabs)/brief.tsx` | 339 | `"Not a symptom severity scale."` → Replace with `"Not a severity scale."` |

### `therapist` (HIGH PRIORITY — landing page & public HTML)

| File | Line | Context |
|------|------|---------|
| `public/therapists.html` | 289+ | Entire page uses "therapist" ~20x in subject lines, CTAs, headings |
| `public/dashboard.html` | 6, 7, 495, 500, 530, 547, 854 | `"Therapist Dashboard"` throughout |
| `public/landing.html` | 435–826 | `"For Therapists"` section, CSS classes, CTAs (~20 instances) |
| `public/groups.html` | 6, 7, 15, 16, 22, 23, 238, 280–287 | `"Therapist-led capacity groups"` throughout |

**Note:** "Therapist" is deeply embedded in the distribution channel pages. Replacing with "provider" or "practitioner" is recommended but would be a significant content rewrite. Flag for Eric's decision.

### `CPT` (MEDIUM)

| File | Line | Context |
|------|------|---------|
| `app/cci.tsx` | 282, 285 | `"CPT 90885 Reimbursement Notice"` / `"e.g., CPT 90885 review"` |
| `app/upgrade.tsx` | 282, 284 | Same CPT references |

### `medical device` (MEDIUM)

| File | Line | Context |
|------|------|---------|
| `app/about.tsx` | 74 | `"Not a medical device or diagnostic tool"` |
| `public/privacy.html` | 208 | `"Orbital is not a medical device."` |
| `public/therapists.html` | 505 | Same |
| `public/landing.html` | 905 | Same |
| `public/support.html` | 146–147, 162 | Same |
| `public/coach.html` | 452 | Same |

**Note:** These are disclaimer/negation contexts ("is NOT a medical device"). May be legally required. Flag for legal review.

### `condition` (LOW — mostly non-medical context)

| File | Line | Context |
|------|------|---------|
| `components/VegaSentinelChart.tsx` | 9, 148, 151, 155, 252 | `"Volatility Condition Graph"` / `"Trigger condition met"` — technical, not medical |
| `app/settings.tsx` | 437 | `"Volatility condition report"` — technical context |

**Assessment:** These use "condition" in a technical/signal context, not medical. Low risk but worth noting.

### `compliance` (LOW — mostly governance context)

| File | Line | Context |
|------|------|---------|
| `locales/*.ts` | 315–318 | `"// GOVERNANCE & COMPLIANCE"` — code comment only |
| `app/legal.tsx` | 5, 110 | Code comment + governance section |
| `app/audit.tsx` | 5, 116, 155 | Audit/compliance context (institutional) |
| `app/about.tsx` | 120 | `"Compliance-ready exports"` |
| `app/data-exit.tsx` | 5, 62, 79, 88, 234 | GDPR compliance context |
| `app/settings.tsx` | 407, 409 | Section header "COMPLIANCE" |
| `app/b2b-addons.tsx` | 48, 101, 130, 133 | `"Compliance / Vendor Risk Pack"` |
| `public/privacy.html` | 180 | Financial compliance context |

**Assessment:** "Compliance" here refers to data governance/GDPR/institutional — not medical compliance. Safe in these contexts per the forbidden terms list which specifies "compliance (medical context)."

### `prevent` (LOW — code logic context)

| File | Line | Context |
|------|------|---------|
| `app/security-controls.tsx` | 47, 77 | `"prevent the creation of..."` / `"structurally prevented"` — security context |
| `app/executive-engagement.tsx` | 73 | `"Prevent pilot failure"` — business context |
| `app/why-orbital.tsx` | 57 | `"Prevent double-navigation"` — code comment |
| `app/redeem.tsx` | 10 | `"Nonces prevent replay attacks"` — code comment |
| `app/circles/index.tsx` | 11 | `"prevent race conditions"` — code comment |

**Assessment:** All non-medical uses. Safe.

---

## Summary

| Severity | Term | User-Facing Instances |
|----------|------|-----------------------|
| 🔴 CRITICAL | diagnosis | 13 |
| 🔴 CRITICAL | treatment | 8 |
| 🔴 CRITICAL | symptom | 5 |
| 🔴 CRITICAL | therapist | 50+ (across 4 HTML pages) |
| 🟡 MEDIUM | CPT | 4 |
| 🟡 MEDIUM | medical device | 6 (disclaimer/negation) |
| 🟢 LOW | condition | 5 (technical context) |
| 🟢 LOW | compliance | 15+ (governance context) |
| 🟢 LOW | prevent | 5 (code/business context) |

**Total critical violations requiring immediate fix: ~26 instances across 13 files**
**"Therapist" rebrand: ~50+ instances across 4 public HTML pages (separate decision needed)**
