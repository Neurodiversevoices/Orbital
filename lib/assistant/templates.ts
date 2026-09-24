/**
 * Assistant reply templates — the ONLY sentences the assistant can say.
 *
 * Deterministic, canon-sourced (governance/ORBITAL_CANON.md,
 * governance/CAPACITY_DOCTRINE.ts, governance/PROHIBITED_FEATURES.md).
 * No model generates text. Every template is descriptive: it records what the
 * user reported or scheduled and describes the app. None advises, interprets,
 * or prompts.
 *
 * tests/unit/assistant.test.ts proves every template except REFUSAL_SENTENCE
 * is free of PROHIBITED_REPLY_WORDS.
 */

/** Words no reply may contain outside the refusal sentence. */
export const PROHIBITED_REPLY_WORDS = [
  'mood',
  'wellness',
  'symptom',
  'diagnose',
  'diagnosis',
  'stress',
  'fatigue',
  'productivity',
  'advice',
] as const;

/**
 * What the assistant will not do. Shown verbatim in the refusal and in the
 * screen footer, so the boundary is visible before anyone asks.
 */
export const REFUSAL_TOPICS = [
  'advise',
  'coach',
  'diagnose',
  'interpret your reports',
  'discuss medication',
  'discuss therapy',
] as const;

export const REFUSAL_SENTENCE =
  "I can't help with that. I don't advise, coach, diagnose, interpret your reports, or discuss medication or therapy. " +
  'For anything medical or urgent, contact a qualified professional or local emergency services.';

export type StateLabel = 'RESOURCED' | 'ELEVATED' | 'DEPLETED';

export const T = {
  greeting:
    'I can log a capacity report, hold or book an appointment, set a reminder, show what you have logged, or help with the app.',
  empty: 'Type or tap a capacity state to log it.',
  unknown:
    'I did not catch that. Try "log depleted", "book dentist tomorrow at 3pm", "show my week", or "how do I cancel my subscription".',
  voiceStub: 'Voice input is not switched on in this build. Type instead, or tap a state below.',

  capacityLogged: (label: StateLabel, time: string) => `Logged: ${label} at ${time}. Nothing else is added to it.`,
  capacityAsk: 'Which state? RESOURCED, ELEVATED, or DEPLETED.',

  appointmentHeld: (title: string, when: string) => `Held: ${title}, ${when}. It stays a hold until you book it.`,
  appointmentBooked: (title: string, when: string) => `Booked: ${title}, ${when}.`,
  reminderSaved: (title: string, when: string) =>
    `Reminder saved: ${title}, ${when}. It is listed here; phone alerts are not switched on yet.`,
  appointmentNeedsTime: (title: string) => `When is ${title}? For example "tomorrow at 3pm" or "Friday 10:30am".`,
  appointmentsNone: 'You have no appointments or reminders saved.',
  appointmentsList: (lines: string[]) => `Saved: ${lines.join('; ')}.`,

  absenceNone: (days: number) => `No capacity reports in the last ${days} days. Nothing is filled in for those days.`,
  absenceSummary: (logged: number, days: number, missing: string[]) =>
    missing.length === 0
      ? `${logged} reports across the last ${days} days. Every day has at least one.`
      : `${logged} reports across the last ${days} days. No report on: ${missing.join(', ')}. Those days stay blank.`,

  help: {
    onboarding:
      'To start: tap the orb on Today and move it to RESOURCED, ELEVATED, or DEPLETED. Patterns appear after 7 reports.',
    navigation:
      'Today is the first tab, Patterns is the second, and this Assistant is the third. Settings is the gear at the top of Today.',
    account:
      'Settings > Account holds your display name and sessions. Settings > Delete Account removes your account and all its data.',
    subscription:
      'Settings > Manage Subscription lets you view or cancel. Restore Purchases is on the upgrade screen.',
    export: 'Settings > What Happens to My Data explains, in plain language, how your reports are handled.',
    privacy: 'Your reports are yours. Orbital does not read your location, contacts, calendar, or microphone.',
  },
} as const;

export type HelpTopic = keyof typeof T.help;

/** Every static template string, for the prohibited-word test. */
export function allStaticTemplates(): string[] {
  const sample: StateLabel = 'DEPLETED';
  return [
    T.greeting,
    T.empty,
    T.unknown,
    T.voiceStub,
    T.capacityLogged(sample, '3:00 PM'),
    T.capacityAsk,
    T.appointmentHeld('appointment', 'Tue 3:00 PM'),
    T.appointmentBooked('appointment', 'Tue 3:00 PM'),
    T.reminderSaved('appointment', 'Tue 3:00 PM'),
    T.appointmentNeedsTime('appointment'),
    T.appointmentsNone,
    T.appointmentsList(['appointment, Tue 3:00 PM']),
    T.absenceNone(7),
    T.absenceSummary(3, 7, ['Mon', 'Wed']),
    T.absenceSummary(7, 7, []),
    ...Object.values(T.help),
  ];
}

export function containsProhibitedWord(text: string): string | null {
  const lower = text.toLowerCase();
  for (const w of PROHIBITED_REPLY_WORDS) {
    if (new RegExp(`\\b${w}`, 'i').test(lower)) return w;
  }
  return null;
}
