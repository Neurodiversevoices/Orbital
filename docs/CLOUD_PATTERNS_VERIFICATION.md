# Cloud Patterns v1 Verification Checklist

Verification steps for Orbital cloud backup and cross-device sync.

## Prerequisites

- [ ] Supabase project deployed with `00003_cloud_patterns_v1.sql` migration
- [ ] Environment variables set: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Two test devices (or emulators) available

---

## 1. Uninstall/Reinstall Restore

**Goal:** Verify logs are restored after app reinstall.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1.1 | Sign in and enable Cloud Backup | Toggle shows "enabled" |
| 1.2 | Log 3+ capacity signals with notes | Signals appear in Patterns |
| 1.3 | Wait for "Sync Now" or trigger manually | Last sync time updates |
| 1.4 | Uninstall the app completely | App removed |
| 1.5 | Reinstall and sign in with same account | Sign in succeeds |
| 1.6 | Enable Cloud Backup toggle | Toggle enabled |
| 1.7 | Pull-to-refresh on Patterns screen | All 3 signals restored with notes |

**Pass Criteria:** All logs restored with correct state, timestamps, and notes.

---

## 2. Offline Queue Sync

**Goal:** Verify logs created offline sync when network returns.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.1 | Sign in and enable Cloud Backup | Toggle shows "enabled" |
| 2.2 | Enable Airplane Mode | Device offline |
| 2.3 | Log 2 capacity signals | Signals saved locally |
| 2.4 | Open Cloud Sync screen | Shows "X pending" status |
| 2.5 | Disable Airplane Mode | Network restored |
| 2.6 | Wait 60s or tap "Sync Now" | Pending count drops to 0 |
| 2.7 | Check Supabase `capacity_logs` table | 2 new rows with correct data |

**Pass Criteria:** Offline logs sync automatically when network available.

---

## 3. Second Device Sync

**Goal:** Verify logs sync between devices.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.1 | On Device A: Sign in, enable Cloud Backup | Toggle enabled |
| 3.2 | On Device A: Log 3 capacity signals | Signals appear |
| 3.3 | On Device A: Trigger "Sync Now" | Sync completes |
| 3.4 | On Device B: Sign in with same account | Sign in succeeds |
| 3.5 | On Device B: Enable Cloud Backup | Toggle enabled |
| 3.6 | On Device B: Pull-to-refresh Patterns | All 3 signals from Device A appear |
| 3.7 | On Device B: Log 1 new signal | Signal appears |
| 3.8 | On Device B: Trigger "Sync Now" | Sync completes |
| 3.9 | On Device A: Pull-to-refresh | Device B's signal appears |

**Pass Criteria:** Bidirectional sync works across devices.

---

## 4. RLS Unauthorized Read Fails

**Goal:** Verify Row-Level Security prevents cross-user access.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 4.1 | User A: Sign in, enable Cloud Backup | Toggle enabled |
| 4.2 | User A: Log 2 signals and sync | Signals in cloud |
| 4.3 | Note User A's `user_id` from Supabase | UUID recorded |
| 4.4 | User B: Sign in with different account | Sign in succeeds |
| 4.5 | In Supabase SQL Editor as User B's session, run: | |
| | `SELECT * FROM capacity_logs WHERE user_id = '<User A UUID>';` | Returns 0 rows |
| 4.6 | Verify User B's Patterns screen | Only User B's own logs visible |

**Alternative RLS Test (via Supabase Dashboard):**

```sql
-- Run as authenticated User B (use Supabase Auth to get JWT)
-- This should return ZERO rows even if User A has data

SELECT COUNT(*) FROM capacity_logs
WHERE user_id != auth.uid();
-- Expected: 0 (RLS blocks cross-user reads)
```

**Pass Criteria:** Users cannot read each other's capacity logs.

---

## Quick Smoke Test

For rapid verification during development:

```bash
# 1. Sign in on web (localhost:8085)
# 2. Enable cloud backup
# 3. Log a "resourced" signal
# 4. Check Supabase table:
#    SELECT * FROM capacity_logs ORDER BY created_at DESC LIMIT 1;
# 5. Should see your log with correct state and client_log_id
```

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Sync not starting | Is `cloudBackupEnabled` true in settings? |
| Auth errors | Check Supabase auth.users for the account |
| RPC errors | Verify `batch_upsert_capacity_logs` function exists |
| Merge conflicts | Server wins - check `synced_at` timestamps |
| Missing logs after pull | Check `deleted_at` is null in cloud |

---

## Files Changed

- `supabase/migrations/00003_cloud_patterns_v1.sql` - Schema
- `lib/cloud/` - Sync engine, outbox, settings, hook
- `lib/hooks/useEnergyLogs.ts` - Cloud integration
- `app/cloud-sync.tsx` - Cloud Backup toggle UI
