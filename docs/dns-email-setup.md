# DNS Records Checklist — Email Infrastructure Setup

**Date:** February 2026
**Domains:** `orbital.health` (primary), `go.orbital.health` (Apollo cold outreach subdomain)
**Current email host:** Zoho Mail (for `orbital.health`)

---

## Overview

You need DNS records for two things:

1. **`go.orbital.health`** — New Zoho subdomain for Apollo cold outreach (`eric@go.orbital.health`)
2. **`orbital.health`** — Resend verification for transactional email (waitlist welcome emails from `eric@orbital.health`)

**Important:** A domain can only have ONE SPF record. Since `orbital.health` already uses Zoho, the root SPF record must include BOTH Zoho and Resend via `include:` directives.

---

## Part 1: `go.orbital.health` — Zoho Subdomain for Apollo

### Step 1: Add subdomain in Zoho Mail Admin Console

1. Go to **Zoho Mail Admin Console → Domains → Add Domain**
2. Add `go.orbital.health` as a subdomain
3. Create the mailbox `eric@go.orbital.health`

### Step 2: DNS Records to Add

All records below go in your domain registrar's DNS dashboard.

#### MX Records (receive mail at `go.orbital.health`)

| Type | Host/Name        | Value           | Priority | TTL  |
|------|------------------|-----------------|----------|------|
| MX   | `go`             | `mx.zoho.com`   | 10       | 3600 |
| MX   | `go`             | `mx2.zoho.com`  | 20       | 3600 |
| MX   | `go`             | `mx3.zoho.com`  | 50       | 3600 |

> **Note:** If your Zoho account is on a regional data center (EU, India, Australia, Japan), use the corresponding suffix: `mx.zoho.eu`, `mx.zoho.in`, `mx.zoho.com.au`, or `mx.zoho.jp`. Check your Zoho Admin Console for the exact values.

#### SPF Record

| Type | Host/Name | Value                                    | TTL  |
|------|-----------|------------------------------------------|------|
| TXT  | `go`      | `v=spf1 include:zohomail.com ~all`       | 3600 |

> Only one SPF record per subdomain. If Apollo also sends from this subdomain, you may need to add Apollo's SPF include too (check Apollo's domain auth settings).

#### DKIM Record

| Type | Host/Name                   | Value                              | TTL  |
|------|-----------------------------|------------------------------------|------|
| TXT  | `zmail._domainkey.go`       | *(copy from Zoho Admin Console)*   | 3600 |

> Go to **Zoho Admin Console → go.orbital.health → Email Configuration → DKIM → Add**. Select 2048-bit key length. Copy the full TXT value provided and paste it as the record value.

#### DMARC Record

| Type | Host/Name   | Value                                                                 | TTL  |
|------|-------------|-----------------------------------------------------------------------|------|
| TXT  | `_dmarc.go` | `v=DMARC1; p=none; rua=mailto:dmarc@go.orbital.health; pct=100; adkim=r; aspf=r` | 3600 |

> Start with `p=none` (monitoring only). After confirming deliverability, escalate to `p=quarantine` then `p=reject`.

---

## Part 2: `orbital.health` — Resend for Transactional Email

### Step 1: Set up in Resend Dashboard

1. Go to **[resend.com/domains](https://resend.com/domains)** → Add Domain → `orbital.health`
2. Resend will generate **domain-specific** DNS records for you. The exact values below are templates — **copy the actual values from Resend's dashboard.**

### Step 2: DNS Records to Add

Resend uses a `send` subdomain (e.g., `send.orbital.health`) for SPF/bounce processing, and puts DKIM records on your root domain.

#### SPF / Bounce MX (on Resend's send subdomain)

| Type | Host/Name              | Value                                     | Priority | TTL  |
|------|------------------------|-------------------------------------------|----------|------|
| MX   | `send`                 | `feedback-smtp.us-east-1.amazonses.com`   | 10       | 3600 |
| TXT  | `send`                 | `v=spf1 include:amazonses.com ~all`       | 3600     |

> **These are approximate.** Resend will show you the exact hostname and value. The `send` prefix may differ if you customize the Return Path in Resend.

#### DKIM Records

Resend typically provides 3 CNAME records for DKIM:

| Type  | Host/Name                                       | Value                                      | TTL  |
|-------|------------------------------------------------|--------------------------------------------|------|
| CNAME | `resend._domainkey`                            | *(copy from Resend dashboard)*             | 3600 |
| CNAME | *(2nd DKIM selector from Resend)*              | *(copy from Resend dashboard)*             | 3600 |
| CNAME | *(3rd DKIM selector from Resend)*              | *(copy from Resend dashboard)*             | 3600 |

> The exact hostnames and values are generated per-domain. You **must** copy them from Resend's dashboard.

### Step 3: Update Root SPF Record

**Critical:** `orbital.health` likely already has an SPF record for Zoho:

```
v=spf1 include:zohomail.com ~all
```

You need to **update** this single record to include Resend's SPF as well:

| Type | Host/Name | Value                                                    | TTL  |
|------|-----------|----------------------------------------------------------|------|
| TXT  | `@`       | `v=spf1 include:zohomail.com include:amazonses.com ~all` | 3600 |

> **Do NOT create a second SPF record.** Multiple SPF records on the same domain/subdomain will break validation. Merge them into one.

### Step 4: DMARC on Root Domain

If `orbital.health` doesn't already have a DMARC record, add one:

| Type | Host/Name | Value                                                                       | TTL  |
|------|-----------|-----------------------------------------------------------------------------|------|
| TXT  | `_dmarc`  | `v=DMARC1; p=none; rua=mailto:dmarc@orbital.health; pct=100; adkim=r; aspf=r` | 3600 |

> If a DMARC record already exists, **do not add a second one.** Only one DMARC record is allowed per domain. Using `aspf=r` (relaxed) is important because Resend sends from a `send.orbital.health` subdomain — relaxed alignment allows this to pass.

---

## Part 3: Vercel Environment Variables

After Resend domain is verified, add these in **Vercel → Project Settings → Environment Variables**:

| Variable            | Value                                  |
|---------------------|----------------------------------------|
| `RESEND_API_KEY`    | *(from Resend dashboard → API Keys)*   |
| `RESEND_FROM_EMAIL` | `eric@orbital.health`                  |

---

## Complete DNS Record Summary

### Records for `orbital.health` (root domain)

| #  | Type  | Host/Name           | Value                                                     | Priority | Notes                        |
|----|-------|---------------------|-----------------------------------------------------------|----------|------------------------------|
| 1  | TXT   | `@`                 | `v=spf1 include:zohomail.com include:amazonses.com ~all`  | —        | **UPDATE** existing SPF      |
| 2  | TXT   | `_dmarc`            | `v=DMARC1; p=none; rua=mailto:dmarc@orbital.health; pct=100; adkim=r; aspf=r` | — | Add if doesn't exist |
| 3  | CNAME | `resend._domainkey` | *(from Resend dashboard)*                                 | —        | DKIM for Resend              |
| 4  | CNAME | *(from Resend)*     | *(from Resend dashboard)*                                 | —        | DKIM for Resend (2nd)        |
| 5  | CNAME | *(from Resend)*     | *(from Resend dashboard)*                                 | —        | DKIM for Resend (3rd)        |

### Records for `send.orbital.health` (Resend bounce subdomain)

| #  | Type | Host/Name | Value                                   | Priority | Notes             |
|----|------|-----------|-----------------------------------------|----------|-------------------|
| 6  | MX   | `send`    | *(from Resend dashboard)*               | 10       | Bounce processing |
| 7  | TXT  | `send`    | *(from Resend dashboard)*               | —        | SPF for send sub  |

### Records for `go.orbital.health` (Zoho / Apollo subdomain)

| #  | Type | Host/Name             | Value                                      | Priority | Notes                    |
|----|------|-----------------------|--------------------------------------------|----------|--------------------------|
| 8  | MX   | `go`                  | `mx.zoho.com`                              | 10       | Primary Zoho MX          |
| 9  | MX   | `go`                  | `mx2.zoho.com`                             | 20       | Secondary Zoho MX        |
| 10 | MX   | `go`                  | `mx3.zoho.com`                             | 50       | Tertiary Zoho MX         |
| 11 | TXT  | `go`                  | `v=spf1 include:zohomail.com ~all`         | —        | SPF for subdomain        |
| 12 | TXT  | `zmail._domainkey.go` | *(from Zoho Admin Console)*                | —        | DKIM for subdomain       |
| 13 | TXT  | `_dmarc.go`           | `v=DMARC1; p=none; rua=mailto:dmarc@go.orbital.health; pct=100; adkim=r; aspf=r` | — | DMARC for subdomain |

**Total: 13 DNS records** (some values must be copied from Zoho/Resend dashboards)

---

## Verification Checklist

After adding all records, wait 1-2 hours (up to 48h for full propagation), then:

- [ ] **Zoho:** Admin Console → go.orbital.health → Email Configuration → Verify All Records
- [ ] **Zoho:** Send a test email from `eric@go.orbital.health` and check headers for SPF/DKIM pass
- [ ] **Resend:** Dashboard → Domains → orbital.health → Verify DNS Records (should show "Verified")
- [ ] **Vercel:** Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env vars, redeploy
- [ ] **Apollo:** Settings → Mailboxes → Add `eric@go.orbital.health` → Run diagnostics
- [ ] **Test:** Submit a waitlist signup on the landing page and confirm welcome email arrives
- [ ] **MXToolbox:** Check `go.orbital.health` at mxtoolbox.com for SPF/DKIM/DMARC pass
- [ ] **MXToolbox:** Check `orbital.health` SPF record shows both `zohomail.com` and `amazonses.com`

---

## Post-Setup: DMARC Escalation Timeline

| Week | DMARC Policy | Action                                          |
|------|-------------|--------------------------------------------------|
| 1-2  | `p=none`    | Monitor reports at `dmarc@orbital.health`        |
| 3-4  | `p=quarantine; pct=25` | Quarantine 25% of failing emails       |
| 5-6  | `p=quarantine; pct=100` | Quarantine all failing emails          |
| 7+   | `p=reject`  | Full enforcement — reject unauthenticated email  |

> Update the DMARC records (both `_dmarc` and `_dmarc.go`) as you progress through each stage.
