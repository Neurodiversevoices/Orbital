# FIRST ARTIFACT SPECIFICATION

**Classification:** INTERNAL
**Version:** 1.0.0
**Effective Date:** 2025-01-01
**Status:** LOCKED - NO AMENDMENTS WITHOUT BOARD APPROVAL

---

## 1. CANONICAL FIRST ARTIFACT

### 1.1 Definition

The canonical first artifact delivered by Orbital is the **90-Day Longitudinal Capacity Summary**.

This specification is LOCKED. The first artifact cannot be changed to:
- Daily insights
- Weekly summaries
- Real-time dashboards
- Any artifact requiring less than 90 signals

### 1.2 Rationale for Selection

| Criterion | Justification |
|-----------|---------------|
| Longitudinal threshold | 90 days establishes meaningful baseline |
| Non-trivial value | Distinguishes from daily "insight" apps |
| Institutional relevance | Quarterly cadence aligns with organizational cycles |
| Patience signal | Demonstrates Orbital's long-term value proposition |
| Anti-engagement | Prevents daily checking behavior |

---

## 2. GENERATION CONDITIONS

### 2.1 Trigger Criteria

The 90-Day Summary becomes available when:

| Condition | Requirement |
|-----------|-------------|
| Signal count | >= 90 signals recorded |
| Time span | Signals span >= 75 calendar days |
| Coverage | >= 50% of days have at least one signal |

All three conditions must be met.

### 2.2 Generation Timing

| Trigger Type | Behavior |
|--------------|----------|
| Automatic | Not generated automatically |
| User-initiated | Available in Settings > Export when eligible |
| Scheduled | Optional: Generate on 90th day anniversary (silent) |

### 2.3 Regeneration Policy

| Scenario | Behavior |
|----------|----------|
| New signals added | User may regenerate with updated data |
| Data deletion | Artifact regenerates excluding deleted signals |
| Time passage | Quarterly regeneration available (Q2, Q3, Q4 summaries) |

---

## 3. ARTIFACT CONTENTS

### 3.1 Document Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     ORBITAL                                 │
│           90-Day Capacity Summary                           │
│                                                             │
│  Generated: [Date]                                          │
│  Period: [Start Date] - [End Date]                          │
│  Document ID: [UUID]                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SUMMARY                                                    │
│  ─────────                                                  │
│  Total Signals: [N]                                         │
│  Coverage: [X]% of days                                     │
│  Average Capacity: [Y]%                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CAPACITY DISTRIBUTION                                      │
│  ─────────────────────                                      │
│  High Capacity (Resourced):    [A]% ([N1] signals)          │
│  Stable Capacity (Stretched):  [B]% ([N2] signals)          │
│  Low Capacity (Depleted):      [C]% ([N3] signals)          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  90-DAY VISUALIZATION                                       │
│  ─────────────────────                                      │
│  [Capacity graph - 90-day timeline]                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OBSERVED PATTERNS                                          │
│  ─────────────────                                          │
│  • [Pattern 1 - day of week, if significant]                │
│  • [Pattern 2 - time of day, if significant]                │
│  • [Pattern 3 - category correlation, if significant]       │
│                                                             │
│  Note: Patterns are observational. This document            │
│  contains no diagnostic information.                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MONTHLY BREAKDOWN                                          │
│  ─────────────────                                          │
│  Month 1: [X]% average ([N] signals)                        │
│  Month 2: [Y]% average ([N] signals)                        │
│  Month 3: [Z]% average ([N] signals)                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DATA GOVERNANCE                                            │
│  ───────────────                                            │
│  This summary is generated from self-reported capacity      │
│  signals. It contains no diagnostic, clinical, or           │
│  medical information. The data remains under your           │
│  control and is not shared without your explicit consent.   │
│                                                             │
│  Verification Hash: [SHA-256]                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [QR Code - links to verification endpoint]                 │
│                                                             │
│  orbitalhealth.app/verify/[document-id]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Content Specifications

| Section | Required | Content Rules |
|---------|----------|---------------|
| Header | Yes | Brand, title, dates, document ID |
| Summary | Yes | Signal count, coverage, average only |
| Distribution | Yes | Three-state breakdown with counts |
| Visualization | Yes | 90-day graph, no annotations |
| Patterns | Conditional | Only if statistically significant (p < 0.05) |
| Monthly Breakdown | Yes | Per-month averages |
| Governance | Yes | Standard non-diagnostic disclaimer |
| Verification | Yes | Hash + QR code for authenticity |

### 3.3 Visual Design

| Element | Specification |
|---------|---------------|
| Format | PDF, single-page preferred (max 2 pages) |
| Color scheme | Orbital brand colors (dark, calm) |
| Typography | Clean, readable, accessibility-compliant |
| Graph style | Minimal, no decorative elements |
| Density | Executive-grade (scannable in 30 seconds) |

---

## 4. SHARING BEHAVIOR

### 4.1 Sharing Model

| Property | Specification |
|----------|---------------|
| Default state | Private (user-only) |
| Sharing method | Generate read-only link |
| Access control | Link + optional PIN |
| Scope | Full document or redacted version |

### 4.2 Expiration Rules

| Share Type | Default Expiration | Maximum Expiration |
|------------|-------------------|-------------------|
| Personal export | No expiration | N/A |
| Shared link | 14 days | 90 days |
| Institutional share | 30 days | 1 year |

### 4.3 Read-Only Enforcement

Shared artifacts are:
- View-only (no download unless explicitly permitted)
- Watermarked with recipient identifier
- Logged in audit trail
- Revocable by user at any time

---

## 5. EXCLUSIONS

### 5.1 What the First Artifact Does NOT Include

| Excluded Element | Rationale |
|------------------|-----------|
| Daily insights | Encourages daily checking |
| Recommendations | Orbital does not prescribe |
| Comparisons to norms | No population comparison |
| Predictions | No forward-looking claims |
| Diagnostic language | Non-diagnostic doctrine |
| Raw signal data | Summary only; raw data via separate export |
| Notes content | Privacy; notes not included in summary |

### 5.2 Artifacts That Are NOT First

The following artifact types are explicitly subordinate to the 90-Day Summary:

| Artifact | Status | Available At |
|----------|--------|--------------|
| Weekly summary | Not implemented | Never |
| Daily insight | Not implemented | Never |
| 30-day summary | Secondary | 30 signals (optional) |
| Annual summary | Secondary | 365 signals |
| Lifetime export | Secondary | Any time |

---

## 6. IMPLEMENTATION

### 6.1 Generation Pipeline

```
User requests artifact
        │
        ▼
┌───────────────────┐
│ Validate eligibility │
│ (90 signals, 75 days, │
│  50% coverage)        │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Compute statistics │
│ - Distribution     │
│ - Patterns         │
│ - Monthly breakdown│
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Generate PDF      │
│ - Render template │
│ - Embed graph     │
│ - Add verification│
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Store artifact    │
│ - Immutable storage│
│ - Hash generation │
│ - Audit log entry │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Return to user    │
│ - Download option │
│ - Share option    │
└───────────────────┘
```

### 6.2 Technical Requirements

| Requirement | Specification |
|-------------|---------------|
| PDF generation | Server-side, deterministic |
| Hash algorithm | SHA-256 |
| Storage | Immutable object storage |
| Retention | User-controlled (default: permanent) |
| Verification | Public endpoint for hash validation |

---

## 7. RATIONALE DOCUMENTATION

### 7.1 Why 90 Days First

1. **Prevents daily engagement patterns:** Users cannot check Orbital daily for "insights"
2. **Establishes value proposition:** Longitudinal data requires longitudinal time
3. **Aligns with institutions:** Quarterly reporting is standard organizational cadence
4. **Differentiates from competitors:** Wellness apps deliver instant gratification; Orbital delivers patience
5. **Supports acquisition narrative:** "90 days of governed capacity data" is a meaningful unit

### 7.2 Why NOT Daily/Weekly First

| Alternative | Rejection Reason |
|-------------|------------------|
| Daily insight | Creates checking habit; contradicts calm philosophy |
| Weekly summary | Insufficient longitudinal value; premature patterns |
| Real-time dashboard | Engagement-driven; not longitudinal |
| 30-day summary | Acceptable but not first; 90 days more meaningful |

---

## 8. AMENDMENT RESTRICTIONS

This specification is LOCKED. Changes require:

1. Board resolution (unanimous)
2. Legal opinion on product positioning impact
3. User notification (60-day advance)
4. Revision to investor materials
5. Update to institutional agreements

The "first artifact" is a core product identity element and cannot be changed for convenience, competitive pressure, or user requests.

---

*End of Document*
