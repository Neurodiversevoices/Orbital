# TypeScript Stabilization Tickets

**Generated:** 2026-01-11
**Total Errors:** ~45
**Priority:** Pre-marketing stabilization

---

## Category Summary

| Category | Count | Build Risk | Runtime Risk |
|----------|-------|------------|--------------|
| Locale type mismatch | 15 | Low | Medium |
| Missing locale translations | 7 | Low | Low |
| Missing accessibility translations | 2 | Low | Low |
| DataRoom type issues | 3 | Low | Low |
| Function argument mismatch | 4 | **High** | **High** |
| Crypto/ArrayBuffer types | 3 | Low | Low |
| Missing exports | 1 | **High** | Medium |
| Sentry crash reporter | 2 | Low | Low |
| Duplicate property | 1 | Medium | Low |
| Cloud sync type | 1 | Low | Medium |

---

## Top 5 Build-Breaking Tickets

### 1. [CRITICAL] Function Argument Mismatch in index.tsx
**File:** `app/(tabs)/index.tsx:207,261`
**Error:** `Expected 1-3 arguments, but got 4`
**Risk:** Will break build in strict mode
**Fix:**
```typescript
// Line 207: Remove extra argument or update function signature
// Investigate: formatTimeAgo or similar function receiving 4 args
```

### 2. [CRITICAL] Missing STARTER_TIER Export
**File:** `lib/access/entitlements.ts:27`
**Error:** `Module '"../subscription/pricing"' has no exported member 'STARTER_TIER'`
**Risk:** Import will fail
**Fix:**
```typescript
// In lib/subscription/pricing.ts, add:
export const STARTER_TIER = { ... }
// Or update entitlements.ts import to use correct export name
```

### 3. [HIGH] Duplicate Property in IPhoneFrame
**File:** `components/device/IPhoneFrame.tsx:184`
**Error:** `An object literal cannot have multiple properties with the same name`
**Risk:** Syntax error, will break build
**Fix:**
```typescript
// Remove one of the duplicate properties in the StyleSheet
```

### 4. [HIGH] Locale Type Widening Needed
**Files:** Multiple (index.tsx, export.tsx, HistoryItem.tsx, device-preview.tsx)
**Error:** `Type '"fr"' is not assignable to type '"en" | "es"'`
**Risk:** Type error when non-en/es locale selected
**Fix:**
```typescript
// Option A: Update function signatures to accept Locale type
// Option B: Add 'fr' | 'de' | 'pt' | 'it' | 'ja' to parameter types
// Option C: Use type assertion at call sites (temporary)
```

### 5. [HIGH] Missing Locale Translations (teamMode, schoolZone)
**Files:** `locales/es.ts`, `fr.ts`, `de.ts`, `pt.ts`, `it.ts`, `ja.ts`
**Error:** Missing `teamMode` and `schoolZone` properties
**Risk:** TypeScript error, missing translations in production
**Fix:**
```typescript
// Add to each locale file:
teamMode: {
  title: "[Translated]",
  // ... copy structure from en.ts
},
schoolZone: {
  title: "[Translated]",
  // ... copy structure from en.ts
},
```

---

## Lower Priority Tickets

### 6. [MEDIUM] Patterns.tsx Type Mismatch
**File:** `app/(tabs)/patterns.tsx:332,743`
**Errors:**
- `'"monthly"' is not assignable to type '"quarterly"'`
- `Property 'toLowerCase' does not exist on type 'never'`

### 7. [MEDIUM] Cloud Sync Type Issue
**File:** `lib/cloud/syncEngine.ts:126`
**Error:** `{ deleted_at: string }` not assignable to `never`

### 8. [MEDIUM] Experiment New State Type
**File:** `app/experiment/new.tsx:155`
**Error:** `number` not assignable to `SetStateAction<4>`

### 9. [LOW] DataRoom Type Incomplete
**Files:** `lib/dataroom/dataRoomGenerator.ts`, `orgProvisioning.ts`
**Missing:** `technicalArchitecture`, `legalDocuments`, `metadata`
**Note:** Enterprise feature, not in v1.0

### 10. [LOW] Accessibility Translation Keys
**File:** `app/accessibility.tsx:114,117`
**Missing:** `simpleMode`, `simpleModeDesc` in locale types

### 11. [LOW] Crypto ArrayBuffer Types
**File:** `lib/vault/crypto.ts:166,180`
**Issue:** `SharedArrayBuffer` vs `ArrayBuffer` compatibility
**Note:** Vault is optional feature

### 12. [LOW] Sentry Crash Reporter Types
**File:** `lib/crashReporter.ts:24,33`
**Issue:** `CrashContext` index signature
**Note:** Error reporting, non-critical path

---

## Recommended Fix Order

1. **IPhoneFrame duplicate property** (5 min) - Syntax fix
2. **STARTER_TIER export** (10 min) - Import fix
3. **index.tsx argument count** (15 min) - Function call fix
4. **Locale type widening** (30 min) - Type system fix
5. **Missing locale translations** (60 min) - Content addition

---

## Quick Wins (< 15 min each)

- [ ] Remove duplicate property in IPhoneFrame.tsx
- [ ] Export STARTER_TIER from pricing.ts
- [ ] Fix argument count in index.tsx:207
- [ ] Add type assertion for Locale in 2-3 critical paths

## Defer Until Post-Launch

- DataRoom enterprise types
- Vault crypto types
- Full locale translation completion
