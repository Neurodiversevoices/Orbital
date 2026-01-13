# Safe Healer Rules
## Version: 2.0

---

## WHAT SAFE HEALER IS

Safe Healer is an automated error remediation system. It:
- Monitors `ORBITAL_ALERTS.log` for errors
- Identifies the likely source file
- Creates a fix branch
- Runs validation gates
- Waits for human review

---

## WHAT SAFE HEALER IS NOT

Safe Healer does NOT:
- Auto-deploy fixes
- Auto-merge branches
- Skip validation gates
- Fix multiple files at once
- Operate on dirty repos

---

## SAFETY GATES (IN ORDER)

### Gate 1: Clean Repo Lock

```
if (git status --porcelain is not empty) → SKIP
```

Healer will not run on a dirty repo. All changes must be committed first.

### Gate 2: Main Advanced Detection

```
if (local main != origin/main) → RESET and CLEAR
```

If main has advanced, healer resets to origin/main and clears all incidents.

### Gate 3: Signature Deduplication

```
if (alert fingerprint already seen) → SKIP
```

Same error signature will not trigger duplicate fix attempts.

### Gate 4: Cooldown

```
if (last run < 5 minutes ago) → SKIP
```

Minimum 5-minute cooldown between runs.

### Gate 5: Path Allowlist

```
allowed_paths = ["components/", "app/", "lib/"]
if (target_file not in allowed_paths) → BLOCK
```

Healer can only modify code files, not config, scripts, or infrastructure.

### Gate 6: TypeScript Compile

```
if (npx tsc --noEmit fails) → REVERT and ABANDON
```

Fix must pass TypeScript validation.

### Gate 7: Web Build

```
if (npm run build:web fails) → REVERT and ABANDON
```

Fix must pass web build.

---

## BRANCH NAMING

```
bot/fix-YYYYMMDD-HHMMSS
```

All healer branches use this pattern for easy identification.

---

## INCIDENT STATES

| State | Meaning |
|-------|---------|
| new | Alert received, not yet processed |
| blocked | Path not allowed or file not found |
| failed_tsc | TypeScript validation failed |
| failed_webbuild | Web build failed |
| ready | Fix committed, awaiting human review |

---

## HUMAN RESPONSIBILITIES

1. Review healer branches before merging
2. Delete bad fix branches
3. Manually fix if healer fails repeatedly
4. Monitor incident log for patterns

---

## DIRECTORY STRUCTURE

```
ops_state/
  ├── active_incidents.json  # Current incident tracking
  └── healer_state.json      # Last run timestamp
ops_fixes/
  └── [fix/failure reports]
ops_logs/
  └── healer.log
```

---

## FAILURE REPORTS

When healer fails, it writes a report to `ops_fixes/`:
- Timestamp
- Fingerprint
- Reason for failure
- Target file
- Build output (if applicable)

---

## LOCKED RULES

1. Healer NEVER auto-merges
2. Healer NEVER modifies config files
3. Healer NEVER skips validation gates
4. Healer NEVER runs on dirty repos
5. Healer NEVER fixes multiple files in one run
6. Human review is ALWAYS required
