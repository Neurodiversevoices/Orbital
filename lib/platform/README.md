# Orbital Platform Overlay

Additive scaffolding for Orbital's "Human-Capacity Intelligence Platform"
architecture. **Nothing in this directory replaces existing code.** It
layers ON TOP of the current app.

## Architecture (3 layers)

1. **Trustworthy Core** — auth · audit · posture · tenancy isolation. Every
   action is observable, every grant revocable. Memory is off by default.
2. **Capability Engine** — capacity logging, baselines, signals, pattern
   detection. (This is the existing Orbital app — `lib/sentinel`,
   `lib/cci`, `lib/supabase/sync.ts`, etc.)
3. **Segment Packs** — six distinct postures sharing the same engine:
   Personal · Workspace · Enterprise · Health · Edu · Gov.

## Files

| File | Purpose | State |
|------|---------|-------|
| `types.ts` | All overlay types — `SubBrand`, `TrustPosture`, `MemoryRecord`, `PermissionGrant`, `AuditEvent` | DONE |
| `subBrandConfig.ts` | The 6 sub-brand configs as exported constants | DONE |
| `SubBrandProvider.tsx` | React context + AsyncStorage persistence (`orbital.subBrand`) | DONE |
| `trustCore.ts` | `useTrustPosture`, `recordAuditEvent`, `requestPermissionGrant`, `revokeGrant` | SKELETON (TODOs) |
| `memory.ts` | `useMemory`, `editMemory`, `deleteMemory`, `clearScope`, `setTemporaryChat` | SKELETON (TODOs) |

## Routes

All under `app/(platform)/` — a NEW route group, isolated from the
existing tabs.

| Route | Purpose |
|-------|---------|
| `index.tsx` | Cinematic 3-layer landing with orb proxy + "Pick your tier" CTA |
| `memory.tsx` | 4-section memory dashboard (Ephemeral · Workspace · Profile · Implicit) |
| `permissions.tsx` | Active grants ledger with revoke action |
| `audit.tsx` | Reverse-chrono audit log with actor/action filters |
| `sub-brand.tsx` | 6-card sub-brand picker (persists choice) |

## Sub-brand postures

| Brand | Memory | Audit | Compliance | Tenant | Accent |
|-------|--------|-------|------------|--------|--------|
| Personal | off | off | none | no | `#2DD4BF` |
| Workspace | off | on | none | yes | `#06B6D4` |
| Enterprise | off | on | SOC 2 | yes | `#06B6D4` |
| Health | off | on | HIPAA | yes | `#2DD4BF` |
| Edu | off | on | FERPA | yes | `#F59E0B` |
| Gov | off | on | FedRAMP | yes | `#DC2626` |

Memory default is **off** for every tier — opt-in only.

## What's done vs TODO

### Done
- Types compile under strict mode (`npx tsc --noEmit`).
- Sub-brand context persists across cold launches via AsyncStorage.
- All 5 platform screens render with full a11y (roles + labels) and
  4.5:1 contrast on `#01020A`.
- Glass-card pattern, capacity-spectrum accents, no orange.
- Sticky sub-brand chip in the platform header.

### TODO (backend wire-up)
- `trustCore.recordAuditEvent` → flush to `audit_events` table; persist
  the local queue to AsyncStorage; respect `posture.auditLogging`.
- `trustCore.requestPermissionGrant` / `revokeGrant` → consent sheet UI
  + new `permission_grants` Supabase table (not yet created).
- `memory.useMemory` → real Supabase reads, scoped + tenant-isolated.
- `memory.editMemory` / `deleteMemory` / `clearScope` → real writes,
  with paired audit events.
- `memory.setTemporaryChat` → AsyncStorage persistence + broadcast to
  chat surfaces.
- `app/(platform)/memory.tsx` `handleEdit` → open an edit sheet (currently
  a no-op).
- `app/(platform)/audit.tsx` → swap mock data for `audit_events` query.
- `app/(platform)/permissions.tsx` → swap mock data for grants query.

## Constraints honored

- **No new dependencies.** Only existing imports used (React, RN,
  expo-router, AsyncStorage, react-native-safe-area-context).
- **No existing file modified** — every change is new under
  `lib/platform/` or `app/(platform)/`.
- **Orb component untouched.** The landing renders a static orb surrogate.
- **`lib/supabase/types.ts` untouched** — overlay types live here.
- Strict TypeScript throughout.
