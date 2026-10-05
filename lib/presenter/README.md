# Presenter — a synthetic human that reads back the record

`script.en.json` is every line the presenter can say: 43 lines across about, capacity, today,
patterns, record, export, privacy. `rules.ts` is what it may say; `npm run presenter:check` enforces it.

**Scope (owner decision 2026-10-05): inside the frozen law.** `governance/PROHIBITED_FEATURES.md` and
`governance/DECISION_2026-09-12_ASSISTANT_WITHDRAWN.md` stand. The presenter describes what the user
recorded. It does not advise, coach, suggest, remind, chat, or listen (no microphone).

- **Off by default, never autoplays, never on first launch** (`SILENT_ONBOARDING.md`). Every line is
  `user_tap`, or `after_user_log` once the user has turned the presenter on.
- **Spoken text is fixed.** Each line is rendered once to a lipsynced clip; the user's numbers appear
  only in the `caption`, filled on device by `fillCaption()` from their own record.
- **Absence** is only ever "No signals recorded" (`ABSENCE_AS_SIGNAL_SPEC.md` 4.1).
- **Disclosure**: `about.disclosure` says it is synthetic and not a person; the check fails without it.

`npm run presenter:check` runs a control first (a script of planted violations must be caught, rule
by rule), then checks every line against `CAPACITY_DOCTRINE.prohibitedLanguage` plus the advice,
reminder, gamification and absence phrases, fixed spoken text, declared caption variables, real
`surface` screens and the disclosure. Exit 0 only when the control is fully caught and the script is clean.

Clips: `clip` is `null` until a line is rendered and passes the lipsync gate (Nova's
`creator.json standards.lipsync_gate`); it then holds the bundled clip path and its sha256.

- **Render** (Nova, on the Mac, $0, one line at a time):
  `python3 scripts/nova_build/creator/presenter_lines.py --script <this repo>/lib/presenter/script.en.json --char orbital-presenter`
  writes `manifest.json` + `clips/<id>.mp4` for the lines that pass the gate (disclosure label + mark applied).
- **Attach**: `npm run presenter:attach -- <manifest.json>` copies a clip to `assets/presenter/en/<id>.mp4` only if it
  passed, was rendered from the line's current text, and its sha256 matches; a line whose text changed goes back to `null`.
- **Check**: `npm run presenter:check` also fails if an attached clip is missing or its bytes differ from the gated clip.

The presenter is the fictional character `orbital-presenter`, **fully clothed in every output**; her swimsuit turntable
is a private body-fitting input in Nova and is never shipped or published.
