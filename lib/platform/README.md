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
| `trustCore.ts` | `useTrustPosture`, `recordAuditEvent`, `requestPermissionGrant`, `revokeGrant`, `fetchAuditEvents`, `fetchActiveGrants` | WIRED (Supabase) |
| `memory.ts` | `useMemory`, `editMemory`, `deleteMemory`, `clearScope`, `setTemporaryChat` | WIRED (Supabase + AsyncStorage) |

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

### Wired (migration 00017_platform_overlay)
- **Migration 00017** creates `permission_grants` and `platform_memory_records`,
  and extends `audit_events` with `actor`, `target`, `metadata` columns.
  RLS: every table is locked to `auth.uid() = user_id`. `permission_grants`
  uses `revoked_at` (soft-delete) instead of DELETE to preserve the trail.
- `trustCore.recordAuditEvent` flushes to the extended `audit_events` table.
  Local queue retains events when the cloud insert fails (best-effort).
- `trustCore.requestPermissionGrant` / `revokeGrant` insert / soft-delete
  rows in `permission_grants` and pair with `grant.request` / `grant.revoke`
  audit events.
- `trustCore.fetchAuditEvents` / `fetchActiveGrants` are read helpers used
  by `app/(platform)/audit.tsx` and `permissions.tsx`.
- `memory.useMemory(scope)` reads from `platform_memory_records` filtered
  by `auth.uid() = user_id` and the supplied scope. Returns loading + error.
- `memory.editMemory` / `deleteMemory` / `clearScope` mutate Supabase rows
  and pair each with a `memory.{edit,delete,clear}` audit event.
- `memory.setTemporaryChat` persists to AsyncStorage under
  `orbital.platform.temporaryChat` and pairs with a `memory.temporary_chat`
  audit event. Sync mirror via `getTemporaryChat`, async via `getTemporaryChatAsync`.

### Still TODO
- `app/(platform)/memory.tsx` `handleEdit` → open an edit sheet (currently
  a no-op).
- Local audit queue → AsyncStorage persistence (so unsynced events survive
  a cold launch).
- Realtime subscriptions on `platform_memory_records` for cross-device sync.

## Constraints honored

- **No new dependencies.** Only existing imports used (React, RN,
  expo-router, AsyncStorage, react-native-safe-area-context).
- **No existing file modified** — every change is new under
  `lib/platform/` or `app/(platform)/`.
- **Orb component untouched.** The landing renders a static orb surrogate.
- **`lib/supabase/types.ts` untouched** — overlay types live here.
- Strict TypeScript throughout.
