# Pattern History Retention - Legal Clauses

**Version:** 1.0
**Effective Date:** January 2025
**Company:** Orbital Health Intelligence, Inc.

---

## Privacy Policy Additions

### Section: Data Retention

**Heading: Pattern History Retention**

We retain pattern history data indefinitely to improve our products and services. Pattern history includes de-identified capacity signals, timestamps, and derived analytics (such as day-of-week patterns and trend indicators).

**What We Retain:**
- Normalized capacity measurements
- Timestamps and time-based patterns
- Category associations (sensory, demand, social)
- Session and engagement metadata
- Derived pattern analytics

**What We Remove Upon Deletion:**
- Your user identity and account linkage
- Personal notes and text content
- Device identifiers
- Any information that could directly identify you

**Why We Retain Pattern History:**
- Product improvement and quality assurance
- Safety, security, and fraud prevention
- Analytics and aggregate insights
- Research and model development (with appropriate consent)

**Retention Duration:**
Pattern history is retained permanently in de-identified form. This data cannot be traced back to you after your account is deleted or you request data deletion.

---

### Section: Deletion Requests

**Heading: What Happens When You Delete Data**

When you delete your data or account, we:

1. **Remove from your view:** Deleted items no longer appear in your app or history.

2. **Unlink your identity:** We remove the connection between your account and the pattern history records. Your user ID is replaced with a non-reversible hash.

3. **Remove personal content:** Any notes, text entries, or personal identifiers are permanently removed from the retained records.

4. **Retain de-identified patterns:** We keep de-identified pattern history (capacity states, timestamps, and derived analytics) for the purposes described above.

**Important:** Deleting your data removes it from your personal view and unlinks your identity, but does not erase the underlying de-identified pattern history. This applies to all product modes (Personal, Family, Clinician-Share, Org-Pilot, Enterprise).

---

## Terms of Service Additions

### Section: Data Practices

**Heading: Pattern History and Retention**

By using Orbital, you acknowledge and agree that:

1. **Pattern History Collection:** We collect and retain pattern history derived from your capacity signals. This includes normalized capacity measurements, timestamps, categories, and derived analytics.

2. **Permanent Retention:** Pattern history is retained indefinitely in de-identified form for product improvement, analytics, safety, and fraud prevention purposes.

3. **Deletion Scope:** When you delete data or your account, we remove personal identifiers and unlink your identity from pattern history. The de-identified pattern data remains in our systems.

4. **No Full Erasure:** You understand that requesting deletion removes your access and personal linkage but does not erase retained de-identified pattern history.

5. **All Modes:** This retention policy applies to all product modes and features.

---

### Section: User Rights

**Heading: Your Data Rights**

You have the right to:

- **Access:** View your active pattern history through the app
- **Export:** Download your data in standard formats
- **Delete:** Remove data from your view and unlink your identity
- **Portability:** Transfer your active data to another service

You acknowledge that:

- Deletion removes your access and identity linkage but not de-identified pattern history
- We retain de-identified data for legitimate business purposes
- Some jurisdictions may provide additional rights (see Jurisdiction-Specific Rights below)

---

### Section: Jurisdiction-Specific Rights

**Heading: Additional Rights by Region**

**For users in the European Union (GDPR) or United Kingdom:**
Where required by law, you may request erasure of personal data. Our de-identification process is designed to render data non-personal under applicable law. If you believe you have grounds for complete erasure, please contact privacy@orbitalhealth.app.

**For users in California (CCPA):**
California residents have the right to request deletion of personal information. Our de-identification process removes personal identifiers. De-identified data is not considered personal information under CCPA.

---

## In-App Disclosure Text

### Delete History Confirmation

**Short version (for dialogs):**
> Deleting removes this from your view. We retain pattern history for system improvement and safety.

**Full version (for help/FAQ):**
> When you delete data, it is removed from your personal view and any linked identity information is removed. However, we retain de-identified pattern history permanently for product improvement, analytics, safety, and fraud prevention. This data cannot be traced back to you after deletion.

### Delete Account Confirmation

> Deleting your account removes your personal information and unlinks your identity from all data. Pattern history is retained in de-identified form for product improvement, analytics, safety, and fraud prevention purposes.

---

## Compliance Notes

**TODO: Legal Review Required**

1. **GDPR Article 17 (Right to Erasure):** Review whether de-identification satisfies erasure requirements. Consider adding a narrow exception path for verified complete erasure requests.

2. **CCPA:** Confirm de-identified data exclusion applies to pattern history retention.

3. **HIPAA (if applicable):** If expanding to HIPAA-covered contexts, review retention against minimum necessary standards.

4. **FERPA (if applicable):** For educational institution deployments, ensure retention aligns with educational records requirements.

5. **Children's Privacy:** If users under 13/16 are permitted, review retention against COPPA/age-appropriate design code requirements.

**Implementation Status:**
- [x] De-identification function implemented
- [x] Soft-delete replaces hard-delete
- [x] UI disclosure added
- [x] Audit trail for modifications
- [ ] Legal review of clauses
- [ ] Jurisdiction-specific exception paths
- [ ] Annual retention policy review process

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2025 | Initial retention policy clauses |
