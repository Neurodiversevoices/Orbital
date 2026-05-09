# Medical / Health Compliance Audit — Orbital
**Date:** 2026-05-09
**Auditor:** Compliance sweep agent (agent-adf78f8be84a40822)
**Scope:** Marketing copy, app copy, store metadata, CCI, FDA SaMD boundary, HIPAA boundary, Apple medical-app guidelines, state-level health-data laws.
**Prior reference:** `FORBIDDEN_TERMS_SWEEP_2026-03-03.md`

> Severity legend: **PASS** · **MINOR** · **MAJOR** · **CRITICAL**

---

## Executive Summary

| Section | Grade | Notes |
|---|---|---|
| A. Marketing copy (public/*.html) | **MAJOR** | Regression: blog posts and `landing.html` introduce predictive/causal medical-adjacent claims; `home.html` advertises features that don't exist; `therapists.html` retains "clinical" + "therapist" heavily. |
| B. App copy (app/, components/) | **MINOR** | "Clinical" still embedded in product surface; otherwise clean. CCI brand decision pending. |
| C. App Store metadata | **MINOR** | Description and keywords are clean. Category `healthcare-fitness` is acceptable but has tradeoffs. |
| D. CCI report generation | **MAJOR** | Generated PDF/HTML emits **"Patient ID"** and **"PATIENT INFO"** labels — strongest medical-record framing in the codebase. |
| E. FDA SaMD boundary | **PASS (borderline)** | Self-tracking framing holds. Marketing predictive claims push toward the line. |
| F. HIPAA boundary | **PASS** | Not a covered entity. State-level (WA MHMD) coverage is a gap. |
| G. Apple medical-app guidelines | **MINOR** | 1.4.1 risk elevated by "clinical-grade", "clinical reports", "clinical dashboard" copy. |
| H. State health-data laws | **MAJOR** | No WA MHMD-compliant Consumer Health Data privacy notice. No affirmative-authorization UI. |

**Overall grade: MAJOR — not currently App-Review safe in the way the team believes it is. The 2026-03-03 sweep cleaned the *core app surfaces* but new copy (blog content, marketing rewrites, CCI generated artifact) has re-introduced material risk.**

---

## A. Marketing Copy (public/*.html, public/blog/*)

### A1. `public/landing.html` — MAJOR
- **Line 471** "Most crashes are scheduled three weeks in advance. ... Orbital can [see them]." — predictive medical claim, treats user "crashes" as forecastable health events.
- **Line 546** "Know before you crash. ... Predict high-output windows." — same.
- **Line 586** "Burnout isn't inevitable. It's predictable." — directly claims the app predicts a colloquial-medical condition.
- **Line 507** "of workers report burnout symptoms" — uses "symptoms" with `burnout` (a flagged term in the prior sweep).
- **Line 591** "THERAPISTS & CLINICIANS" feature tag.
- **Line 610** "CLINICAL-GRADE SIGNAL" trust point.
- **Line 611** "...doesn't diagnose, treat, or replace your clinician." — useful disclaimer but uses "clinician" which the doctrine treats as clinical.
- **Line 617** "Stop managing symptoms. Start reading your system." — final CTA uses "symptoms".
- **Line 905 (existing per prior sweep)** "...does not provide medical advice or clinical assessments." — disclaimer present but disclaimer footer is a single sentence; not a Health-data-specific notice.

**Why it matters:** Apple 1.4.1 reviewers explicitly look for predictive/diagnostic language. "Clinical-grade", "predictable" + condition name (burnout), and "manage symptoms" together substantially increase rejection risk.

**Fix:** Replace "predictable" with "patterned"; replace "manage symptoms" with "tracking signals"; demote "CLINICAL-GRADE SIGNAL" → "INSTRUMENT-GRADE SIGNAL"; replace "clinician/therapist" feature-tag with "Care Team" or remove; replace "burnout symptoms" with "depletion patterns"; reframe "predict" as "anticipate / prepare for / plan around".

### A2. `public/home.html` — MAJOR (DO-NOT-EDIT per task scope)
- **Line 7** meta description: "A clinical-grade instrument."
- **Line 14** og:description: "Clinical-grade daily instrument."
- **Line 268** "Predictive alerts" listed as a Pro feature — overlaps with FDA SaMD predictive medical purpose framing. Also: this feature **does not appear to be implemented** (no backend, no UI surface).
- **Line 267** "HealthKit / Health Connect" listed as Pro feature — **also not implemented** (no plugin in `app.json`, no Info.plist key, no permission strings). Marketing a non-existent feature is an Apple guideline 2.3 issue (accurate metadata).
- **Line 244–245** "NOT A MEDICAL DEVICE / NOT FOR DIAGNOSIS OR TREATMENT" — disclaimers present, good.
- **Line 242** "CDS EXCLUSION · CURES ACT §3060(a)" — citing the 21st Century Cures Act software exclusion is unusual on consumer marketing and reads as a claim that someone has performed regulatory analysis. Defensible but should be reviewed by counsel.

**Per task constraint, NOT modified by this audit.** Flagged for owner of `home.html` rewrite.

### A3. `public/blog/*.html` — CRITICAL
- 10 blog posts, **none have a medical disclaimer**.
- Heavy use of: ADHD (~35x), autism/autistic (~20x), burnout (~30x), shutdown, dysregulated nervous system, medication, dosage.
- `concept-7-therapist-clinician-peer-content.html` is **written as if to a clinical audience** ("our neurodivergent clients", "I've noticed in my practice", "#ClinicalTools" tag) and explicitly uses "symptom tracking" 7+ times.
- `concept-9-medication-changes-capacity.html` line 5: "your doctor adjusts your dosage" — the post effectively counsels users on what to do during medication changes; even though it doesn't prescribe, it positions the app in the dosage-management workflow.
- `concept-1-adhd-burnout.html` line 32: "biological signal underneath everything" — claims to measure biology.

**Why it matters:** App reviewers and FTC review marketing the same as in-app copy. Blog posts that read as therapeutic guidance with no disclaimer are the highest individual risk surface.

**Fix:** Add a uniform medical disclaimer footer to every `public/blog/*.html` page. Replace "biological signal" with "self-reported pattern". Reframe `concept-7` as "what we hear from therapists" (third-party testimonial framing) instead of practitioner first-person voice.

### A4. `public/therapists.html` — MAJOR (decision pending)
- 50+ uses of "Therapist" in headings, CTAs, plan names, email subject lines.
- "clinical dashboard" (L307), "clinical-grade by design" (L308), "clinical reports" (L374), "clinical practice" (L15), "clinical program guide" (L506), "provider-client clinical relationship" (L513).
- Disclaimer (L513) is good copy — present and explicit.
**Per prior sweep, marked as needing Eric's decision. Status unchanged.**

### A5. `public/groups.html` — MAJOR (decision pending)
- "Therapist-led capacity groups" framing throughout.
- Same as above — needs product decision.

### A6. `public/coach.html` — MINOR
- L364 "clinical-grade reports" — soft regression of the prior cleanup. Disclaimer at L460 is otherwise solid.

### A7. `public/dashboard.html` — MAJOR (decision pending)
- "Therapist Dashboard" labels (L503, L555, L995, L1015, L1181) — internal admin surface.
- `flag-burnout` style class and "BURNOUT" alert badge displayed to dashboard users.
- No medical disclaimer footer.

### A8. `public/blog.html` (index) — MINOR
- L7 meta description: "clinical-grade tracking, and care team workflows".
- L278 "clinical notes from building capacity intelligence".

### A9. `public/privacy.html` and `public/terms.html` — PASS
- Disclaimers updated per prior sweep are present (L216, L172). Language is current with the App-Store-safe rewrite. Note privacy policy lacks state-specific (WA MHMD, CA CMIA) consumer health data sections — see Section H.

### A10. `public/support.html` — PASS
- Disclaimers present and clean (L155, L170).

---

## B. App Copy (app/*.tsx, components/*.tsx)

### B1. "Clinical Capacity Instrument" / "Clinical Orb" naming — MINOR (decision pending)
| File | Line | Term |
|---|---|---|
| `app/cci.tsx` | 217 | "Clinical Capacity Instrument" |
| `app/upgrade.tsx` | 263 | "Clinical Capacity Instrument · Issued per individual" |
| `app/upgrade.tsx` | 283 | "Supports clinical documentation and record review..." |
| `app/upgrade.tsx` | 293 | "...creates a fixed clinical-grade record..." |
| `app/upgrade.tsx` | 529, 589 | "Clinical capacity artifact · Issued once" |
| `app/(tabs)/brief.tsx` | 178, 182 | "Clinical Capacity Instrument" / "clinical-grade instrument" |
| `app/legal.tsx` | 113 | "The Clinical Capacity Instrument (CCI-Q4) is informational..." |
| `components/qcr/QCRScreen.tsx` | 236, 318–319, 367 | "Written Clinical Summary", "clinicalNotes", "not a clinical assessment" |
| `components/qcr/QCRPaywall.tsx` | 85, 96, 116 | "clinical documentation", "Clinical observations", "Clinical reporting tier" |
| `components/CCIChart.tsx`, `components/CCI90DayChart.tsx` | header comments | "Clinical Capacity Indicator" |
| `components/orb/ClinicalOrb.tsx`, `ClinicalGauge.tsx` | filename + symbols | "ClinicalOrb", "ClinicalGauge", "precision clinical instrument" |

**Disposition:** Per prior sweep: the team chose to *keep* "Clinical" in the CCI product name. The doctrine still bans the term, but the product accepts the cost. Name decision is **owner-only**. This audit recommends one of:
- (a) Rename to **"Capacity Instrument" / CI-Q4** (cleanest; matches doctrine).
- (b) Keep, but **always wrap with the standard non-diagnostic disclaimer** in the same view (currently inconsistent).
- (c) Keep only the abbreviation **CCI** in user-facing copy, never expand it. Internally it can be "Capacity Composite Index" — the C does not have to map to "Clinical".

### B2. CCI artifact internals — MAJOR
The CCI generation pipeline emits HTML/PDF that contains:
- `lib/cci/artifact.ts` line 240: comment `PATIENT INFO` heading section
- line 242, 512: CSS class `.patient-info`
- line 514: `<span class="info-label">Patient ID:</span>`
- line 28: demo data `patientId: '34827-AFJ'`
- line 890–891: `Patient ID` label on rendered output
- `lib/cci/powerTemplate.ts` line 346–347, 450: `Patient ID` shown to user; "Patient ID is anonymized... data remains under patient control"
- `lib/cci/types.ts` line 53–54, `dynamic/types.ts` line 50–51, `dynamic/format.ts`, `dynamic/compute.ts` line 257–261, 344–345 — `patientId` is the canonical identifier in the type system
- `lib/cci/generateCCIPdf.ts` line 53, 144, 233 — `patientIdSeed`, file naming `CCI_${patientId}_*.pdf`
- `lib/cci/bundleArtifact.ts` line 423, 447, 484 — bundle artifact has "Non-diagnostic" disclaimer (good) but uses "symptom severity scale" wording
- Rendered output: `output/cci_ultra.html:187, 482` and `output/qcr_q4_2025.html:46` confirm the words appear in the actual generated artifact.

**Why it matters:** "Patient ID" is the single strongest signal that this app is a clinical record. It frames the user as a patient — even though they haven't been diagnosed and Orbital isn't a provider. App Review staff opening the CCI PDF will see "Patient ID: 34827-AFJ" before any disclaimer.

**Fix:** Rename `patientId` → `subjectId` or `participantId` (research-grade, non-clinical) throughout `lib/cci/`. Replace `Patient ID:` label in artifact HTML with `Record ID:` or `Subject ID:`. Replace `PATIENT INFO` section heading with `RECORD INFO`. This is a code rename across multiple files — flagged as needing engineering work, NOT applied here.

### B3. Other app copy — clean
- `app/legal.tsx` L110: "Orbital does not provide clinical advice, professional evaluation, or care recommendations." — current, App-Store-safe.
- `app/about.tsx` L48 "No diagnoses. No prescriptions. Just signal and pattern." — strong disclaimer.
- `app/(tabs)/patterns.tsx` L43 "Calm, non-clinical labels for data depth", L625 "Calm, Non-Diagnostic" — both code comments. PASS.
- `app/audit.tsx` L117 "Non-diagnostic. Orbital capacity tracking system." — PASS.
- `app/data-exit.tsx` L98 "Non-diagnostic. Data deleted per user request." — PASS.

### B4. `lib/modeDemoData.ts` line 224, 228 — MINOR
- "Patient outcomes good." / "High patient volume." — these are *demo strings shown in a healthcare-vertical mode* (B2B preview). The mode is gated as DEMO_ONLY and not user-facing for consumer accounts. Acceptable in a B2B sales surface but the language confirms an institutional clinical use case the consumer App Store positioning denies. **Recommendation:** Restrict the healthcare-vertical demo mode behind a B2B sales flag so it does not ship in the consumer build.

### B5. Locales — PASS
- All locale files use `Non-diagnostic` consistently. The disclaimers were tightened per prior sweep. Spanish, French, Italian, Japanese, German, Portuguese, Korean, Chinese all clean.

---

## C. App Store / Play Metadata

### C1. iOS App Store description — MINOR
- Line 57: "CLINICAL CAPACITY INDEX (CCI)" — uses "Clinical" in a feature heading (decision pending per B1).
- Line 75: disclaimer "Non-diagnostic. Not a substitute for professional consultation. All data is self-reported." — present and good.
- Keywords (line 25): `capacity,tracking,neurodivergent,ADHD,autism,patterns,signals,self-tracking,offline,private,journal` — uses "ADHD" and "autism" as keywords. Apple does NOT prohibit condition-name keywords for non-clinical apps in the Health & Fitness category, but it does increase scrutiny. **Recommendation:** keep — this is a deliberate audience-matching decision and the app does not claim to treat these conditions.

### C2. Play Store description — PASS
- "WHAT ORBITAL IS NOT" section is explicit and well-written.

### C3. Category `public.app-category.healthcare-fitness` — MINOR
- The Healthcare-Fitness category implies a healthy-lifestyle app. Apple's guideline language: "Apps in the Medical category... should not provide inaccurate data" — Healthcare-Fitness is the looser sibling category and is appropriate.
- However, marketing pages claim "clinical-grade" and "burnout prediction", which would push reviewers toward Medical-category scrutiny.
- **Disposition:** The category is fine; the *marketing copy needs to match the category*.

### C4. APP_STORE_METADATA.md self-claim line 179 — MINOR
The file claims "✅ No instances of: diagnosis, treatment, therapy, therapist, medical device, HIPAA, CPT, FDA, prescribe, prescription, clinical trial, therapeutic, treat, cure, prevent, symptom, disorder, condition (medical), compliance (medical)" — this is *true of the metadata file itself*, but the broader codebase still contains many of these terms. The self-claim is correct in scope but the file should clarify it applies only to App Store-submitted text.

---

## D. In-App CCI Generation

### D1. Output rendering — MAJOR
See B2 above. The single most critical engineering task for medical compliance: rename `patientId` and remove "PATIENT INFO" / "Patient ID" labels from the rendered artifact.

### D2. CCI disclaimers in artifact — PARTIAL PASS
- `lib/cci/powerTemplate.ts` line 446: "This is NOT a diagnostic instrument." — PASS.
- `lib/cci/bundleArtifact.ts` line 447, 484: "This is NOT a diagnostic tool. Not a symptom severity scale." — uses "symptom" (prior sweep flagged). Replace with "severity scale" (already done elsewhere; this file was missed).
- `lib/cci/dynamic/governance.ts` line 30–45 contains a runtime forbidden-terms list including "diagnosis", "treatment", "symptom" — good defensive code, but it does not check the static template strings.

### D3. Reimbursement copy — MAJOR
`app/cci.tsx` line 273–278 and `app/upgrade.tsx` line 282–283:
> "Supports clinical documentation and record review in a manner compatible with standard clinical review billing codes. Reimbursement is not guaranteed and varies by payer."

This copy is doing two things at once that are individually risky:
1. Implying the app's output is acceptable for clinical billing.
2. Mentioning "billing codes" (the prior sweep flagged "CPT 90885" — appears the explicit code was removed but the reimbursement framing remains).

For App Review: this reads as a medical-billing tool. Recommendation: remove the entire "billing codes" framing from consumer-facing surfaces. Keep it for B2B sales conversations only.

---

## E. FDA SaMD Boundary

**Question:** Does Orbital meet the FDA Software-as-a-Medical-Device definition?

**Test:** Software is SaMD if its intended use is one or more medical purposes — diagnosis, treatment, prevention, mitigation, or cure of a disease or condition.

**Findings:**
- **Diagnosis:** No. App and product copy explicitly say "non-diagnostic" everywhere. PASS.
- **Treatment:** No. No treatment is recommended. PASS.
- **Prevention/Mitigation:** **BORDERLINE.** Marketing claims "Burnout isn't inevitable. It's predictable." (`landing.html:586`) and "Burnout recovery" (`landing.html:579`) frame the app as preventing a (colloquial) condition. FDA defines SaMD intent based on labeling and marketing claims, not technical capability. Consistent prevention-of-condition framing, even for a colloquial condition, can shift intent.
- **Cure:** No. PASS.

**Conclusion: Orbital is currently NOT a SaMD, but the marketing copy on `landing.html` is the closest the product has come to crossing into "intended for prevention of a condition." FDA enforcement risk is low for direct-to-consumer wellness apps using "burnout" colloquially, but the language should be tightened to remove "predict" + "burnout" pairings.**

**Specific fixes:**
- Replace "Burnout isn't inevitable. It's predictable." with "Depletion patterns are visible." or "Capacity patterns are readable."
- Replace "Predictive alerts" with "Pattern reminders" or "Capacity nudges".
- Replace "Predict high-output windows" with "Plan around your high-capacity windows".
- Treat "burnout" as a narrative descriptor only, never the predicted outcome.

---

## F. HIPAA Boundary

**Question:** Is Orbital a HIPAA covered entity or business associate?

**Findings:**
- Orbital is direct-to-consumer. Not a healthcare provider, health plan, or clearinghouse. PASS as covered entity test.
- Therapist mode (`public/therapists.html`) markets a B2B tier where therapists pay Orbital to view client capacity data. **If a therapist (a covered entity) uploads client capacity data into Orbital and Orbital stores it on their behalf, Orbital becomes a Business Associate.** Currently the marketing (L401: "CCI reports are purchased directly by clients") avoids this by routing the data through the client. Architecturally this is fine. Operationally, a single therapist who creates accounts on behalf of clients triggers BA status.
- **Required artifact: a Business Associate Agreement (BAA) template** for the therapist tier, or explicit terms forbidding therapists from creating client accounts.
- Sentinel Brief (`app/sentinel-brief.tsx`) is currently DEMO-only with synthetic data — no PHI flow. PASS.
- Circles share data peer-to-peer with explicit handshake confirmation (`app/circles/confirm.tsx`). The shared data is capacity logs (low sensitivity in HIPAA terms — not PHI absent provider involvement). PASS.

**Conclusion: Not a HIPAA covered entity. NOT a business associate today, but the therapist tier creates a path to BA status that needs operational guardrails.**

---

## G. Apple Medical-App Guidelines

### G1. Guideline 1.4.1 — Medical apps with elevated scrutiny
Triggers: claims of clinical accuracy, diagnosis, or treatment.

**Risk indicators present:**
- "Clinical Capacity Instrument" (in-app, App Store description, marketing).
- "Clinical-grade signal" (`landing.html:610`).
- "Clinical-grade daily instrument" (`home.html:14`).
- "Clinical reports" (`coach.html:364`, `therapists.html:374`).
- "Clinical dashboard" (`therapists.html:307`).

**Verdict:** Elevated. Apple may demand documentation if a reviewer flags this. Recommendation: have one-paragraph internal write-up ("Why we say 'clinical-grade'") prepared for an App Review escalation.

### G2. Guideline 1.4.4 — Drug dosage calculators
**Verdict:** N/A. Orbital does not calculate dosages. PASS.

### G3. Guideline 5.1.1(ix) — Health-related human subject research
**Risk:** `lib/research/rweExport.ts` exports OMOP-formatted research data with `Patient/${cohortParticipantId}` references and "Patient self-reported" observation type. If this is enabled in a shipping build, Apple will require evidence of IRB review or equivalent.

**Verdict:** Currently a backend export, not a user-facing research consent flow. Recommendation: gate this entire module behind a build flag (`__DEV__` or B2B-only) so it cannot run in the consumer build.

### G4. Guideline 5.1.3 — Health and fitness data privacy
- "Health, fitness, and medical data must be kept private and not shared with third parties without consent."
- Circles requires explicit handshake (PASS).
- B2B Sentinel modes route to contact form only (PASS as long as DEMO).

**Verdict:** PASS for current production flows.

---

## H. State Health Data Laws

### H1. Washington My Health My Data Act (MHMD) — MAJOR GAP
- "Consumer health data" includes any personal info linked to physical or mental health, including biometric data, health-conditions inferences, and capacity / nervous-system data (very arguably).
- Required:
  - **Consumer Health Data Privacy Policy** (separate from general privacy policy).
  - **Affirmative authorization** (opt-in, separate consent screen, before collection).
  - **Geofencing prohibition** within 2,000 ft of healthcare facilities.
- Orbital current state:
  - General privacy policy at `public/privacy.html` does NOT have a Consumer Health Data section.
  - No separate WA-state-specific consent screen on first-launch.
  - No geofencing audit (likely fine since Orbital does not use location, but should be explicitly documented).
- **Status:** Not currently compliant for Washington-state users.

### H2. CA Confidentiality of Medical Information Act (CMIA)
- CMIA-medical-information rules apply primarily to providers. CA's CCPA / CPRA broader consumer privacy regime is already addressed in the existing privacy policy (line 195).
- **Status:** PASS via existing CCPA disclosure.

### H3. CT Data Privacy Act / NV SB 370 / VA CDPA
- These follow GDPR-like patterns covered by existing policy. **Status:** PASS.

### H4. Recommendation
Add a `public/health-data-privacy.html` page (separate route) that:
- States WA MHMD-compliant scope.
- Defines what counts as consumer health data in Orbital (capacity logs, drivers, baselines).
- Provides an explicit affirmative-consent toggle (web sign-up flow + app first-launch).
- Names the right to delete consumer health data without account deletion.

---

## "Clinical Capacity Index" Naming Recommendation

**Current state:** "Clinical" appears in the product name (`Clinical Capacity Instrument` / CCI-Q4), in component class names (`ClinicalOrb`, `ClinicalGauge`), and in 30+ surfaces.

**Options:**

| Option | Cost | Risk reduction | Best for |
|---|---|---|---|
| **A. Rename to Capacity Instrument (CI-Q4)** | High (refactor) | High | Clean App Review story |
| **B. Keep "Clinical", everywhere wrap with non-diagnostic disclaimer** | Medium (audit + add disclaimers) | Medium | Preserves brand, increases verbosity |
| **C. Keep abbreviation "CCI" only, never expand it** | Low (search/replace) | High | Best ratio of effort to risk reduction |

**Recommendation: Option C.** Keep `CCI` everywhere as an opaque trademark. Replace every expansion of "Clinical Capacity Instrument" / "Clinical Capacity Index" with just "CCI". This requires no architectural change, preserves the brand, and removes the only word that triggers App Review medical scrutiny.

---

## Summary Table

| Section | Findings | Critical | Major | Minor |
|---|---|---|---|---|
| A. Marketing copy | 10 | 1 | 5 | 4 |
| B. App copy | 5 | 0 | 1 | 4 |
| C. App Store metadata | 4 | 0 | 0 | 4 |
| D. CCI report | 3 | 0 | 2 | 1 |
| E. FDA SaMD | 1 | 0 | 0 | 1 (borderline) |
| F. HIPAA | 1 | 0 | 0 | 1 (BAA gap) |
| G. Apple guidelines | 4 | 0 | 0 | 4 |
| H. State laws | 4 | 0 | 1 | 3 |
| **Total** | **32** | **1** | **9** | **22** |

**Overall grade: MAJOR — substantial regression risk; many fixes are low-effort.**

---

## Phase 3: Fixes Applied This Audit

The following low-risk fixes were applied directly:

1. Added a uniform medical disclaimer footer to all 11 blog pages (`public/blog/*.html`).
2. Replaced "biological signal" with "self-reported pattern" in `concept-1-adhd-burnout.html`.
3. Tightened predictive language on `landing.html` (the non-home rewrite is in scope).
4. Added a privacy-policy section on consumer health data (WA MHMD scaffolding) at the bottom of `public/privacy.html`.
5. Replaced `Patient ID` user-facing labels with `Record ID` in `lib/cci/bundleArtifact.ts` rendered output (does not touch `patientId` field name in types — see followups).
6. Replaced "symptom severity scale" with "severity scale" in `lib/cci/bundleArtifact.ts` (lines 447, 484) — sweeping the prior-sweep replacement to this missed file.

See git diff for exact changes.

---

## Followup Tasks (require human decision or non-low-risk engineering)

### CRITICAL
1. **Rename `patientId` → `subjectId` (or similar) across `lib/cci/`** — code refactor across `types.ts`, `dynamic/types.ts`, `dynamic/format.ts`, `dynamic/compute.ts`, `artifact.ts`, `powerTemplate.ts`, `generateCCIPdf.ts`. Update generated HTML labels (`PATIENT INFO` → `RECORD INFO`, `Patient ID:` → `Record ID:`). Re-render the demo PDF outputs. Engineering owner needed.
2. **Address `public/home.html` regression** — owner of the cinematic rewrite (do not edit per audit constraint) should change "clinical-grade" to "instrument-grade" and remove "Predictive alerts" + "HealthKit / Health Connect" feature bullets (both currently advertise non-existent features). Apple metadata-accuracy issue.

### MAJOR
3. **Decision on the "Clinical Capacity" product name** — Eric/Founder. Recommendation: keep abbreviation `CCI` only, never expand the C as "Clinical".
4. **Remove "billing codes" reimbursement framing** from `app/cci.tsx:273–278` and `app/upgrade.tsx:282–283`. Move that copy into B2B sales material only.
5. **Therapist tier — confirm B2B path** (`public/therapists.html`, `public/groups.html`, `public/dashboard.html`). Either:
   - Keep therapist branding and ship a Business Associate Agreement template + clinic operational guardrails, or
   - Rebrand the tier as "Care Partner / Practitioner" without the word "Therapist", or
   - Move all therapist-facing pages behind auth (so consumer App Review never sees them).
6. **WA My Health My Data Act compliance** — write the Consumer Health Data Privacy Notice, add an affirmative-authorization first-launch toggle, document geofencing N/A status. Legal + engineering.
7. **Predictive-claim cleanup on `landing.html`** — replace "Burnout isn't inevitable. It's predictable." (line 586) with non-predictive phrasing. Marketing copy decision.
8. **Gate `lib/research/rweExport.ts` behind a build flag** — ensure the OMOP "Patient/" reference exporter does not ship in consumer builds.

### MINOR
9. **Restrict `lib/modeDemoData.ts` healthcare-vertical strings** ("Patient outcomes good") to a B2B-only build.
10. **Update `APP_STORE_METADATA.md` self-claim line 179** to clarify scope (file applies to submitted text only, not to the broader codebase).
11. **Add a one-paragraph "Why we say 'clinical-grade'" internal note** — pre-empt App Review escalation under guideline 1.4.1.
12. **Audit `components/orb/ClinicalOrb.tsx` and `components/orb/ClinicalGauge.tsx` filenames** — these are user-facing through bundle errors / Sentry logs. Rename consideration during the Option-C product decision.
13. **Re-render the demo PDF outputs** (`output/cci_ultra.html`, `output/qcr_q4_2025.html`, `output/CCI_Q4_2025_Ultra_PatternReadable.pdf`) after the patientId rename — they currently still embed `Patient ID` text.

---

## Auditor's Final Assessment

The 2026-03-03 sweep was effective on the *core in-app surfaces it covered*, but three things have happened since:
1. Marketing teams have rewritten public pages (`home.html`, `landing.html`) and re-introduced predictive / "clinical-grade" framing.
2. Blog content has been generated at volume with no disclaimer footer and explicit therapeutic framing.
3. The CCI artifact code path was never audited — and it emits the highest-risk single string in the entire product: `Patient ID:`.

If Orbital re-submits today, the most likely App Review concern is not the in-app copy (which is mostly clean) but **the rendered CCI PDF and the blog ecosystem**. The fix list in this audit is mostly low-effort and the team has demonstrated it can move quickly on these.

**Recommended order of operations:**
1. Apply this audit's blog disclaimer + landing.html copy fixes (low-risk, applied here).
2. `patientId` rename (medium engineering, highest risk reduction).
3. Founder decision on the CCI name and the therapist tier.
4. WA MHMD privacy notice (legal-driven).
