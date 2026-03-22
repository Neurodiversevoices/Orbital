---
name: submit
description: Full App Store submission flow
---
# Submit to App Store
1. Run the preflight skill. All checks must pass.
2. Bump ios.buildNumber in app.json by 1.
3. Commit: "chore: bump build for submission"
4. Run: git push origin master
5. Run: eas build --platform ios --profile production --auto-submit
6. Report build URL when complete.
