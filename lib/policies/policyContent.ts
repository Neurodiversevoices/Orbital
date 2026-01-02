/**
 * Orbital Policy Documents
 *
 * Versioned legal content for institutional compliance.
 * All policies use calm, formal, institutional tone.
 * No marketing language.
 */

export interface PolicyDocument {
  id: string;
  title: string;
  version: string;
  effectiveDate: string;
  content: string;
}

export const POLICIES: Record<string, PolicyDocument> = {
  terms_of_service: {
    id: 'terms_of_service',
    title: 'Terms of Service',
    version: '1.0.0',
    effectiveDate: '2025-01-01',
    content: `ORBITAL TERMS OF SERVICE
Version 1.0.0 | Effective January 1, 2025

1. ACCEPTANCE OF TERMS

By accessing or using Orbital ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.

2. DESCRIPTION OF SERVICE

Orbital is a longitudinal capacity tracking tool that enables users to record self-reported functional capacity signals over time. The Service provides pattern visualization, trend analysis, and optional sharing features.

3. NON-DIAGNOSTIC NATURE

THE SERVICE IS NOT A MEDICAL DEVICE AND DOES NOT PROVIDE MEDICAL ADVICE, DIAGNOSIS, OR TREATMENT. Orbital records are self-reported observations only. The Service should not be used as a substitute for professional medical evaluation.

4. USER RESPONSIBILITIES

Users are responsible for:
- Maintaining the confidentiality of their account
- Ensuring the accuracy of information they provide
- Complying with applicable laws and regulations
- Using the Service only for its intended purpose

5. DATA OWNERSHIP

You retain ownership of your capacity data. Orbital stores and processes this data solely to provide the Service. You may export or delete your data at any time.

6. ACCEPTABLE USE

You agree not to:
- Use the Service for any unlawful purpose
- Attempt to gain unauthorized access
- Interfere with Service operation
- Share access credentials

7. TERMINATION

Either party may terminate this agreement at any time. Upon termination, you may export your data during the export window period before deletion.

8. LIMITATION OF LIABILITY

TO THE MAXIMUM EXTENT PERMITTED BY LAW, ORBITAL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.

9. MODIFICATIONS

We may modify these Terms at any time. Continued use after modifications constitutes acceptance of updated Terms.

10. GOVERNING LAW

These Terms are governed by applicable law in the jurisdiction of service operation.`,
  },

  privacy_policy: {
    id: 'privacy_policy',
    title: 'Privacy Policy',
    version: '1.0.0',
    effectiveDate: '2025-01-01',
    content: `ORBITAL PRIVACY POLICY
Version 1.0.0 | Effective January 1, 2025

1. INTRODUCTION

This Privacy Policy describes how Orbital collects, uses, and protects your information when you use our capacity tracking service.

2. INFORMATION WE COLLECT

2.1 Information You Provide
- Capacity state recordings (resourced, stretched, depleted)
- Category tags (sensory, demand, social)
- Optional notes you add to entries
- Account information if using sync features

2.2 Information Collected Automatically
- Device type and operating system
- App version
- Usage patterns (aggregate, anonymized)
- Error logs for debugging

3. HOW WE USE YOUR INFORMATION

We use your information to:
- Provide the capacity tracking service
- Generate pattern visualizations
- Enable data export features
- Improve service quality
- Respond to support requests

4. DATA STORAGE AND SECURITY

- Your data is stored locally on your device by default
- If sync is enabled, data is encrypted in transit and at rest
- We implement industry-standard security measures
- We do not sell your personal information

5. DATA SHARING

We may share data only:
- With your explicit consent (e.g., sharing features)
- To comply with legal obligations
- With service providers under strict confidentiality agreements
- In aggregate, anonymized form for research (with consent)

6. YOUR RIGHTS

You have the right to:
- Access your data
- Export your data
- Delete your data
- Revoke sharing permissions
- Withdraw from optional features

7. DATA RETENTION

- Active data: Retained while you use the Service
- After termination: Export window provided, then deletion
- Audit logs: Retained per compliance requirements

8. CHILDREN'S PRIVACY

Orbital is not intended for users under 13. If institutional deployment includes minors, appropriate consents must be obtained.

9. INTERNATIONAL USERS

Data may be processed in different jurisdictions. We comply with applicable data protection regulations.

10. CONTACT

For privacy questions, contact your institutional administrator or the designated privacy contact.

11. UPDATES

We may update this Privacy Policy. Material changes will be communicated through the Service.`,
  },

  data_retention_policy: {
    id: 'data_retention_policy',
    title: 'Data Retention Policy',
    version: '1.0.0',
    effectiveDate: '2025-01-01',
    content: `ORBITAL DATA RETENTION POLICY
Version 1.0.0 | Effective January 1, 2025

1. PURPOSE

This policy defines how long Orbital retains user data and the procedures for data lifecycle management.

2. RETENTION PERIODS

2.1 Active Capacity Data
- Personal accounts: Retained indefinitely or until deletion requested
- Institutional accounts: Per organizational retention policy (1-7 years typical)

2.2 Audit Logs
- Access and sharing events: 3 years minimum
- Export events: 3 years minimum
- Security events: 5 years minimum

2.3 Account Information
- Active accounts: Duration of service
- Terminated accounts: 30-day export window, then deletion

3. DELETION PROCEDURES

3.1 User-Initiated Deletion
- Users may delete individual entries at any time
- Users may request full account deletion
- Deletion is permanent and irreversible

3.2 Institutional Deletion
- Follows organizational offboarding procedures
- Export window provided before deletion
- Deletion certificate available upon completion

4. LEGAL HOLDS

Data may be retained beyond standard periods if:
- Required by legal process
- Subject to regulatory investigation
- Necessary for dispute resolution

5. VAULT STORAGE

For multi-year retention:
- Historical data is compressed and archived
- Identifiers are separated from pattern data
- Access requires elevated permissions

6. DATA PORTABILITY

Before deletion:
- Full data export available in multiple formats
- Export includes all capacity entries and metadata
- No data lock-in

7. COMPLIANCE

This policy complies with:
- General data protection principles
- Industry-specific requirements (as applicable)
- Institutional policies (when deployed organizationally)`,
  },

  non_diagnostic_disclaimer: {
    id: 'non_diagnostic_disclaimer',
    title: 'Non-Diagnostic Disclaimer',
    version: '1.0.0',
    effectiveDate: '2025-01-01',
    content: `ORBITAL NON-DIAGNOSTIC DISCLAIMER
Version 1.0.0 | Effective January 1, 2025

IMPORTANT NOTICE

Orbital is a self-reporting tool for tracking personal functional capacity. IT IS NOT A MEDICAL DEVICE.

1. NOT MEDICAL ADVICE

The information provided through Orbital:
- Does not constitute medical advice
- Does not provide diagnosis of any condition
- Should not replace professional medical consultation
- Is not validated for clinical decision-making

2. SELF-REPORTED DATA

All data in Orbital is:
- Self-reported by the user
- Subjective in nature
- Not independently verified
- Not clinically validated

3. PATTERN RECOGNITION LIMITATIONS

The pattern analysis features:
- Identify trends in self-reported data only
- Do not predict health outcomes
- Should not be used for treatment decisions
- Are informational, not prescriptive

4. INTENDED USE

Orbital is intended for:
- Personal longitudinal capacity awareness
- Communication support with care providers
- Pattern observation over time
- Institutional aggregate monitoring (non-clinical)

5. PROFESSIONAL GUIDANCE

If you have concerns about your health or capacity:
- Consult qualified healthcare providers
- Do not rely solely on Orbital data
- Share Orbital records with providers as supplementary information only

6. NO WARRANTIES

Orbital makes no warranties regarding:
- Accuracy of pattern analysis
- Applicability to any individual condition
- Suitability for any particular purpose

7. ACKNOWLEDGMENT

By using Orbital, you acknowledge that you understand:
- This is not a diagnostic tool
- Professional medical advice should be sought for health concerns
- Self-reported data has inherent limitations`,
  },

  cancellation_refund_policy: {
    id: 'cancellation_refund_policy',
    title: 'Cancellation & Refund Policy',
    version: '1.0.0',
    effectiveDate: '2025-01-01',
    content: `ORBITAL CANCELLATION & REFUND POLICY
Version 1.0.0 | Effective January 1, 2025

1. FREE SERVICE TIERS

For free usage tiers:
- No payment required, no refund applicable
- Service may be discontinued at any time
- Data export available before termination

2. PAID SERVICE TIERS

2.1 Subscription Cancellation
- Cancel at any time through account settings
- Access continues until end of current billing period
- No partial-period refunds

2.2 Annual Subscriptions
- May be cancelled for pro-rated refund within 30 days
- After 30 days, no refund; access continues until term end

3. INSTITUTIONAL AGREEMENTS

For enterprise and institutional deployments:
- Terms governed by individual service agreements
- Refund policies as specified in contract
- Contact your account representative for questions

4. DATA AFTER CANCELLATION

Upon cancellation:
- 30-day export window provided
- Data deleted after export window
- Deletion certificate available upon request

5. SERVICE CHANGES

If we discontinue service:
- Advance notice provided
- Export window extended
- Pro-rated refund for prepaid periods

6. DISPUTES

For billing disputes:
- Contact support within 60 days of charge
- Provide transaction details
- Resolution within 30 business days`,
  },

  jurisdiction_governing_law: {
    id: 'jurisdiction_governing_law',
    title: 'Jurisdiction & Governing Law',
    version: '1.0.0',
    effectiveDate: '2025-01-01',
    content: `ORBITAL JURISDICTION & GOVERNING LAW
Version 1.0.0 | Effective January 1, 2025

1. GOVERNING LAW

These terms and your use of Orbital are governed by applicable law in the jurisdiction where the Service is provided.

2. DISPUTE RESOLUTION

2.1 Informal Resolution
Parties agree to attempt informal resolution before formal proceedings.

2.2 Arbitration
Subject to applicable law, disputes may be resolved through binding arbitration.

2.3 Class Action Waiver
To the extent permitted by law, claims must be brought individually.

3. INTERNATIONAL USERS

3.1 Data Transfer
Data may be transferred to and processed in various jurisdictions.

3.2 Local Compliance
We comply with applicable local data protection laws including:
- GDPR for EU users
- CCPA for California users
- Other applicable regional requirements

4. INSTITUTIONAL DEPLOYMENTS

For organizational deployments:
- Jurisdiction may be specified in service agreement
- Local requirements take precedence where mandated
- Compliance certifications available upon request

5. SEVERABILITY

If any provision is found unenforceable, remaining provisions continue in effect.

6. ENTIRE AGREEMENT

These terms, together with the Privacy Policy and applicable service agreements, constitute the entire agreement between parties.`,
  },
};

export const POLICY_ORDER = [
  'terms_of_service',
  'privacy_policy',
  'data_retention_policy',
  'non_diagnostic_disclaimer',
  'cancellation_refund_policy',
  'jurisdiction_governing_law',
];

export function getPolicy(id: string): PolicyDocument | null {
  return POLICIES[id] || null;
}

export function getAllPolicies(): PolicyDocument[] {
  return POLICY_ORDER.map(id => POLICIES[id]);
}
