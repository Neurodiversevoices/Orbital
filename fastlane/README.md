fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios pre_submit_checks

```sh
[bundle exec] fastlane ios pre_submit_checks
```

Typecheck + repo sanity before release

### ios maestro_smoke

```sh
[bundle exec] fastlane ios maestro_smoke
```

Run Maestro smoke tests (blocks release on failure)

### ios publish_ota

```sh
[bundle exec] fastlane ios publish_ota
```

Publish EAS Update OTA to a channel

### ios rollback_ota

```sh
[bundle exec] fastlane ios rollback_ota
```

Rollback production OTA to previous revision

### ios staged_ota

```sh
[bundle exec] fastlane ios staged_ota
```

Staged OTA rollout (percentage 1–100)

### ios health_check

```sh
[bundle exec] fastlane ios health_check
```

Weekly health checks

### ios check_performance

```sh
[bundle exec] fastlane ios check_performance
```

Performance check (Maestro smoke duration)

### ios crash_detection

```sh
[bundle exec] fastlane ios crash_detection
```

Crash stress (Maestro navigation + resume)

### ios generate_release_notes

```sh
[bundle exec] fastlane ios generate_release_notes
```

Generate App Store release notes from git history

### ios validate_iap

```sh
[bundle exec] fastlane ios validate_iap
```

Validate IAP configuration (manual checklist in ASC / RevenueCat)

### ios upload_iap_screenshots

```sh
[bundle exec] fastlane ios upload_iap_screenshots
```

Upload IAP review screenshots (manual / asc-mcp for non-subscription IAPs)

### ios upload_metadata

```sh
[bundle exec] fastlane ios upload_metadata
```

Upload App Store metadata (Fastlane metadata folder)

### ios post_release_check

```sh
[bundle exec] fastlane ios post_release_check
```

Post-release reminders (ASC review timing)

### ios release_ios

```sh
[bundle exec] fastlane ios release_ios
```

Single-command iOS release (local / CI)

### ios screenshots

```sh
[bundle exec] fastlane ios screenshots
```

Capture App Store screenshots (Maestro smoke test → fastlane/screenshots/en-US)

Note: `fastlane snapshot` (UI test) is not configured; this lane is the supported pipeline.

### ios upload_screenshots

```sh
[bundle exec] fastlane ios upload_screenshots
```

Upload screenshots to App Store Connect

### ios refresh_screenshots

```sh
[bundle exec] fastlane ios refresh_screenshots
```

Full screenshot pipeline

### ios build_production

```sh
[bundle exec] fastlane ios build_production
```

Build production IPA

### ios submit

```sh
[bundle exec] fastlane ios submit
```

Submit to App Store

### ios deliver_screenshots

```sh
[bundle exec] fastlane ios deliver_screenshots
```

Upload screenshots only (same as: deliver run --skip_binary_upload --skip_metadata --force)

### ios ipad_screenshots

```sh
[bundle exec] fastlane ios ipad_screenshots
```

Maestro flow on iPad Pro 12.9 sim (when installed)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
