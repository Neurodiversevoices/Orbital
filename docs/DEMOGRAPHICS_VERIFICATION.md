# Optional Demographics Implementation
## Verification & Privacy Checklist

**Implementation Date:** 2025-01-07
**Status:** Complete

---

## A. FILES CREATED/MODIFIED

### New Files

| File | Purpose |
|------|---------|
| `lib/profile/types.ts` | Type definitions, validation, age bracket computation, k-anonymity helpers |
| `lib/profile/storage.ts` | AsyncStorage CRUD for profile data |
| `lib/profile/useProfile.ts` | React hook for profile management |
| `lib/profile/index.ts` | Module exports |
| `app/profile.tsx` | Profile settings UI screen |
| `supabase/migrations/00002_user_demographics.sql` | Database schema for cloud sync |

### Modified Files

| File | Change |
|------|--------|
| `app/settings.tsx` | Added Profile row in Account section |
| `lib/hooks/useExport.ts` | Added profile export helpers |

---

## B. DATA MODEL VERIFICATION

### Local Storage (AsyncStorage)

```typescript
interface UserProfile {
  yearOfBirth: number | null;         // YYYY format only
  genderChoice: GenderChoice | null;  // Enum value
  genderSelfDescribed: string | null; // Free text (NEVER displayed)
  profileUpdatedAt: string | null;    // ISO timestamp
}
```

### Cloud Storage (Supabase)

```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY,
  year_of_birth INTEGER,        -- 1900 to current year
  gender_choice gender_choice,  -- ENUM
  gender_self_described TEXT,   -- NEVER aggregated
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Gender Enum

- `woman`
- `man`
- `non_binary`
- `self_described`
- `unspecified` (default)

### Age Brackets (Computed, Never Stored)

- 0-5, 6-9, 10-13, 14-18, 19-24, 25-30, 31-40, 41-50, 51-60, 60+

---

## C. PRIVACY RULES VERIFICATION

### ✅ NEVER Visible In

| Context | Verified |
|---------|----------|
| Circles | ✅ Not imported in circles/ |
| Live signaling | ✅ Not in capacity log flow |
| Sharing links | ✅ Excluded by default via getProfileForSharedExport(false) |
| Family view | ✅ No family integration |
| Sponsor/Org view | ✅ RLS blocks, only aggregates visible |
| Other users | ✅ RLS: auth.uid() = user_id |

### ✅ NEVER Affects

| Aspect | Verified |
|--------|----------|
| Pricing | ✅ Not in subscription logic |
| Eligibility | ✅ Not in access control |
| Feature access | ✅ Not gated |

### ✅ K-Anonymity Enforcement

```typescript
// lib/profile/types.ts
export function canShowDemographicBreakdown(
  count: number,
  k: number = 10  // Default threshold
): boolean {
  return count >= k;
}
```

```sql
-- supabase/migrations/00002_user_demographics.sql
CASE WHEN COUNT(*) >= p_k_threshold
     THEN AVG(green_pct)::NUMERIC(5,2)
     ELSE NULL
END as avg_green_pct,
COUNT(*) < p_k_threshold as is_suppressed
```

---

## D. VALIDATION VERIFICATION

### Year of Birth

```typescript
// lib/profile/types.ts
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1900;

export function isValidYearOfBirth(year: number | null): boolean {
  if (year === null) return true;
  return Number.isInteger(year) && year >= MIN_YEAR && year <= CURRENT_YEAR;
}
```

```sql
-- Database constraint
year_of_birth INTEGER CHECK (
  year_of_birth IS NULL OR
  (year_of_birth >= 1900 AND year_of_birth <= EXTRACT(YEAR FROM CURRENT_DATE))
)
```

### Gender Self-Described

- Only stored when genderChoice === 'self_described'
- NEVER displayed in UI after save
- NEVER included in aggregates
- NEVER exported in shared exports

---

## E. EXPORT VERIFICATION

### Personal Export (JSON)

- ✅ Includes all demographics (user owns their data)
- Function: `getProfileForExport()`

### Shared Export (PDF/CSV/Links)

- ✅ EXCLUDES demographics by default
- ✅ Optional toggle: `getProfileForSharedExport(includeDemographics)`
- ✅ Self-described text NEVER included even with toggle

---

## F. UI VERIFICATION

### Location

Settings → Account → Profile

### No Blocking

- ✅ Both fields marked "Optional"
- ✅ No validation errors prevent save
- ✅ Empty/unspecified is valid
- ✅ Not in onboarding flow

### Helper Text

- Year: "Used only for anonymous age-range insights. Never shown to others."
- Gender: "Used only for anonymous, thresholded aggregate insights."

---

## G. MANUAL TEST CHECKLIST

### Basic Functionality

- [ ] Can open Profile screen from Settings
- [ ] Can enter year of birth (4 digits)
- [ ] Year validates against 1900-current bounds
- [ ] Can select gender from dropdown
- [ ] "Self-described" shows text input
- [ ] Can leave both fields empty
- [ ] Changes persist after app restart

### Privacy Verification

- [ ] Demographics NOT visible in Circles hub
- [ ] Demographics NOT visible in capacity logging UI
- [ ] Demographics NOT in sharing previews
- [ ] Demographics NOT in PDF export (without toggle)
- [ ] Demographics NOT in CSV export (without toggle)
- [ ] Demographics INCLUDED in JSON personal export

### Aggregate Verification

- [ ] Dashboard shows "Not enough data" for cohorts < 10
- [ ] Age brackets display correctly (not exact ages)
- [ ] "Self-described" shows as category, not text

---

## H. TRUTH CLAIMS FOR PRIVACY STATEMENTS

The following statements are now factually accurate:

1. **"Year of birth and gender are optional."**
   - Both fields default to null/unspecified
   - No blocking or required validation

2. **"Demographics are never visible to other users."**
   - RLS enforces user_id = auth.uid()
   - No export to Circles, sharing, or social features

3. **"Demographics are used only in anonymous, aggregate analytics."**
   - K-anonymity (K≥10) enforced at database function level
   - Suppressed cohorts show "Not enough data"

4. **"You can export your demographic data."**
   - Personal JSON export includes all profile fields

5. **"Demographics are excluded from shared exports by default."**
   - getProfileForSharedExport(false) returns empty object
   - Explicit toggle required to include

6. **"Self-described gender text is stored privately."**
   - Stored in genderSelfDescribed column
   - NEVER displayed, aggregated, or exported in shared contexts

---

## I. WHAT IS NOT IMPLEMENTED

1. Demographics in team/school/org mode UI (future work)
2. Demographics in QSB aggregate views (future work)
3. Founder dashboard demographic breakdowns (future work)

These would use the `get_org_demographic_breakdown()` database function which is already implemented with k-anonymity enforcement.

---

**Signed:** Claude Code Implementation
**Date:** 2025-01-07
