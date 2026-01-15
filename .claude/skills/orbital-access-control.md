# Orbital Access Control System

Use this skill when working with access control, subscription tiers, feature gating, or user permissions in Orbital.

## Core Concepts

### User Tiers (B2C)
| Tier | Access Level |
|------|--------------|
| `starter` | Free users - limited signals, limited history |
| `individual` | Paid - unlimited signals |
| `individual_pro` | Pro - full features |

### Access Check Methods
```tsx
const { hasTier, hasFeature, freeUserViewActive } = useAccess();

// Check tier level
hasTier('individual_pro') // true if Pro or higher

// Check specific feature
hasFeature('unlimitedSignals')
```

## B2C vs B2B Rules

### B2C Pages (Consumer)
- **Briefings page**: Demo content only, NO subscription gating
- **Home page**: Signal input, patterns, accessible to all
- **CCI page**: Demo artifact, accessible to all

### B2B Pages (Enterprise/Institutional)
- **Organization tab**: Only for institutional modes (employer, school, healthcare)
- **Global/Sentinel**: Enterprise features
- Controlled by `orgBypass` flag

## Key Flags

### `FOUNDER_DEMO_ENABLED`
```tsx
// Defined in lib/hooks/useDemoMode.tsx
export const FOUNDER_DEMO_ENABLED = process.env.EXPO_PUBLIC_FOUNDER_DEMO === '1';
```
- Set via environment variable at BUILD TIME
- Used for founder/developer testing
- Does NOT affect `hasTier()` - only affects demo visibility

### `showBriefingsOrgGlobal`
- Returns true for: institutional modes (`orgBypass`) OR `FOUNDER_DEMO_ENABLED`
- Used for B2B Organization/Global tabs
- Do NOT use for B2C features

### `freeUserViewActive`
- Hard override to simulate free user experience
- Blocks ALL elevated access when enabled
- Used for QA testing

## Common Mistakes to Avoid

1. **Don't gate demo content** - Demo pages (Briefings, CCI viewer) should be visible to all users
2. **Don't confuse B2C and B2B** - Organization/Global are B2B only, Personal/Circles are B2C
3. **Don't use `showBriefingsOrgGlobal` for B2C** - It's designed for institutional modes
4. **`FOUNDER_DEMO_ENABLED` is build-time** - Won't change at runtime

## File Locations
- Access hook: `lib/access/entitlements.ts`
- Demo mode: `lib/hooks/useDemoMode.tsx`
- Forced role view: `lib/access/forcedRoleView.ts`
