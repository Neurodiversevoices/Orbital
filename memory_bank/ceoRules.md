# CEO / Founder Rules

> Extracted from governance docs. For full details, see:
> - [master_brief.md](../master_brief.md) Sections 2, 13, 14
> - [governance/FOUNDER_OPERATING_SYSTEM.md](../governance/FOUNDER_OPERATING_SYSTEM.md)

## Identity

- Eric Parrish, AuDHD, solo founder
- Executive function limitations — keep workflows streamlined and "child-proof"
- 10-year horizon, patient capital

## Operating Cadence

| Cadence | Time | Work |
|---------|------|------|
| Daily | <15 min | System health check only |
| Weekly | <2 hrs | Prioritize max 3 items |
| Monthly | <4 hrs | Financial + feedback review |
| Quarterly | <8 hrs | Roadmap + governance review |

## Forbidden Metrics

Do NOT track: daily active users, session duration, feature usage frequency,
streaks, NPS, competitor feature parity.

## Scope Creep Protocol

Before approving any feature:
1. Does it require daily user attention? -> NO
2. Does it create engagement pressure? -> NO
3. Does it use prohibited language? -> NO
4. Does it add cognitive load? -> NO
5. Would removal break longitudinal value? -> YES

If unclear, defer to quarterly review.

## Development Rules (from master_brief.md Section 13)

1. Never change package.json dependencies
2. Never modify the orb without approval
3. Always `npx tsc --noEmit` before committing
4. Always commit and push after completing tasks
5. Backend-only tasks = no UI changes
6. Test in simulator for UI changes

## Survival Patterns

- **Overwhelmed:** Stop non-critical work, identify ONE cause, solve or defer
- **Stuck on decision:** Choose less code, less load, easier to reverse
- **Burned out:** Maintenance mode, 2+ weeks away, return with quarterly review
- **External pressure:** Thank, don't commit, quarterly review queue
