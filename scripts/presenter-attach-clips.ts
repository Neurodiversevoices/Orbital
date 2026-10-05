/**
 * presenter:attach — bring Nova's rendered, gated clips into the app.
 *
 *   npx tsx scripts/presenter-attach-clips.ts <nova manifest.json>
 *
 * The manifest comes from Nova's scripts/nova_build/creator/presenter_lines.py (one lipsynced clip per line, each
 * through the lipsync gate, disclosure label + mark applied). A clip is attached ONLY when:
 *   - its row PASSED the gate, and
 *   - it was rendered from the line's CURRENT spoken text (sha256 of the text matches), and
 *   - the file's sha256 matches the manifest.
 * It is copied to assets/presenter/en/<id>.mp4 and the line's `clip` becomes {path, sha256}. A line whose text
 * changed since its clip was rendered goes back to `clip: null`. Nothing else in the script is touched.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const SCRIPT = join(ROOT, 'lib/presenter/script.en.json');
const DEST = 'assets/presenter/en';

const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

/** The script's on-disk format: top level indented, one line object per row (small diffs when clips attach). */
export function serialize(script: { lines: unknown[] } & Record<string, unknown>): string {
  const { lines, ...head } = script;
  const top = JSON.stringify(head, null, 2).replace(/\n}$/, '');
  return `${top},\n  "lines": [\n${lines.map((l) => '    ' + JSON.stringify(l)).join(',\n')}\n  ]\n}\n`;
}

function main(): number {
  const manPath = process.argv[2];
  if (!manPath) {
    console.log('usage: presenter-attach-clips.ts <manifest.json> | --format');
    return 2;
  }
  const script = JSON.parse(readFileSync(SCRIPT, 'utf8'));
  if (manPath === '--format') {
    writeFileSync(SCRIPT, serialize(script));
    return 0;
  }
  const man = JSON.parse(readFileSync(manPath, 'utf8'));
  const base = dirname(resolve(manPath));
  let attached = 0, reset = 0, skipped = 0;
  for (const line of script.lines) {
    const row = man.lines?.[line.id];
    const textSha = sha(line.spoken);
    if (!row || !row.PASS || row.text_sha256 !== textSha || !row.clip) {
      if (line.clip && (!row || row.text_sha256 !== textSha)) { line.clip = null; reset++; }
      skipped++;
      continue;
    }
    const src = join(base, row.clip);
    if (!existsSync(src) || sha(readFileSync(src)) !== row.sha256) {
      console.log(`  REFUSED ${line.id}: ${src} missing or sha256 differs from the manifest`);
      skipped++;
      continue;
    }
    const rel = `${DEST}/${line.id}.mp4`;
    mkdirSync(join(ROOT, DEST), { recursive: true });
    copyFileSync(src, join(ROOT, rel));
    line.clip = { path: rel, sha256: row.sha256 };
    attached++;
  }
  writeFileSync(SCRIPT, serialize(script));
  const have = script.lines.filter((l: { clip: unknown }) => l.clip).length;
  console.log(`attached ${attached}, reset ${reset}, not attached ${skipped}; clips ${have}/${script.lines.length} ` +
              `(char ${man.char}, voice ${man.voice})`);
  return 0;
}

process.exit(main());
