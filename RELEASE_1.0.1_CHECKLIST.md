# Orbital 1.0.1 — what is done, and what only you can do

Prepared 2026-09-12. Everything in **Done** is committed. Everything in
**Yours** is an App Store Connect account action; no agent touched a
credential, and the four `AuthKey_*.p8` files in this repo were not read.

## Done — the build side is ready

Versions were **inconsistent** before this, which would have produced a build
Apple rejected or mis-numbered:

| where | was | now |
|---|---|---|
| `ios/Orbital.xcodeproj/project.pbxproj` · `MARKETING_VERSION` | `1.0` | **`1.0.1`** |
| `ios/Orbital.xcodeproj/project.pbxproj` · `CURRENT_PROJECT_VERSION` | `1` | **`131`** |
| `ios/Orbital/Info.plist` · `CFBundleShortVersionString` | `1.0.0` | **`1.0.1`** |
| `ios/Orbital/Info.plist` · `CFBundleVersion` | `130` | **`131`** |

The plist carried literal values rather than `$(MARKETING_VERSION)`, so the
two disagreed in both fields. Both are now set and consistent. `131` is one
past the highest build the plist recorded.

Fixed identifiers, unchanged: bundle `com.erparris.orbital`, team `2KM3QL4UMV`.

Also landed this shift and relevant to review: the Enterprise tier's
`crisis frequency` metric and `Clinical Notes` feature are **withdrawn**
(`ORBITAL_PRODUCT_MASTERFILE_v1.0.md:230,232`), which removes the conflict
with the frozen prohibition on medical-device-territory features. If review
previously raised a health-claims question, that surface is gone.

## Yours — App Store Connect only

1. **Create the version.** App Store Connect → Orbital → iOS App → **+ Version
   or Platform** → `1.0.1`. Until this exists there is no editable version to
   ship into; every prior build has expired.
2. **Archive and upload.** Xcode → Product → Archive → Distribute App → App
   Store Connect. It will carry `1.0.1 (131)`.
3. **Fill "What's New in This Version".** Required on every version after the
   first; 1.0 will not have one to inherit.
4. **Attach the build** to 1.0.1 once processing finishes, then Submit.

Reviewer notes already drafted: `ASC_REVIEW_NOTES.md`.
Store metadata already drafted: `APP_STORE_METADATA.md`.

## Why an agent stopped here

Creating a version, uploading a build and submitting for review are actions on
your developer account. Those stay with you, and the signing keys stay where
they are. **App Store Connect is the only authority on this app's real state** —
nothing in this repo proves what is live, and the repo has been wrong about it
before. Read the status there, not here.
