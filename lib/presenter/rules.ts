/**
 * PRESENTER SCRIPT RULES — what the synthetic presenter may say.
 *
 * The presenter is a synthetic human that lipsyncs PRE-RECORDED lines. It is not a
 * chatbot (PROHIBITED_FEATURES.md, Category C), it never listens (Category A:
 * camera/microphone access), and it only describes what the user recorded.
 * Owner decision 2026-10-05: scope stays inside the frozen law
 * (governance/DECISION_2026-09-12_ASSISTANT_WITHDRAWN.md is not reversed).
 *
 * Sources, all enforced by checkScript():
 *   governance/CAPACITY_DOCTRINE.ts       prohibitedLanguage (passed in as `doctrineTerms`)
 *   governance/PROHIBITED_FEATURES.md     Category B (streaks, badges) and C (advice, tips, chat)
 *   governance/ABSENCE_AS_SIGNAL_SPEC.md  section 4.2 phrases; "No signals recorded" is the label
 *   governance/SILENT_ONBOARDING.md       presenter off by default, never on first launch, no autoplay
 *
 * Pure module: no imports, so the CLI can load it under Node's type stripping as well as tsx.
 */

export type PresenterTrigger = 'user_tap' | 'after_user_log';

export interface PresenterLine {
  id: string;
  section: string;
  /** repo path of the screen that shows this line; must exist */
  surface: string;
  trigger: PresenterTrigger;
  /** the words the presenter SAYS: fixed text, rendered once to a lipsynced clip */
  spoken: string;
  /** optional on-screen text; {var} placeholders are filled from the user's own record */
  caption?: string;
  vars?: string[];
  /** rendered clip (path + sha256), null until rendered and gated */
  clip: { path: string; sha256: string } | null;
}

export interface PresenterScript {
  schema: string;
  locale: string;
  presenter: {
    enabled_by_default: boolean;
    autoplay: boolean;
    microphone: boolean;
    disclosure_line: string;
  };
  lines: PresenterLine[];
}

/** Advice, chat, reminders, gamification and wellness framing (PROHIBITED_FEATURES.md B + C, ASSISTANT_WITHDRAWN). */
export const PRESENTER_BANNED: readonly string[] = [
  'you should', 'try', 'consider', 'recommend', 'suggest', 'tip', 'tips', 'advice',
  'remember to', "don't forget", 'make sure', 'it may help', 'helps you', 'you might want',
  'medication', 'medicine', 'dose', 'pill', 'prescription', 'therapist', 'coach', 'coaching',
  'breathe', 'breathing', 'meditate', 'mood', 'emotion', 'energy', 'stress', 'fatigue', 'tired',
  'feel better', 'streak', 'badge', 'achievement', 'score', 'grade', 'percent',
  'great job', 'well done', 'proud', 'keep it up', 'keep going',
  // ABSENCE_AS_SIGNAL_SPEC 4.2
  'missing', 'skipped', 'incomplete', "didn't log", 'gaps in tracking', "don't break",
];

export const SPOKEN_MAX_CHARS = 200;

function termRegex(term: string): RegExp {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])${esc}($|[^a-z0-9])`, 'i');
}

/** Clean one doctrine entry: the doctrine carries inline comments and is matched as written. */
function cleanTerms(terms: readonly string[]): string[] {
  return terms.map((t) => t.trim().toLowerCase()).filter(Boolean);
}

export function bannedIn(text: string, terms: readonly string[]): string[] {
  return terms.filter((t) => termRegex(t).test(text));
}

export interface Violation {
  id: string;
  rule: string;
  detail: string;
}

/**
 * Every rule, every line. `fileExists` lets the CLI tie each line to a real screen; omit it in pure tests.
 */
export function checkScript(
  script: PresenterScript,
  doctrineTerms: readonly string[],
  fileExists?: (path: string) => boolean,
): Violation[] {
  const out: Violation[] = [];
  const terms = [...cleanTerms(doctrineTerms), ...PRESENTER_BANNED];
  const p = script.presenter;
  if (p.enabled_by_default) out.push({ id: '*', rule: 'silent_onboarding', detail: 'presenter must be off by default' });
  if (p.autoplay) out.push({ id: '*', rule: 'silent_onboarding', detail: 'presenter must never autoplay' });
  if (p.microphone) out.push({ id: '*', rule: 'prohibited_features_A', detail: 'microphone access is prohibited' });

  const seen = new Set<string>();
  for (const l of script.lines) {
    if (seen.has(l.id)) out.push({ id: l.id, rule: 'unique_id', detail: 'duplicate id' });
    seen.add(l.id);
    if (l.trigger !== 'user_tap' && l.trigger !== 'after_user_log') {
      out.push({ id: l.id, rule: 'trigger', detail: `trigger ${String(l.trigger)} is not user-initiated` });
    }
    if (!l.spoken.trim()) out.push({ id: l.id, rule: 'spoken', detail: 'empty' });
    if (l.spoken.length > SPOKEN_MAX_CHARS) {
      out.push({ id: l.id, rule: 'spoken_length', detail: `${l.spoken.length} > ${SPOKEN_MAX_CHARS} chars` });
    }
    if (/[{}]/.test(l.spoken)) {
      out.push({ id: l.id, rule: 'spoken_fixed', detail: 'spoken text is rendered once; variables belong in the caption' });
    }
    for (const [field, text] of [['spoken', l.spoken], ['caption', l.caption ?? '']] as const) {
      const hit = bannedIn(text, terms);
      if (hit.length) out.push({ id: l.id, rule: 'language', detail: `${field}: ${hit.join(', ')}` });
    }
    const used = [...(l.caption ?? '').matchAll(/\{([a-z0-9_]+)\}/g)].map((m) => m[1]);
    const declared = new Set(l.vars ?? []);
    for (const v of used) if (!declared.has(v)) out.push({ id: l.id, rule: 'vars', detail: `{${v}} not declared` });
    for (const v of declared) if (!used.includes(v)) out.push({ id: l.id, rule: 'vars', detail: `${v} declared, unused` });
    if (fileExists && !fileExists(l.surface)) {
      out.push({ id: l.id, rule: 'surface', detail: `${l.surface} does not exist` });
    }
  }
  const disc = script.lines.find((l) => l.id === p.disclosure_line);
  if (!disc) {
    out.push({ id: p.disclosure_line, rule: 'disclosure', detail: 'disclosure line missing' });
  } else if (!/synthetic/i.test(disc.spoken) || !/not a person/i.test(disc.spoken)) {
    out.push({ id: disc.id, rule: 'disclosure', detail: 'must say it is synthetic and not a person' });
  }
  return out;
}

/** Fill a caption from the user's own record. Unknown placeholders are left visible, never invented. */
export function fillCaption(line: PresenterLine, values: Record<string, string | number>): string {
  return (line.caption ?? '').replace(/\{([a-z0-9_]+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}
