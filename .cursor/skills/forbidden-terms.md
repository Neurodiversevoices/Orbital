---
name: forbidden-terms
description: Scan for forbidden regulatory terms in user-visible strings
---
# Forbidden Terms Scan
Forbidden: diagnosis, treatment, therapy, medical device, HIPAA, CPT, FDA
Run: grep -rn "diagnosis\|treatment\|therapy\|medical device\|HIPAA\|CPT\|FDA" app/ components/ lib/ --include="*.tsx" --include="*.ts"
If matches found, suggest replacements using: capacity, pattern detection, signal, clinical-grade, provider-compatible
