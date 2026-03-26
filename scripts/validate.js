#!/usr/bin/env node
/**
 * Programmatic Stages 1–4 from .cursor/rules/submission-protocol.md
 * Exit 0 only if no BLOCKING findings. Prints BLOCKING / HIGH / MEDIUM groups.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');

const findings = { BLOCKING: [], HIGH: [], MEDIUM: [] };

function add(level, msg) {
  findings[level].push(msg);
}

function walkFiles(dir, extOk, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
      walkFiles(p, extOk, out);
    } else {
      if (extOk(path.extname(name))) out.push(p);
    }
  }
  return out;
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

// --- Stage 1: semantic / code audit ---
function stage1ForbiddenTerms() {
  const roots = [
    path.join(REPO, 'app'),
    path.join(REPO, 'components'),
    path.join(REPO, 'locales'),
  ];
  const extOk = (e) => ['.tsx', '.ts', '.jsx', '.js', '.json'].includes(e);
  // Workspace rule + protocol clinical list (case-insensitive)
  const re =
    /\b(diagnosis|diagnose|treatment|therapy|medical device|HIPAA|CPT|FDA|clinical-grade)\b/gi;
  for (const root of roots) {
    for (const file of walkFiles(root, extOk)) {
      const lines = read(file).split('\n');
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (
          trimmed.startsWith('//') ||
          trimmed.startsWith('*') ||
          trimmed.startsWith('/*') ||
          trimmed.endsWith('*/')
        ) {
          return;
        }
        const t = line.replace(/\/\/.*$/, '');
        let m;
        re.lastIndex = 0;
        while ((m = re.exec(t)) !== null) {
          add(
            'BLOCKING',
            `Forbidden term "${m[1]}" in ${path.relative(REPO, file)}:${i + 1}`
          );
        }
      });
    }
  }
}

function stage1ConsoleLog() {
  const roots = [path.join(REPO, 'app'), path.join(REPO, 'components')];
  const extOk = (e) => ['.tsx', '.ts', '.jsx', '.js'].includes(e);
  for (const root of roots) {
    for (const file of walkFiles(root, extOk)) {
      const lines = read(file).split('\n');
      lines.forEach((line, i) => {
        if (!/console\.log\s*\(/.test(line)) return;
        if (line.includes('__DEV__')) return;
        add(
          'BLOCKING',
          `console.log without __DEV__ guard: ${path.relative(REPO, file)}:${i + 1}`
        );
      });
    }
  }
}

function stage1MockPurchaseIos() {
  const upgrade = path.join(REPO, 'app', 'upgrade.tsx');
  if (!fs.existsSync(upgrade)) return;
  const lines = read(upgrade).split('\n');
  const mockCallIdx = lines.findIndex((l) => /\bawait\s+handleMockPurchase\s*\(/.test(l));
  if (mockCallIdx === -1) return;
  const webCommentIdx = lines.findIndex((l) =>
    /\/\/\s*Web:\s*(RevenueCat|stub)/i.test(l.trim())
  );
  const nativeCommentIdx = lines.findIndex((l) =>
    /\/\/\s*iOS\/Android:\s*never use mock checkout/i.test(l)
  );
  if (nativeCommentIdx === -1) {
    add('HIGH', 'upgrade.tsx: missing "never use mock checkout" comment near native purchase path');
  }
  if (webCommentIdx !== -1 && mockCallIdx < webCommentIdx) {
    add(
      'BLOCKING',
      'upgrade.tsx: await handleMockPurchase appears before the Web-only branch — must not run on iOS native'
    );
  }
}

function stage1TypeScript() {
  const r = spawnSync('npx', ['tsc', '--noEmit'], {
    cwd: REPO,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const raw = (r.stdout || '') + (r.stderr || '');
  const allLines = raw.split('\n').filter((l) => l.trim());
  const lines = allLines.filter((l) => !l.includes('supabase/functions'));
  if (r.status !== 0 && lines.length) {
    lines.slice(0, 40).forEach((l) => add('BLOCKING', `TypeScript: ${l}`));
    if (lines.length > 40) add('BLOCKING', `TypeScript: … ${lines.length - 40} more lines`);
  } else if (r.status !== 0 && allLines.length) {
    /* only supabase/functions (Deno) errors — same as submission-protocol filter */
  } else if (r.status !== 0) {
    add('BLOCKING', 'TypeScript: npx tsc --noEmit failed (no output)');
  }
}

function stage1IconAlpha() {
  const icon = path.join(REPO, 'assets', 'icon.png');
  if (!fs.existsSync(icon)) {
    add('MEDIUM', 'Stage 1: assets/icon.png missing (cannot check alpha)');
    return;
  }
  if (process.platform !== 'darwin') {
    add('MEDIUM', 'Stage 1: icon alpha check skipped (sips requires macOS)');
    return;
  }
  const r = spawnSync('sips', ['-g', 'hasAlpha', icon], { encoding: 'utf8' });
  if (/hasAlpha:\s*yes/i.test(r.stdout || '')) {
    add('HIGH', 'assets/icon.png has alpha — strip with sips --deleteProperty hasAlpha before submit');
  }
}

// --- Stage 2: URLs + optional ASC SKU spot-check ---
async function stage2Urls() {
  for (const [label, url] of [
    ['Terms', 'https://orbitalhealth.app/terms'],
    ['Privacy', 'https://orbitalhealth.app/privacy'],
  ]) {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow' });
      if (!res.ok) {
        add('BLOCKING', `${label} URL ${url} returned ${res.status} (expected 200)`);
      }
    } catch (e) {
      add('BLOCKING', `${label} URL fetch failed: ${url} — ${e.message || e}`);
    }
  }
}

function loadEasAscConfigExists() {
  try {
    const eas = JSON.parse(read(path.join(REPO, 'eas.json')));
    const ios = eas?.submit?.production?.ios;
    if (!ios?.ascApiKeyPath) return null;
    const keyPath = path.join(REPO, ios.ascApiKeyPath.replace(/^\.\//, ''));
    if (!fs.existsSync(keyPath)) return null;
    return { appId: ios.ascAppId, ios };
  } catch {
    return null;
  }
}

async function stage2AscSpotCheck() {
  const cfg = loadEasAscConfigExists();
  if (!cfg) {
    add(
      'MEDIUM',
      'Stage 2: ASC IAP audit skipped (no eas.json ASC key file on disk — expected in CI after secret write)'
    );
    return;
  }
  const crypto = require('crypto');
  const keyPath = path.join(
    REPO,
    cfg.ios.ascApiKeyPath.replace(/^\.\//, '')
  );
  const privateKey = read(keyPath);
  function createAscToken() {
    const header = Buffer.from(
      JSON.stringify({
        alg: 'ES256',
        kid: cfg.ios.ascApiKeyId,
        typ: 'JWT',
      })
    ).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        iss: cfg.ios.ascApiKeyIssuerId,
        aud: 'appstoreconnect-v1',
        iat: now,
        exp: now + 19 * 60,
      })
    ).toString('base64url');
    const msg = `${header}.${payload}`;
    const sig = crypto.sign('sha256', Buffer.from(msg), {
      key: privateKey,
      dsaEncoding: 'ieee-p1363',
    });
    return `${msg}.${Buffer.from(sig).toString('base64url')}`;
  }
  const token = createAscToken();
  const BASE = 'https://api.appstoreconnect.apple.com';
  const protoSkus = [
    'orbital_cci_free',
    'orbital_cci_pro',
    'orbital_individual_annual',
    'orbital_individual_monthly',
    'orbital_pro_annual',
    'orbital_pro_monthly',
  ];
  async function fetchJson(url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    let j = {};
    try {
      j = text ? JSON.parse(text) : {};
    } catch {
      j = {};
    }
    return { ok: res.ok, status: res.status, json: j };
  }
  let found = new Set();
  let next = `${BASE}/v1/apps/${cfg.appId}/inAppPurchasesV2?limit=200`;
  while (next) {
    const { ok, json } = await fetchJson(next);
    if (!ok) {
      add('HIGH', `Stage 2: ASC inAppPurchasesV2 list failed HTTP (cannot verify protocol SKUs)`);
      return;
    }
    for (const row of json.data || []) {
      const pid = row.attributes?.productId;
      if (pid) found.add(pid);
    }
    const raw = json.links?.next;
    next = raw ? (raw.startsWith('http') ? raw : `${BASE}${raw}`) : null;
  }
  let gnext = `${BASE}/v1/apps/${cfg.appId}/subscriptionGroups?limit=50`;
  let groupId = null;
  while (gnext) {
    const { ok, json } = await fetchJson(gnext);
    if (!ok) break;
    const g0 = (json.data || [])[0];
    if (g0?.id) groupId = g0.id;
    gnext = null;
  }
  if (groupId) {
    let snext = `${BASE}/v1/subscriptionGroups/${groupId}/subscriptions?limit=200`;
    while (snext) {
      const { ok, json } = await fetchJson(snext);
      if (!ok) break;
      for (const row of json.data || []) {
        const pid = row.attributes?.productId;
        if (pid) found.add(pid);
      }
      const raw = json.links?.next;
      snext = raw ? (raw.startsWith('http') ? raw : `${BASE}${raw}`) : null;
    }
  }
  for (const sku of protoSkus) {
    if (!found.has(sku)) {
      add('HIGH', `Stage 2: protocol IAP missing in ASC list: ${sku}`);
    }
  }
}

// --- Stage 3: visual (informational in CI) ---
function stage3Visual() {
  if (process.env.ORBITAL_MAESTRO_VISUAL_OK === '1') return;
  add(
    'MEDIUM',
    'Stage 3: simulator screenshots not run in this script — run scripts/maestro/screenshot-flow.yaml on iPhone 16; set ORBITAL_MAESTRO_VISUAL_OK=1 after capture to silence'
  );
}

// --- Stage 4: paywall / App Store copy ---
function stage4Paywall() {
  const upgrade = path.join(REPO, 'app', 'upgrade.tsx');
  if (!fs.existsSync(upgrade)) {
    add('BLOCKING', 'Stage 4: app/upgrade.tsx missing');
    return;
  }
  const t = read(upgrade);
  if (!/Restore Purchases/.test(t)) {
    add('BLOCKING', 'Stage 4: paywall must show "Restore Purchases"');
  }
  if (!/Privacy/.test(t) || !/Terms/.test(t)) {
    add('BLOCKING', 'Stage 4: paywall must reference Terms and Privacy');
  }
  if (!/charged for renewal|renewal within 24 hours|auto-renew/i.test(t)) {
    add(
      'BLOCKING',
      'Stage 4: renewal disclosure before purchase not found (expect renewal / 24h copy)'
    );
  }
}

function stage4AppStoreDescriptionMoney() {
  const metaDir = path.join(REPO, 'fastlane', 'metadata');
  if (!fs.existsSync(metaDir)) {
    add('MEDIUM', 'Stage 4: fastlane/metadata not found — skipped $ check for App Store description');
    return;
  }
  const files = walkFiles(metaDir, (e) => e === '.txt');
  for (const f of files) {
    const rel = path.relative(REPO, f);
    if (!/\/description\.txt$/i.test(f) && !rel.includes('description')) continue;
    const body = read(f);
    if (/\$\d|\$\s*\d|\bUSD\b/i.test(body)) {
      add('BLOCKING', `Stage 4: dollar / USD amount in metadata file ${rel}`);
    }
  }
}

function printReport() {
  for (const level of ['BLOCKING', 'HIGH', 'MEDIUM']) {
    const xs = findings[level];
    if (!xs.length) continue;
    console.log(`\n=== ${level} (${xs.length}) ===`);
    xs.forEach((m) => console.log(`- ${m}`));
  }
  const ok = findings.BLOCKING.length === 0;
  console.log(
    `\n${ok ? 'READY TO SUBMIT (no BLOCKING items)' : 'NOT READY — fix BLOCKING items first'}`
  );
}

async function main() {
  console.log('Orbital validate.js — submission-protocol.md Stages 1–4\n');
  stage1ForbiddenTerms();
  stage1ConsoleLog();
  stage1MockPurchaseIos();
  stage1TypeScript();
  stage1IconAlpha();
  await stage2Urls();
  await stage2AscSpotCheck();
  stage3Visual();
  stage4Paywall();
  stage4AppStoreDescriptionMoney();
  printReport();
  process.exitCode = findings.BLOCKING.length > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
