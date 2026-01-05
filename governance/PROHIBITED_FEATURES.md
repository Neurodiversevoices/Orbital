# WHAT WE WILL NEVER BUILD

**Status**: FROZEN
**Effective**: Permanent
**Classification**: Infrastructure Law

---

## I. PURPOSE

This document is a binding list of features, capabilities, and directions that Orbital will **never** implement, regardless of:

- User requests
- Business pressure
- Competitive positioning
- Partnership requirements
- Revenue opportunities
- Technical feasibility

These prohibitions exist because implementing them would violate Orbital's core purpose as capacity infrastructure.

---

## II. THE LIST

### Category A: Surveillance Features

| Feature | Why Prohibited |
|---------|---------------|
| Location tracking | Enables surveillance, not capacity understanding |
| Passive data collection | Removes consent from signal act |
| Activity monitoring | Confuses activity with capacity |
| Screen time tracking | Surveillance disguised as wellness |
| Biometric integration | Creates medical device risk, enables passive monitoring |
| Device usage patterns | Surveillance, not self-report |
| Background app activity | Passive data collection |
| Geofencing/location triggers | Context inference without consent |
| Camera/microphone access | Never needed, creates risk |
| Contact list access | Social inference, privacy violation |

### Category B: Social/Engagement Features

| Feature | Why Prohibited |
|---------|---------------|
| Social feed | Transforms utility into social product |
| Comments on signals | Adds noise, enables judgment |
| Likes/reactions | Gamifies capacity, creates pressure |
| Leaderboards | Competition inappropriate for capacity |
| Achievements/badges | Gamification of self-report |
| Streaks | Creates guilt, not awareness |
| Push notification campaigns | Engagement optimization, not utility |
| "Friends" or followers | Network effects inappropriate here |
| Public profiles | Capacity is private |
| Viral sharing mechanics | Growth hacking incompatible with purpose |

### Category C: Recommendation/Advice Features

| Feature | Why Prohibited |
|---------|---------------|
| Personalized recommendations | Creates advice liability |
| "You should..." prompts | Medical/therapeutic advice risk |
| Suggested actions | Prescriptive, not descriptive |
| AI-generated insights | Black box advice, liability risk |
| Chatbot for support | Creates therapeutic relationship |
| Crisis intervention prompts | Medical device territory |
| Wellness tips | Generic advice dilutes signal focus |
| Content recommendations | Transforms utility into content platform |
| Mood improvement suggestions | Therapeutic advice risk |
| Meditation/breathing exercises | Scope creep into wellness app |

### Category D: Scoring/Quantification Features

| Feature | Why Prohibited |
|---------|---------------|
| Numeric capacity scores | False precision, enables comparison |
| Wellness score | Quantifies the unquantifiable |
| Daily/weekly grades | Judgment frame inappropriate |
| Progress percentages | Implies "improvement" trajectory |
| Comparison to others | Capacity is individual |
| Comparison to "average" | Creates norm pressure |
| Ranking systems | Competition inappropriate |
| Performance metrics | Employment surveillance risk |
| Productivity correlation | Conflates capacity with output |
| "Health score" | Medical claim territory |

### Category E: Aggregation/Dashboard Features

| Feature | Why Prohibited |
|---------|---------------|
| Team dashboards | Enables management surveillance |
| Manager views | Hierarchy incompatible with safety |
| Organization analytics | Institutional surveillance |
| Cohort comparisons | Creates judgment frame |
| "Team health" scores | Aggregate surveillance |
| Admin override access | Violates consent model |
| HR integration | Employment decision risk |
| Performance review integration | Surveillance use |
| Attendance correlation | Surveillance disguised as wellness |
| Aggregate trend reports | Only permitted de-identified, for research |

### Category F: History/Archive Features

| Feature | Why Prohibited |
|---------|---------------|
| Detailed timeline | Enables pattern surveillance |
| Calendar view of signals | Too much history visibility |
| "On this day" memories | Nostalgia inappropriate here |
| Historical comparisons | Judgment of past self |
| Trend arrows longer than 14 days | Creates deterministic frame |
| Lifetime statistics | Longitudinal surveillance |
| Export to social media | Signal is private |
| Shareable history reports | History should not be shareable |
| Year-in-review | Transforms utility into content |

### Category G: Integration/API Features

| Feature | Why Prohibited |
|---------|---------------|
| Public API for signal access | Third-party surveillance risk |
| Calendar integration (read) | Context inference |
| Email/message integration | Content surveillance |
| Wearable data import | Passive data contradicts active signal |
| Health app integration | Medical device risk |
| Employer system integration | Employment surveillance |
| Insurance data sharing (individual) | Discrimination risk |
| Social media posting | Capacity is private |
| Smart home integration | Environment surveillance |
| AI assistant integration | Context leakage |

### Category H: Monetization Features

| Feature | Why Prohibited |
|---------|---------------|
| Advertising | Attention extraction incompatible |
| Data selling (individual) | Privacy violation |
| Premium "insights" | Creates two-tier utility |
| Pay-to-unlock history | Monetizes privacy |
| Sponsored content | Ad-supported model inappropriate |
| Affiliate wellness products | Conflicts with non-advice posture |
| "Premium" social features | Gamification through monetization |
| Crypto/token integration | Speculation inappropriate |
| NFT anything | No |

### Category I: Explanation/Interpretation Features

| Feature | Why Prohibited |
|---------|---------------|
| "Why are you feeling this way?" | Forces interpretation |
| Cause attribution | Creates causal claims |
| AI explanation of patterns | Black box interpretation |
| Suggested reasons for state | Leads user interpretation |
| Diagnostic language | Medical device risk |
| Symptom tracking | Medical device territory |
| Condition correlation | Diagnostic inference |
| Treatment tracking | Medical advice risk |
| Medication reminders | Medical device function |

---

## III. BOUNDARY CASES

### Permitted with Constraints

| Feature | Constraint | Rationale |
|---------|------------|-----------|
| Pattern visibility | Only after 7+ signals | Earned through use |
| Circle signal sharing | Color only, no history | Minimum viable signal |
| Export | Own data only, on request | Data portability right |
| Aggregate research | De-identified, consented | Claim validation |
| Institutional pilots | No individual visibility | Aggregate only |

### Gray Areas (Default: No)

| Feature | Current Decision | Review Trigger |
|---------|------------------|----------------|
| Apple Health export (write) | No | If user demand exceeds threshold |
| Widget showing current state | No | If silent onboarding validates |
| Watch complication | No | If core app achieves irreversibility |
| Shortcuts/automation | No | If power users demonstrate need |

---

## IV. ENFORCEMENT

### Code-Level Blocks

Where possible, prohibited features are blocked architecturally:

```typescript
// lib/circles/invariants.ts
// Throws if aggregation attempted

// lib/vault/types.ts
// No diagnosis fields in schema

// lib/storage.ts
// No external API exposure
```

### Review Requirements

Any feature touching prohibited areas requires:

1. Written justification
2. Board-level approval
3. External ethics review
4. User notification plan
5. 90-day implementation window

### Violation Response

If a prohibited feature is discovered in codebase:

1. Immediate removal (within 24 hours)
2. Incident report
3. Root cause analysis
4. Process improvement

---

## V. PERMANENCE

This list is **frozen and append-only**.

- Items cannot be removed
- Items can only be added
- Additions require same governance as removal would

The list grows more restrictive over time, never less.

---

## VI. THE UNDERLYING PRINCIPLE

Every item on this list fails one or more of these tests:

1. **Does it respect consent?** (Passive collection fails)
2. **Does it preserve privacy?** (Surveillance fails)
3. **Does it maintain non-diagnostic posture?** (Medical features fail)
4. **Does it serve capacity understanding?** (Engagement features fail)
5. **Does it avoid judgment?** (Scoring fails)
6. **Does it prevent institutional capture?** (Dashboards fail)

If a proposed feature fails ANY test, it belongs on this list.

---

**Document Owner**: Infrastructure
**Last Frozen**: 2026-01-04
**Review Cycle**: Append-only additions permitted
