# Orbital Deployment Workflow

Use this skill when deploying changes to production.

## Deployment Architecture

```
Feature Branch → master → Vercel Auto-Deploy
```

- **Vercel** hosts the web app at `https://orbital-jet.vercel.app`
- Vercel auto-deploys when `master` branch is updated
- Changes on feature branches do NOT deploy until merged to master

## Standard Deployment Flow

### 1. Commit and Push to Feature Branch
```bash
git add -A
git commit -m "feat(scope): description"
git push -u origin <branch-name>
```

### 2. Merge to Master and Deploy
```powershell
# Windows PowerShell
git fetch origin && git checkout master && git merge origin/<branch-name> && git push origin master
```

```bash
# Mac/Linux
git fetch origin && git checkout master && git merge origin/<branch-name> && git push origin master
```

### 3. Wait for Vercel Build
- Vercel typically builds in 1-2 minutes
- Check https://vercel.com/dashboard for build status
- Hard refresh browser (Ctrl+Shift+R) after deploy

## Environment Variables

### Build-Time vs Runtime
- **Build-time**: `EXPO_PUBLIC_*` vars are baked into JS bundle by Babel
- **Runtime**: Regular env vars available to serverless functions

### Setting Build-Time Env Vars for Vercel
Option A: Vercel Dashboard → Project → Settings → Environment Variables
Option B: `vercel.json` with `build.env`:
```json
{
  "build": {
    "env": {
      "EXPO_PUBLIC_FOUNDER_DEMO": "1"
    }
  }
}
```

Note: The `env` key in vercel.json (without `build`) only sets runtime vars.

## Common Issues

### Changes Not Appearing
1. **Not merged to master** - Feature branch changes don't auto-deploy
2. **Vercel cache** - Try hard refresh or wait for cache invalidation
3. **Build failed** - Check Vercel dashboard for errors

### Branch Naming
Claude Code branches must follow pattern: `claude/<description>-<sessionId>`
Example: `claude/locate-file-MUWxC`

## Quick Reference

| Action | Command |
|--------|---------|
| Check current branch | `git branch` |
| See what's not pushed | `git log origin/master..HEAD` |
| Force Vercel redeploy | Push empty commit to master |

## Website URL
Production: https://orbital-jet.vercel.app
