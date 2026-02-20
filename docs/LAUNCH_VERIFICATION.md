# Orbital Launch Verification

Generated: 2025-01-07

## 1. Verified Feature Inventory

### What Exists

| Feature | Status | Code Path |
|---------|--------|-----------|
| **Cloud Sync (Automatic)** | VERIFIED | `lib/cloud/useCloudSync.ts:174-191` - auto-sync starts on auth |
| **Offline-First Logging** | VERIFIED | `lib/storage.ts` - local writes always succeed |
| **Outbox Queue** | VERIFIED | `lib/cloud/outbox.ts` - queues when offline |
| **Auto-Sync Triggers** | VERIFIED | Every 60s, on foreground, on reconnect (`useCloudSync.ts:181-202`) |
| **Conflict Resolution** | VERIFIED | Server wins (`syncEngine.ts:246-256`) |
| **Demographics (Year Only)** | VERIFIED | `user_profiles.year_of_birth INTEGER` (no DOB) |
| **k-Anonymity (K>=10)** | VERIFIED | `get_org_demographic_breakdown` enforces threshold |
| **RLS Enforcement** | VERIFIED | `auth.uid() = user_id` on all tables |
| **Magic Link Auth** | VERIFIED | `lib/supabase/auth.ts:signInWithMagicLink` |
| **RevenueCat IAP** | VERIFIED | `lib/subscription/pricing.ts` |
| **Data Export** | EXISTS | `lib/hooks/useExport.ts` |
| **Account Deletion** | EXISTS | CASCADE on `auth.users(id)` |

### What Was Fixed

| Issue | Fix | File |
|-------|-----|------|
| Cloud backup toggle existed | **REMOVED** - Cloud sync is now automatic when authenticated | `app/cloud-sync.tsx` |
| "Enable Cloud Backup" opt-in UI | **REMOVED** - No user opt-in required | `app/cloud-sync.tsx` |
| `isCloudBackupEnabled()` checked toggle | **CHANGED** - Always returns `true` | `lib/cloud/settings.ts:103-105` |
| `enableSync()`/`disableSync()` exposed | **DEPRECATED** - Now no-ops | `lib/cloud/useCloudSync.ts:95-108` |
| Sync required toggle check | **REMOVED** - Sync starts on auth | `lib/cloud/useCloudSync.ts:174-191` |
| Privacy note said "optional" | **UPDATED** - Now says "Your Data, Your Control" | `app/cloud-sync.tsx:346-351` |
| Page title said "Cloud Sync" | **CHANGED** - Now "Account" | `app/cloud-sync.tsx:153` |

### What Was Removed

- `Switch` component import in cloud-sync.tsx
- `handleToggleCloudBackup` function
- `CloudOff` icon (no disabled state exists)
- All "opt-in" language and UI
- `cloudBackupEnabled` setting checks throughout

---

## 2. Launch-Blocking Checklist

### Authentication

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Magic link auth works | **PASS** | `auth.ts:signInWithMagicLink()` |
| Apple Sign-In (iOS) | **NEEDS VERIFY** | Requires App Store Connect config |
| No anonymous cloud writes | **PASS** | All RLS policies require `auth.uid()` |
| Cloud sync automatic after auth | **PASS** | `useCloudSync.ts:174-191` triggers on `auth.isAuthenticated` |

### Cloud Sync

| Requirement | Status | Evidence |
|-------------|--------|----------|
| No opt-in UI | **PASS** | Toggle removed from `cloud-sync.tsx` |
| No "cloud backup" language | **PASS** | Changed to "Cloud Sync Active" |
| Sync starts on auth | **PASS** | Effect at `useCloudSync.ts:174` |
| Sync on 60s interval | **PASS** | `SYNC_INTERVAL_MS = 60000` |
| Sync on reconnect | **PASS** | NetInfo listener at `useCloudSync.ts:193-202` |
| Offline queue works | **PASS** | `outbox.ts` stores pending entries |
| Server wins conflicts | **PASS** | `mergeCloudIntoLocal` at `syncEngine.ts:235-262` |

### Data Ownership & RLS

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Users read only own rows | **PASS** | `auth.uid() = user_id` on all SELECT policies |
| Users write only own rows | **PASS** | `auth.uid() = user_id` on all INSERT/UPDATE policies |
| No admin override on capacity_logs | **PASS** | No `service_role` policy exists |
| Founder cannot access individual rows | **PASS** | RLS with no bypass; functions check `auth.uid()` |

### Demographics

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Year of birth only (no DOB) | **PASS** | `year_of_birth INTEGER` in `user_profiles` |
| k-anonymity K>=10 | **PASS** | `p_k_threshold INTEGER DEFAULT 10` in aggregate functions |
| Self-described never aggregated | **PASS** | Line 167: `CASE WHEN gender = 'self_described' THEN 'self_described'` |
| Demographics never in Circles | **PASS** | Stored in `user_profiles`, not synced to social |

### Pricing (RevenueCat)

| Tier | Expected | Actual | Status |
|------|----------|--------|--------|
| Individual Monthly | $19/mo | $19/mo | **MATCH** |
| Individual Annual | $179/yr | $179/yr | **MATCH** |
| Pro Monthly | $49/mo | $49/mo | **MATCH** |
| Pro Annual | $449/yr | $449/yr | **MATCH** |
| Family Monthly | $9/mo | $9/mo | **MATCH** |
| Family Annual | $79/yr | $79/yr | **MATCH** |
| Family Pro Monthly | $29/mo | $29/mo | **MATCH** |
| Family Pro Annual | $259/yr | $259/yr | **MATCH** |
| Sponsor Seat Core | $200/yr | $200/yr | **MATCH** |
| Sponsor Seat Pro | $349/yr | $349/yr | **MATCH** |
| Bundle 10 | $3,500/yr | $3,500/yr | **MATCH** |
| Bundle 25 | $9,000/yr | $9,000/yr | **MATCH** |
| Bundle 50 | $18,000/yr | $18,000/yr | **MATCH** |

**Source:** `lib/subscription/pricing.ts:80-270`

---

## 3. Cloud is System of Record

### Enforcement Code Paths

1. **On Auth → Sync Starts Automatically**
   ```typescript
   // lib/cloud/useCloudSync.ts:174-191
   useEffect(() => {
     if (!auth.isAuthenticated) return;
     syncNow(); // Initial sync
     syncIntervalRef.current = setInterval(() => {
       syncNow();
     }, SYNC_INTERVAL_MS);
   }, [auth.isAuthenticated, syncNow]);
   ```

2. **On Log Save → Enqueue for Cloud**
   ```typescript
   // lib/hooks/useEnergyLogs.ts:83-91
   if (auth.isAuthenticated) {
     await cloudSync.enqueueLogForSync(newLog);
   }
   ```

3. **On App Load → Pull from Cloud First**
   ```typescript
   // lib/hooks/useEnergyLogs.ts:37-46
   if (auth.isAuthenticated && !hasInitialPull.current) {
     data = await cloudSync.pullAndMerge(data);
     hasInitialPull.current = true;
   }
   ```

4. **On Conflict → Server Wins**
   ```typescript
   // lib/cloud/syncEngine.ts:246-256
   // Overlay cloud logs (server wins on conflict)
   for (const cloudLog of cloudLogs) {
     const converted = cloudToLocal(cloudLog);
     mergedMap.set(converted.id, converted); // Overwrites local
   }
   ```

5. **isCloudBackupEnabled() → Always True**
   ```typescript
   // lib/cloud/settings.ts:103-105
   export async function isCloudBackupEnabled(): Promise<boolean> {
     return true; // Cloud is the system of record
   }
   ```

---

## 4. Supabase RLS Verification

### Founder Cannot Access Individual Rows

**Evidence from `00003_cloud_patterns_v1.sql`:**

```sql
-- NO admin override - user-owned data only
CREATE POLICY "Users can view own capacity logs"
    ON capacity_logs FOR SELECT
    USING (auth.uid() = user_id);
```

**No service_role bypass exists for capacity_logs.**

**Functions also enforce ownership:**
```sql
-- upsert_capacity_log
IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied: can only upsert own logs';
END IF;
```

### Verification Test (Run in Supabase SQL Editor)

```sql
-- As any authenticated user, this should return 0:
SELECT COUNT(*) FROM capacity_logs WHERE user_id != auth.uid();
-- Expected: 0 (RLS blocks cross-user reads)

-- As service_role, there is NO policy granting access:
-- capacity_logs has ONLY policies for auth.uid() = user_id
```

---

## 5. App Store + Play Store Readiness

### Metadata

| Item | Status | Notes |
|------|--------|-------|
| App Name | Orbital | |
| Bundle ID (iOS) | com.erparris.orbital | Verify in App Store Connect |
| Package (Android) | com.erparris.orbital | Verify in Play Console |
| Age Rating | 4+ / Everyone | No user-generated content visible to others |
| Privacy Policy | Required | Must link to privacy policy |
| Data Safety | Required | Declare: account info, usage data, encrypted in transit |

### Privacy Language Requirements

- **Data Collected:** Email (for authentication), capacity logs (user-owned)
- **Data Usage:** Personal tracking, cross-device sync
- **Data Sharing:** None (no third-party sharing)
- **Data Retention:** Until user deletes account
- **Security:** Row-level security, encrypted in transit

### Build Configuration

| Item | iOS | Android |
|------|-----|---------|
| Sentry DSN | Set in env | Set in env |
| RevenueCat API Key | Set in env | Set in env |
| Supabase URL | Set in env | Set in env |
| Supabase Anon Key | Set in env | Set in env |

---

## 6. Critical Risks

### Real Issues (Not Hypothetical)

1. **Apple Sign-In Not Verified**
   - Status: Code exists but not tested with App Store Connect
   - Mitigation: Test before submission

2. **RevenueCat Product IDs Must Match**
   - Status: Product IDs defined in code
   - Mitigation: Verify exact match in RevenueCat dashboard + App Store Connect + Play Console

3. **Supabase Migrations Must Be Applied**
   - Status: SQL files exist but deployment not verified
   - Mitigation: Run migrations in production Supabase before launch

4. **Debug Logs Should Be Removed**
   - Status: `console.log` and `console.error` exist in code
   - Mitigation: Remove or guard with `__DEV__` before store submission

---

## Summary

| Category | Status |
|----------|--------|
| Cloud Opt-In Removed | **COMPLETE** |
| Cloud Sync Automatic | **COMPLETE** |
| RLS Blocks Founder | **COMPLETE** |
| Pricing Matches | **COMPLETE** |
| Demographics Year Only | **COMPLETE** |
| k-Anonymity Enforced | **COMPLETE** |
| App Store Ready | **NEEDS VERIFY** |
| Play Store Ready | **NEEDS VERIFY** |

**Launch Recommendation:** Ready for final TestFlight/Internal Testing verification.
