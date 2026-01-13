# Orbital Deployment Manual
## Version: 1.0

---

## PRE-DEPLOYMENT CHECKLIST

Before any deployment:

1. [ ] `npm run ci:verify` passes (TypeScript, ESLint, Prettier, Security Audit)
2. [ ] `npm run preflight` passes (12 Playwright tests)
3. [ ] `npm run stress` passes (k6 load tests) — optional but recommended
4. [ ] No uncommitted changes in git
5. [ ] On `main` branch
6. [ ] Main is up-to-date with origin

### Full Citadel Verification (Recommended Before Major Releases)

```bash
npm run citadel
```

This runs all three verification layers in sequence:
1. `ci:verify` — Static analysis + security audit
2. `preflight` — E2E Playwright tests
3. `stress` — k6 load tests (requires k6 installed)

---

## WEB DEPLOYMENT (Vercel)

### Production Deploy

```bash
vercel --prod
```

### Preview Deploy

```bash
vercel
```

### Environment Variables Required

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_SENTRY_DSN
EXPO_PUBLIC_REVENUECAT_API_KEY
```

---

## MOBILE DEPLOYMENT (EAS)

### iOS Production

```bash
CI=1 npx eas build --platform ios --profile production
CI=1 npx eas submit --platform ios
```

### Android Production

```bash
CI=1 npx eas build --platform android --profile production
CI=1 npx eas submit --platform android
```

### Build Profiles

Located in `eas.json`:
- `development`: Local testing
- `preview`: TestFlight / Internal Testing
- `production`: App Store / Play Store

---

## SAFE HEALER OPERATION

### Starting the Watcher

```powershell
.\watch_alerts.ps1
```

### Manual Healer Run

```powershell
.\safe_healer_v2.ps1
```

### Healer Constraints

1. Only runs if repo is clean
2. Only modifies files in: `components/`, `app/`, `lib/`
3. Requires TypeScript to pass
4. Requires web build to pass
5. Creates branch, never auto-merges
6. 5-minute cooldown between runs

---

## ROLLBACK PROCEDURE

### Vercel Rollback

1. Go to Vercel dashboard
2. Select deployment to rollback to
3. Click "Promote to Production"

### Git Rollback

```bash
git revert HEAD
git push origin main
```

---

## INCIDENT RESPONSE

### Sentry Alert

1. Check Sentry dashboard
2. Identify error location
3. If payment-related: immediate fix required
4. Create hotfix branch
5. Fix, test, deploy

### Safe Healer Alert

1. Check `ORBITAL_ALERTS.log`
2. Review healer branch if created
3. If fix looks correct: merge
4. If fix looks wrong: delete branch, fix manually

---

## NO AUTO-DEPLOY

Bots do not auto-deploy. All deployments require human trigger.

Safe Healer creates branches. Humans merge.

---

## CITADEL STRESS TESTING

### What It Tests

The Citadel stress test simulates "1,000 users join at once":

| Scenario | Description | Pass Criteria |
|----------|-------------|---------------|
| Burst Join | 1,000 VUs ramp 0→1000 in 30s, hold 60s | Error rate < 0.5% |
| Burst Logging | 1,000 VUs × 3 writes each | P95 latency < 800ms |
| Read Pressure | 1,000 VUs concurrent reads | RLS violations = 0 |

### Prerequisites

1. Install k6 (free, open-source):
   ```bash
   # Windows (chocolatey)
   choco install k6

   # macOS (homebrew)
   brew install k6

   # Linux (apt)
   sudo apt-get install k6
   ```

2. (Optional) Local Supabase for isolated testing:
   ```bash
   npx supabase start
   ```

### Running Stress Tests

```bash
# Generate 1,000 test users (mock or real)
npm run stress:seed

# Run full stress test
npm run stress

# Run everything (ci:verify + preflight + stress)
npm run citadel
```

### Interpreting Results

```
╔═══════════════════════════════════════════════════════════════╗
║           ORBITAL CITADEL STRESS TEST RESULTS                ║
╠═══════════════════════════════════════════════════════════════╣
║  Key Metrics:                                                ║
║    Total Requests:    X,XXX                                  ║
║    Error Rate:        0.XXX%                                 ║
║    P95 Latency:       XXXms                                  ║
║    RLS Violations:    0                                      ║
╠═══════════════════════════════════════════════════════════════╣
║               ✓ STRESS TEST: PASS                             ║
╚═══════════════════════════════════════════════════════════════╝
```

### Failure Thresholds

| Metric | Local Threshold | Remote Threshold |
|--------|-----------------|------------------|
| Error Rate | < 0.5% | < 0.5% |
| P95 Latency | < 800ms | < 2000ms |
| P99 Latency | < 1500ms | < 4000ms |
| RLS Violations | = 0 | = 0 |

---

## LOCKED RULES

- No deploy on Friday after 3pm
- No deploy during user peak hours (9am-12pm EST)
- No deploy without passing builds
- No deploy from non-main branches to production
