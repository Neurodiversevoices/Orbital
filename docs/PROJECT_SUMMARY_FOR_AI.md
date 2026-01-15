# ORBITAL - Comprehensive Project Summary

*A medical-grade capacity tracking application for personal wellness and institutional wellness programs*

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Core Concepts & Terminology](#4-core-concepts--terminology)
5. [Application Architecture](#5-application-architecture)
6. [Screen & Navigation Reference](#6-screen--navigation-reference)
7. [Library Modules Deep Dive](#7-library-modules-deep-dive)
8. [Component Library](#8-component-library)
9. [Authentication & Security](#9-authentication--security)
10. [Data Model & Storage](#10-data-model--storage)
11. [Enterprise Features](#11-enterprise-features)
12. [Privacy & Governance](#12-privacy--governance)
13. [Subscription & Monetization](#13-subscription--monetization)
14. [Internationalization](#14-internationalization)
15. [Testing & Quality](#15-testing--quality)
16. [Build & Deployment](#16-build--deployment)
17. [Recent Changes](#17-recent-changes)

---

## 1. EXECUTIVE SUMMARY

**Orbital** is a React Native/Expo application for tracking personal "capacity" - a holistic measure of one's energy, stress, and wellness state. The app serves both individual users (B2C) and institutional wellness programs (B2B) with strict privacy controls.

### Core Value Proposition
- **Signal, not symptom**: Track capacity states (resourced/stretched/depleted) rather than specific health conditions
- **Privacy-first**: All data stays on device by default; cloud sync is opt-in
- **Longitudinal patterns**: Build insights over weeks/months/years of logging
- **Institutional use**: Schools, employers, healthcare systems can view aggregate (never individual) patterns

### Key Differentiators
- **No gamification**: Clinical, professional tone throughout
- **K-anonymity enforcement**: Aggregate views require minimum 5 participants
- **Offline-first**: Full functionality without internet
- **Medical-grade reliability**: Sentry monitoring, comprehensive error handling

### Platform Support
- iOS (primary)
- Android
- Web (Vercel deployment)

---

## 2. TECHNOLOGY STACK

### Frontend Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.1.0 | UI library (latest with Concurrent Features) |
| React Native | 0.81.5 | Cross-platform mobile (New Architecture enabled) |
| Expo | 54.0.30 | React Native framework & tooling |
| Expo Router | 6.0.21 | File-based routing (like Next.js) |
| TypeScript | ~5.9.2 | Type safety (strict mode) |

### State & Data
| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | 2.90.0 | PostgreSQL backend, auth, real-time |
| AsyncStorage | 2.2.0 | Local data persistence |
| React Context | - | App-wide state (Locale, Auth, Demo, etc.) |

### UI & Visualization
| Technology | Version | Purpose |
|------------|---------|---------|
| Vega / Vega-Lite | 6.2.0 / 6.4.1 | Declarative data visualization |
| Lucide React Native | 0.562.0 | Icon library |
| React Native Reanimated | 4.1.1 | 60fps animations |
| React Native SVG | 15.12.1 | SVG rendering |

### Authentication & Security
| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase Auth | - | Email, magic link, anonymous auth |
| Expo Apple Authentication | 8.0.8 | Sign in with Apple |
| Expo Local Authentication | 17.0.8 | Face ID / Touch ID |
| BIP39 | 3.1.0 | Mnemonic seed phrases for vault |

### Monitoring & Payments
| Technology | Version | Purpose |
|------------|---------|---------|
| Sentry | 7.8.0 | Error tracking, performance |
| React Native Purchases | 8.12.0 | RevenueCat subscriptions |

### Runtime
- **Engine**: Hermes (optimized React Native JS engine)
- **Architecture**: React Native New Architecture enabled

---

## 3. PROJECT STRUCTURE

```
Orbital/
├── app/                      # Screens & routing (Expo Router)
│   ├── (tabs)/              # Bottom tab navigation
│   │   ├── index.tsx        # Home - capacity logging
│   │   ├── patterns.tsx     # Analytics & pattern discovery
│   │   └── brief.tsx        # Briefings & reports
│   ├── circles/             # Social features (live dots)
│   ├── qsb/                 # Quarterly Strategic Brief
│   ├── experiment/          # A/B testing screens
│   ├── shared/              # Shared view routes
│   └── [30+ modal screens]  # Settings, account, legal, etc.
│
├── components/              # Reusable UI components
│   ├── GlassOrb.tsx        # Primary capacity input (3D orb)
│   ├── EnergyGraph.tsx     # Time-series visualization
│   ├── qcr/                # Quarterly Capacity Report
│   ├── qsb/                # Quarterly Strategic Brief
│   ├── legal/              # Age gate, terms acceptance
│   └── device/             # iPhone mockups
│
├── lib/                     # Core business logic (40,805 LOC)
│   ├── supabase/           # Backend client, auth, sync
│   ├── session/            # Idle timeout, device registry, audit
│   ├── profile/            # User identity, demographics
│   ├── circles/            # Live dots, six laws enforcement
│   ├── sentinel/           # Institutional early warning
│   ├── enterprise/         # B2B hardening, k-anonymity
│   ├── governance/         # Compliance, audit trails
│   ├── payments/           # RevenueCat integration
│   └── [20+ more modules]
│
├── theme/                   # Design tokens
│   ├── colors.ts           # Capacity state colors, UI palette
│   ├── spacing.ts          # 4px base unit scale
│   └── styles.ts           # Glow effects, glass morphism
│
├── locales/                 # i18n (8 languages)
├── governance/              # Business doctrines & specs
├── legal/                   # Compliance documents
├── scripts/                 # Build & utility scripts
├── tests/                   # E2E (Playwright) & load tests
└── supabase/               # Database migrations
```

### Key Statistics
| Metric | Value |
|--------|-------|
| TypeScript Files | 200+ |
| Lines of Code (lib/) | 40,805 |
| App Screens | 30+ |
| Components | 23 main + subdirectories |
| Languages Supported | 8 |
| Lib Modules | 31 specialized directories |

---

## 4. CORE CONCEPTS & TERMINOLOGY

### Capacity States
The fundamental unit of logging in Orbital:

| State | Color | Meaning |
|-------|-------|---------|
| **Resourced** | Cyan (#00E5FF) | High energy, full capacity |
| **Stretched** | Amber (#E8A830) | Moderate energy, some strain |
| **Depleted** | Red (#F44336) | Low energy, need recovery |

### Capacity Drivers (Categories)
Tags that explain WHY a capacity state exists:
- **Sensory**: Environmental factors (noise, light, temperature)
- **Demand**: Workload, obligations, cognitive load
- **Social**: Interpersonal interactions, relationships

### Key Features

| Feature | Description |
|---------|-------------|
| **Signals** | Individual capacity log entries |
| **Patterns** | Longitudinal trends discovered over time |
| **Baseline** | Personal average established after 30+ days |
| **Milestones** | 7d, 30d, 90d record depth achievements |
| **Circles** | Social feature - "live dots" showing capacity to trusted contacts |
| **CCI** | Clinical Capacity Instrument - formal quarterly artifact |
| **QCR** | Quarterly Capacity Report - summary document |
| **Sentinel** | Institutional early warning system (demo only) |

### App Modes
| Mode | Type | Description |
|------|------|-------------|
| Personal | B2C | Individual use |
| Caregiver | B2C | Supporting someone else |
| Employer | B2B Demo | Workplace wellness |
| School District | B2B Demo | K-12 education |
| University | B2B Demo | Higher education |
| Healthcare | B2B Demo | Clinical settings |

---

## 5. APPLICATION ARCHITECTURE

### Provider Hierarchy
The app wraps content in nested providers:

```
GestureHandlerRootView
└── LocaleProvider (i18n)
    └── AccessibilityProvider
        └── DemoModeProvider
            └── AppModeProvider
                └── SubscriptionProvider
                    └── TermsAcceptanceProvider
                        └── AgeGate (13+ verification)
                            └── IdleTimeoutWrapper
                                └── Stack Navigator
```

### Data Flow Patterns

**1. Offline-First Sync**
```
User Action → AsyncStorage (instant) → Outbox Queue → Cloud Sync (background)
                                                            ↓
Cloud Pull ← Supabase ← Merge & Conflict Resolution
```

**2. Authentication Flow**
```
useAuth() → Supabase Auth → Session Token → Device Registry → Audit Log
```

**3. Capacity Logging**
```
GlassOrb (gesture) → State Selection → Composer (notes) → savelog() → AsyncStorage
                                                                          ↓
                                                               Cloud Sync (if enabled)
```

### Key Architectural Decisions
- **File-based routing**: Expo Router for intuitive navigation
- **Context over Redux**: React Context for global state
- **Hooks pattern**: Custom hooks encapsulate business logic
- **Fail-closed security**: Default deny for all access checks
- **Privacy by design**: Local-first, cloud opt-in

---

## 6. SCREEN & NAVIGATION REFERENCE

### Tab Navigation (Bottom Bar)
| Tab | Icon | Screen | Purpose |
|-----|------|--------|---------|
| Home | House | `(tabs)/index.tsx` | Primary capacity logging |
| Patterns | BarChart2 | `(tabs)/patterns.tsx` | Analytics & history |
| Briefings | FileText | `(tabs)/brief.tsx` | Reports & intelligence |

### Modal Screens (slide_from_bottom)
| Screen | File | Purpose |
|--------|------|---------|
| Settings | `settings.tsx` | App configuration |
| Account | `account.tsx` | User identity, sessions |
| Active Sessions | `active-sessions.tsx` | Device management |
| Cloud Sync | `cloud-sync.tsx` | Auth & backup |
| Upgrade | `upgrade.tsx` | Subscription tiers |
| Data Exit | `data-exit.tsx` | Delete account/data |
| Accessibility | `accessibility.tsx` | A11y settings |
| Legal | `legal.tsx` | Terms & privacy |
| About | `about.tsx` | App information |
| Dashboard | `dashboard.tsx` | Aggregate capacity brief |
| CCI | `cci.tsx` | Clinical Capacity Instrument |

### Stack Screens (slide_from_right)
| Screen Group | Files | Purpose |
|--------------|-------|---------|
| Circles | `circles/*.tsx` | Social features |
| QSB | `qsb/*.tsx` | Quarterly Strategic Brief |
| Experiments | `experiment/*.tsx` | A/B testing |
| Tutorial | `tutorial.tsx` | Onboarding |

---

## 7. LIBRARY MODULES DEEP DIVE

### Authentication & Session (`lib/supabase/`, `lib/session/`)

**Supabase Auth** (`lib/supabase/auth.ts`)
```typescript
// Key exports
useAuth() → { isAuthenticated, user, signIn, signOut, ... }
validatePassword() → { isValid, errors, strength }
getMFAFactors(), enrollMFA(), verifyMFAChallenge()
```

**Session Management** (`lib/session/`)
```typescript
// Idle Timeout (15 min default, 1 min warning)
useIdleTimeout({ enabled, onTimeout, onWarning })

// Device Registry
createDeviceSession() → DeviceSession
getDeviceSessions() → DeviceSession[]
removeDeviceSession(id)

// Audit Logging
logAuthEvent(action, metadata)
// Actions: sign_in, sign_out, mfa_enabled, password_changed, etc.
```

### User Profile (`lib/profile/`)

**Identity** (`identity.ts`) - Display name & avatar (local-only)
```typescript
useIdentity(email) → { displayName, initials, avatarColor, updateName }
```

**Demographics** (`types.ts`, `storage.ts`) - Optional, for aggregates only
```typescript
UserProfile { yearOfBirth, genderChoice }
computeAgeBracket(year) → '18-24' | '25-34' | ...
canShowDemographicBreakdown(n) → boolean (K-anonymity)
```

### Circles - Social Features (`lib/circles/`)

**The Six Laws** (CRITICAL - enforced at code level):
1. **NO AGGREGATION**: Max 25 connections, no analytics
2. **NO HISTORY**: Ephemeral signals with TTL (1 hour default)
3. **BIDIRECTIONAL CONSENT**: Invite/accept handshake required
4. **SOCIAL FIREWALL**: circles:* namespace isolation
5. **NO HIERARCHY**: Peer-to-peer only, no admin roles
6. **SYMMETRICAL VISIBILITY**: Both parties see each other

```typescript
// Key exports
circlesSetMySignal(color, ttlMs) // Set your current state
circlesGetSignalsForMe() → ViewerSafeSignal[] // See connections
createInvite() → { code, qrData }
confirmInvite(inviteId) // Accept connection
```

### Cloud Sync (`lib/cloud/`)

**Offline-First Architecture**
```typescript
useCloudSync() → {
  pushToCloud(), pullFromCloud(), fullSync(),
  lastSyncAt, isSyncing, error
}

// Sync Config
BATCH_SIZE: 50 logs per push
PULL_LIMIT: 1000 logs per pull
RETRY_DELAY_MS: 1000 (exponential backoff)
```

### Enterprise Hardening (`lib/enterprise/`)

**Deployment Classes**
```typescript
// Class A: Relational (named individuals, ≤25 participants)
// Class B: Institutional (anonymous units, K-anonymity enforced)

determineDeploymentClass(domain) → 'class_a_relational' | 'class_b_institutional'
```

**K-Anonymity** (`kAnonymity.ts`)
```typescript
K_ANONYMITY_THRESHOLD: 5 // Minimum group size for aggregates
SIGNAL_DELAY_SECONDS: 86400 // 24-hour delay
applyKAnonymity(data) // Suppress small groups
```

### Entitlements & Access (`lib/entitlements/`, `lib/access/`)

**Tier Ladder**
```
Free → Pro → Family → Circles → Bundle (10/15/20 seats)
                              ↘
                               CCI-Q4 (purchasable at any tier)
```

```typescript
getUserEntitlements() → {
  isFree, isPro, hasFamily, hasCircle, hasBundle,
  cciPrice, rawEntitlements
}

canPurchaseCircle() → { eligible: boolean, reason: string }
```

### Governance & Compliance (`lib/governance/`)

**Core Modules**
- `immutableAuditLog.ts` - Tamper-proof audit trail
- `consentLifecycle.ts` - Consent management
- `dataSeparation.ts` - Identity ≠ patterns
- `retentionControls.ts` - Data retention policies
- `accountOffboarding.ts` - Right to erasure
- `jurisdictionDeployment.ts` - Regulatory compliance

---

## 8. COMPONENT LIBRARY

### Core Interactive Components

**GlassOrb** (`GlassOrb.tsx`)
- 240px interactive 3D sphere for capacity selection
- Gesture-driven: Pan to select state, tap to save
- Real-time color interpolation
- Breathing animation with glow effects

**CategorySelector** (`CategorySelector.tsx`)
- Single-select for capacity drivers (sensory/demand/social)
- Icon + label buttons with state-aware colors

**Composer** (`Composer.tsx`)
- Note input with draft persistence
- 200 character limit, keyboard-aware

### Visualization Components

**EnergyGraph** (`EnergyGraph.tsx`)
- SVG time-series chart
- Adaptive bucketing (6h → 60d based on range)
- Zone bands for capacity states

**SentinelChart** (`SentinelChart.tsx`)
- Institutional volatility visualization
- Baseline bands with trigger callouts

**CCIChart** (`CCIChart.tsx`)
- Clinical Capacity Indicator chart
- Bezier curves with gradient bands
- Shared between individual & aggregate views

### Panel Components

**MilestonesPanel** - Record depth indicators (7d/30d/90d)
**PatternLanguagePanel** - Clinical interpretation guide
**OrgRoleBanner** - Institutional reassurance messaging
**WeeklyCapacityRecord** - Calendar view for entries

### Design System

**Colors**
```typescript
resourced: '#00E5FF' // Cyan
stretched: '#E8A830' // Amber
depleted: '#F44336'  // Red
background: '#05060A' // Dark
card: '#0A0B10'
```

**Spacing** (4px base)
```typescript
xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48
```

**Border Radius**
```typescript
sm: 8, md: 12, lg: 16, xl: 24
```

---

## 9. AUTHENTICATION & SECURITY

### Authentication Methods
1. **Email/Password** - Standard auth with password validation
2. **Magic Link** - Passwordless email login
3. **Sign in with Apple** - iOS native integration
4. **Anonymous** - Local-only mode (no cloud features)

### Password Requirements
```typescript
validatePassword(password) → {
  isValid: boolean,
  errors: string[],
  strength: 'weak' | 'fair' | 'strong' | 'excellent'
}
// Requirements: 12+ chars, uppercase, lowercase, number, special char
```

### Multi-Factor Authentication
```typescript
enrollMFA() → { qr_code, secret, uri }
verifyMFAEnrollment(code)
verifyMFAChallenge(factorId, code)
unenrollMFA(factorId)
```

### Biometric Authentication
```typescript
useBiometric() → {
  status: BiometricStatus,
  authenticate(prompt),
  enable(), disable()
}
// Supports: Face ID, Touch ID, Fingerprint
```

### Session Security
- **Idle Timeout**: 15 minutes with 1-minute warning
- **Device Registry**: Track all active sessions
- **Remote Logout**: Remove sessions from other devices
- **Audit Logging**: All auth events logged

---

## 10. DATA MODEL & STORAGE

### Core Data Types

**Capacity Log**
```typescript
CapacityLog {
  id: string
  state: 'resourced' | 'stretched' | 'depleted'
  timestamp: string (ISO 8601)
  tags: string[] // ['sensory', 'demand', 'social']
  note?: string
  deviceId: string
}
```

**User Profile**
```typescript
UserProfile {
  yearOfBirth: number | null
  genderChoice: 'male' | 'female' | 'non-binary' | 'self_described' | 'prefer_not_to_say' | null
  genderSelfDescribed?: string
}
```

**User Identity** (local-only)
```typescript
UserIdentity {
  displayName: string | null
  avatarUrl: string | null
  avatarSource: 'initials' | 'upload' | 'gravatar'
}
```

**Device Session**
```typescript
DeviceSession {
  id: string
  deviceId: string
  deviceName: string
  platform: 'ios' | 'android' | 'web'
  lastActiveAt: string
  createdAt: string
  isCurrent: boolean
}
```

### Storage Keys (AsyncStorage)
```typescript
// Active Data
'@orbital:logs'           // Capacity logs
'@orbital:preferences'    // User preferences
'@orbital:recipients'     // Share recipients
'@orbital:shares'         // Active shares
'@orbital:audit'          // Audit entries

// Session & Identity
'@orbital:device_id'      // Unique device identifier
'@orbital:device_sessions'// All known sessions
'@orbital:current_session'// Current session
'@orbital:session_audit'  // Auth event log
'@orbital:user_identity'  // Display name/avatar

// Enterprise
'@orbital:institutional'  // Org configuration
'@orbital:vault'          // Long-term vaulted logs
'@orbital:team_mode'      // Team settings
'@orbital:school_zone'    // School Zone settings
```

### Cloud Storage (Supabase)
- Capacity logs (synced from device)
- Share configurations
- Audit events
- Research consent records

---

## 11. ENTERPRISE FEATURES

### Deployment Classes

**Class A: Relational**
- Named individuals (up to 25)
- Circles allowed
- Admin can view patterns (with consent)
- Use case: Small teams, families

**Class B: Institutional**
- Anonymous organizational units
- No individual names stored
- K-anonymity always enforced (min 5)
- Sentinel early warning system
- Use case: Schools, enterprises

### Institutional Surfaces (Demo Only in Phase 1)
- **Sentinel Brief**: Volatility condition reports
- **Capacity Brief**: Periodic leadership advisory
- **Operator Admin**: Aggregate signals by cohort

### K-Anonymity Enforcement
```typescript
K_ANONYMITY_THRESHOLD = 5
// All aggregate views require minimum 5 participants
// Small cohorts are suppressed or combined
```

### Domain Restrictions
```typescript
checkDomainRestriction(email) → {
  restricted: boolean,
  enforcement: 'block_all' | 'redirect_sso' | 'contact_sales'
}
```

---

## 12. PRIVACY & GOVERNANCE

### Core Principles
1. **Local-first**: All data on device by default
2. **Opt-in cloud**: User explicitly enables sync
3. **No surveillance**: Institutions see aggregates only
4. **Data separation**: Identity ≠ patterns
5. **Right to erasure**: Full deletion available

### Privacy Guarantees for Profiles
- NEVER visible in Circles
- NEVER visible in live signaling
- NEVER visible to family/sponsors/institutions
- Does NOT affect pricing or eligibility
- Used ONLY for aggregate analytics (with K-anonymity)

### Audit Trail
```typescript
SessionAuditEntry {
  id: string
  action: SessionAction // 'sign_in' | 'sign_out' | 'mfa_enabled' | ...
  deviceId: string
  deviceName: string
  platform: 'ios' | 'android' | 'web'
  timestamp: string
  metadata?: { method?, mfaUsed?, reason? }
}
```

### Data Retention
- Pattern history: NEVER hard-deleted (de-identified only)
- User data: Exportable, deletable via Data Exit
- Audit logs: Append-only, tamper-proof

### Compliance Features
- GDPR export and erasure
- CCPA compliance
- COPPA age gate (13+)
- FERPA educational record handling
- SOC 2 control framework

---

## 13. SUBSCRIPTION & MONETIZATION

### B2C Tier Ladder
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Basic logging, 7-day history |
| Pro | $X/mo | Full history, patterns, export |
| Family | Pro + $X | Add family members |
| Circles | Per-circle | Live dots (5 buddies max) |
| Bundle | Annual | 10/15/20 Pro seats |

### CCI Pricing
| User Tier | CCI-Q4 Price |
|-----------|--------------|
| Free | $199 |
| Pro | $149 |

### Payment Integration
- **RevenueCat**: Subscription management
- **Stripe**: (Pending) Direct payments
- **Sponsor Codes**: Institutional access grants

---

## 14. INTERNATIONALIZATION

### Supported Languages
| Code | Language |
|------|----------|
| en | English |
| es | Spanish |
| fr | French |
| de | German |
| it | Italian |
| ja | Japanese |
| pt-BR | Portuguese (Brazil) |

### Implementation
```typescript
const { t, locale, setLocale } = useLocale();

// Usage
<Text>{t.settings.language}</Text>

// Interpolation
interpolate(t.patterns.signalsLogged, { count: 42 })
```

---

## 15. TESTING & QUALITY

### E2E Testing (Playwright)
```bash
npm test              # Headless
npm run test:headed   # With browser UI
```

**Configuration**
- Base URL: `http://localhost:8085`
- Timeout: 30 seconds
- Retries: 2 in CI, 1 locally
- Artifacts: Screenshots, videos, traces on failure

### Load Testing
```bash
npm run stress        # Load testing
npm run stress:seed   # Generate test users
```

### Code Quality
```bash
npm run typecheck     # TypeScript validation
npm run lint          # ESLint (max 100 warnings)
npm run format        # Prettier formatting
npm run doctor        # Health check
npm run preflight     # Pre-build validation
```

### CI/CD (GitHub Actions)
1. **Doctor Job**: Health check, artifact upload
2. **Validate & Build**: TypeScript check, web build

---

## 16. BUILD & DEPLOYMENT

### Development
```bash
npm start             # expo start --web
npm run web           # Same as above
```

### Production Build
```bash
npm run build:web     # expo export -p web
# Output: ./dist directory
```

### Deployment
- **Platform**: Vercel
- **Build Command**: `npm run build:web`
- **Output**: `dist/`
- **Security Headers**: CSP, HSTS, X-Frame-Options

### Environment Variables
```
EXPO_PUBLIC_FOUNDER_DEMO=1  # Enable founder demo features
EXPO_PUBLIC_SUPABASE_URL    # Supabase endpoint
EXPO_PUBLIC_SUPABASE_ANON_KEY  # Supabase public key
```

---

## 17. RECENT CHANGES

### Session Management & Security (Latest)
Added comprehensive session security features:

**New Files**
- `lib/session/idleTimeout.ts` - 15-min idle timeout with warning
- `lib/session/deviceRegistry.ts` - Device tracking & remote logout
- `lib/session/auditLog.ts` - Auth event logging
- `lib/profile/identity.ts` - Local-only display name/avatar
- `app/account.tsx` - Account settings screen
- `app/active-sessions.tsx` - Session management screen

**Key Features**
- Idle timeout with 1-minute warning modal
- Device session registry
- Remote logout capability
- Auth event audit trail
- Privacy-first user identity (local storage only)

### Previous Updates
- Circle CCI view with time range selector
- Aggregate CCI chart implementation
- Settings page cleanup (removed deprecated sections)
- Password complexity validation
- MFA enrollment/verification
- Biometric authentication

---

## APPENDIX: QUICK REFERENCE

### Common File Locations
| Purpose | Path |
|---------|------|
| Main layout | `app/_layout.tsx` |
| Tab screens | `app/(tabs)/*.tsx` |
| Auth logic | `lib/supabase/auth.ts` |
| Session mgmt | `lib/session/*.ts` |
| Cloud sync | `lib/cloud/*.ts` |
| Storage | `lib/storage.ts` |
| Theme | `theme/*.ts` |
| Components | `components/*.tsx` |

### Key Hooks
```typescript
useAuth()           // Authentication state & methods
useCloudSync()      // Cloud backup operations
useIdleTimeout()    // Session timeout management
useIdentity()       // Display name & avatar
useProfile()        // Demographics (optional)
useLocale()         // Internationalization
useSubscription()   // Entitlements & tier
useBiometric()      // Face ID / Touch ID
```

### Critical Constants
```typescript
IDLE_TIMEOUT_MS: 900000      // 15 minutes
WARNING_BEFORE_MS: 60000     // 1 minute
K_ANONYMITY_THRESHOLD: 5     // Minimum group size
MAX_CIRCLE_CONNECTIONS: 25   // Circle limit
SIGNAL_TTL_MS: 3600000       // 1 hour signal expiry
```

---

*Generated: January 2026*
*Project: Orbital v1.0.0*
*Branch: claude/locate-file-MUWxC*
