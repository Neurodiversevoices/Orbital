# Reviewer Reply — Build 130 Resolution Center

## Draft

Thank you for the detailed feedback. We have resolved both findings and are resubmitting.

---

**Guideline 5.1.2(i) — Device ID declared "Used for Tracking"**

This was a metadata declaration error. The app does not track users per Apple's definition.

Our complete SDK list and their data use:

- **RevenueCat** — purchase receipt verification and entitlement management (App Functionality). RevenueCat's SDK contains internal proxy files (`ASIdManagerProxy.swift`, `TrackingManagerProxy.swift`) that use method mangling to *detect* whether ATT permission has been granted — they do not call `requestTrackingAuthorization`, do not read the IDFA, and do not send device data to any third party for advertising or measurement purposes.
- **Sentry** — crash reporting only (Analytics). No cross-app data linkage. No data broker sharing.
- **Supabase** — first-party backend (auth, database, realtime). No third-party data sharing.

The app has no `NSUserTrackingUsageDescription` in its plist and presents no ATT prompt, consistent with an app that does not track.

We have corrected the App Privacy declaration: Device ID is now declared with "Used for Tracking = No" and purposes limited to "App Functionality" (RevenueCat receipt verification).

---

**Guideline 3.1.2(c) — Missing functional Terms of Use (EULA) link**

We have made two changes:

1. **App Description** (all locales): Added the following text to the end of the description:
   ```
   Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
   Privacy Policy: https://orbitalhealth.app/privacy
   ```

2. **In-app subscription screen**: Added tappable "Terms of Use (EULA)" and "Privacy Policy" links directly on the paywall UI. Both links open in Safari. This required a new binary (Build 131).

The Standard Apple EULA applies to this app (no custom EULA).

Both URLs resolve successfully (HTTP 200).

---

We believe both findings are fully resolved. Please let us know if you need any additional information.

---

## Notes for Eric before posting

- [ ] Confirm ASC privacy declaration updated (Device ID → Used for Tracking = No) via web UI
- [ ] Confirm App Description updated in all locales via web UI
- [ ] Build 131 submitted and selected as the review binary
- [ ] Post this reply in the Resolution Center thread for app 6757295146
- [ ] Change "Build 130" references to "Build 131" in the reply if submitting new binary
