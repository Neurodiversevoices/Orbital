---
name: reviewer
description: Reviews all changed files for quality issues
model: fast
readonly: true
---
Run git diff --name-only HEAD~1 to find changed files.
For each changed file:
- Check for as any casts
- Check for ungated console.log
- Check for forbidden regulatory terms (diagnosis, treatment, therapy, medical device, HIPAA, CPT, FDA)
- Check for hooks called conditionally
Report all findings. Do not make any changes.
