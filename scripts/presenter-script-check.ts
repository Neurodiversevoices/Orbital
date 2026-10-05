/**
 * presenter:check — every presenter line against Orbital's frozen law.
 *
 *   npx tsx scripts/presenter-script-check.ts            (or: node --experimental-strip-types ...)
 *
 * Runs a CONTROL first: a script of known violations must be caught, rule by rule, or the check
 * refuses to report a pass (a checker that finds nothing proves nothing). Then the real script.
 * Exit 0 = control caught everything AND the script has zero violations.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());   // run from the repo root (npm run presenter:check does)

async function main(): Promise<number> {
  // Paths through variables: loadable under Node type stripping and tsx alike, without tsc import-extension rules.
  const rulesPath = join(ROOT, 'lib/presenter/rules.ts');
  const doctrinePath = join(ROOT, 'governance/CAPACITY_DOCTRINE.ts');
  const R = await import(rulesPath);
  const D = await import(doctrinePath);
  const terms: string[] = [...D.CAPACITY_DOCTRINE.prohibitedLanguage];

  const bad = {
    schema: 'control', locale: 'en',
    presenter: { enabled_by_default: true, autoplay: true, microphone: true, disclosure_line: 'x.disclosure' },
    lines: [
      { id: 'x.disclosure', section: 'x', surface: 'nope.tsx', trigger: 'user_tap', spoken: 'Hi, I am your helper.', clip: null },
      { id: 'x.advice', section: 'x', surface: 'nope.tsx', trigger: 'user_tap', spoken: 'You should try breathing exercises.', clip: null },
      { id: 'x.clinical', section: 'x', surface: 'nope.tsx', trigger: 'user_tap', spoken: 'This indicates anxiety because of stress.', clip: null },
      { id: 'x.absence', section: 'x', surface: 'nope.tsx', trigger: 'user_tap', spoken: "You didn't log yesterday. Keep your streak!", clip: null },
      { id: 'x.meds', section: 'x', surface: 'nope.tsx', trigger: 'user_tap', spoken: 'Remember to take your medication.', clip: null },
      { id: 'x.var', section: 'x', surface: 'nope.tsx', trigger: 'first_launch', spoken: 'You logged {count} times.', caption: '{n}', clip: null },
      { id: 'x.var', section: 'x', surface: 'nope.tsx', trigger: 'user_tap', spoken: 'Fine.', clip: null },
    ],
  };
  const want = ['silent_onboarding', 'prohibited_features_A', 'disclosure', 'language', 'spoken_fixed', 'vars', 'trigger', 'unique_id', 'surface'];
  const ctrl: { rule: string; id: string }[] = R.checkScript(bad, terms, (p: string) => existsSync(join(ROOT, p)));
  const caught = new Set(ctrl.map((v) => v.rule));
  const missed = want.filter((r) => !caught.has(r));
  const langIds = new Set(ctrl.filter((v) => v.rule === 'language').map((v) => v.id));
  const langMissed = ['x.advice', 'x.clinical', 'x.absence', 'x.meds'].filter((id) => !langIds.has(id));
  console.log(`control: ${ctrl.length} violations caught; rules missed: ${missed.length ? missed.join(', ') : 'none'}; ` +
              `banned lines missed: ${langMissed.length ? langMissed.join(', ') : 'none'}`);
  if (missed.length || langMissed.length) {
    console.log('CONTROL FAILED: the checker would pass a script it must refuse. No verdict on the real script.');
    return 2;
  }

  const script = JSON.parse(readFileSync(join(ROOT, 'lib/presenter/script.en.json'), 'utf8'));
  const v: { id: string; rule: string; detail: string }[] = R.checkScript(script, terms, (p: string) => existsSync(join(ROOT, p)));
  // An attached clip must be the file it names: present, and the sha256 recorded when it passed the lipsync gate.
  for (const l of script.lines as { id: string; clip: { path: string; sha256: string } | null }[]) {
    if (!l.clip) continue;
    const f = join(ROOT, l.clip.path);
    if (!existsSync(f)) v.push({ id: l.id, rule: 'clip', detail: `${l.clip.path} does not exist` });
    else if (createHash('sha256').update(readFileSync(f)).digest('hex') !== l.clip.sha256) {
      v.push({ id: l.id, rule: 'clip', detail: `${l.clip.path} sha256 differs from the gated clip` });
    }
  }
  const sections: Record<string, number> = {};
  for (const l of script.lines) sections[l.section] = (sections[l.section] ?? 0) + 1;
  const clips = script.lines.filter((l: { clip: unknown }) => l.clip).length;
  console.log(`script: ${script.lines.length} lines ${JSON.stringify(sections)}; clips rendered ${clips}/${script.lines.length}; ` +
              `terms checked ${terms.length + R.PRESENTER_BANNED.length}`);
  for (const x of v) console.log(`  VIOLATION ${x.id} [${x.rule}] ${x.detail}`);
  console.log(v.length ? `FAIL: ${v.length} violations` : 'PASS: 0 violations');
  return v.length ? 1 : 0;
}

main().then((code) => process.exit(code), (e) => { console.error(e); process.exit(3); });
