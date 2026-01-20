# Orbital Security Incident Playbook

## Quick Reference

| Severity | Response Time | Escalation Path |
|----------|---------------|-----------------|
| P0 (Critical) | 15 min | On-call + Engineering Lead |
| P1 (High) | 1 hour | On-call Engineer |
| P2 (Medium) | 4 hours | Next business day |

---

## 1. Incident Detection

Security alerts are triggered automatically for:
- `WEBHOOK_SIGNATURE_INVALID` - Stripe webhook tampering attempt
- `SKU_VALIDATION_FAILED` - Attempted price/product manipulation
- `SESSION_OWNER_MISMATCH` - User trying to access another's session
- `AUTH_FAILURE` - Failed authentication (potential brute force)
- `RATE_LIMIT_EXCEEDED` - API abuse or DDoS attempt
- `PURCHASE_FAILED` - Payment flow failure (revenue impact)

**Alert Delivery:**
- Webhook: `SECURITY_ALERT_WEBHOOK` env var (Slack/PagerDuty)
- Logs: Vercel Functions logs + Supabase `security_audit_log` table

---

## 2. Initial Triage (First 15 minutes)

### Step 1: Acknowledge & Assess
```bash
# Query recent security events
SELECT * FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Step 2: Classify Severity
- **P0 Critical**: Active exploitation, data breach, payment system compromise
- **P1 High**: Repeated auth failures from same IP, webhook signature failures
- **P2 Medium**: Isolated rate limit hits, single failed auth attempts

### Step 3: Contain (if P0/P1)
```bash
# Block IP at Vercel level (if persistent abuse)
# Add to BLOCKED_IPS environment variable

# Rotate compromised credentials immediately:
# - Stripe webhook secret
# - Supabase service role key
```

---

## 3. Incident Response by Type

### A. Webhook Signature Failures
**Symptoms:** `WEBHOOK_SIGNATURE_INVALID` events
**Possible Causes:**
1. Attacker attempting to forge webhook calls
2. Webhook secret mismatch (deployment issue)
3. Request replay attack

**Response:**
1. Check if events correlate with legitimate Stripe activity (Dashboard > Developers > Webhooks)
2. If mismatch: Verify `STRIPE_WEBHOOK_SECRET_*` env vars match Stripe Dashboard
3. If attack: Document source IP, consider IP block, file report with Stripe

### B. SKU Validation Failures
**Symptoms:** `SKU_VALIDATION_FAILED` events
**Possible Causes:**
1. Attacker attempting to create checkout for unauthorized products
2. Client-side bug sending wrong product IDs
3. Outdated product catalog

**Response:**
1. Check `productId` in event details against `skuValidation.ts` catalog
2. If legitimate product missing: Update catalog and redeploy
3. If attack: Document pattern, user ID if authenticated

### C. Session Owner Mismatch
**Symptoms:** `SESSION_OWNER_MISMATCH` events
**Possible Causes:**
1. User A trying to verify User B's checkout session (IDOR attempt)
2. Session sharing/link forwarding

**Response:**
1. This is a blocked attack - no action needed unless pattern emerges
2. If repeated from same user: Consider account review
3. Log for compliance records

### D. Rate Limit Exceeded
**Symptoms:** `RATE_LIMIT_EXCEEDED` events
**Possible Causes:**
1. Legitimate high traffic (viral growth)
2. Scraping/enumeration attack
3. DDoS attempt

**Response:**
1. Check if single IP or distributed
2. Single IP: Likely abuse - monitor, block if persistent
3. Distributed: May be legitimate - consider raising limits temporarily

### E. Repeated Auth Failures
**Symptoms:** Multiple `AUTH_FAILURE` from same IP
**Possible Causes:**
1. Credential stuffing attack
2. User forgot password
3. Token expiration issues

**Response:**
1. If >10 failures/min from same IP: Block IP
2. If specific user targeted: Force password reset, notify user
3. Review for account takeover indicators

---

## 4. Post-Incident

### Document
- Timeline of events
- Actions taken
- Root cause (if determined)
- Preventive measures

### Review
- Update this playbook if new attack vector discovered
- Consider additional monitoring/alerting
- Debrief with team within 48 hours for P0/P1

### Communicate (if data breach)
- Legal review required
- User notification per privacy policy
- Regulatory reporting if required (GDPR, etc.)

---

## 5. Key Contacts

| Role | Contact |
|------|---------|
| Engineering On-Call | [Configure in PagerDuty] |
| Stripe Support | https://support.stripe.com |
| Supabase Support | https://supabase.com/support |
| Legal/Privacy | [Internal contact] |

---

## 6. Environment Variables Checklist

Required for security controls:
- `SUPABASE_URL` - Database connection
- `SUPABASE_SERVICE_ROLE_KEY` - Service access
- `STRIPE_SECRET_KEY_TEST` / `STRIPE_SECRET_KEY_LIVE` - API access
- `STRIPE_WEBHOOK_SECRET_TEST` / `STRIPE_WEBHOOK_SECRET_LIVE` - Webhook verification
- `SECURITY_ALERT_WEBHOOK` - Alert delivery (Slack/PagerDuty)
- `ALLOWED_ORIGINS` - CORS whitelist (defaults to orbital.health)

---

*Last Updated: 2026-01-20*
