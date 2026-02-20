# Google Play Console Setup

**Date:** 2026-02-20
**Package:** `com.erparris.orbital`

---

## 1. Create the App in Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **"Create app"**
3. Fill in:
   - **App name:** Orbital
   - **Default language:** English (United States)
   - **App or game:** App
   - **Free or paid:** Free (with in-app purchases)
4. Accept the declarations (Developer Program Policies, US export laws)
5. Click **"Create app"**

The package name `com.erparris.orbital` will be confirmed when you upload your first AAB (app bundle).

---

## 2. App Signing Strategy (EAS-Managed)

Orbital uses **EAS Build** with remote credential management. This means:

- **App signing key:** Managed by Google Play (Play App Signing)
- **Upload key:** Managed by EAS (auto-generated on first Android build)
- **You never need to handle keystores manually**

### How It Works

1. On first `eas build --platform android`, EAS generates an upload keystore
2. EAS stores it encrypted in their credential service
3. When you upload the AAB to Play Console, Google manages the final signing key
4. This is the recommended setup per both Google and Expo

### Verifying After First Build

```bash
# View credentials EAS has stored
eas credentials --platform android
```

This will show the upload keystore fingerprints (SHA-1, SHA-256). You'll need the SHA-256 for certain integrations.

---

## 3. Service Account Creation (For EAS Submit)

A Google Cloud service account allows `eas submit` to upload builds to Play Console without manual intervention.

### Step 3a: Create the Service Account in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select the project linked to your Play Console (or create one)
3. Navigate to **IAM & Admin → Service Accounts**
4. Click **"Create Service Account"**
   - Name: `orbital-play-submit`
   - Description: "EAS Build submission to Google Play"
5. Click **"Create and Continue"**
6. **Skip the role assignment** (Play Console manages permissions, not Cloud IAM)
7. Click **"Done"**

### Step 3b: Generate the JSON Key

1. Click on the newly created service account
2. Go to **"Keys"** tab
3. Click **"Add Key" → "Create new key"**
4. Select **JSON** format
5. Click **"Create"** — the file downloads automatically
6. **Save it as:** `./keys/google-play-service-account.json`

This path matches `eas.json` → `submit.production.android.serviceAccountKeyPath`.

The file is already in `.gitignore` (`keys/*.json`).

### Step 3c: Link to Google Play Console

1. Go to **Play Console → Settings → API access**
2. If not already linked, click **"Link"** to connect your Google Cloud project
3. Under **"Service accounts"**, find `orbital-play-submit`
4. Click **"Grant access"**
5. Set permissions:
   - **App access:** Select "Orbital" (or all apps)
   - **Account permissions:** None needed
   - **App permissions:**
     - Release to production, beta, alpha tracks
     - Manage store listing
     - View financial data
6. Click **"Invite user"**
7. **Accept the invitation** in the service account's email (or it auto-accepts)

### Step 3d: Verify

```bash
# Test that EAS can authenticate (dry run — does NOT submit)
eas submit --platform android --profile production --latest
```

If authentication fails, verify:
- The JSON key file exists at `./keys/google-play-service-account.json`
- The service account has "Release manager" equivalent permissions in Play Console
- The Google Cloud project is linked to Play Console

---

## 4. Required Play Console Configuration

Before your first submission, complete these sections in Play Console:

### Store Listing

See `docs/PLAY_STORE_LISTING_DRAFT.md` for ready-to-paste content.

- Title, short description, full description
- Screenshots (phone, 7" tablet, 10" tablet)
- Feature graphic (1024x500)
- App icon (512x512 PNG) — use `assets/icon.png`

### Content Rating

1. Go to **Policy → App content → Content rating**
2. Complete the IARC questionnaire
3. Key answers for Orbital:
   - Violence: None
   - Sexual content: None
   - Language: None
   - Controlled substance: None
   - User-generated content visible to others: **No** (Orbital is private-first)

### Data Safety

See `docs/PLAY_DATA_SAFETY_DRAFT.md` for the complete declaration.

### Target Audience

- Target audience: **18 and over**
- Not designed for children under 13
- No child-directed content

### Privacy Policy

- Required before publishing
- Must be a live URL accessible to anyone
- Link it in Play Console → Policy → App content → Privacy policy

---

## 5. Release Track Strategy

| Track | Purpose | When |
|-------|---------|------|
| Internal testing | Team verification, purchase sandbox | First upload |
| Closed testing (alpha) | Founder demo, early access | After internal passes |
| Open testing (beta) | Wider audience | Optional |
| Production | Public release | After all testing passes |

### Recommended First Upload

1. Build: `eas build --platform android --profile production`
2. Submit: `eas submit --platform android --profile production`
3. This uploads to the **internal** track (configured in `eas.json`)
4. Add your test accounts in Play Console → Internal testing → Testers

---

## 6. Test Purchases (Google Play Billing)

### License Testing

1. Go to **Play Console → Settings → License testing**
2. Add tester Gmail addresses
3. These accounts can make purchases without being charged

### Sandbox vs Production

- License testers get **sandbox transactions** (no real charges)
- Subscriptions renew on an accelerated schedule for testing
- RevenueCat test purchases show in the dashboard with a "Sandbox" badge

---

## EAS Configuration Reference

**File:** `eas.json`

```json
"android": {
  "credentialsSource": "remote",
  "buildType": "app-bundle",
  "autoIncrement": "versionCode"
}
```

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./keys/google-play-service-account.json",
      "track": "internal",
      "releaseStatus": "draft"
    }
  }
}
```

---

## Checklist

- [ ] App created in Play Console with name "Orbital"
- [ ] Google Cloud project linked to Play Console
- [ ] Service account `orbital-play-submit` created
- [ ] JSON key saved to `./keys/google-play-service-account.json`
- [ ] Service account granted release permissions in Play Console
- [ ] Store listing completed (see PLAY_STORE_LISTING_DRAFT.md)
- [ ] Content rating questionnaire completed
- [ ] Data safety form completed (see PLAY_DATA_SAFETY_DRAFT.md)
- [ ] Privacy policy URL set
- [ ] Target audience set to 18+
- [ ] License test accounts added
- [ ] First AAB uploaded to internal testing track
