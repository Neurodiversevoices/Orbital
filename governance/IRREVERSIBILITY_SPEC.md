# IRREVERSIBILITY SPECIFICATION

**Status**: FROZEN
**Effective**: Permanent
**Classification**: Infrastructure Law

---

## I. DEFINITION

Orbital becomes **irreversible** when uninstalling it causes irrecoverable loss that the user perceives and cannot recreate elsewhere.

This is not about data lock-in. It is about **cognitive lock-in** — the system becomes part of how the user understands themselves.

---

## II. THE THREE IRREVERSIBILITY TRIGGERS

Orbital reaches irreversibility when ALL THREE conditions exist:

### Trigger 1: Longitudinal Memory Exists

**Condition**: User has ≥30 capacity signals spanning ≥14 unique days.

**What is created**:
- Pattern visibility (7-day, 14-day, 30-day views unlock progressively)
- Personal baseline emerges from data
- Capacity trajectory becomes visible
- "Normal" becomes defined by historical data

**What is lost on uninstall**:
- All pattern history
- Personal baseline calibration
- Trajectory continuity
- The ability to answer "Is this week normal for me?"

**Where enforced**: `lib/storage.ts` — logs stored in `orbital:logs` namespace

### Trigger 2: Circle Relationship Exists

**Condition**: User has ≥1 active Circle connection (bidirectional consent established).

**What is created**:
- Shared signaling language with another person
- Implicit availability contract ("I'll update my state; you'll check it")
- Reduced friction in relationship ("I don't need to explain, they can see")

**What is lost on uninstall**:
- The shared language disappears
- The other person loses visibility
- Relationship reverts to explicit communication
- Trust built through signal history is reset

**Where enforced**: `lib/circles/storage.ts` — connections stored in `circles:connection:*`

### Trigger 3: Orb Becomes Interpretive Reference

**Condition**: User has logged capacity ≥3 times in one week for ≥4 consecutive weeks.

**What is created**:
- The Orb becomes "how I think about my state"
- Internal dialogue shifts to Orb language ("I'm amber today")
- Self-assessment becomes tied to Orb interaction

**What is lost on uninstall**:
- The interpretive frame disappears
- User loses vocabulary for internal state
- Self-assessment becomes harder, not easier

**Where enforced**: `lib/hooks/useTutorial.ts` — `markFirstSignalLogged()` tracks engagement

---

## III. SYSTEM DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ORBITAL IRREVERSIBILITY                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
│  │  TRIGGER 1      │   │  TRIGGER 2      │   │  TRIGGER 3      │       │
│  │  Longitudinal   │   │  Circle         │   │  Interpretive   │       │
│  │  Memory         │   │  Relationship   │   │  Reference      │       │
│  │                 │   │                 │   │                 │       │
│  │  ≥30 signals    │   │  ≥1 active      │   │  ≥3 logs/week   │       │
│  │  ≥14 unique days│   │  connection     │   │  for 4 weeks    │       │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘       │
│           │                     │                     │                 │
│           ▼                     ▼                     ▼                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    IRREVERSIBILITY STATE                        │   │
│  │                                                                 │   │
│  │  When ALL THREE triggers are active, Orbital becomes:           │   │
│  │  - Part of self-understanding (cognitive)                       │   │
│  │  - Part of relationship infrastructure (social)                 │   │
│  │  - Source of pattern truth (historical)                         │   │
│  │                                                                 │   │
│  │  Uninstall at this point causes PERCEIVED LOSS.                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## IV. WHAT CANNOT BE RECREATED ELSEWHERE

### 1. Longitudinal Continuity

| Lost | Why Irrecoverable |
|------|-------------------|
| 30+ days of capacity history | Cannot be reconstructed from memory |
| Pattern baselines | Emerge from data, not recollection |
| Trajectory shape | Requires continuous measurement |
| Unlock progress (7d → 14d → 30d → 90d → 1y) | Time-bound accumulation |

**Alternative apps cannot help**: They start from zero. There is no "import history" because the history is the product.

### 2. Shared Signaling Language

| Lost | Why Irrecoverable |
|------|-------------------|
| Circle connections | Other party must also use Orbital |
| Implicit availability contracts | Built through consistent use |
| Reduced explanation burden | Trust accumulated over time |

**Alternative apps cannot help**: Even if both parties switch, the trust history resets. The "they know what amber means" is gone.

### 3. Interpretive Frame

| Lost | Why Irrecoverable |
|------|-------------------|
| Orb as self-reference | Cognitive habit, not data |
| Capacity vocabulary | Internal language shift |
| Daily reflection anchor | Behavioral pattern |

**Alternative apps cannot help**: The mental model is Orbital-specific. Other apps have different metaphors, different colors, different interaction patterns.

---

## V. THE UNINSTALL PAIN MATRIX

When a user considers uninstalling after reaching irreversibility:

| They Think | They Realize |
|------------|--------------|
| "I'll just remember my patterns" | Memory is unreliable; the patterns were in the data |
| "I'll tell my partner directly" | That's more friction; Circles was the point |
| "I'll use another app" | Starting over loses everything accumulated |
| "I don't need this anymore" | The need resurfaces; the tool is gone |

This is not artificial lock-in. This is **natural consequence of longitudinal utility**.

---

## VI. MEASUREMENT

### Irreversibility Score (Internal Only)

```typescript
interface IrreversibilityMetrics {
  // Trigger 1: Longitudinal Memory
  totalSignals: number;           // Target: ≥30
  uniqueDaysLogged: number;       // Target: ≥14

  // Trigger 2: Circle Relationship
  activeCircleConnections: number; // Target: ≥1

  // Trigger 3: Interpretive Reference
  weeksWithMinimumLogs: number;   // Target: ≥4 (weeks with ≥3 logs)

  // Composite
  triggersActive: number;         // 0-3
  isIrreversible: boolean;        // true when triggersActive === 3
}
```

### We Track (Internally)

- Percentage of users reaching each trigger
- Time to irreversibility
- Correlation between irreversibility and retention

### We Do NOT

- Show users their "irreversibility score"
- Gamify progress toward irreversibility
- Notify users when they reach triggers
- Use irreversibility as a marketing claim

---

## VII. "NOTICED WHEN MISSING"

The ultimate test of irreversibility:

> If a user uninstalls Orbital after reaching irreversibility, they will notice the absence within 7 days.

**What they notice**:
1. "I don't know if this week is normal" (lost longitudinal context)
2. "My partner doesn't know I'm struggling" (lost Circle signal)
3. "I used to know how to describe this feeling" (lost interpretive frame)

**What they cannot do**:
1. Recreate the pattern history
2. Instantly rebuild the Circle trust
3. Import the mental model to another system

---

## VIII. ETHICAL BOUNDARIES

### What We Build

- Utility that becomes essential through genuine value
- Lock-in through accumulated meaning, not artificial barriers
- Irreversibility as a consequence of longitudinal truth

### What We Do NOT Build

- Export friction (data is always exportable)
- Account deletion obstacles (instant and complete)
- Dark patterns around uninstall
- Guilt messaging on churn
- Re-engagement campaigns targeting churned users

If a user leaves, they leave. The irreversibility is in what they lose, not in obstacles we create.

---

## IX. CODE LOCATIONS

| Trigger | Primary Code | Storage Keys |
|---------|--------------|--------------|
| Longitudinal Memory | `lib/storage.ts` | `orbital:logs` |
| Circle Relationship | `lib/circles/storage.ts` | `circles:connection:*` |
| Interpretive Reference | `lib/hooks/useTutorial.ts` | `orbital:firstSignalLogged:v1` |

---

## X. PERMANENCE

This specification is **frozen**. The irreversibility triggers are fundamental to Orbital's utility proposition.

Reducing these triggers would weaken the product. Increasing them would be artificial lock-in.

The balance is: **genuine value creates natural irreversibility**.

---

**Document Owner**: Infrastructure
**Last Frozen**: 2026-01-04
**Review Cycle**: Never (frozen)
