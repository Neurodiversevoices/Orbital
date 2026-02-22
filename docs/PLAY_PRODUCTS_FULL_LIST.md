# Google Play Billing Products — Full List

**Date:** 2026-02-20
**Source of truth:** `lib/subscription/pricing.ts`
**Package:** `com.erparris.orbital`

---

## Overview

21 product IDs are defined in code. All must be created in Google Play Console under **Monetize → Products**.

- **Subscriptions:** Created under Monetize → Subscriptions
- **In-app products:** Created under Monetize → In-app products

---

## Subscriptions (Auto-Renewable)

Each subscription in Google Play has one or more **base plans** (monthly, annual). Create one subscription product per logical tier, then add base plans.

### Pro (Individual)

| Subscription ID | `orbital_pro` |
|----------------|---------------|
| **Monthly base plan** | `orbital_pro_monthly` — $29.00/month |
| **Annual base plan** | `orbital_pro_annual` — $290.00/year |
| **Grace period** | 7 days (recommended) |
| **Resubscribe** | Enabled |
| **RevenueCat Product IDs** | `orbital_pro_monthly`, `orbital_pro_annual` |

### Family Add-On (Base 5 Seats)

| Subscription ID | `orbital_family` |
|----------------|------------------|
| **Monthly base plan** | `orbital_family_monthly` — $79.00/month |
| **Annual base plan** | `orbital_family_annual` — $790.00/year |
| **Grace period** | 7 days |
| **RevenueCat Product IDs** | `orbital_family_monthly`, `orbital_family_annual` |

### Family Extra Seat (Per Additional Member)

| Subscription ID | `orbital_family_extra_seat` |
|----------------|----------------------------|
| **Monthly base plan** | `orbital_family_extra_seat_monthly` — $9.00/month |
| **Annual base plan** | `orbital_family_extra_seat_annual` — $90.00/year |
| **Grace period** | 7 days |
| **RevenueCat Product IDs** | `orbital_family_extra_seat_monthly`, `orbital_family_extra_seat_annual` |

### Circle (5 Buddies Max)

| Subscription ID | `orbital_circle` |
|----------------|------------------|
| **Monthly base plan** | `orbital_circle_monthly` — $79.00/month |
| **Annual base plan** | `orbital_circle_annual` — $790.00/year |
| **Grace period** | 7 days |
| **RevenueCat Product IDs** | `orbital_circle_monthly`, `orbital_circle_annual` |

### Bundle 10-Seat (Annual Only)

| Subscription ID | `orbital_bundle_10` |
|----------------|---------------------|
| **Annual base plan** | `orbital_bundle_10_annual` — $2,700.00/year |
| **Grace period** | 14 days (high-value) |
| **RevenueCat Product ID** | `orbital_bundle_10_annual` |

### Bundle 15-Seat (Annual Only)

| Subscription ID | `orbital_bundle_15` |
|----------------|---------------------|
| **Annual base plan** | `orbital_bundle_15_annual` — $4,000.00/year |
| **Grace period** | 14 days |
| **RevenueCat Product ID** | `orbital_bundle_15_annual` |

### Bundle 20-Seat (Annual Only)

| Subscription ID | `orbital_bundle_20` |
|----------------|---------------------|
| **Annual base plan** | `orbital_bundle_20_annual` — $5,200.00/year |
| **Grace period** | 14 days |
| **RevenueCat Product ID** | `orbital_bundle_20_annual` |

### Admin Add-On

| Subscription ID | `orbital_admin_addon` |
|----------------|-----------------------|
| **Monthly base plan** | `orbital_admin_addon_monthly` — $29.00/month |
| **Annual base plan** | `orbital_admin_addon_annual` — $290.00/year |
| **Grace period** | 7 days |
| **RevenueCat Product IDs** | `orbital_admin_addon_monthly`, `orbital_admin_addon_annual` |

---

## In-App Products (One-Time Purchases)

Create these under **Monetize → In-app products**. All are **managed products** (non-consumable — purchased once per user context).

### CCI Issuance (Capacity Credential Index)

| Product ID | Price | Description |
|-----------|-------|-------------|
| `orbital_cci_free` | $199.00 | CCI issuance for Starter-tier users |
| `orbital_cci_pro` | $149.00 | CCI issuance for Pro-tier users |
| `orbital_cci_circle_all` | $399.00 | CCI covering all Circle members |
| `orbital_cci_bundle_all` | $999.00 | CCI covering all Bundle members |

---

## Legacy Product IDs

These exist in code for migration compatibility. Create them if migrating existing iOS subscribers to Android, otherwise skip.

| Product ID | Maps To | Notes |
|-----------|---------|-------|
| `orbital_individual_monthly` | `orbital_pro_monthly` | Legacy naming |
| `orbital_individual_annual` | `orbital_pro_annual` | Legacy naming |
| `orbital_bundle_10_monthly` | N/A | Bundles are now annual-only |
| `orbital_bundle_25_monthly` | N/A | Replaced by 15/20 tiers |
| `orbital_bundle_25_annual` | N/A | Replaced by 15/20 tiers |
| `orbital_qcr_individual` | Future product | QCR artifact (not yet active) |
| `orbital_qcr_circle` | Future product | QCR artifact (not yet active) |
| `orbital_qcr_bundle` | Future product | QCR artifact (not yet active) |

---

## Google Play Billing Settings

### Grace Period

- Subscriptions under $100/month: **7 days**
- Subscriptions over $100/month (bundles): **14 days**
- Grace period lets users fix payment issues without losing access

### Account Hold

- Enable **account hold** for all subscriptions
- Duration: up to 30 days (Google default)
- Keeps the subscription in a paused state while billing retries

### Price Changes

- Google Play requires user consent for price increases
- For price decreases, no consent needed
- RevenueCat handles the notification to your app

### Proration Mode

- Default: `IMMEDIATE_WITH_TIME_PRORATION`
- This is the standard for upgrades (user pays the difference immediately)
- Configured in RevenueCat, not in Play Console

---

## Creation Order

1. **Subscriptions first** (Pro, Family, Circle, Bundle, Admin)
   - Create the subscription container
   - Add base plans (monthly and/or annual)
   - Set pricing for each base plan
   - Enable grace period and account hold
2. **In-app products second** (CCI items)
   - Create each as a managed product
   - Set the price
3. **Activate all products** (they start in "Draft" — must be activated before testing)

---

## Verification Checklist

After creating all products:

- [ ] All 13 active subscription base plans created and priced
- [ ] All 4 CCI in-app products created and priced
- [ ] Grace period enabled on all subscriptions
- [ ] Account hold enabled on all subscriptions
- [ ] All products in "Active" status (not Draft)
- [ ] Products imported into RevenueCat (see REVENUECAT_ANDROID_SETUP.md)
- [ ] Test purchase works with license tester account
