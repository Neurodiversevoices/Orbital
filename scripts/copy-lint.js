#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Orbital — clinical copy lint.
 *
 * Walks `app/` and `components/` (NOT `lib/`, NOT `docs/`, NOT `public/`)
 * and reports any forbidden Path-A vocabulary that appears in
 * user-facing strings.
 *
 * Heuristic for "user-facing":
 *   - JSX text content:  `>some text<`
 *   - String/template literal values assigned to props named
 *     label / title / text / headline / subtitle / subline /
 *     placeholder / accessibilityLabel / message / body / eyebrow.
 *
 * The scanner deliberately skips:
 *   - Single-line `// …` and block `/* … *\/` comments
 *   - `import …` and `export …` statements
 *   - Files inside `lib/cci/` (out of scope per Path A)
 *   - Anything listed in `scripts/copy-allowlist.json`
 *
 * Exit codes:
 *   0 — clean
 *   1 — forbidden hits
 *   2 — execution error
 *
 * Usage:
 *   node scripts/copy-lint.js
 *   npm run copy:lint
 *
 * Implementation note: only Node built-ins (fs, path) are used so this
 * script can run in any CI environment without `npm install`.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config — keep in sync with lib/copy/words.ts
// ---------------------------------------------------------------------------

const FORBIDDEN_WORDS = [
  'diagnose',
  'diagnosis',
  'diagnostic',
  'treat',
  'treatment',
  'cure',
  'heal',
  'therapy',
  'therapist',
  'prescribe',
  'prescription',
  'dose',
  'dosage',
  'symptom',
  'condition',
  'disorder',
  'illness',
  'disease',
  'patient',
];

const FORBIDDEN_RE = new RegExp(
  `\\b(${FORBIDDEN_WORDS.slice()
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})\\b`,
  'gi',
);

const TARGET_PROPS = new Set([
  'label',
  'title',
  'text',
  'headline',
  'subtitle',
  'subline',
  'placeholder',
  'accessibilityLabel',
  'message',
  'body',
  'eyebrow',
]);

const SCAN_ROOTS = ['app', 'components'];
const SKIP_DIRS = new Set([
  'node_modules',
  '.expo',
  '.git',
  'dist',
  'build',
  'ios',
  'android',
  '__tests__',
  '__mocks__',
]);
const SKIP_PATH_FRAGMENTS = [
  // Path A keeps "patient" in the CCI codebase.
  path.join('lib', 'cci'),
  path.join('components', 'cci'),
];
const FILE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const ALLOWLIST_PATH = path.join(ROOT, 'scripts', 'copy-allowlist.json');

function loadAllowlist() {
  try {
    const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { entries: [] };
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    return { entries };
  } catch (err) {
    if (err && err.code === 'ENOENT') return { entries: [] };
    console.warn(
      `[copy-lint] WARNING: failed to parse allowlist at ${ALLOWLIST_PATH}: ${err.message}`,
    );
    return { entries: [] };
  }
}

function isAllowed(allowlist, file, line, word) {
  return allowlist.entries.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    if (entry.word && entry.word.toLowerCase() !== word.toLowerCase()) return false;
    if (entry.file && !file.endsWith(entry.file)) return false;
    if (entry.line && entry.line !== line) return false;
    return Boolean(entry.word || entry.file);
  });
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function shouldSkipDir(dirPath) {
  const base = path.basename(dirPath);
  if (SKIP_DIRS.has(base)) return true;
  return SKIP_PATH_FRAGMENTS.some((frag) => dirPath.includes(frag));
}

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === 'ENOENT') return;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(full)) continue;
      walk(full, out);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (!FILE_EXTS.has(ext)) continue;
      if (SKIP_PATH_FRAGMENTS.some((frag) => full.includes(frag))) continue;
      out.push(full);
    }
  }
}

// ---------------------------------------------------------------------------
// Source pre-processing — strip comments + import/export lines
// ---------------------------------------------------------------------------

function stripCommentsAndImports(src) {
  // Replace block comments with same-length whitespace so line/column stays
  // correct (good enough for our coarse heuristic).
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m
      .split('')
      .map((c) => (c === '\n' ? '\n' : ' '))
      .join(''),
  );

  // Strip line comments and import/export statements per line.
  out = out
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (
        trimmed.startsWith('import ') ||
        trimmed.startsWith('import(') ||
        trimmed.startsWith('export ') ||
        trimmed.startsWith('export{') ||
        trimmed.startsWith('export*')
      ) {
        return ' '.repeat(line.length);
      }
      const lineCommentIdx = findLineCommentStart(line);
      if (lineCommentIdx === -1) return line;
      return line.slice(0, lineCommentIdx) + ' '.repeat(line.length - lineCommentIdx);
    })
    .join('\n');

  return out;
}

// Returns the index of the first `//` that is outside strings, or -1.
function findLineCommentStart(line) {
  let i = 0;
  let inStr = null; // '"' | "'" | '`'
  while (i < line.length - 1) {
    const ch = line[i];
    const nx = line[i + 1];
    if (inStr) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === inStr) {
        inStr = null;
      }
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      i += 1;
      continue;
    }
    if (ch === '/' && nx === '/') return i;
    i += 1;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// User-facing string extraction
// ---------------------------------------------------------------------------

/**
 * Yield { value, line, column } for each user-facing string in `src`.
 *
 * Heuristics:
 *   1. JSX text:        `>([^<>{}]+)<`  (with at least one letter)
 *   2. Prop strings:    `(propName)\s*=\s*"…"` or `…={"…"}` / `={`…`}`
 *
 * `src` should already have comments and imports stripped.
 */
function* extractUserFacingStrings(src) {
  // 1. JSX text content
  const jsxTextRe = />([^<>{}\n]+)</g;
  let m;
  while ((m = jsxTextRe.exec(src)) !== null) {
    const value = m[1];
    if (!/[a-zA-Z]/.test(value)) continue;
    if (value.trim().length === 0) continue;
    yield {
      value,
      offset: m.index + 1,
    };
  }

  // 2. Prop value strings (label="…", title={"…"}, headline={`…`}, etc.)
  //    Captures the prop name and the literal contents.
  const propRe = new RegExp(
    String.raw`\b(${[...TARGET_PROPS].join('|')})\s*=\s*` +
      String.raw`(?:` +
      String.raw`"([^"\\]*(?:\\.[^"\\]*)*)"` + // double-quoted
      String.raw`|'([^'\\]*(?:\\.[^'\\]*)*)'` + // single-quoted
      String.raw`|\{\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*\}` + // ={"..."}
      String.raw`|\{\s*'([^'\\]*(?:\\.[^'\\]*)*)'\s*\}` + // ={'...'}
      String.raw`|\{\s*\x60([^\x60]*)\x60\s*\}` + // ={`...`}
      String.raw`)`,
    'g',
  );
  while ((m = propRe.exec(src)) !== null) {
    const value = m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6];
    if (typeof value !== 'string') continue;
    if (!/[a-zA-Z]/.test(value)) continue;
    // Compute offset of the literal contents inside the match.
    const literalStart = m[0].indexOf(value, m[0].indexOf('=')) ;
    yield {
      value,
      offset: m.index + (literalStart >= 0 ? literalStart : 0),
    };
  }
}

// ---------------------------------------------------------------------------
// Line/column lookup
// ---------------------------------------------------------------------------

function buildLineIndex(src) {
  const offsets = [0];
  for (let i = 0; i < src.length; i += 1) {
    if (src.charCodeAt(i) === 10 /* \n */) offsets.push(i + 1);
  }
  return offsets;
}

function offsetToLineCol(lineIndex, offset) {
  // Binary search.
  let lo = 0;
  let hi = lineIndex.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (lineIndex[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, column: offset - lineIndex[lo] + 1 };
}

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------

function scanFile(filePath, allowlist) {
  const hits = [];
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.warn(`[copy-lint] could not read ${filePath}: ${err.message}`);
    return hits;
  }

  const cleaned = stripCommentsAndImports(raw);
  const lineIndex = buildLineIndex(cleaned);
  const relPath = path.relative(ROOT, filePath);

  for (const { value, offset } of extractUserFacingStrings(cleaned)) {
    FORBIDDEN_RE.lastIndex = 0;
    let wm;
    while ((wm = FORBIDDEN_RE.exec(value)) !== null) {
      const absOffset = offset + wm.index;
      const { line, column } = offsetToLineCol(lineIndex, absOffset);
      const word = wm[1].toLowerCase();
      if (isAllowed(allowlist, relPath, line, word)) continue;
      hits.push({
        file: relPath,
        line,
        column,
        word,
        snippet: value.trim().slice(0, 120),
      });
      if (wm.index === FORBIDDEN_RE.lastIndex) FORBIDDEN_RE.lastIndex += 1;
    }
  }

  return hits;
}

function pad(str, width) {
  const s = String(str);
  if (s.length >= width) return s;
  return s + ' '.repeat(width - s.length);
}

function printReport(allHits) {
  if (allHits.length === 0) {
    console.log('[copy-lint] OK — no forbidden words in user-facing strings.');
    return;
  }

  const fileW = Math.min(
    60,
    Math.max(8, ...allHits.map((h) => h.file.length)),
  );
  const wordW = Math.max(8, ...allHits.map((h) => h.word.length));

  console.log('');
  console.log(
    `${pad('FILE', fileW)}  ${pad('LINE:COL', 9)}  ${pad('WORD', wordW)}  SNIPPET`,
  );
  console.log(
    `${'-'.repeat(fileW)}  ${'-'.repeat(9)}  ${'-'.repeat(wordW)}  ${'-'.repeat(40)}`,
  );
  for (const h of allHits) {
    console.log(
      `${pad(h.file, fileW)}  ${pad(`${h.line}:${h.column}`, 9)}  ${pad(h.word, wordW)}  ${h.snippet}`,
    );
  }
  console.log('');
  console.log(
    `[copy-lint] FAIL — ${allHits.length} forbidden hit${allHits.length === 1 ? '' : 's'} across ${
      new Set(allHits.map((h) => h.file)).size
    } file(s).`,
  );
  console.log(
    `Add a known-safe occurrence to scripts/copy-allowlist.json (entries[]: { file, line?, word? }).`,
  );
}

function main() {
  const allowlist = loadAllowlist();
  const files = [];
  for (const root of SCAN_ROOTS) {
    walk(path.join(ROOT, root), files);
  }

  let allHits = [];
  for (const file of files) {
    allHits = allHits.concat(scanFile(file, allowlist));
  }

  // Stable sort: file, then line, then column.
  allHits.sort((a, b) => {
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    if (a.line !== b.line) return a.line - b.line;
    return a.column - b.column;
  });

  printReport(allHits);
  process.exit(allHits.length === 0 ? 0 : 1);
}

try {
  main();
} catch (err) {
  console.error(`[copy-lint] ERROR: ${err && err.stack ? err.stack : err}`);
  process.exit(2);
}
