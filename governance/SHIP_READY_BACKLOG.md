# SHIP-READY BACKLOG

**Classification:** INTERNAL
**Version:** 1.0.0
**Generated:** 2025-01-01
**Total Items:** 48

---

## PRIORITY LEGEND

| Priority | Meaning | Timeline |
|----------|---------|----------|
| P0 | Critical - Required for launch | Immediate |
| P1 | High - Required for institutional readiness | 30 days |
| P2 | Medium - Required for full compliance | 60 days |
| P3 | Low - Enhancement | 90 days |

---

## CATEGORY: LANGUAGE ENFORCEMENT

### LE-001: Create ESLint Plugin for Prohibited Terms
**Priority:** P0 | **Risk:** Low | **Owner:** Engineering

**Description:** Create `eslint-plugin-orbital-language` that rejects prohibited terms in string literals and template literals.

**Acceptance Criteria:**
- [ ] Plugin detects all terms from ORBITAL_CANON prohibited list
- [ ] Plugin runs on `*.ts`, `*.tsx` files
- [ ] Clear error messages with reference to ORBITAL_CANON.md
- [ ] Plugin published to internal registry

---

### LE-002: Add Language Lint to CI/CD Pipeline
**Priority:** P0 | **Risk:** Low | **Owner:** Engineering

**Description:** Add ESLint language check as required CI gate.

**Acceptance Criteria:**
- [ ] CI fails if prohibited terms detected
- [ ] Runs on all PRs
- [ ] Clear failure message in PR
- [ ] Documented in CONTRIBUTING.md

---

### LE-003: Create Export Template Registry
**Priority:** P1 | **Risk:** Low | **Owner:** Engineering

**Description:** Implement approved template system for all exports/artifacts.

**Acceptance Criteria:**
- [ ] Templates defined in `lib/export/templates.ts`
- [ ] Each template has version, hash, approval date
- [ ] No freeform text allowed in exports
- [ ] All copy from approved string constants

---

### LE-004: Localization Audit for Prohibited Terms
**Priority:** P1 | **Risk:** Medium | **Owner:** Product

**Description:** Audit all localization files for prohibited language.

**Acceptance Criteria:**
- [ ] All 7 language files audited
- [ ] Prohibited terms replaced with approved alternatives
- [ ] Lint rule runs on locales directory
- [ ] Sign-off from product owner

---

## CATEGORY: DATA INTEGRITY

### DI-001: Implement Signal Integrity Hashing
**Priority:** P0 | **Risk:** Medium | **Owner:** Engineering

**Description:** Add SHA-256 hash to each signal for integrity verification.

**Acceptance Criteria:**
- [ ] Hash computed on signal creation
- [ ] Hash stored with signal
- [ ] Verification function available
- [ ] Migration for existing signals (backfill hash)

---

### DI-002: Enforce Append-Only Signal Storage
**Priority:** P0 | **Risk:** Medium | **Owner:** Engineering

**Description:** Ensure signals can only be appended or soft-deleted, never modified.

**Acceptance Criteria:**
- [ ] Update operations blocked at storage layer
- [ ] Soft delete implemented with deletion record
- [ ] Audit log entry on any deletion
- [ ] Tests verify update rejection

---

### DI-003: Implement Derived Views Only Pattern
**Priority:** P1 | **Risk:** Low | **Owner:** Engineering

**Description:** Ensure all analytics are computed at query time, never cached.

**Acceptance Criteria:**
- [ ] No analytics tables in database
- [ ] All stats computed from raw signals
- [ ] Performance acceptable (< 500ms for 90-day view)
- [ ] Documentation updated

---

### DI-004: Signal Backup Automation
**Priority:** P0 | **Risk:** High | **Owner:** Engineering

**Description:** Implement automated daily backup of all signal data.

**Acceptance Criteria:**
- [ ] Daily backup scheduled
- [ ] Backup verification (restore test monthly)
- [ ] 90-day retention for hot backups
- [ ] Alert on backup failure

---

## CATEGORY: PERMISSIONS & ACCESS

### PA-001: Implement Role-Based Access Control
**Priority:** P0 | **Risk:** High | **Owner:** Engineering

**Description:** Implement full RBAC system per ENGINEERING_ENFORCEMENT_PLAN.md.

**Acceptance Criteria:**
- [ ] All roles defined (individual, family-admin, org-member, org-admin, etc.)
- [ ] Permissions matrix implemented
- [ ] Role checked on all data access
- [ ] Tests for each role/permission combination

---

### PA-002: Implement Tenant Isolation
**Priority:** P0 | **Risk:** High | **Owner:** Engineering

**Description:** Ensure complete data isolation between tenants.

**Acceptance Criteria:**
- [ ] All queries filtered by tenant ID
- [ ] Cross-tenant access impossible
- [ ] Penetration test verifies isolation
- [ ] Audit log on any access attempt

---

### PA-003: Implement Aggregate Minimum Enforcement
**Priority:** P1 | **Risk:** Medium | **Owner:** Engineering

**Description:** Enforce minimum cohort size (10) for aggregate views.

**Acceptance Criteria:**
- [ ] Aggregate queries check cohort size
- [ ] Return null if < 10 users
- [ ] UI shows "Insufficient data" message
- [ ] No workaround possible

---

### PA-004: Implement Read-Only Sharing Links
**Priority:** P1 | **Risk:** Medium | **Owner:** Engineering

**Description:** Create shareable read-only links with scope and expiration.

**Acceptance Criteria:**
- [ ] Link generation in sharing screen
- [ ] Scope selection (time range, data types)
- [ ] Expiration selection (7/14/30/90 days)
- [ ] Link revocation capability
- [ ] Watermark on shared view

---

## CATEGORY: DEMO MODE

### DM-001: Demo Data Namespace Isolation
**Priority:** P1 | **Risk:** Medium | **Owner:** Engineering

**Description:** Ensure demo mode uses completely separate storage.

**Acceptance Criteria:**
- [ ] Demo prefix for all storage keys
- [ ] Real data never touched in demo mode
- [ ] Switching modes is instant (no data migration)
- [ ] Tests verify isolation

---

### DM-002: Demo Watermark Implementation
**Priority:** P1 | **Risk:** Low | **Owner:** Engineering

**Description:** Add visible watermark when demo mode is active.

**Acceptance Criteria:**
- [ ] Watermark visible on all screens
- [ ] Watermark on all exports from demo mode
- [ ] Watermark on shared links from demo mode
- [ ] Cannot be disabled while in demo mode

---

### DM-003: Demo Seed/Reseed/Reset Functions
**Priority:** P1 | **Risk:** Low | **Owner:** Engineering

**Description:** Implement demo data lifecycle management.

**Acceptance Criteria:**
- [ ] Seed function generates realistic 90-day or 1-year data
- [ ] Reseed regenerates with new random seed
- [ ] Reset clears all demo data
- [ ] UI controls in Settings > Demo Mode

---

## CATEGORY: ARTIFACTS & EXPORTS

### AE-001: Implement 90-Day Summary PDF Generator
**Priority:** P1 | **Risk:** Medium | **Owner:** Engineering

**Description:** Create the canonical first artifact per FIRST_ARTIFACT_SPEC.md.

**Acceptance Criteria:**
- [ ] PDF matches spec layout exactly
- [ ] All sections included (summary, distribution, graph, patterns, governance)
- [ ] Verification hash embedded
- [ ] QR code for verification

---

### AE-002: Implement Artifact Verification Endpoint
**Priority:** P2 | **Risk:** Low | **Owner:** Engineering

**Description:** Public endpoint to verify artifact authenticity.

**Acceptance Criteria:**
- [ ] Endpoint at `/verify/[document-id]`
- [ ] Returns generation date, validity
- [ ] No user-identifying information exposed
- [ ] Rate limited

---

### AE-003: Implement Immutable Artifact Storage
**Priority:** P1 | **Risk:** Medium | **Owner:** Engineering

**Description:** Store generated artifacts immutably.

**Acceptance Criteria:**
- [ ] Artifacts stored in append-only storage
- [ ] Hash computed and stored on generation
- [ ] Cannot be modified after creation
- [ ] Retention policy applied

---

### AE-004: Implement Annual Summary PDF
**Priority:** P2 | **Risk:** Low | **Owner:** Engineering

**Description:** Create annual summary artifact for 365+ signal users.

**Acceptance Criteria:**
- [ ] Requires 365+ signals
- [ ] Quarterly breakdown included
- [ ] Year-over-year comparison (if applicable)
- [ ] Same verification as 90-day summary

---

### AE-005: Implement Deletion Certificate Generation
**Priority:** P2 | **Risk:** Medium | **Owner:** Engineering

**Description:** Generate formal deletion certificates per DATA_TRUST_POSITION.md.

**Acceptance Criteria:**
- [ ] Certificate generated on data deletion
- [ ] Includes verification hash
- [ ] Lists what was deleted
- [ ] Verifiable at public endpoint

---

## CATEGORY: AUDIT LOG

### AL-001: Implement Immutable Audit Log
**Priority:** P0 | **Risk:** High | **Owner:** Engineering

**Description:** Create append-only audit log with chain integrity.

**Acceptance Criteria:**
- [ ] Append-only (no update/delete)
- [ ] Each entry links to previous (hash chain)
- [ ] Chain integrity verifiable
- [ ] 7-year retention

---

### AL-002: Log All Data Access Events
**Priority:** P0 | **Risk:** Medium | **Owner:** Engineering

**Description:** Ensure all data access is logged.

**Acceptance Criteria:**
- [ ] Signal reads logged
- [ ] Aggregate queries logged
- [ ] Export generation logged
- [ ] Share access logged

---

### AL-003: Implement Audit Log Query Interface
**Priority:** P2 | **Risk:** Low | **Owner:** Engineering

**Description:** Allow authorized users to query audit log.

**Acceptance Criteria:**
- [ ] System admins can query full log
- [ ] Users can query their own events
- [ ] Filter by date range, action type
- [ ] Pagination supported

---

### AL-004: Implement Audit Log Export for Compliance
**Priority:** P2 | **Risk:** Medium | **Owner:** Engineering

**Description:** Export audit log for SOC 2 / HIPAA compliance.

**Acceptance Criteria:**
- [ ] Export in JSON and CSV
- [ ] Date range selectable
- [ ] Export itself logged
- [ ] Anonymization options

---

## CATEGORY: ACCESSIBILITY

### AC-001: Screen Reader Audit
**Priority:** P0 | **Risk:** Medium | **Owner:** Engineering

**Description:** Audit all screens for screen reader compatibility.

**Acceptance Criteria:**
- [ ] All interactive elements have accessibilityLabel
- [ ] All elements have appropriate accessibilityRole
- [ ] Navigation order logical
- [ ] Tested with VoiceOver and TalkBack

---

### AC-002: Dynamic Type Support Verification
**Priority:** P1 | **Risk:** Low | **Owner:** Engineering

**Description:** Verify app usable at 200% system font size.

**Acceptance Criteria:**
- [ ] All text scales with system setting
- [ ] No text truncation that loses meaning
- [ ] Layout remains usable
- [ ] Screenshots at 200% in test documentation

---

### AC-003: Reduced Motion Support
**Priority:** P1 | **Risk:** Low | **Owner:** Engineering

**Description:** Respect system reduced motion preference.

**Acceptance Criteria:**
- [ ] `useReducedMotion` hook implemented
- [ ] All animations check preference
- [ ] Static alternatives provided
- [ ] Tested with setting enabled

---

### AC-004: Touch Target Size Audit
**Priority:** P0 | **Risk:** Low | **Owner:** Engineering

**Description:** Ensure all touch targets are minimum 44x44 points.

**Acceptance Criteria:**
- [ ] All buttons meet minimum size
- [ ] All list items meet minimum size
- [ ] Automated test or manual audit complete
- [ ] Violations fixed

---

### AC-005: High Contrast Theme
**Priority:** P2 | **Risk:** Low | **Owner:** Engineering

**Description:** Implement high contrast color scheme option.

**Acceptance Criteria:**
- [ ] High contrast colors defined
- [ ] User can enable in accessibility settings
- [ ] Minimum 7:1 contrast ratio
- [ ] Tested with contrast analyzer

---

### AC-006: One-Action-Per-Screen Mode
**Priority:** P3 | **Risk:** Low | **Owner:** Engineering

**Description:** Implement simplified mode for cognitive accessibility.

**Acceptance Criteria:**
- [ ] Setting in accessibility preferences
- [ ] When enabled, only one primary action per screen
- [ ] Explicit navigation (no hidden gestures)
- [ ] Confirmations on separate screens

---

## CATEGORY: PHASE SYSTEM

### PS-001: Implement Phase Detection
**Priority:** P0 | **Risk:** Low | **Owner:** Engineering

**Description:** Implement `getPhase()` function per LONGITUDINAL_PHASES.md.

**Acceptance Criteria:**
- [ ] Correctly identifies phase 0-3
- [ ] Used throughout UI for feature gating
- [ ] Tested at boundary conditions (6, 7, 29, 30, 89, 90)
- [ ] Phase stored/cached appropriately

---

### PS-002: Implement Feature Gating by Phase
**Priority:** P1 | **Risk:** Medium | **Owner:** Engineering

**Description:** Gate all features by user's longitudinal phase.

**Acceptance Criteria:**
- [ ] Phase 0: No graphs, count only
- [ ] Phase 1: 7-day graph, basic stats
- [ ] Phase 2: 30-day graph, trends, patterns
- [ ] Phase 3: All features, artifacts
- [ ] UI shows appropriate empty/locked states

---

### PS-003: Implement Phase Transition Notifications
**Priority:** P2 | **Risk:** Low | **Owner:** Engineering

**Description:** Notify user when they transition to a new phase.

**Acceptance Criteria:**
- [ ] Subtle, non-intrusive notification
- [ ] Shows what's newly available
- [ ] Can be dismissed
- [ ] Logged in audit

---

## CATEGORY: ABSENCE HANDLING

### AH-001: Implement Gap Detection Algorithm
**Priority:** P1 | **Risk:** Low | **Owner:** Engineering

**Description:** Implement gap detection per ABSENCE_AS_SIGNAL_SPEC.md.

**Acceptance Criteria:**
- [ ] Gaps derived at query time (not stored)
- [ ] Categories: short (1-3), medium (4-14), extended (15+)
- [ ] Used only in 90+ day views
- [ ] Tests for edge cases

---

### AH-002: Implement Coverage Calculation
**Priority:** P1 | **Risk:** Low | **Owner:** Engineering

**Description:** Calculate signal coverage percentage.

**Acceptance Criteria:**
- [ ] Percentage of days with at least one signal
- [ ] Shown in quarterly summary only
- [ ] Neutral language ("78% of days")
- [ ] Not shown in daily/weekly views

---

### AH-003: Remove All Nudge/Reminder Code
**Priority:** P0 | **Risk:** Low | **Owner:** Engineering

**Description:** Audit and remove any nudge or reminder functionality.

**Acceptance Criteria:**
- [ ] No push notification code
- [ ] No email reminder code
- [ ] No "welcome back" messaging
- [ ] No streak/chain tracking

---

## CATEGORY: INSTITUTIONAL FEATURES

### IF-001: Implement Aggregate Dashboard
**Priority:** P2 | **Risk:** Medium | **Owner:** Engineering

**Description:** Create institutional dashboard showing aggregate-only data.

**Acceptance Criteria:**
- [ ] Only available to org-admin, org-viewer roles
- [ ] Minimum cohort size enforced (10)
- [ ] No individual drill-down
- [ ] Average capacity, distribution counts only

---

### IF-002: Implement Organization Management
**Priority:** P2 | **Risk:** Medium | **Owner:** Engineering

**Description:** Allow org admins to manage organization membership.

**Acceptance Criteria:**
- [ ] Invite users by email
- [ ] Remove users from org
- [ ] User consent required for data contribution
- [ ] User can leave org anytime

---

### IF-003: Implement Data Retention Controls
**Priority:** P2 | **Risk:** Medium | **Owner:** Engineering

**Description:** Allow users to set data retention preferences.

**Acceptance Criteria:**
- [ ] Options: 1 year, 3 years, 5 years, indefinite
- [ ] Automatic deletion at expiry
- [ ] User notification before deletion
- [ ] Override for institutional requirements

---

## CATEGORY: LEGAL & COMPLIANCE

### LC-001: Finalize Terms of Service
**Priority:** P0 | **Risk:** High | **Owner:** Legal

**Description:** Complete and publish Terms of Service.

**Acceptance Criteria:**
- [ ] Legal review complete
- [ ] Non-diagnostic language prominent
- [ ] Data handling aligned with DATA_TRUST_POSITION
- [ ] Published in Policy Center

---

### LC-002: Finalize Privacy Policy
**Priority:** P0 | **Risk:** High | **Owner:** Legal

**Description:** Complete and publish Privacy Policy.

**Acceptance Criteria:**
- [ ] GDPR compliant
- [ ] CCPA compliant
- [ ] Data collection clearly described
- [ ] Published in Policy Center

---

### LC-003: Create Non-Diagnostic Disclaimer
**Priority:** P0 | **Risk:** Medium | **Owner:** Legal/Product

**Description:** Create prominent non-diagnostic disclaimer.

**Acceptance Criteria:**
- [ ] Shown on first app open
- [ ] Included in all artifacts
- [ ] Included in all shared views
- [ ] Legal sign-off

---

### LC-004: Implement GDPR Data Export
**Priority:** P1 | **Risk:** Medium | **Owner:** Engineering

**Description:** Allow users to export all their data (GDPR right).

**Acceptance Criteria:**
- [ ] Export all signals
- [ ] Export all artifacts
- [ ] Export audit log entries
- [ ] JSON and CSV formats

---

### LC-005: Implement GDPR Data Deletion
**Priority:** P1 | **Risk:** High | **Owner:** Engineering

**Description:** Allow users to delete all their data (GDPR right).

**Acceptance Criteria:**
- [ ] Complete deletion within 30 days
- [ ] Deletion certificate generated
- [ ] Backup deletion within 90 days
- [ ] Anonymized audit entries retained

---

## CATEGORY: INFRASTRUCTURE

### IN-001: Implement Monitoring Dashboard
**Priority:** P0 | **Risk:** Medium | **Owner:** Engineering

**Description:** Create automated monitoring for system health.

**Acceptance Criteria:**
- [ ] Uptime monitoring
- [ ] Error rate tracking
- [ ] Backup success verification
- [ ] Alerts to founder on P0 issues

---

### IN-002: Implement Security Scanning
**Priority:** P1 | **Risk:** High | **Owner:** Engineering

**Description:** Automated security scanning in CI/CD.

**Acceptance Criteria:**
- [ ] Dependency vulnerability scanning
- [ ] SAST (static analysis)
- [ ] Secrets detection
- [ ] Alerts on critical findings

---

### IN-003: Implement Auto-Renewal for Certificates
**Priority:** P1 | **Risk:** Medium | **Owner:** Engineering

**Description:** Automate SSL/TLS certificate renewal.

**Acceptance Criteria:**
- [ ] Let's Encrypt or equivalent
- [ ] Auto-renewal 30 days before expiry
- [ ] Alert on renewal failure
- [ ] No manual intervention required

---

---

## SUMMARY

| Priority | Count | Focus |
|----------|-------|-------|
| P0 | 16 | Launch blockers |
| P1 | 18 | Institutional readiness |
| P2 | 11 | Full compliance |
| P3 | 3 | Enhancements |
| **Total** | **48** | |

---

## EXECUTION ORDER

### Phase 1: Launch Blockers (P0)
1. LE-001, LE-002 (Language enforcement)
2. DI-001, DI-002, DI-004 (Data integrity)
3. PA-001, PA-002 (Permissions)
4. AL-001, AL-002 (Audit log)
5. AC-001, AC-004 (Accessibility core)
6. PS-001 (Phase detection)
7. AH-003 (Remove nudges)
8. LC-001, LC-002, LC-003 (Legal)
9. IN-001 (Monitoring)

### Phase 2: Institutional Readiness (P1)
10. LE-003, LE-004 (Templates, localization)
11. DI-003 (Derived views)
12. PA-003, PA-004 (Aggregate, sharing)
13. DM-001, DM-002, DM-003 (Demo mode)
14. AE-001, AE-003 (Artifacts)
15. AC-002, AC-003 (Accessibility)
16. PS-002 (Feature gating)
17. AH-001, AH-002 (Absence)
18. LC-004, LC-005 (GDPR)
19. IN-002, IN-003 (Security)

### Phase 3: Full Compliance (P2)
20. AE-002, AE-004, AE-005 (More artifacts)
21. AL-003, AL-004 (Audit query/export)
22. AC-005 (High contrast)
23. PS-003 (Phase notifications)
24. IF-001, IF-002, IF-003 (Institutional)

### Phase 4: Enhancements (P3)
25. AC-006 (One-action mode)

---

*End of Document*
