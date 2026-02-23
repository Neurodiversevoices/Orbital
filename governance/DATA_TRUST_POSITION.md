# DATA TRUST POSITION

**Classification:** EXTERNAL
**Version:** 1.0.0
**Effective Date:** 2025-01-01
**Status:** APPROVED FOR INSTITUTIONAL DISTRIBUTION

---

## 1. EXECUTIVE SUMMARY

Orbital maintains a governance-first approach to capacity signal data. This document defines what Orbital will never do, what Orbital permits only under governance, and the technical controls that enforce these commitments.

This position is designed to satisfy:
- Enterprise procurement requirements
- Healthcare payer due diligence
- Pharmaceutical partnership evaluation
- Acquisition technical review
- Regulatory compliance assessment

---

## 2. ABSOLUTE PROHIBITIONS

Orbital commits to the following prohibitions without exception or amendment:

### 2.1 Data Monetization Prohibitions

| Prohibition | Statement |
|-------------|-----------|
| **P-001** | Orbital will NEVER sell individual user data to any third party |
| **P-002** | Orbital will NEVER sell aggregate data as a standalone product |
| **P-003** | Orbital will NEVER license user data for advertising purposes |
| **P-004** | Orbital will NEVER share data with data brokers or aggregators |
| **P-005** | Orbital will NEVER use data to build user profiles for sale |

### 2.2 Surveillance Prohibitions

| Prohibition | Statement |
|-------------|-----------|
| **P-010** | Orbital will NEVER provide individual-level monitoring to employers |
| **P-011** | Orbital will NEVER alert managers about specific employee capacity states |
| **P-012** | Orbital will NEVER enable real-time surveillance of user behavior |
| **P-013** | Orbital will NEVER track location, device usage, or biometric data |
| **P-014** | Orbital will NEVER correlate capacity data with performance metrics |

### 2.3 Diagnostic Prohibitions

| Prohibition | Statement |
|-------------|-----------|
| **P-020** | Orbital will NEVER provide clinical diagnoses |
| **P-021** | Orbital will NEVER screen for medical or psychological conditions |
| **P-022** | Orbital will NEVER claim therapeutic or treatment value |
| **P-023** | Orbital will NEVER replace professional clinical assessment |
| **P-024** | Orbital will NEVER use clinical terminology in user-facing content |

### 2.4 Behavioral Scoring Prohibitions

| Prohibition | Statement |
|-------------|-----------|
| **P-030** | Orbital will NEVER generate "risk scores" for individuals |
| **P-031** | Orbital will NEVER predict future behavior or performance |
| **P-032** | Orbital will NEVER rank or compare users against each other |
| **P-033** | Orbital will NEVER inform hiring, firing, or promotion decisions |
| **P-034** | Orbital will NEVER contribute to insurance underwriting |

---

## 3. GOVERNANCE-CONTROLLED OPERATIONS

The following operations are permitted only under explicit governance controls:

### 3.1 Data Sharing (User-Initiated)

| Operation | Governance Requirements |
|-----------|------------------------|
| Share with individual | User initiates, selects recipient, sets expiration |
| Share with clinician | User initiates, HIPAA-aware recipient, audit logged |
| Share with institution | User consents, aggregate-only, no individual identification |
| Export personal data | User initiates, full or partial, any time |

### 3.2 Institutional Access

| Operation | Governance Requirements |
|-----------|------------------------|
| Aggregate dashboard | Minimum 10 users per cohort, no individual drill-down |
| Trend reporting | Cohort-level only, no identification of individuals |
| Research participation | Separate consent, IRB approval, anonymization |

### 3.3 Data Retention

| Operation | Governance Requirements |
|-----------|------------------------|
| Default retention | User-controlled, no automatic deletion |
| Deletion request | Processed within 30 days, deletion certificate issued |
| Institutional retention | Per-agreement (1/3/5 years), user-overridable |
| Research retention | Per-IRB protocol, anonymized only |

---

## 4. READ-ONLY SHARING MODEL

### 4.1 Scope Controls

All shared views enforce:

| Control | Implementation |
|---------|----------------|
| Read-only | No edit, save, or modification capability |
| Scoped | User selects which time range to share |
| Attributed | Shared views watermarked with recipient info |
| Revocable | User can revoke access at any time |

### 4.2 Expiration Rules

| Share Type | Default | Minimum | Maximum |
|------------|---------|---------|---------|
| Personal share | 14 days | 1 day | 90 days |
| Clinical share | 30 days | 7 days | 180 days |
| Institutional | 90 days | 30 days | 365 days |
| Research | Per protocol | N/A | Study duration |

### 4.3 Access Logging

All share access is logged:

| Event | Logged Data |
|-------|-------------|
| Share created | User ID, recipient type, scope, expiration, timestamp |
| Share accessed | Share ID, accessor IP (hashed), timestamp |
| Share revoked | Share ID, revocation reason (optional), timestamp |
| Share expired | Share ID, auto-expired flag, timestamp |

---

## 5. DELETION CONTROLS

### 5.1 User Deletion Rights

Users may delete:

| Scope | Process | Timeline |
|-------|---------|----------|
| Individual signals | In-app deletion | Immediate |
| Date range | In-app deletion | Immediate |
| All data | Account deletion request | 30 days |
| Specific shares | Revoke access | Immediate |

### 5.2 Deletion Certificates

Upon complete data deletion:

```
┌─────────────────────────────────────────────────────────────┐
│                  ORBITAL DATA DELETION CERTIFICATE          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Certificate ID: [UUID]                                     │
│  Issued: [Date/Time]                                        │
│                                                             │
│  This certifies that all data associated with:              │
│  Account ID: [Hashed ID]                                    │
│                                                             │
│  Has been permanently deleted from:                         │
│  ✓ Primary storage                                          │
│  ✓ Backup systems (within 90 days)                          │
│  ✓ Derived artifacts                                        │
│  ✓ Audit logs (anonymized, retained for compliance)         │
│                                                             │
│  Deletion method: Cryptographic erasure                     │
│  Verification hash: [SHA-256]                               │
│                                                             │
│  This certificate may be verified at:                       │
│  orbitalhealth.app/verify/deletion/[certificate-id]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Backup Retention

| Storage Type | Deletion Timeline |
|--------------|-------------------|
| Primary database | Immediate |
| Hot backups | 7 days |
| Cold backups | 90 days |
| Disaster recovery | 90 days |

---

## 6. AUDIT LOG DESIGN

### 6.1 Immutability

Audit logs are:
- Append-only (no modification or deletion)
- Cryptographically signed
- Stored in separate, access-controlled infrastructure
- Retained for minimum 7 years

### 6.2 Log Contents

| Event Category | Logged Fields |
|----------------|---------------|
| Authentication | User ID (hashed), timestamp, method, success/failure |
| Data access | User ID, data scope, accessor identity, timestamp |
| Data modification | User ID, modification type, before/after hash, timestamp |
| Sharing | Share ID, recipient type, scope, expiration, timestamp |
| Deletion | Deletion scope, certificate ID, timestamp |
| Export | Export type, scope, timestamp |

### 6.3 Compliance Export

Audit logs are exportable for:
- SOC 2 Type II audits
- HIPAA compliance verification
- Regulatory inquiries (with legal process)
- User data access requests

---

## 7. RETENTION CONTROLS

### 7.1 User-Controlled Retention

| Setting | Options |
|---------|---------|
| Default | Indefinite (user chooses deletion) |
| Automatic | 1 year / 3 years / 5 years / Never |
| Reminder | Optional annual reminder to review |

### 7.2 Institutional Retention

| Agreement Type | Default Retention | Override |
|----------------|-------------------|----------|
| Employer benefit | 3 years | User may delete earlier |
| Healthcare integration | 7 years | Per HIPAA requirements |
| Research protocol | Study duration | Per IRB approval |

### 7.3 Retention After Termination

| Scenario | Behavior |
|----------|----------|
| User cancels subscription | Data retained, access limited to export |
| Employer terminates contract | User data remains with user |
| Orbital discontinues service | 12-month export window, then deletion |

---

## 8. TECHNICAL ENFORCEMENT

### 8.1 Architecture Controls

| Control | Implementation |
|---------|----------------|
| Data isolation | Per-user encryption keys |
| Access control | Role-based, principle of least privilege |
| Aggregate queries | Differential privacy, minimum cohort size |
| API rate limiting | Prevents bulk extraction |

### 8.2 Monitoring

| Monitor | Alert Condition |
|---------|-----------------|
| Unusual access patterns | >10x normal query volume |
| Bulk export attempts | Automatic block + investigation |
| Permission escalation | Requires multi-party approval |
| Audit log access | Logged and reviewed weekly |

---

## 9. ACQUISITION / PARTNERSHIP CONSIDERATIONS

### 9.1 Data Transfer Restrictions

In any acquisition or partnership:

| Restriction | Commitment |
|-------------|------------|
| Data stays with users | No bulk transfer without user consent |
| Governance survives | Data trust position survives acquisition |
| User notification | 90-day advance notice of any change |
| Opt-out right | Users may export and delete before transfer |

### 9.2 Due Diligence Support

Orbital provides:
- SOC 2 Type II report
- HIPAA compliance documentation (where applicable)
- Data flow diagrams
- Security architecture review
- Audit log samples (anonymized)
- Deletion certificate samples

---

## 10. CONTACT

For data governance inquiries:

**Data Protection Officer**
governance@orbitalhealth.app

For institutional partnership inquiries:

**Institutional Partnerships**
institutions@orbitalhealth.app

---

*This document represents Orbital's binding commitment to data governance. Violations may be reported to governance@orbitalhealth.app.*

---

*End of Document*
