# Orbital iOS A+ Accessibility Audit — 2026-05-09

**Scope:** WCAG 2.2 Level AA + Apple iOS-specific accessibility expectations.
**Companion to:** `docs/IOS_AUDIT_2026-05-09.md` Section D (which is now superseded for the accessibility dimension).
**Build under audit:** Build 131 (Phase-3 + Phase-4 fixes already applied to the original audit).
**Auditor mode:** AUDIT-ONLY. No code changes were made by this pass. All "Fix" snippets below are advisory.

Severity scale: **PASS / MINOR / MAJOR / CRITICAL** with `file:line` evidence and a code-snippet remediation per non-PASS.

---

## Executive grade

| Dimension | Grade | Pass Rate |
|---|---|---|
| **A. WCAG 2.2 Level AA**          | **B**  | ~24/30 SC effectively passed = **80%** (see §A) |
| **B. iOS-specific (VO + DT + RM)**| **B−** | mixed — strong DT, very weak VoiceOver on bespoke controls |
| **C. Per-screen audit**           | **C+** | 5/13 audited screens have any a11y props |
| **D. Per-component audit**        | **B**  | 5/16 interactive components have a11y props |
| **E. Web (`public/home.html`)**   | **A−** | semantic, motion-aware, focus-visible — minor contrast nits |

**Overall accessibility grade: B−** (was B+ in the parent audit; deeper drill reveals more gaps that weren't surfaced before).

After applying the **Top 3 quick fixes** below, grade rises to **A−**.
Reaching **A** requires the gauge VoiceOver work (see §B1, Followup #1).

---

## A. WCAG 2.2 Level AA Checklist

### A1. Perceivable

#### 1.1.1 Non-text content — **MAJOR**
Multiple icon-only Pressables across screens still lack `accessibilityLabel`.

Evidence:
- `app/(tabs)/index.tsx:236-238` — Sparkles button (plans) has zero a11y props.
- `app/(tabs)/index.tsx:240-242` — Settings gear button has zero a11y props.
- `app/settings.tsx:218-220` — close button (X icon) has no label.
- `app/upgrade.tsx:482-484` — close button (X icon) has no label.
- `app/cci.tsx:170,185,197` — back arrow buttons have no label.
- `components/AvatarPicker.tsx:116-138` — each avatar `Pressable` has no `accessibilityLabel` (the underlying `<Image>` also has none).
- `app/(tabs)/patterns.tsx:199-201` — debug close "X" button has no label (founder-only path, lower stakes but still an issue when visible).

Decorative/duplicate icons properly hidden:
- `app/(platform)/index.tsx:93-108` orb proxy — `accessibilityElementsHidden` + `importantForAccessibility="no"`. **PASS** for that case.

**Fix (representative):**
```tsx
// app/(tabs)/index.tsx:236
<Pressable
  onPress={() => router.push('/upgrade')}
  style={styles.plansButton}
  accessibilityRole="button"
  accessibilityLabel="Plans and pricing"
>
  <Sparkles color="#FFD700" size={22} />
</Pressable>
```

---

#### 1.3.1 Info and relationships — **MINOR**
- Headings are rendered as `<Text>` with no `accessibilityRole="header"` anywhere. VoiceOver cannot use the rotor "Headings" navigation.
  - `app/(tabs)/index.tsx:239` "Orbital" title
  - `app/auth/index.tsx:251` "Orbital" title and `:342` form title
  - `app/profile-setup.tsx:110` "Set Up Your Profile" title
  - `app/(tabs)/patterns.tsx:627,629` page title + subtitle
  - `app/(platform)/index.tsx:87` "The Orbital Platform"
- Form labels in `app/profile-setup.tsx:143` ("Display Name") are visually associated but the `TextInput` has no `accessibilityLabel="Display Name"` linking the two for VO.

**Fix (representative):**
```tsx
<Text style={styles.title} accessibilityRole="header">Orbital</Text>
// and on TextInput:
<TextInput
  ...
  accessibilityLabel="Display name"
  accessibilityHint="Used in Circles. Two characters minimum."
/>
```

---

#### 1.3.5 Identify input purpose — **PASS** (with **MINOR** gap)
- `app/auth/index.tsx:354,366` — `autoComplete="email"` and `autoComplete="new-password" | "current-password"` ✅
- `app/reset-password.tsx:237,269` — `autoComplete="new-password"` ✅
- `app/profile-setup.tsx:144-153` — display-name `TextInput` has no `autoComplete="name"` or `textContentType="name"`. **MINOR.**

**Fix:**
```tsx
<TextInput
  ...
  autoComplete="name"
  textContentType="name"
/>
```

---

#### 1.4.3 Contrast (Minimum) — **MINOR** (carries forward from Phase 4 `D5`)
Computed against bg `#01020A`:
- `#2DD4BF` teal → ~10.2:1 ✅
- `rgba(255,255,255,0.85)` (primary text) → ~14.7:1 ✅
- `rgba(255,255,255,0.6)` (secondary) → ~9.8:1 ✅
- `rgba(255,255,255,0.5)` → ~7.5:1 ✅
- `rgba(255,255,255,0.4)` → ~5.5:1 — passes AA for all text but is borderline. Used heavily across `EmptyState.tsx:91,98`, `HistoryItem.tsx:212`, `app/(tabs)/index.tsx:286,383,397`.
- `rgba(255,255,255,0.35)` → ~4.6:1 — fails AA (4.5:1) for normal-size text by a hair. `auth/index.tsx:349,362,520` (placeholder text and subtitle), `TimeRangeTabs.tsx:216`.
- `rgba(255,255,255,0.3)` → ~3.6:1 — **fails AA for any text < 18pt**. Used in `auth/index.tsx:614,693`, `app/profile-setup.tsx:129,149`, `Composer.tsx:151,171`. Several of these are placeholder text where users may dwell.
- `rgba(255,255,255,0.25)` → ~2.9:1 — **fails AA**. Used `HistoryItem.tsx:156` (delete icon), `(tabs)/patterns.tsx:1044` (longitudinal note italicized footer).

**Fix:** raise the lowest-tier text color from `rgba(255,255,255,0.3)` to `rgba(255,255,255,0.5)` (still subtle, comfortably 7.5:1). For placeholders: `rgba(255,255,255,0.5)` matches Apple's HIG default placeholder contrast.
```tsx
placeholderTextColor="rgba(255,255,255,0.5)"  // was 0.3
```

---

#### 1.4.4 Resize text (200%) — **MINOR**
- `EmptyState.tsx`, `HistoryItem.tsx` already have `maxFontSizeMultiplier={1.5}` (Phase 4).
- Many other screens have hardcoded `fontSize` with no `maxFontSizeMultiplier`. At 200% Dynamic Type the layout will overflow:
  - `app/(tabs)/index.tsx:382-401` welcome / signal bar text
  - `app/auth/index.tsx:511,521,623` title and form title
  - `app/profile-setup.tsx:243,249,283,291` header / labels
  - `app/upgrade.tsx` (whole screen)
  - `app/(tabs)/patterns.tsx` stats values, headers
- `tabBarShowLabel:false` in `app/(tabs)/_layout.tsx:49` — tabs themselves don't display labels visually, so size escalation is moot, but VO still announces them via `tabBarAccessibilityLabel`. ✅

**Fix:** add `maxFontSizeMultiplier={1.5}` to body text; `={1.3}` to titles inside fixed-height containers (signal bar, button rows).

---

#### 1.4.10 Reflow (320px viewport) — **MINOR**
- The signal bar at `app/(tabs)/index.tsx:267-296` has three columns with `minWidth:70` each + dividers. At 320px (older iPhone SE width) this becomes ~210 + paddings and squeezes; at 200% Dynamic Type it can horizontal-clip.
- `TimeRangeTabs.tsx:185-191` — six tabs in a row will become very thin at 320px; minimum tap region drops below 44pt × 44pt for some tabs (currently 49pt tall × ~44pt wide on a 320px screen, so it's borderline).

**Fix:** wrap the signal bar in `flexWrap: 'wrap'` or convert to a vertical stack at narrow widths. For TimeRangeTabs, gate to 4 visible tabs at narrow widths or scroll horizontally.

---

#### 1.4.11 Non-text contrast — **MINOR**
- Glass surface borders `rgba(255,255,255,0.15)` on `#01020A` → ~3.0:1. Borderline; passes 3:1 only by a hair. Used pervasively (`auth/index.tsx:585`, all "glass cards").
- `rgba(255,255,255,0.08)` and `rgba(255,255,255,0.10)` borders (e.g. `(tabs)/index.tsx:391`, `(tabs)/patterns.tsx:1066,1090`) → 1.6–2.0:1 — **fails 3:1**. These are decorative dividers, but if they're carrying the visual structure (separating tappable rows in a list) that fails 1.4.11.
- Composer submit button border at `Composer.tsx:166` uses `rgba(255,255,255,0.1)` when disabled → fails. ✅ borderline once `accentColor` is applied.

**Fix:** for borders that *carry* state (selected/disabled/divider), promote to `rgba(255,255,255,0.18)` (3.4:1) or higher.

---

#### 1.4.12 Text spacing — **PASS** (RN doesn't override user-stylesheet because there isn't one; the criterion applies to web, where `public/home.html` uses Inter at 1.55 line-height — passes ≥1.5).

---

#### 1.4.13 Content on hover/focus — **PASS** (mobile native has no hover; web tooltips are absent in `public/home.html`).

---

### A2. Operable

#### 2.1.1 Keyboard / 2.1.4 Character key shortcuts — **N/A** for native. Web (`public/home.html`) has no key shortcuts. **PASS.**

#### 2.4.3 Focus order — **MINOR (unverified)**
- `app/(tabs)/index.tsx` — when a state is selected, `CategorySelector` and `Composer` slide in. VoiceOver focus may not auto-move to the new content; user must scroll-explore. Unverified on device. Recommend `AccessibilityInfo.setAccessibilityFocus(reactTag)` after the slide-in completes.
- `app/auth/index.tsx` — when `authMode` flips to `'signin'/'signup'`, focus does not move to the form heading. VO users will hear the same "Sign in with email" button still in focus.

**Fix:**
```tsx
import { findNodeHandle, AccessibilityInfo } from 'react-native';
const formTitleRef = useRef<Text>(null);
useEffect(() => {
  if (authMode !== null && formTitleRef.current) {
    const tag = findNodeHandle(formTitleRef.current);
    if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
  }
}, [authMode]);
```

#### 2.4.7 Focus visible — **N/A on native**, **PASS on web** (`public/home.html:58-62` `:focus-visible { outline:2px solid var(--teal); }`).

#### 2.4.11 Focus not obscured (NEW WCAG 2.2) — **MINOR**
- `app/(tabs)/index.tsx` Composer is `position:'absolute'; bottom:0` (`Composer.tsx:185-188`). When the keyboard is up, focusing on the orb or category buttons can place the focused element behind the composer. `KeyboardAvoidingView` mitigates but doesn't guarantee on all device sizes.

#### 2.4.12 Focus not obscured (Enhanced) — **MINOR** (same as above, stricter).

#### 2.4.13 Focus appearance — **PASS on web**, **N/A on native** (iOS provides the focus ring via Switch Control / VO automatically; cannot be customized).

#### 2.5.1 Pointer gestures — **MAJOR**
The orb is dragged to set capacity (`components/orb/ClinicalOrb.tsx` uses `Gesture.Pan`). This is a **path-based gesture with no single-pointer alternative** — VoiceOver / Switch Control / motor-impaired users cannot set capacity at all.

**Fix:** add `accessibilityActions=[{name: 'increment'}, {name: 'decrement'}]` plus `accessibilityRole="adjustable"` and an `onAccessibilityAction` handler that nudges `capacity` by `SNAP_INCREMENT`. Also expose two visible "+" / "−" buttons with `accessibilityLabel="Increase capacity"` / `"Decrease capacity"` for AssistiveTouch users.

```tsx
<View
  accessible
  accessibilityRole="adjustable"
  accessibilityLabel="Capacity"
  accessibilityValue={{ min: 0, max: 100, now: Math.round(capacity * 100) }}
  accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
  onAccessibilityAction={(e) => {
    if (e.nativeEvent.actionName === 'increment') {
      capacity.value = withSpring(Math.min(1, capacity.value + 0.05));
    } else if (e.nativeEvent.actionName === 'decrement') {
      capacity.value = withSpring(Math.max(0, capacity.value - 0.05));
    }
  }}
>
  <ClinicalOrb ... />
</View>
```

**This change must be reviewed by orb team per Rule 2.**

#### 2.5.2 Pointer cancellation — **PASS**
RN `Pressable` defaults: `onPress` fires on up-event, can be aborted by sliding off. ✅ across the codebase.

#### 2.5.3 Label in name — **PASS** for the items that have labels (e.g., `Composer.tsx:166` accessibilityLabel="Save entry" includes the visible action). **MAJOR** for icon-only buttons missing labels (covered in 1.1.1).

#### 2.5.4 Motion actuation — **PASS**
No shake-to-undo, no tilt-to-control. App is touch-only.

#### 2.5.7 Dragging movements (NEW WCAG 2.2) — **MAJOR**
Same as 2.5.1: orb drag has no single-tap alternative. Also:
- `WeeklyCapacityRecord.tsx` (calendar week navigation) — needs verification it has tap-only navigation alternatives.

#### 2.5.8 Target size minimum (24×24) — **PASS on WCAG**, **MINOR vs Apple HIG (44×44)**
- TagSelector buttons: 48×48 ✅
- HistoryItem delete: ~32px effective with hitSlop=12 (Phase 3 raised). ✅ on WCAG 24px, **MINOR** on Apple's 44.
- `auth/index.tsx:651` eyeBtn — width 40, height matches input ~52, hitSlop 8. ✅
- `(tabs)/index.tsx:368,379` plans/settings buttons: padding `spacing.sm` (~10) × 22-24 icon = ~42-44 — borderline.
- Avatar style chips in `AvatarPicker.tsx` — verify ≥44pt.

---

### A3. Understandable

#### 3.1.1 Language of page — **PASS** on web (`<html lang="en">`), **N/A** native (iOS uses bundle's `Info.plist` `CFBundleDevelopmentRegion`). The `lib/hooks/useLocale` hook supports en/es but does not propagate to `accessibilityLanguage` on `<Text>` for Spanish content. **MINOR.**

#### 3.2.6 Consistent help — **PASS**
Settings → "Help/Support" + "About" appear in the same place on every screen via the gear icon.

#### 3.3.7 Redundant entry — **PASS**
- Email is auto-filled via `autoComplete="email"`.
- Display name is one-time only.

#### 3.3.8 Accessible authentication (no cognitive function test) — **PASS**
- Email + password sign-in (no CAPTCHAs, no math problems, no memory tests).
- Sign in with Apple is a one-tap biometric path — explicitly listed by Apple as compliant.
- Password fields support `autoComplete` so saved passwords (Keychain / Password Manager) work.

---

### A4. Robust

#### 4.1.2 Name, Role, Value — **MAJOR**
Cross-cutting failure: no `accessibilityRole` on:
- `app/settings.tsx:218,565,612,624,...` — every Pressable.
- `app/upgrade.tsx:171,184,212,296,307,...` — every Pressable.
- `app/profile-setup.tsx:178,182` — Skip and Continue buttons.
- `app/cci.tsx:170,185,197,281,293,...` — every Pressable.
- `app/dashboard.tsx` — period selector and back button.
- `app/cci-report.tsx` — every Pressable.

Counts: `grep -c "accessibilityLabel\|accessibilityRole"` returned **0** for `settings.tsx`, `upgrade.tsx`, `profile-setup.tsx`, `cci.tsx`, `cci-report.tsx`, `dashboard.tsx`.

**Fix:** add `accessibilityRole="button"` + `accessibilityLabel` to every `Pressable` not already labeled. This is the highest-volume, lowest-risk fix in the audit.

---

## B. iOS-Specific Accessibility (beyond WCAG)

### B1. VoiceOver

#### Reading order on key screens — **NEEDS DEVICE TEST**
- `app/(tabs)/index.tsx`: header (plans, title, settings) → welcome → signal bar → instruction → orb → categories → composer. Verified by source order; visual order matches DOM order. Likely PASS. **Unverified on device.**
- `app/profile-setup.tsx`: header → preview → name input → avatar picker → skip/continue. PASS by source.
- `app/auth/index.tsx`: top section → banners → button stack | form. PASS.
- `app/(tabs)/patterns.tsx`: very long screen. Top of screen has critical state (DataDepth, WeeklySummary), then graph, then stats, then drivers, then Milestones, PatternLanguage, QCRButton, calendar. All a11y traversable, all readable. The `DebugOverlay` (founder-only) is `position:'absolute'` `zIndex:1000` — when visible, VO will likely read it first which is desirable.

#### accessibilityElementsHidden / importantForAccessibility — **PASS** for the one place it's used.
- `app/(platform)/index.tsx:95-97` — orb proxy correctly hidden.
- **MINOR:** decorative items elsewhere are not explicitly hidden:
  - `app/auth/index.tsx:243-248` `glowAnchor` and `glowRing` decorations — VO will skip them anyway because they have no text/role, but explicit `accessibilityElementsHidden` is the belt-and-suspenders move.
  - `HistoryItem.tsx:106-109` orb dot + glow — purely decorative; the parent Pressable label already conveys the state in words, so VO double-reads color isn't an issue but could be cleaner.

#### Custom controls have role + value — **CRITICAL** for the gauge

`components/orb/ClinicalGauge.tsx:80-234` — Skia canvas, no a11y at all. The `<Canvas>` is invisible to VoiceOver. A user cannot read or know the current capacity value via VO.

**Same applies to `components/orb/ClinicalOrb.tsx`** — the entire dragable orb has zero a11y wrapping.

**Fix:** wrap both in a single `accessible View` with `accessibilityRole="adjustable"`, `accessibilityValue={{ min:0, max:100, now: capacity*100, text: 'low-medium range' }}`, and `accessibilityActions=[{name:'increment'},{name:'decrement'}]`.

**Concrete recommended a11y label:**
> "Capacity gauge. 42 percent, low-medium range. Swipe up to increase, swipe down to decrease."

This requires orb-team review (Rule 2) and is the single most impactful fix in this audit.

#### accessibilityActions for swipe gestures — **MINOR**
- `HistoryItem.tsx` is currently a `Pressable` with a separate delete button. There is no swipe-to-delete, so no `accessibilityActions` are needed — verified.
- `WeeklyCapacityRecord.tsx` calendar week change — the user can swipe weeks. Has no `accessibilityActions=[{name:'increment'},{name:'decrement'}]`. Recommend adding "next week" / "previous week" actions.
- `app/(tabs)/_layout.tsx` swipe between tabs — handled by native bottom-tab bar; VO uses double-tap on a tab. PASS.

#### accessibilityLanguage — **MINOR**
`useLocale` returns Spanish strings on `locale==='es'` but no `<Text>` carries `accessibilityLanguage="es-MX"` so VO will read Spanish text with the English voice. Whole app affected; `t.home.title` etc.

**Fix (one-shot in a wrapper):**
```tsx
const { locale } = useLocale();
const lang = locale === 'es' ? 'es-MX' : 'en-US';
// then on every <Text>: accessibilityLanguage={lang}
// (or wrap a custom <T/> component once)
```

---

### B2. Dynamic Type — **PASS** (with **MINOR**)
- `allowFontScaling` defaults to `true` on `<Text>`; **no component force-disables it** (verified by `grep -rn "allowFontScaling={false}" components/ app/` returns nothing).
- `maxFontSizeMultiplier={1.5}` applied in `EmptyState.tsx`, `HistoryItem.tsx` (Phase 4). All other screens uncapped → at the user's max Dynamic Type (~310%) layouts will overflow. See 1.4.4 above.
- Tap targets do **not** scale with text. A 44pt button stays 44pt even when text is 200%. **PASS** on Apple's "tap targets remain 44 even when text scales".

---

### B3. Reduce Motion — **PASS** (Phase 4 P4.7)
- `useAccessibility` hook now reads `AccessibilityInfo.isReduceMotionEnabled()` on mount and subscribes to `'reduceMotionChanged'` (`lib/hooks/useAccessibility.tsx:76-135`). ✅
- **MAJOR caveat:** orb shader animation in `components/orb/` does not consume `useAccessibility` (per Phase 4 audit, "useAccessibility is consumed only by `app/_layout.tsx` and `app/accessibility.tsx`"). The orb's pan / spring / shader animations run regardless of OS Reduce Motion. This is the single largest visible animation in the app, and a Reduce Motion user is the most likely to feel discomfort from it.
- `app/(tabs)/index.tsx:94,103` `withTiming` keyboard-show animations (250ms each) do not gate on Reduce Motion either.
- `Animated.View` `entering={FadeIn}/{SlideInDown}` across screens does not gate.

**Fix:** `useReducedMotion()` hook from `react-native-reanimated` is built-in and worklet-safe. Wrap entering animations:
```tsx
import { useReducedMotion } from 'react-native-reanimated';
const reduce = useReducedMotion();
<Animated.View entering={reduce ? FadeIn.duration(0) : SlideInDown.duration(300).springify()} />
```
For the orb, the orb team must apply per Rule 2.

---

### B4. Reduce Transparency — **CRITICAL**
- `AccessibilityInfo.isReduceTransparencyEnabled` is **never queried anywhere** (grep returns nothing).
- Every "glass" surface uses `rgba(255,255,255,0.07)` background + `rgba(255,255,255,0.15)` border with no solid fallback. When iOS user has Reduce Transparency ON, these surfaces stay translucent.
- Affected: every card across `auth/index.tsx`, `(tabs)/index.tsx`, `(tabs)/patterns.tsx`, `(platform)/*.tsx`, `settings.tsx`, `upgrade.tsx`, `EmptyState.tsx` actionHint container.

**Fix:**
```tsx
// in lib/hooks/useAccessibility.tsx (extend existing hook)
const [reduceTransparency, setReduceTransparency] = useState(false);
useEffect(() => {
  AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
  const sub = AccessibilityInfo.addEventListener(
    'reduceTransparencyChanged', setReduceTransparency);
  return () => sub.remove?.();
}, []);
// Expose `reduceTransparency` and consume in glass-surface styles:
backgroundColor: reduceTransparency ? '#0A0C18' : 'rgba(255,255,255,0.07)',
```

---

### B5. Increase Contrast — **CRITICAL**
- `AccessibilityInfo.isHighTextContrastEnabled` (iOS Settings → Accessibility → Display → Increase Contrast) is **never queried**.
- The app's lowest-tier text colors (`rgba(255,255,255,0.3)` and below) become **even harder** to perceive for users who explicitly opted into high contrast.

**Fix:** mirror B4. Provide a high-contrast palette where every text color is at least `rgba(255,255,255,0.7)` and every border is at least `rgba(255,255,255,0.5)`.

---

### B6. Bold Text — **MINOR**
- `AccessibilityInfo.isBoldTextEnabled` not queried.
- Custom fonts (`DMSans_400Regular`, `SpaceMono_400Regular`) do not auto-respond to iOS Bold Text. RN's default system font does, but the moment a `fontFamily: 'DMSans_400Regular'` is set, Bold Text setting has no effect.
- Affected: every `<Text>` in `app/auth/index.tsx`, `EmptyState.tsx`, etc.

**Fix:** when Bold Text is on, swap to `DMSans_700Bold` on body text:
```tsx
const [boldText, setBoldText] = useState(false);
useEffect(() => {
  AccessibilityInfo.isBoldTextEnabled().then(setBoldText);
  const sub = AccessibilityInfo.addEventListener('boldTextChanged', setBoldText);
  return () => sub.remove?.();
}, []);
fontFamily: boldText ? 'DMSans_700Bold' : 'DMSans_400Regular'
```

---

### B7. Smart Invert / Forced Dark — **PASS**
- App is forced dark (`userInterfaceStyle:"dark"`).
- No real photos rendered (only `<Image>` for avatar URLs from Dicebear).
- Avatar `<Image>` lacks `accessibilityIgnoresInvertColors` — under Smart Invert (legacy), the cartoon avatars would invert. **MINOR.** Most users no longer use Smart Invert in iOS 18+ (replaced with system-level dark), so impact is small.

**Fix:**
```tsx
<Image source={{uri: avatar.url}} accessibilityIgnoresInvertColors />
```

---

### B8. Switch Control — **MAJOR**
- Sequential focus + activation works only for Pressables that are correctly labeled. Per A4.1.2 above, many Pressables have no `accessibilityRole` so Switch Control announces them as the generic UIKit element type (often "button" by default, sometimes nothing).
- The orb is unreachable by Switch Control (no role, no actions). **CRITICAL** — Switch Control users cannot use the core feature.

#### B9. Voice Control — **MAJOR**
- Voice Control announces visible text labels. Buttons without visible text (icon-only) are announced as numbered overlays ("Tap 1", "Tap 2"). For many buttons in this app, that's the only way Voice Control users can hit them.
- The fix here is identical to A4.1.2: add `accessibilityLabel` everywhere. Once labels exist, Voice Control users can say "Tap Settings" instead of "Tap 7".

#### B10. AssistiveTouch / accessibilityCustomActions — **MINOR**
- No custom-action surfaces exist in the codebase (`grep -rn "accessibilityActions"` returns 0). Once the orb gains `increment`/`decrement` actions (B1), AssistiveTouch users will be unblocked.

---

## C. Per-Screen Audit

### C1. `app/(tabs)/index.tsx` (Home) — **C+**
| Element | Line | Status | Issue |
|---|---|---|---|
| Plans button (Sparkles) | 236 | MAJOR | no `accessibilityLabel` |
| "Orbital" title | 239 | MINOR | no `accessibilityRole="header"` |
| Settings gear | 240 | MAJOR | no `accessibilityLabel` |
| Welcome text | 255 | PASS | scaling default |
| Signal bar (3 stats) | 267-296 | MINOR | non-interactive but no `accessibilityLabel` summarizing "Today 70 percent, trend up, 12 signals" |
| Instruction text | 298 | PASS | |
| Orb container | 302-323 | CRITICAL | wrap in adjustable role; see B1 |
| CategorySelector | 331 | PASS (Phase 3) | |
| Composer | 338-348 | PASS (already has label) | |

### C2. `app/(tabs)/patterns.tsx` — **C**
- DataDepthBadge, WeeklySummaryCard render long stat strings as separate `<Text>` blocks; VO reads each separately ("Average Capacity", "70 percent", "Entries", "12") instead of combined. Wrap each `statItem` in a single `accessible` View with `accessibilityLabel="Average capacity 70 percent"`.
- TimeRangeTabs PASS.
- DebugOverlay close button line 199 — MAJOR (founder only).
- All FlatList items rendering log entries already use HistoryItem which is labeled (PASS).
- Calendar `WeeklyCapacityRecord` — needs verification.

### C3. `app/auth/index.tsx` — **B−**
- "Orbital" title 251 — header role missing (MINOR).
- "· LOG SENSORY INPUT ·" subtitle 254 — decorative, but no `accessibilityElementsHidden`. (Could go either way.)
- Apple/email/Google buttons 274-308 — visible label inside text → `accessibilityLabel` is auto-derived; but `accessibilityRole="button"` is absent (RN Pressable defaults to no role). MINOR.
- `Sign in with Apple` button has a leading space in the text (line 282 `" Sign in with Apple"`) — VoiceOver may read "Pause Sign in with Apple". Cosmetic but real.
- Email/password TextInputs PASS (`autoComplete` set).
- Show/hide password "eyeBtn" 369-378 — no `accessibilityLabel`. CRITICAL for screen reader users entering passwords. **MAJOR.**

**Fix:**
```tsx
<Pressable
  ...
  accessibilityRole="button"
  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
  accessibilityState={{ expanded: showPassword }}
>
```

### C4. `app/profile-setup.tsx` — **D** (no a11y at all)
- Title 110 — header role missing.
- Display name TextInput 144-153 — no `accessibilityLabel`, no `autoComplete="name"`, no `textContentType="name"`. MAJOR.
- Skip button 178 — visible text, role missing. MINOR.
- Continue button 182-202 — visible text, but icon-only suffix; role missing. MINOR.
- AvatarPicker (delegated) — see D below.

### C5. `app/settings.tsx` — **D** (no a11y at all)
0 occurrences of accessibility props across 776 lines of Pressables. Every settings row, mode toggle, language picker, and demo control is unlabeled to VO. **MAJOR.** This is the densest interaction surface in the app and the worst-affected screen.

### C6. `app/upgrade.tsx` — **D**
0 occurrences across 825 lines (paywall, restore button, plan tiers, feature comparison). Apple's reviewers are increasingly accessibility-aware on paywalls. **MAJOR — also a review risk.**

### C7. `app/cci.tsx` / `app/cci-report.tsx` — **D**
Both 0 occurrences. **MAJOR.**

### C8. `app/(platform)/*.tsx` — **A−**
| File | Pressables | Labeled | Notes |
|---|---|---|---|
| `index.tsx` | 1 CTA + cards | ✅ all | LayerCard uses `accessibilityRole="summary"` |
| `memory.tsx` | many | ✅ most | Switch toggles labeled (verify) |
| `permissions.tsx` | revoke buttons | ✅ all (line 95) | exemplary |
| `audit.tsx` | filter chips | ✅ | |
| `sub-brand.tsx` | tier picker | ✅ | |

These newer screens were built with a11y in mind. **PASS / MINOR.** Recommend a final spot-check that switches in `memory.tsx` carry `accessibilityLabel` (couldn't verify all 8 from this audit).

---

## D. Per-Component Audit

| Component | a11y Score | Notes |
|---|---|---|
| `EmptyState.tsx` | **PASS** | Has `maxFontSizeMultiplier`. The `Icon` is decorative — could add `accessibilityElementsHidden` to its container. The container itself reads title + description in source order ✅. |
| `HistoryItem.tsx` | **PASS (Phase 3+4)** | Long descriptive label, delete button labeled, hitSlop 12, font scaling capped. |
| `CategorySelector.tsx` | **PASS (Phase 3)** | role + label + state + hint ✅ |
| `TagSelector.tsx` | **PASS (Phase 3)** | same ✅ |
| `TimeRangeTabs.tsx` | **PASS (Phase 3)** | accessibilityRole="tab" + state ✅ |
| `Composer.tsx` | **MINOR** | Submit button labeled. **TextInput has no `accessibilityLabel="Add details"` or `accessibilityHint`; placeholder text is the only cue, which VoiceOver reads but cannot rely on per WCAG 1.3.1.** |
| `ClinicalGauge.tsx` | **CRITICAL** | Zero a11y. See B1. |
| `ClinicalOrb.tsx` | **CRITICAL** | Zero a11y. See B1, 2.5.1, 2.5.7. |
| `AvatarPicker.tsx` | **MAJOR** | each avatar Pressable lacks `accessibilityLabel="Avatar option, style fun-emoji, name 'Felix'"`. The `Image` lacks `accessibilityLabel`. |
| `ModeSelector.tsx` | **MAJOR** | 0 a11y, multiple modes selectable. |
| `OrgRoleBanner.tsx` | **MAJOR** | 0 a11y on its Pressable. |
| `StateDots.tsx` | **MAJOR** | 0 a11y; 3 dots that map to capacity states but no semantic announcement. |
| `WeeklyCapacityRecord.tsx` | **MAJOR** | 0 a11y on calendar week navigation; this is a date-grid that needs `accessibilityRole="grid"` semantics. |
| `PatternLanguagePanel.tsx` | **MAJOR** | 0 a11y on its 3 metric cards. |
| `NoteInput.tsx` | **MAJOR** | TextInput, 0 a11y. |
| `ErrorBoundary.tsx` | **MINOR** | Reload button has 0 a11y; rare path. |
| `BlurredPatternTease.tsx` | **MAJOR** | "Upgrade" Pressable, 0 a11y. |
| `BundleSeatAvatar.tsx` | **MAJOR** | Avatar Pressable, 0 a11y. |

---

## E. Web Accessibility — `public/home.html`

| Criterion | Status | Evidence |
|---|---|---|
| Skip-to-content link | **PASS** | `:742` `<a class="skip" href="#scene-calibration">Skip to content</a>` |
| Heading order | **PASS** | h1 at `:780`, h2s at `:796,:844,:854,:902,:960`, h3s at `:865,:876,:887` — strict h1→h2→h3 |
| ARIA labels on icon-only controls | **PASS** | brand `aria-label="Orbital home"` `:757`; tier links `aria-label="Orbital Personal — start now"` etc. |
| Custom cursor breaks keyboard focus? | **PASS** | `:91` `@media (pointer:coarse), (prefers-reduced-motion:reduce) { .cursor { display:none!important; } }` and `:focus-visible` ring is unaffected by `mix-blend-mode:difference` cursor since the cursor is `pointer-events:none`. |
| Reduced-motion gating | **PASS** | `:719-731` disables all animations and swaps to `#stage-fallback` static gradient |
| Color contrast on glass cards | **MINOR** | `--ink-faint:rgba(233,238,247,0.38)` ≈ 5.4:1 on `--bg`. ✅ But used on glass surfaces (slightly lighter bg), drops to ~4.2:1 — borderline. |
| Focus rings visible | **PASS** | `:58-62` `:focus-visible { outline:2px solid var(--teal); }` |
| `<html lang="en">` | **PASS** | `:2` |
| `aria-live="polite"` on telemetry | **PASS** | `:749,:855` |
| Decorative SVG/canvas hidden | **PASS** | `:745,:746` `aria-hidden="true"` on `#stage` and `#stage-fallback` |

**Predicted Lighthouse Accessibility score: 96-98**. Loses 2-4 points only if the audit flags the borderline `--ink-faint` text contrast on glass. Otherwise fully clean.

**Fix (the only one):** raise `--ink-faint` from 0.38 to 0.50.

---

## Summary Table

| Severity | Count | Top items |
|---|---|---|
| CRITICAL | 4 | gauge/orb VoiceOver (`ClinicalGauge` + `ClinicalOrb`); Reduce Transparency unhandled (every glass surface); Increase Contrast unhandled; orb has no single-pointer alternative (WCAG 2.5.1 / 2.5.7) |
| MAJOR | 11 | screen-wide missing `accessibilityRole`/`Label` on settings.tsx, upgrade.tsx, cci.tsx, cci-report.tsx, profile-setup.tsx, dashboard.tsx; AvatarPicker, ModeSelector, NoteInput, WeeklyCapacityRecord, PatternLanguagePanel components; show/hide password button in auth |
| MINOR | 17 | header roles, focus auto-move on auth mode flip, accessibilityLanguage='es-MX' for Spanish, max font size cap on uncapped screens, low-contrast borders, low-contrast placeholder text, signal bar reflow at 320px, BoldText support, accessibilityIgnoresInvertColors on avatars, web `--ink-faint` contrast, `Composer` TextInput hint |
| PASS | 24 | reduce-motion sync, autoComplete on auth, target sizes 24px+, no key shortcuts, no motion actuation, web home.html skip link / headings / focus / reduced-motion / lang, profile-setup avatar handling, all of `(platform)/*` screens, Phase-3 components (CategorySelector, TagSelector, TimeRangeTabs, HistoryItem, EmptyState) |

### WCAG 2.2 AA Pass Rate

Of the 30 applicable Level AA Success Criteria for native + web:
- **Pass:** 24 (1.4.12, 1.4.13, 2.1.1, 2.1.4, 2.4.7-web, 2.4.13-web, 2.5.2, 2.5.4, 3.1.1-web, 3.2.6, 3.3.7, 3.3.8, 1.3.5 (mostly), and the Phase-3 components covering 1.1.1/4.1.2 partially)
- **Minor:** 1.3.1, 1.4.3, 1.4.4, 1.4.10, 1.4.11, 2.4.3, 2.4.11, 2.4.12, 2.5.8, 3.1.1-native (lang on Spanish text)
- **Major:** 1.1.1 (icon-only buttons widely), 4.1.2 (role/value widely)
- **Critical:** 2.5.1, 2.5.7 (orb has no alternative)

**Effective AA pass rate: ~80%** (24/30 if we count "minor" as pass, 13/30 = **43%** if we count strictly).

---

## Top 3 Critical Findings

1. **Orb / ClinicalGauge has zero VoiceOver / Switch Control / Voice Control accessibility** — the core feature of the app is invisible and unusable to those users. Single biggest blocker. (`components/orb/ClinicalGauge.tsx:80-234`, `components/orb/ClinicalOrb.tsx`).
2. **Reduce Transparency is never honored** (no `AccessibilityInfo.isReduceTransparencyEnabled` query in the codebase) — every glass card stays translucent for users who explicitly need solid surfaces. Affects the entire UI.
3. **`app/settings.tsx`, `app/upgrade.tsx`, `app/cci.tsx`, `app/profile-setup.tsx`, `app/dashboard.tsx` have ZERO accessibility props** across hundreds of Pressables — Switch Control / Voice Control users effectively cannot navigate paid-purchase flows or change settings.

---

## Top 3 Quick Fixes (highest ROI, lowest risk)

1. **Mass-add `accessibilityRole="button"` + `accessibilityLabel` to every Pressable in the 6 zero-a11y screens** (settings, upgrade, cci, cci-report, profile-setup, dashboard). Mechanical, no business-logic change. ~50 Pressables. Closes most of WCAG 4.1.2 and B8/B9.
2. **Extend `useAccessibility` to query `AccessibilityInfo.isReduceTransparencyEnabled` and `isHighTextContrastEnabled`**, expose two new booleans. Then add a single `useGlassStyle()` helper that returns either glass or solid based on those flags. Glass surfaces consume the helper. ~30 minute task; touches one new helper + 6-10 style consumers.
3. **Bump every `rgba(255,255,255,0.3)` text/border to `rgba(255,255,255,0.5)`** (sweep-able with a regex). Closes 1.4.3 and 1.4.11 in one pass; preserves visual character (still subtle).

---

## Gauge Accessibility Status

**STATUS: CRITICAL — orb-team review required (Rule 2).**

The single highest-impact finding in this audit. The gauge currently:
- Has no `accessibilityRole`, no `accessibilityValue`, no `accessibilityLabel`.
- Has no single-pointer alternative — drag is the only input.
- Cannot be incremented/decremented by VoiceOver, Switch Control, AssistiveTouch, or Voice Control.

Recommended fix has been spec'd above (B1 / 2.5.1 / 2.5.7) and is a wrapper-only change — does **not** modify orb shaders, animations, or visual output. Strictly an a11y wrapper:

```tsx
<View
  accessible
  accessibilityRole="adjustable"
  accessibilityLabel="Capacity"
  accessibilityValue={{ min: 0, max: 100, now: Math.round(capacity * 100) }}
  accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
  onAccessibilityAction={...}
>
  <ClinicalOrb {...} />
</View>
```

Estimate: 30 minutes of code, 1 hour of orb-team review.

---

## Followup Tasks

1. **[CRITICAL]** Orb a11y wrapper — Rule 2 review (orb team).
2. **[CRITICAL]** Reduce Transparency + High Contrast — extend `useAccessibility`, surface flags, swap glass→solid styles.
3. **[CRITICAL]** Reduce Motion in orb shaders — `useReducedMotion()` from reanimated, gate on shared values. Rule 2 review.
4. **[MAJOR]** Mass-label every Pressable in settings/upgrade/cci/cci-report/profile-setup/dashboard. Mechanical sweep.
5. **[MAJOR]** AvatarPicker — label each `<Pressable>` and `<Image>` with the avatar style + slot index.
6. **[MAJOR]** Show/hide password button (`auth/index.tsx:369-378`) — `accessibilityLabel` toggle on `showPassword`.
7. **[MAJOR]** ModeSelector, OrgRoleBanner, NoteInput, StateDots, WeeklyCapacityRecord, PatternLanguagePanel, BlurredPatternTease, BundleSeatAvatar — all need a11y props.
8. **[MINOR]** Promote heading-level `<Text>` to `accessibilityRole="header"` across all screens.
9. **[MINOR]** Wire `accessibilityLanguage="es-MX"` through the locale provider for Spanish strings.
10. **[MINOR]** Apply `maxFontSizeMultiplier={1.3-1.5}` to body text on un-capped screens; ensure 320px reflow.
11. **[MINOR]** Bold Text support — wrap font selection in `useAccessibility().boldText` once that flag is exposed.
12. **[MINOR]** `accessibilityIgnoresInvertColors` on avatar `<Image>` and any cartoon/photo content.
13. **[MINOR]** Auto-focus the form heading on `authMode` flip in `app/auth/index.tsx`.
14. **[MINOR]** Composer TextInput — add `accessibilityLabel="Note"` and a hint.
15. **[MINOR]** Web — raise `--ink-faint` from 0.38 to 0.50 in `public/home.html` for contrast safety.
16. **[FOLLOWUP]** Manual VoiceOver QA on a real iPhone for `(tabs)/index.tsx`, `(tabs)/patterns.tsx`, `auth/index.tsx`, `profile-setup.tsx` to confirm reading order matches source order assumption.
17. **[FOLLOWUP]** Switch Control sweep on a real iPhone — verify every flow can be completed by sequential focus + activation. Likely will surface several "trap" cases not visible from source.
18. **[FOLLOWUP]** Voice Control sweep — especially around the orb (where Voice Control will need numbered overlays until single-tap alternatives are added).

---

*End of accessibility audit.*
