# Orbital Landing Page — Feature Grid Architecture
## Prepared for Production Implementation

---

## STEP 1: Feature Refinement

### Version A — Clear + Simple
Optimized for: individuals, first-time visitors, mobile scanning.
Language level: plain English, no jargon, no abstraction.

| #  | Original | Version A |
|----|----------|-----------|
| 1  | One-tap capacity logging | Log how you're doing in one tap |
| 2  | Continuous capacity spectrum | No labels. Just a spectrum. |
| 3  | Sensory / Social / Demand drivers | Track what's driving your load |
| 4  | Optional context notes | Add context when you want to |
| 5  | Patterns over time | See your patterns emerge |
| 6  | 7 / 30 / 90-day trends | Weekly, monthly, quarterly views |
| 7  | Driver correlation | See what affects you most |
| 8  | Time-of-week patterns | Know your best and worst days |
| 9  | Stability vs volatility | Measure your consistency |
| 10 | Early warning signals | Catch dips before they hit |
| 11 | Longitudinal record | Your capacity history, preserved |
| 12 | Exportable artifact (CCI-Q4) | A clinical-grade quarterly report |
| 13 | Shareable review view | Share with your provider on your terms |
| 14 | Circles (trusted support) | Invite people you trust |
| 15 | Family mode | Track together as a household |
| 16 | Admin read-only visibility | Oversight without intrusion |
| 17 | Demo institutional modes | Try before you commit |
| 18 | Privacy-first governance | Your data stays yours |
| 19 | No raw data selling | We don't sell data. Period. |
| 20 | Web-first stability | Works everywhere. No app required. |

### Version B — Premium + Structured
Optimized for: therapists, institutional buyers, investors.
Language level: precise, clinical-adjacent, category-defining.

| #  | Original | Version B |
|----|----------|-----------|
| 1  | One-tap capacity logging | Single-input signal capture |
| 2  | Continuous capacity spectrum | Continuous capacity spectrum |
| 3  | Sensory / Social / Demand drivers | Multi-domain driver attribution |
| 4  | Optional context notes | Contextual annotation layer |
| 5  | Patterns over time | Longitudinal pattern detection |
| 6  | 7 / 30 / 90-day trends | Multi-horizon trend analysis |
| 7  | Driver correlation | Driver-capacity correlation |
| 8  | Time-of-week patterns | Temporal pattern mapping |
| 9  | Stability vs volatility | Stability index computation |
| 10 | Early warning signals | Predictive capacity alerts |
| 11 | Longitudinal record | Immutable capacity record |
| 12 | Exportable artifact (CCI-Q4) | Clinical Capacity Index (CCI) |
| 13 | Shareable review view | Consent-gated provider sharing |
| 14 | Circles (trusted support) | Trusted support circles |
| 15 | Family mode | Household capacity view |
| 16 | Admin read-only visibility | Read-only administrative access |
| 17 | Demo institutional modes | Institutional evaluation mode |
| 18 | Privacy-first governance | Privacy-first data governance |
| 19 | No raw data selling | Zero data commercialization |
| 20 | Web-first stability | Platform-independent deployment |

---

## STEP 2: Reordering for Maximum Impact

### New Order (with rationale)

The landing page grid should NOT follow feature logic. It should follow trust logic.
People scan in this emotional sequence:

1. "What does it do?" → INPUT
2. "Is it simple?" → SIMPLICITY
3. "What do I get?" → INSIGHT
4. "Can I trust it?" → GOVERNANCE
5. "Who else can use it?" → SCALE

Reordered list:

**BLOCK 1 — CAPTURE (What you do)**
1. One-tap capacity logging
2. Continuous capacity spectrum
3. Sensory / Social / Demand drivers
4. Optional context notes

WHY FIRST:
- Answers "what is this" in 4 seconds
- Shows simplicity immediately
- Reduces cognitive load on first scan
- Establishes the input model before talking about output

**BLOCK 2 — INTELLIGENCE (What you learn)**
5. Patterns over time
6. 7 / 30 / 90-day trends
7. Driver correlation
8. Time-of-week patterns
9. Stability vs volatility
10. Early warning signals

WHY SECOND:
- This is the value proposition
- Moves from simple input → sophisticated output
- "Free to track, paid to prove" lives here
- Each item escalates in perceived intelligence
- Early warning signals is the emotional hook — it lands last in the block for maximum impact

**BLOCK 3 — PROOF (What you can share)**
11. Longitudinal record
12. Clinical Capacity Index (CCI)
13. Shareable review view

WHY THIRD:
- This is the paid conversion trigger
- CCI is the product's revenue center
- Positioned after intelligence so the reader understands WHY the artifact matters
- "Shareable review view" implies professional credibility without claiming clinical status

**BLOCK 4 — TOGETHER (Who else can use it)**
14. Trusted support circles
15. Family mode
16. Admin read-only visibility
17. Institutional evaluation mode

WHY FOURTH:
- Expands from individual → group → institution
- Shows scale potential to investors
- Shows collaboration potential to therapists
- "Admin read-only" signals enterprise readiness without enterprise language

**BLOCK 5 — TRUST (Why it's safe)**
18. Privacy-first governance
19. Zero data commercialization
20. Platform-independent deployment

WHY LAST:
- Trust closes. It doesn't open.
- Leading with privacy feels defensive. Closing with it feels confident.
- "We don't sell data" as the final statement is a mic drop, not an apology
- Web-first stability shows maturity and accessibility

---

## STEP 3: Final Landing Page Grid — 20 Labels

3-4 words max. Mobile-first. Scannable in under 10 seconds.

### CAPTURE
1. One-tap logging
2. Continuous spectrum
3. Driver tracking
4. Context notes

### INTELLIGENCE
5. Pattern detection
6. Multi-horizon trends
7. Driver correlation
8. Temporal mapping
9. Stability indexing
10. Early warning signals

### PROOF
11. Longitudinal record
12. Clinical capacity report
13. Provider-ready sharing

### TOGETHER
14. Trusted circles
15. Family view
16. Read-only admin
17. Institutional demo

### TRUST
18. Privacy-first governance
19. Zero data sales
20. Works everywhere

---

## STEP 4: Implementation Structure

### Semantic HTML

```html
<section id="features" aria-labelledby="features-heading">
  <h2 id="features-heading" class="sr-only">Platform Features</h2>

  <!-- Block 1: Capture -->
  <div class="feature-block" data-block="capture">
    <h3 class="block-label">Capture</h3>
    <ul class="feature-grid" role="list">
      <li class="feature-item">
        <span class="feature-icon" aria-hidden="true"><!-- SVG --></span>
        <span class="feature-label">One-tap logging</span>
      </li>
      <li class="feature-item">
        <span class="feature-icon" aria-hidden="true"><!-- SVG --></span>
        <span class="feature-label">Continuous spectrum</span>
      </li>
      <li class="feature-item">
        <span class="feature-icon" aria-hidden="true"><!-- SVG --></span>
        <span class="feature-label">Driver tracking</span>
      </li>
      <li class="feature-item">
        <span class="feature-icon" aria-hidden="true"><!-- SVG --></span>
        <span class="feature-label">Context notes</span>
      </li>
    </ul>
  </div>

  <!-- Block 2: Intelligence -->
  <div class="feature-block" data-block="intelligence">
    <h3 class="block-label">Intelligence</h3>
    <ul class="feature-grid" role="list">
      <li class="feature-item">...</li>
      <!-- 6 items -->
    </ul>
  </div>

  <!-- Block 3: Proof -->
  <div class="feature-block" data-block="proof">
    <h3 class="block-label">Proof</h3>
    <ul class="feature-grid" role="list">
      <!-- 3 items -->
    </ul>
  </div>

  <!-- Block 4: Together -->
  <div class="feature-block" data-block="together">
    <h3 class="block-label">Together</h3>
    <ul class="feature-grid" role="list">
      <!-- 4 items -->
    </ul>
  </div>

  <!-- Block 5: Trust -->
  <div class="feature-block" data-block="trust">
    <h3 class="block-label">Trust</h3>
    <ul class="feature-grid" role="list">
      <!-- 3 items -->
    </ul>
  </div>
</section>
```

### Section Hierarchy

```
<body>
  <nav>          — Sticky. Logo + single CTA button.
  <header>       — Hero. Headline + orb + primary CTA.
  <section#social-proof>  — Credibility line or pilot badges.
  <section#how-it-works>  — 3-step flow (Log → Learn → Prove).
  <section#features>      — THE 20-ITEM GRID (this document).
  <section#cci-demo>      — Interactive CCI report demo.
  <section#pricing>       — Free / Pro / CCI tiers.
  <section#faq>           — Objection handling.
  <section#cta-bottom>    — Final CTA + email capture.
  <footer>       — Legal links, privacy, contact.
</body>
```

### Accessibility

- All feature icons are `aria-hidden="true"` (decorative)
- Feature labels are plain text (not embedded in images)
- Block headings (`h3`) provide screen reader navigation landmarks
- Section uses `aria-labelledby` pointing to a visually hidden `h2`
- Color is never the sole indicator — labels carry all meaning
- Touch targets: minimum 44x44px on all interactive elements
- Focus states: visible outline on all focusable elements
- Reduced motion: respect `prefers-reduced-motion` — disable scroll animations

### Mobile Layout

```
MOBILE (< 640px):
┌─────────────────────┐
│  [Block Label]       │
│  ┌───────┐ ┌───────┐│
│  │ Icon  │ │ Icon  ││
│  │ Label │ │ Label ││
│  └───────┘ └───────┘│
│  ┌───────┐ ┌───────┐│
│  │ Icon  │ │ Icon  ││
│  │ Label │ │ Label ││
│  └───────┘ └───────┘│
└─────────────────────┘

2-column grid, 16px gap.
Each item: icon above label, centered.
Block label: left-aligned, uppercase, muted, small.

TABLET (640px–1024px):
3-column grid, 20px gap.

DESKTOP (> 1024px):
4-column grid, 24px gap.
Feature blocks can span full width with items flowing naturally.
```

### Grid System

```css
.feature-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, 1fr);
  list-style: none;
  padding: 0;
  margin: 0;
}

@media (min-width: 640px) {
  .feature-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}

@media (min-width: 1024px) {
  .feature-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
}
```

### Typography

```
Block labels:
  Font: Space Mono (or DM Sans uppercase)
  Size: 11px mobile / 12px desktop
  Weight: 500
  Letter-spacing: 0.12em
  Color: rgba(255, 255, 255, 0.35)
  Transform: uppercase

Feature labels:
  Font: DM Sans
  Size: 14px mobile / 15px desktop
  Weight: 500
  Color: rgba(255, 255, 255, 0.85)
  Line-height: 1.3

Feature icons:
  Size: 20px x 20px
  Stroke: 1.5px
  Color: rgba(8, 209, 224, 0.6) — muted cyan
  Style: Lucide or Phosphor (thin line, clinical feel)
```

### Spacing System

```
Base unit: 8px

Section padding:     80px top/bottom (mobile: 56px)
Block margin-bottom: 48px (mobile: 36px)
Block label margin:  0 0 16px 0
Grid gap:            16px mobile / 20px tablet / 24px desktop
Item padding:        16px (mobile: 12px)
Icon-to-label gap:   8px
```

---

## STEP 5: Risk Flags & Regulatory Guidance

### RISK FLAGS — Language to Avoid

| AVOID | WHY | USE INSTEAD |
|-------|-----|-------------|
| "Mental health" | Implies clinical scope. Triggers App Store medical review. | "Capacity" or "functional capacity" |
| "Diagnosis" | Medical claim. Regulatory violation. | "Pattern detection" or "signal" |
| "Treatment" | Implies therapeutic intervention. | "Awareness" or "insight" |
| "Medical device" | Triggers FDA classification questions. | "Capacity instrument" or "tracking platform" |
| "AI-powered" | Overused, triggers skepticism, may imply autonomous decision-making. | "Structured analysis" or "longitudinal computation" |
| "Burnout detection" | Implies diagnostic capability. | "Capacity trend monitoring" |
| "Clinical report" (unqualified) | Implies regulated clinical document. | "Clinical-grade capacity summary" with disclaimer |
| "Predict" (unqualified) | Implies certainty. Regulatory and liability risk. | "Forecast" or "projection" with confidence language |
| "HIPAA compliant" | Legal claim requiring certification. | "Privacy-first" or "designed with clinical governance in mind" |
| "Therapy" / "Therapist tool" | Positions as clinical intervention software. | "Provider-compatible" or "care-team ready" |
| "Cure" / "Fix" / "Heal" | Medical claims. | Never use. |
| "Neurodivergent" on landing page | Narrows market perception for institutional buyers. | Use in targeted campaigns, not on main landing page. |

### WHAT INCREASES INSTITUTIONAL TRUST

1. **Governance language over feature language.** Institutions don't buy features. They buy compliance, data handling, and risk reduction. "Privacy-first governance" and "zero data commercialization" are more powerful than any feature description for enterprise buyers.

2. **Absence of hype.** The single most trustworthy thing a landing page can do is NOT oversell. Calm, structured, factual language signals maturity. Every exclamation point, every "revolutionary," every "game-changing" reduces institutional trust.

3. **Specificity over abstraction.** "90-day longitudinal capacity summary" is more trustworthy than "powerful insights." Numbers, time horizons, and concrete outputs build credibility.

4. **Visible data governance.** Link to a real privacy policy. State data handling practices in plain language on the landing page itself. "Your data is stored encrypted, never sold, and deletable on request" — visible, not buried in legal.

5. **Professional typography and spacing.** Institutional buyers unconsciously evaluate software quality by visual design. Tight spacing, consistent type hierarchy, and restrained color usage signal engineering maturity. Cluttered layouts signal early-stage risk.

6. **No stock photography.** Product screenshots or abstract geometric visuals only. Stock photos of "diverse professionals smiling at laptops" destroy credibility with sophisticated buyers instantly.

7. **Loadable demo.** "Try before you commit" with a real interactive demo (the CCI report demo you built) is more persuasive than any copy. Let the product speak.

8. **Named contact.** "Questions? hello@orbitalhealth.app" or a founder name. Institutional buyers need to know there's a real person behind the product, not just a form.

### WHAT TO AVOID ON THE PAGE

- Animated backgrounds that distract from content
- Auto-playing video
- Pop-ups on first visit (exit-intent only)
- More than 2 CTA button styles
- More than 3 colors beyond black/white/gray
- Testimonials without attribution (title + domain minimum)
- Claims about efficacy, outcomes, or clinical impact without qualification
- The word "revolutionary"
- Comparison tables against competitors (invites scrutiny, looks insecure)
- Pricing that requires a "Contact Sales" gate for individual tiers (kills consumer conversion)

### APP STORE SPECIFIC

- Do NOT use "clinical" without "grade" qualifier → "clinical-grade" is a quality descriptor, not a regulated claim
- Do NOT reference specific diagnoses (ADHD, autism) in App Store description → use "cognitive capacity" and "neurodivergent-friendly" only in marketing channels
- DO include a disclaimer: "Orbital is not a medical device. It does not diagnose, treat, or prevent any condition."
- DO include a privacy policy URL in the App Store listing
- DO categorize under "Health & Fitness" → NOT "Medical"

---

## IMPLEMENTATION PRIORITY

For Monday (before Apollo emails):
1. Add the 20-item grid to the landing page in the 5-block structure
2. Ensure mobile 2-column grid works
3. Add price anchor ($349 → $199)
4. Add money-back guarantee badge next to buy button
5. Add OG social preview image

This week:
6. Sample CCI PDF download
7. Founder video placeholder
8. Exit-intent email capture
9. Sticky mobile buy button
10. GA4 event tracking on grid interactions
