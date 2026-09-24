/**
 * Assistant intent parser — Option A (inside governance/PROHIBITED_FEATURES.md).
 *
 * Pure and deterministic: no model, no network, no React Native imports, so it
 * is unit-testable under plain Node. Maps a typed sentence to exactly one of the
 * permitted intents. Anything that touches medication, advice, coaching,
 * diagnosis, therapy or interpretation maps to `refuse` BEFORE any other intent
 * is considered (medication reminders are banned by name, so "remind me to take
 * my meds" must never become a reminder).
 */

import type { HelpTopic, StateLabel } from './templates';

export type CapacityStateKey = 'resourced' | 'stretched' | 'depleted';

export type AppointmentKind = 'hold' | 'book' | 'remind';

export type Intent =
  | { type: 'empty' }
  | { type: 'refuse' }
  | { type: 'greeting' }
  | { type: 'capacity'; state: CapacityStateKey }
  | { type: 'capacityAsk' }
  | { type: 'appointment'; kind: AppointmentKind; title: string; when: number | null }
  | { type: 'listAppointments' }
  | { type: 'absence'; days: number }
  | { type: 'help'; topic: HelpTopic }
  | { type: 'unknown' };

export const STATE_LABEL: Record<CapacityStateKey, StateLabel> = {
  resourced: 'RESOURCED',
  stretched: 'ELEVATED',
  depleted: 'DEPLETED',
};

/** Medication in any form is refused everywhere, including inside a reminder. */
const MEDICATION = /\b(med|meds|medication|medications|medicine|pill|pills|dose|dosage|prescription|rx|tablet|tablets|refill)\b/i;

/** Advice / coaching / diagnosis / therapy / interpretation requests. */
const PROHIBITED_REQUEST = new RegExp(
  [
    '\\bshould i\\b',
    '\\badvi[cs]e\\b',
    '\\bcoach(ing)?\\b',
    '\\bdiagnos',
    '\\btherap(y|ist|eutic)\\b',
    '\\bcounsel',
    '\\btreatment\\b',
    '\\bsymptom',
    '\\bwhy am i\\b',
    '\\bwhy do i\\b',
    '\\bwhat does (it|this|that|my) .*mean\\b',
    '\\binterpret',
    '\\bmake me feel\\b',
    '\\bfeel better\\b',
    '\\bmood\\b',
    '\\bdepress',
    '\\banxi',
    '\\bsuicid',
    '\\bkill myself\\b',
    '\\bself[- ]harm\\b',
    '\\bcrisis\\b',
    '\\bwellness\\b',
    '\\btips?\\b',
    '\\brecommend',
    '\\bimprove\\b',
  ].join('|'),
  'i',
);

const STATE_WORDS: Array<[RegExp, CapacityStateKey]> = [
  [/\bresourced\b/i, 'resourced'],
  [/\b(elevated|stretched)\b/i, 'stretched'],
  [/\bdepleted\b/i, 'depleted'],
];

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function findState(text: string): CapacityStateKey | null {
  for (const [re, key] of STATE_WORDS) if (re.test(text)) return key;
  return null;
}

/**
 * Parse "tomorrow at 3pm", "today 9:15am", "friday 10:30am", "at 14:00".
 * Returns epoch ms, or null when no time was given. Date without a time -> null
 * (the assistant then asks for a time rather than inventing one).
 */
export function parseWhen(text: string, now: Date = new Date()): { when: number | null; rest: string } {
  let rest = text;
  let day: Date | null = null;
  const lower = text.toLowerCase();

  const dayMatch = lower.match(/\b(today|tonight|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (dayMatch) {
    const word = dayMatch[1];
    day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (word === 'tomorrow') day.setDate(day.getDate() + 1);
    else if (word !== 'today' && word !== 'tonight') {
      const target = DAY_NAMES.indexOf(word);
      let delta = (target - day.getDay() + 7) % 7;
      if (delta === 0) delta = 7;
      day.setDate(day.getDate() + delta);
    }
    rest = rest.replace(new RegExp(`\\b(on\\s+)?${word}\\b`, 'i'), ' ');
  }

  const timeMatch = rest.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) || rest.match(/\bat\s+(\d{1,2}):(\d{2})\b/i);
  if (!timeMatch) return { when: null, rest: rest.replace(/\s+/g, ' ').trim() };

  let hour = parseInt(timeMatch[1], 10);
  const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const ampm = timeMatch[3]?.toLowerCase();
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return { when: null, rest: rest.replace(/\s+/g, ' ').trim() };
  rest = rest.replace(timeMatch[0], ' ');

  if (!day) {
    day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
    if (candidate.getTime() <= now.getTime()) day.setDate(day.getDate() + 1);
  }
  const when = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute).getTime();
  return { when, rest: rest.replace(/\s+/g, ' ').trim() };
}

export function formatWhen(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${DAY_ABBR[d.getDay()]} ${MONTH_ABBR[d.getMonth()]} ${d.getDate()}, ${hour12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatTime(ms: number): string {
  return formatWhen(ms).split(', ')[1];
}

function cleanTitle(raw: string): string {
  const t = raw
    .replace(/^(me\s+)?(about|of|for|to|an?|the)\s+/i, '')
    .replace(/[.!?]+$/, '')
    .trim();
  return t.length > 0 ? t.slice(0, 80) : 'appointment';
}

export function parseIntent(input: string, now: Date = new Date()): Intent {
  const text = input.trim();
  if (text.length === 0) return { type: 'empty' };
  const lower = text.toLowerCase();

  // 1. Medication is refused everywhere.
  if (MEDICATION.test(lower)) return { type: 'refuse' };

  // 2. Scheduling commands. Titles are echoed verbatim and never interpreted.
  const sched = lower.match(/^(book|hold|schedule|remind me(?: about| of| to)?|set a reminder(?: for| to)?|reminder(?: for)?)\s+(.+)$/i);
  if (sched) {
    const verb = sched[1];
    const kind: AppointmentKind = verb.startsWith('remind') || verb.includes('reminder') ? 'remind' : verb === 'hold' ? 'hold' : 'book';
    const original = text.slice(text.length - sched[2].length);
    const { when, rest } = parseWhen(original, now);
    return { type: 'appointment', kind, title: cleanTitle(rest), when };
  }

  // 3. Every other advice / interpretation request is refused.
  if (PROHIBITED_REQUEST.test(lower)) return { type: 'refuse' };

  if (/^(hi|hello|hey|what can you do|help)\b[\s!?.]*$/i.test(lower)) return { type: 'greeting' };

  // 4. Capacity report.
  const state = findState(lower);
  if (state) return { type: 'capacity', state };
  if (/^(log|record)\b/.test(lower) && /\b(capacity|report|state)\b/.test(lower)) return { type: 'capacityAsk' };

  // 5. Reading back what exists.
  if (/\b(appointments?|reminders?|schedule|booked|holds?)\b/.test(lower)) return { type: 'listAppointments' };
  if (/\b(week|history|logged|reports?|missing|absence|gaps?)\b/.test(lower)) {
    const days = /\bmonth\b/.test(lower) ? 30 : 7;
    return { type: 'absence', days };
  }

  // 6. App help.
  if (/\b(subscription|subscribe|cancel|restore|purchase|billing|refund|price)\b/.test(lower)) return { type: 'help', topic: 'subscription' };
  if (/\b(delete|account|sign ?out|log ?out|password|email)\b/.test(lower)) return { type: 'help', topic: 'account' };
  if (/\b(privacy|private|who can see|location|contacts|microphone)\b/.test(lower)) return { type: 'help', topic: 'privacy' };
  if (/\b(export|my data|download)\b/.test(lower)) return { type: 'help', topic: 'export' };
  if (/\b(where|tab|navigate|settings|find)\b/.test(lower)) return { type: 'help', topic: 'navigation' };
  if (/\b(start|begin|how do i log|how does this work|get started|onboard)\b/.test(lower)) return { type: 'help', topic: 'onboarding' };

  return { type: 'unknown' };
}

/** Local-date key YYYY-MM-DD. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Absence, stated honestly: count reports in the window and name the days with
 * none. Nothing is imputed for a missing day.
 */
export function absenceWindow(timestamps: number[], days: number, now: Date = new Date()): { logged: number; missing: string[] } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).getTime();
  const inWindow = timestamps.filter((t) => t >= start && t <= now.getTime());
  const seen = new Set(inWindow.map(dayKey));
  const missing: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    if (!seen.has(dayKey(d.getTime()))) missing.push(days <= 7 ? DAY_ABBR[d.getDay()] : `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`);
  }
  return { logged: inWindow.length, missing };
}
