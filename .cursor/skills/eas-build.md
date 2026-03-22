---
name: eas-build
description: Build and submit to App Store via EAS
---
# EAS Build
1. Run the preflight skill first. All checks must pass.
2. If any fail, stop and report.
3. If all pass: `eas build --platform ios --profile production --auto-submit`
