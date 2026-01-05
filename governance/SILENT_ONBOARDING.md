# SILENT ONBOARDING SPECIFICATION

**Status**: FROZEN
**Effective**: Permanent
**Classification**: Infrastructure Law

---

## I. PRINCIPLE

**If a user is confused, that is acceptable. If a user is instructed, the system has failed.**

Orbital does not explain itself. The Orb is self-evident or it is nothing.

---

## II. THE FLOW

### First Launch Sequence

```
1. App opens
2. Orb appears (centered, breathing animation)
3. Three capacity buttons visible below Orb
4. User taps a button
5. Orb responds (color change, haptic)
6. Done.
```

That's the entire onboarding.

### What Does NOT Happen

- No splash screen with logo
- No "Welcome to Orbital"
- No tutorial
- No tooltips
- No coach marks
- No "tap here to start"
- No progress indicators
- No "next" buttons
- No explanatory text
- No feature highlights
- No permission requests (deferred)
- No account creation (deferred)
- No terms acceptance (deferred until necessary)

---

## III. SCREEN STATES

### State 1: Virgin Launch

```
┌─────────────────────────────┐
│                             │
│                             │
│            ◉                │  ← Orb (neutral gray, breathing)
│                             │
│                             │
│   [  ●  ]  [  ●  ]  [  ●  ] │  ← Three buttons (cyan, amber, red)
│                             │
└─────────────────────────────┘
```

No text. No labels. Colors are self-explanatory.

### State 2: After First Tap

```
┌─────────────────────────────┐
│                             │
│                             │
│            ◉                │  ← Orb (now shows selected color)
│                             │
│                             │
│   [  ●  ]  [  ●  ]  [  ●  ] │  ← Buttons (selected one highlighted)
│                             │
└─────────────────────────────┘
```

Haptic feedback. Color transition. Nothing else.

### State 3: Subsequent Launches

Identical to State 2. The Orb shows last-set state. User can change it.

---

## IV. DEFERRED ELEMENTS

These exist but appear **only when necessary**:

| Element | Trigger |
|---------|---------|
| Terms acceptance | First data sync or Circle invite |
| Account creation | First backup or Circle invite |
| Permissions (notifications) | First Circle connection |
| Settings access | User explicitly navigates |
| Patterns view | 7 logs accumulated |
| Export functionality | User explicitly navigates |

Nothing is surfaced proactively.

---

## V. RATIONALE

### Why No Instructions?

1. **Selection Effect**: Users who need instructions are not the target users
2. **Trust Signal**: A product confident enough to not explain itself signals competence
3. **Cognitive Load**: Instructions add burden; silence adds space
4. **Discovery**: Self-discovered understanding creates ownership
5. **Filtering**: Confusion is acceptable friction that selects for fit

### Why This Works for Orbital

The Orb is a **mirror**, not a tool. You don't need instructions to look in a mirror.

The three colors map to universal human states:
- Green/Cyan = Good, resourced, available
- Yellow/Amber = Caution, stretched, limited
- Red = Stop, depleted, unavailable

This is traffic light logic. Humans don't need to be taught traffic lights.

---

## VI. WHAT WE ACCEPT

- Users who open the app and close it without understanding
- Users who never return
- Low "activation" rates by conventional metrics
- Support tickets asking "what does this do?"
- App store reviews complaining about lack of guidance

These are features, not bugs. They indicate the selection mechanism is working.

---

## VII. WHAT WE REJECT

Any request to add:

- Onboarding flows
- Feature tours
- Tooltips
- "Did you know?" prompts
- Usage tips
- Getting started guides
- Video tutorials
- In-app help
- Contextual hints
- Progress celebrations
- Achievement unlocks
- "You're doing great!" messages

These violate the core premise: **the Orb is self-evident or it is nothing**.

---

## VIII. IMPLEMENTATION REQUIREMENTS

### Code Constraints

```typescript
// FORBIDDEN in onboarding context:
// - Any <Text> component with instructional content
// - Any Modal or overlay explaining functionality
// - Any animation pointing to UI elements
// - Any "skip" or "next" buttons
// - Any progress indicators
// - Any conditional welcome messages
```

### First Launch Detection

```typescript
// Storage key for virgin state
const FIRST_LAUNCH_KEY = 'orbital:first_launch_complete';

// Set after first capacity selection, not on app open
// This ensures the Orb is used, not just seen
```

### Haptic Feedback

First tap MUST include haptic feedback. This is the only "response" the system gives to confirm the interaction worked. No text, no toast, no animation beyond the Orb color change.

---

## IX. METRICS WE TRACK

| Metric | Purpose |
|--------|---------|
| Time to first tap | Understanding threshold |
| Return rate after first tap | Comprehension signal |
| Return rate after close-without-tap | Selection filter working |

We do NOT track:
- "Onboarding completion rate" (there is no onboarding)
- "Feature discovery rate" (we don't guide discovery)
- "Tutorial engagement" (there is no tutorial)

---

## X. PERMANENCE

This specification is **frozen**. Adding instructional elements requires:

1. Evidence that the product premise is wrong
2. Board-level approval
3. External review of whether we're building the wrong product

If users need to be taught, we've built the wrong thing.

---

**Document Owner**: Infrastructure
**Last Frozen**: 2026-01-04
**Review Cycle**: Never (frozen)
