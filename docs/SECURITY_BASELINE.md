# Orbital Security Baseline Statement

**Version:** 1.0
**Date:** 2026-01-20
**Status:** Production Ready

---

## Executive Summary

Orbital implements defense-in-depth security controls across authentication, authorization, payment processing, and API security layers. All critical security controls have been implemented and verified.

---

## Security Controls Matrix

| Control | Status | Implementation |
|---------|--------|----------------|
| Authentication | ACTIVE | Supabase Auth (JWT, Magic Link, OAuth) |
| Authorization | ACTIVE | Token-based, server-side user ID extraction |
| Rate Limiting | ACTIVE | Token bucket per IP (configurable per endpoint) |
| CORS | ACTIVE | Origin allowlist (orbital.health by default) |
| Webhook Verification | ACTIVE | Stripe signature validation |
| SKU Validation | ACTIVE | Server-side product catalog (no client trust) |
| Idempotency | ACTIVE | UNIQUE constraint on stripe_session_id |
| Audit Logging | ACTIVE | All security events to Supabase + console |
| Security Alerting | ACTIVE | Webhook-based alerts for critical events |

---

## Authentication & Authorization

### Implementation
- **Provider:** Supabase Auth
- **Methods:** Magic Link (email), OAuth (Google, Apple)
- **Token Format:** JWT with expiration
- **Validation:** Server-side via `supabase.auth.getUser(token)`

### Security Properties
- User ID extracted from verified JWT (never from client input)
- Session ownership verified before accessing resources
- Failed auth attempts logged and alerted

---

## Payment Security

### Stripe Integration
- **Mode:** Test/Live configurable via `EXPO_PUBLIC_PAYMENTS_MODE`
- **Checkout:** Server-created sessions only
- **Webhooks:** Signature verification required

### Entitlement Protection
- **SKU Validation:** Server-side product catalog (`skuValidation.ts`)
- **Price IDs:** Environment variables or server-side mapping
- **Idempotency:** Database UNIQUE constraint prevents double-grants
- **Session Ownership:** Authenticated user must match session metadata

---

## API Security

### Rate Limits (per IP, per minute)
| Endpoint Type | Limit |
|---------------|-------|
| Auth | 10 req/min |
| Checkout | 20 req/min |
| Entitlements | 60 req/min |
| Verify Session | 30 req/min |
| Webhook | 1000 req/min |

### CORS Policy
- **Production:** `https://orbital.health`, `https://www.orbital.health`, `https://app.orbital.health`
- **Development:** localhost, Vercel previews, ngrok (NODE_ENV != production)
- **Override:** `ALLOWED_ORIGINS` environment variable

---

## Audit & Monitoring

### Logged Events
- AUTH_SUCCESS / AUTH_FAILURE
- PURCHASE_INITIATED / PURCHASE_COMPLETED / PURCHASE_FAILED
- ENTITLEMENT_GRANTED / ENTITLEMENT_DENIED
- WEBHOOK_RECEIVED / WEBHOOK_SIGNATURE_INVALID
- RATE_LIMIT_EXCEEDED / CORS_REJECTED
- SKU_VALIDATION_FAILED / SESSION_OWNER_MISMATCH

### Alert Triggers
Critical events automatically trigger alerts via `SECURITY_ALERT_WEBHOOK`:
- Webhook signature failures
- SKU validation failures
- Session owner mismatches
- Repeated auth failures
- Rate limit exceeded
- Purchase/webhook processing failures

### Log Storage
- **Primary:** Supabase `security_audit_log` table
- **Secondary:** Vercel Functions console (structured JSON)
- **Retention:** Configurable per Supabase plan

---

## Data Protection

### Sensitive Data Handling
- No PII logged beyond user IDs
- Tokens/secrets automatically redacted from logs
- Service role key restricted to server-side only
- RLS policies on entitlement tables

### Input Validation
- Product IDs validated against server catalog
- Session IDs validated via Stripe API
- User input sanitized before database operations

---

## Deployment Security

### Environment Variables Required
```
# Supabase
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

# Stripe
STRIPE_SECRET_KEY_TEST
STRIPE_SECRET_KEY_LIVE
STRIPE_WEBHOOK_SECRET_TEST
STRIPE_WEBHOOK_SECRET_LIVE

# Security
SECURITY_ALERT_WEBHOOK
ALLOWED_ORIGINS (optional, defaults to orbital.health)
```

### Pre-Deployment Checklist
1. All environment variables configured
2. Stripe webhook endpoints registered
3. `security-verification.sh` passes all tests
4. Supabase schema migrations applied
5. Alert webhook verified

---

## Verification

Security controls can be verified using:
```bash
./scripts/security-verification.sh https://your-domain.vercel.app
```

Tests include:
- Rate limiting triggers at threshold
- CORS rejects unauthorized origins
- Auth required for protected endpoints
- Invalid tokens rejected
- Tampered SKUs rejected
- Webhook signatures verified

---

## Compliance Notes

- **Payment Data:** Handled entirely by Stripe (PCI DSS compliant)
- **Authentication:** Handled by Supabase (SOC 2 compliant)
- **Audit Trail:** Immutable security event log maintained
- **Data Minimization:** Only essential data stored

---

## Incident Response

See [INCIDENT_PLAYBOOK.md](./INCIDENT_PLAYBOOK.md) for response procedures.

---

## Attestation

This security baseline has been implemented and verified as of the date above. All controls are active and functioning as documented.

**Verified Controls:**
- [x] Rate limiting on all sensitive endpoints
- [x] CORS origin restrictions
- [x] Authentication required for user data access
- [x] Server-side SKU validation
- [x] Webhook signature verification
- [x] Session owner verification
- [x] Idempotent entitlement grants
- [x] Security audit logging
- [x] Alert integration

---

*This document should be reviewed and updated with any security-relevant changes.*
