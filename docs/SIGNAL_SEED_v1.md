# Signal Seed v1 — Per-User Atmospheric Reservoir Signature

**Module:** `lib/health/signalSeed.ts` + `lib/health/useSignalSeed.ts`
**Consumer:** `components/AtmosphericReservoir.tsx` (Phase 9, Block A)
**Status:** spec + implementation, additive only

## What it is

The Atmospheric Reservoir is the volumetric two-body shader that replaces the
old gauge / orb on the Field tab. To make every user's reservoir visibly
unique — without leaking any actual physiology onto the GPU — we hash a small
set of long-term physiological constants together with a per-device salt and
map the resulting bytes into eight shader uniforms:

| Uniform           | Type    | Range          | Source byte        |
|-------------------|---------|----------------|--------------------|
| `uSeed`           | `vec4`  | `0..1` × 4     | `bytes[0..3]/255`  |
| `uHueShift`       | `float` | `-10..+10` deg | `(bytes[4]/255)*20-10` |
| `uPattern`        | `int`   | `0..3`         | `bytes[5] % 4`     |
| `uPulseSeconds`   | `float` | `4..8` s       | `4 + (bytes[6]/255)*4` |
| `uRotationSpeed`  | `float` | `0.04..0.12`   | `0.04 + (bytes[7]/255)*0.08` |

Surface pattern values map to `0 = laminar`, `1 = turbulent`, `2 = banded`,
`3 = cellular`. The remaining 8 bytes of the SHA-256 digest are reserved for
future uniforms (e.g. cellular-noise warp, audio coupling).

## Why it's done this way

1. **Deterministic, no server round-trip.** The seed is a pure function of
   `(salt, bucketed physiology)`. Cold launches produce the same visual on
   the same device; no Supabase fetch is required to render the centerpiece.

2. **Privacy by construction.** The shader never sees the user's HR, HRV,
   or sleep numbers. It sees 8 floats / ints derived from a one-way SHA-256.
   Even if the seed leaked, the salt is in iOS Keychain
   (`kSecAttrAccessibleAfterFirstUnlock`) and the inputs are bucket-rounded,
   so reversal is computationally infeasible.

3. **Stable yet evolving.** Bucket rounding (HR ±1 bpm, HRV ±1 ms SDNN,
   bedtime ±15 min, sleep ±0.5 h, age in whole days) keeps the visual
   stable through normal day-to-day jitter. The seed only re-derives when
   long-term physiology drifts past a bucket boundary or when 24 h have
   elapsed.

4. **Per-device uniqueness.** Two users with identical physiology still get
   different reservoirs because the salt is generated per device (via
   `Crypto.getRandomBytes(16)`) on first use.

## Derivation pipeline

```
PhysiologicalSignature
  ├── restingHR        (bpm, ±1)
  ├── hrvBaseline      (ms SDNN, ±1)
  ├── bedtimeMins      (min from midnight, ±15)
  ├── sleepHours       (h, ±0.5)
  └── signalAgeDays    (days, ±1)
                │
                ▼   bucketSignature() — privacy + stability layer
        "bucketed fingerprint string"
                │
                ▼   `${salt}|${fp}`
        Crypto.digestStringAsync(SHA256, input) -> 64-char hex
                │
                ▼   parseFirstBytes(hex, 16)
        Uint8Array[16]                (we use [0..7])
                │
                ▼   bytesToSeed()
        SignalSeed
                │
                ▼   AsyncStorage write under `orbital.signalSeed.cache`
        cached for 24 h or until fingerprint changes
```

## Cache strategy

- **Salt cache:** persisted in `expo-secure-store` under
  `orbital.signalSalt`. Survives app restart, app reinstall (if device is
  restored from iCloud Keychain backup), and Supabase session sign-out. Only
  cleared by `resetSignalSalt()`, which is called on full account sign-out.
- **Seed cache:** persisted in AsyncStorage under
  `orbital.signalSeed.cache`. Schema:
  ```ts
  { fingerprint: string; derivedAt: number; seed: SignalSeed }
  ```
  Re-derive trigger:
  1. fingerprint mismatch (a bucket rolled over), or
  2. 24 h elapsed since `derivedAt`, whichever comes first.

The 24 h TTL re-derives once per day even if physiology is flat — this gives
the seed a slow drift via `signalAgeDays` so brand-new users see their
reservoir visibly evolve over the first week.

## Privacy properties

- **No raw physiology leaves the device into shader memory.** The shader
  receives 8 derived floats / ints, never the inputs.
- **No PII written to logs.** All console.warn paths log error categories,
  not values.
- **Salt is not synced to Supabase.** It lives only in Keychain. Two
  installations of the same account on two devices will see two different
  reservoirs by design — they are device-local visual identities, not
  cross-device account identities.
- **Bucket rounding bounds the input entropy** to roughly:
  HR (40..120, step 1) × HRV (10..120, step 1) × bedtime (96 buckets) ×
  sleep (16 buckets) × ageDays (unbounded but starts at 0). The salt
  dominates entropy on a per-device basis, so the seed is unique across
  users with overwhelming probability.

## Family-resemblance side-effect (Circles)

Members of the same Circle who share life context — e.g. a household whose
sleep schedules have synchronized — will see their bucketed physiology
converge over time. Because the salt is per-device, their reservoirs do
**not** become identical, but they will trend toward visually similar hue
shifts and surface patterns. Different bytes 0..3 (the noise offsets) keep
the bodies themselves unique while the macro identity (palette + cadence)
rhymes. We treat this as a feature, not a leak: it is not derivable in the
reverse direction (you cannot identify circle members from seeds), but it
gives the Circles UI an emergent sense of belonging without ever exchanging
biometric numbers.

## Bucket strategy rationale

| Input          | Step  | Why                                                      |
|----------------|-------|----------------------------------------------------------|
| `restingHR`    | 1 bpm | RHR drifts ±2–3 bpm day-over-day; 1 bpm step is the noise floor.   |
| `hrvBaseline`  | 1 ms  | SDNN day-to-day SD is ~5–10 ms; 1 ms step is well below the noise floor. |
| `bedtimeMins`  | 15 m  | Sleep schedule shifts in 15-min increments are perceptually meaningful; smaller is jitter. |
| `sleepHours`   | 0.5 h | Hour-precision is coarse; half-hour matches HealthKit's sleep session granularity. |
| `signalAgeDays`| 1 d   | Whole days; gives the visual a slow drift over the first week of use. |

## Fallback path

`deriveStarterSeed()` returns a deterministic, calm signature
(laminar surface, no hue shift, mid-range pulse and rotation, even noise
offsets). It is what brand-new users see while their physiology data is
still empty, and what every user falls back to on any error in the
derivation pipeline. The starter seed is intentionally close to the center
of the parameter space so that as physiology fills in, the reservoir
evolves outward rather than starting from a jarring random visual.

## API surface

```ts
// lib/health/signalSeed.ts
export interface SignalSeed { /* see header */ }
export interface PhysiologicalSignature { /* see header */ }

export function deriveSignalSeed(sig: PhysiologicalSignature): Promise<SignalSeed>;
export function deriveStarterSeed(): Promise<SignalSeed>;
export function resetSignalSalt(): Promise<void>;
```

```ts
// lib/health/useSignalSeed.ts
export function useSignalSeed(): {
  seed: SignalSeed;
  loading: boolean;
  refresh: () => Promise<void>;
};
```

## Sign-out semantics

- **Session sign-out** (Supabase token expired or user tapped "Sign out"
  from a multi-account context): `resetSignalSalt()` is **not** called.
  The user's reservoir signature is preserved across the session boundary
  so the next sign-in feels like coming home.
- **Full sign-out** (user taps "Delete account" or "Sign out and erase"):
  call `resetSignalSalt()` to regenerate the salt and clear the seed cache.
  The next sign-in shows a different reservoir signature.

## Backup behavior

iOS Keychain entries written via `expo-secure-store` default to the
`kSecAttrAccessibleAfterFirstUnlock` accessibility class. Per Apple's
documentation, items at this class are **included in iCloud Keychain
backups** when the user has iCloud Keychain enabled and **excluded** from
unencrypted iTunes/Finder backups. The practical consequence:

- Restore-from-backup onto a new device → salt survives → reservoir
  signature is identical to the previous device.
- Migrate-without-backup or uninstall+reinstall on the same device →
  fresh salt → new reservoir signature.

This matches the user's intuition that "my account looks the same when I
restore my phone" without leaking the salt to plaintext system backups.

## Tests / dev hooks

`lib/health/signalSeed.ts` exports an `_internals` object with the pure
helpers (`bucketSignature`, `fingerprint`, `parseFirstBytes`, `bytesToSeed`,
`STARTER_SEED`) so unit tests can validate determinism without standing up
the SecureStore / AsyncStorage shims.
