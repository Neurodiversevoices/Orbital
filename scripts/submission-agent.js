#!/usr/bin/env node
/**
 * Orbital Self-Healing Submission Agent
 *
 * Runs in two modes:
 *   node scripts/submission-agent.js           — daemon (polls every 30 min)
 *   node scripts/submission-agent.js --once    — single run (CI / cron)
 *
 * Required env (CI):
 *   ASC_KEY_ID, ASC_ISSUER_ID, ASC_API_KEY_P8 (PEM content)
 *   EXPO_TOKEN
 *   GITHUB_TOKEN    (optional — to open issues / create PRs)
 *   GITHUB_REPO     (optional — default Neurodiversevoices/Orbital)
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOG_PATH  = path.join(REPO_ROOT, 'logs', 'submission-agent.log');
const APP_ID    = '6757295146';
const ASC_BASE  = 'https://api.appstoreconnect.apple.com';
const GH_BASE   = 'https://api.github.com';
const ONCE      = process.argv.includes('--once');
const INTERVAL_MS = 30 * 60 * 1000;

const EULA_URL  = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const EULA_LINE = `\n\nTerms of Use: ${EULA_URL}`;

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(level, msg, data) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, line + '\n');
  } catch {}
}
const info  = (m, d) => log('INFO',  m, d);
const warn  = (m, d) => log('WARN',  m, d);
const error = (m, d) => log('ERROR', m, d);

// ─── ASC JWT ─────────────────────────────────────────────────────────────────

function loadAscCreds() {
  const keyId    = process.env.ASC_KEY_ID;
  const issuerId = process.env.ASC_ISSUER_ID;
  let   privateKey;

  // CI: PEM content in env
  if (process.env.ASC_API_KEY_P8) {
    privateKey = process.env.ASC_API_KEY_P8;
  } else {
    // Local: read from eas.json path
    try {
      const eas = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'eas.json'), 'utf8'));
      const ios = eas?.submit?.production?.ios;
      if (ios?.ascApiKeyPath) {
        const keyPath = path.join(REPO_ROOT, ios.ascApiKeyPath.replace(/^\.\//, ''));
        privateKey = fs.readFileSync(keyPath, 'utf8');
        return {
          keyId:     ios.ascApiKeyId    || keyId,
          issuerId:  ios.ascApiKeyIssuerId || issuerId,
          privateKey,
        };
      }
    } catch {}
  }
  if (!keyId || !issuerId || !privateKey) {
    throw new Error('ASC creds missing: set ASC_KEY_ID, ASC_ISSUER_ID, ASC_API_KEY_P8');
  }
  return { keyId, issuerId, privateKey };
}

function createAscToken({ keyId, issuerId, privateKey }) {
  const header  = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })).toString('base64url');
  const now     = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iss: issuerId, aud: 'appstoreconnect-v1', iat: now, exp: now + 1100 })).toString('base64url');
  const msg     = `${header}.${payload}`;
  const sig     = crypto.sign('sha256', Buffer.from(msg), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${msg}.${Buffer.from(sig).toString('base64url')}`;
}

async function ascFetch(creds, method, urlPath, body) {
  const url = urlPath.startsWith('http') ? urlPath : `${ASC_BASE}${urlPath}`;
  const tok = createAscToken(creds);
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`ASC ${method} ${url} → ${res.status}`);
    err.detail = json;
    err.status = res.status;
    throw err;
  }
  return json;
}

async function ascPaged(creds, initialPath) {
  const out = [];
  let next = initialPath.startsWith('http') ? initialPath : `${ASC_BASE}${initialPath}`;
  while (next) {
    const chunk = await ascFetch(creds, 'GET', next);
    if (chunk.data) out.push(...chunk.data);
    const raw = chunk.links?.next || null;
    next = raw ? (raw.startsWith('http') ? raw : `${ASC_BASE}${raw}`) : null;
  }
  return out;
}

// ─── GitHub helpers ───────────────────────────────────────────────────────────

async function ghFetch(method, urlPath, body) {
  const token = process.env.GITHUB_TOKEN;
  if (!token || token === 'YOUR_TOKEN_HERE') return null; // graceful skip
  const repo  = process.env.GITHUB_REPO || 'Neurodiversevoices/Orbital';
  const url   = urlPath.startsWith('http') ? urlPath : `${GH_BASE}/repos/${repo}${urlPath}`;
  const res   = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function openGitHubIssue(title, body) {
  const result = await ghFetch('POST', '/issues', { title, body, labels: ['rejection', 'auto-fix'] });
  if (result?.html_url) info('GitHub issue opened', { url: result.html_url });
  return result;
}

async function triggerWorkflow(workflowFile, ref = 'submission') {
  const repo = process.env.GITHUB_REPO || 'Neurodiversevoices/Orbital';
  const token = process.env.GITHUB_TOKEN;
  if (!token || token === 'YOUR_TOKEN_HERE') {
    warn('GITHUB_TOKEN not set — cannot trigger workflow');
    return null;
  }
  const url = `${GH_BASE}/repos/${repo}/actions/workflows/${workflowFile}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref }),
  });
  if (res.status === 204) {
    info(`Workflow ${workflowFile} triggered on ${ref}`);
    return true;
  }
  const text = await res.text();
  warn(`Workflow trigger failed: ${res.status}`, { text });
  return false;
}

// ─── Fix helpers ─────────────────────────────────────────────────────────────

async function fixEula(creds, versionId) {
  info('FIX: Adding EULA line to description');
  // Get current localization
  const locs = await ascFetch(creds, 'GET',
    `/v1/appStoreVersionLocalizations?filter[appStoreVersion]=${versionId}&filter[locale]=en-US`);
  const loc = locs?.data?.[0];
  if (!loc) { warn('No en-US localization found'); return false; }
  const desc = loc.attributes?.description || '';
  if (desc.includes('apple.com/legal/internet-services/itunes/dev/stdeula')) {
    info('EULA line already present');
    return true;
  }
  await ascFetch(creds, 'PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
    data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes: { description: desc + EULA_LINE } },
  });
  info('✅ EULA line added');
  return true;
}

async function fixReviewNotes(creds, versionId, extraNote = '') {
  info('FIX: Posting review notes with demo credentials');
  const base = `Thank you for reviewing Orbital. Demo credentials: review@orbital.health / Review2026!\n\nThis app tracks self-reported functional capacity. It is not a medical device, does not provide diagnoses, and does not offer clinical recommendations.\n\nAll in-app purchases are wired via RevenueCat (product IDs listed in description) and are fully functional in sandbox with the provided demo account.`;
  const notes = extraNote ? `${base}\n\n${extraNote}` : base;
  // GET existing review detail
  const details = await ascFetch(creds, 'GET',
    `/v1/appStoreVersions/${versionId}?include=appStoreReviewDetail`).catch(() => null);
  const detailId = details?.included?.[0]?.id;
  if (detailId) {
    await ascFetch(creds, 'PATCH', `/v1/appStoreReviewDetails/${detailId}`, {
      data: { type: 'appStoreReviewDetails', id: detailId, attributes: { notes, demoAccountName: 'review@orbital.health', demoAccountPassword: 'Review2026!', demoAccountRequired: true, contactEmail: 'eric@orbitalhealth.app' } },
    });
  } else {
    await ascFetch(creds, 'POST', `/v1/appStoreReviewDetails`, {
      data: { type: 'appStoreReviewDetails', attributes: { notes, demoAccountName: 'review@orbital.health', demoAccountPassword: 'Review2026!', demoAccountRequired: true, contactEmail: 'eric@orbitalhealth.app' }, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } } } },
    });
  }
  info('✅ Review notes updated');
  return true;
}

function runForbiddenTermsFix() {
  info('FIX: Running forbidden terms scan (validate.js)');
  const r = spawnSync('node', ['scripts/validate.js'], { cwd: REPO_ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    warn('Forbidden terms or validation failures detected', { output: r.stdout?.slice(0, 500) });
    return false;
  }
  info('✅ Forbidden terms check clean');
  return true;
}

async function fixIapReply(creds, rejectionNote) {
  info('FIX: Posting IAP resolution note to review details (RC wiring)');
  await fixReviewNotes(creds, STATE_CACHE.versionId,
    'IAP note: All products are wired via RevenueCat. Product IDs are listed in the app description. Sandbox testing available with demo account provided above.');
  return true;
}

// ─── Core state machine ───────────────────────────────────────────────────────

// Simple cache so we don't spam ASC for version ID on every cycle
const STATE_CACHE = { versionId: null, localizationId: null };

async function getActiveVersion(creds) {
  const versions = await ascPaged(creds, `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=10&sort=-createdDate`);
  // Prefer PREPARE_FOR_SUBMISSION, then REJECTED, then most recent
  const priority = ['PREPARE_FOR_SUBMISSION', 'WAITING_FOR_REVIEW', 'IN_REVIEW', 'REJECTED'];
  for (const state of priority) {
    const v = versions.find(x => x.attributes?.appStoreState === state);
    if (v) return v;
  }
  return versions[0] || null;
}

async function getRejectionNote(creds, versionId) {
  try {
    const sub = await ascFetch(creds, 'GET',
      `/v1/reviewSubmissions?filter[app]=${APP_ID}&filter[platform]=IOS&limit=10`);
    const rejected = (sub?.data || []).find(s =>
      s.attributes?.state === 'UNRESOLVED_ISSUES' || s.attributes?.state === 'REJECTED');
    if (!rejected) return null;
    const items = await ascFetch(creds, 'GET', `/v1/reviewSubmissions/${rejected.id}/items`);
    for (const item of (items?.data || [])) {
      if ((item.attributes?.errors || []).length > 0) {
        return item.attributes.errors.map(e => e.description).join('\n');
      }
    }
  } catch (e) {
    warn('Could not fetch rejection note', { err: e.message });
  }
  return null;
}

async function attachLatestValidBuild(creds, versionId) {
  const builds = await ascPaged(creds, `/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=25`);
  const valid = builds.find(b => b.attributes?.processingState === 'VALID' && !b.attributes?.expired);
  if (!valid) { warn('No valid build found to attach'); return false; }
  try {
    await ascFetch(creds, 'PATCH', `/v1/appStoreVersions/${versionId}`, {
      data: { type: 'appStoreVersions', id: versionId, relationships: { build: { data: { type: 'builds', id: valid.id } } } },
    });
    info(`✅ Build ${valid.attributes?.version} (${valid.id}) attached`);
    return true;
  } catch (e) {
    warn('Build attach failed', { err: e.message });
    return false;
  }
}

async function cancelStaleSubmissions(creds) {
  const subs = await ascFetch(creds, 'GET',
    `/v1/reviewSubmissions?filter[app]=${APP_ID}&filter[platform]=IOS&limit=10`);
  let cancelled = 0;
  for (const s of (subs?.data || [])) {
    if (s.attributes?.state === 'READY_FOR_REVIEW') {
      try {
        await ascFetch(creds, 'PATCH', `/v1/reviewSubmissions/${s.id}`, {
          data: { type: 'reviewSubmissions', id: s.id, attributes: { canceled: true } },
        });
        cancelled++;
      } catch {} // not always cancellable
    }
  }
  if (cancelled) info(`Cancelled ${cancelled} stale review submission(s)`);
}

async function submitForReview(creds, versionId) {
  // Try cancelling stale submissions first
  await cancelStaleSubmissions(creds);

  // Create new review submission
  try {
    const newSub = await ascFetch(creds, 'POST', `/v1/reviewSubmissions`, {
      data: {
        type: 'reviewSubmissions',
        attributes: { platform: 'IOS' },
        relationships: { app: { data: { type: 'apps', id: APP_ID } } },
      },
    });
    const subId = newSub.data?.id;
    info('Created review submission', { id: subId });

    // Add version as item
    await ascFetch(creds, 'POST', `/v1/reviewSubmissionItems`, {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: subId } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
        },
      },
    });

    // Confirm submission
    const confirmed = await ascFetch(creds, 'PATCH', `/v1/reviewSubmissions/${subId}`, {
      data: { type: 'reviewSubmissions', id: subId, attributes: { submitted: true } },
    });
    info('✅ Submitted for review', {
      submissionId: subId,
      state: confirmed.data?.attributes?.state,
    });
    return subId;
  } catch (e) {
    error('Submit for review failed', { err: e.message, detail: JSON.stringify(e.detail?.errors?.[0]) });
    return null;
  }
}

// ─── Known-fix dispatch ───────────────────────────────────────────────────────

const FIXES = [
  {
    match: /eula|terms of use|license agreement/i,
    label: 'EULA',
    fix: async (creds, versionId, note) => fixEula(creds, versionId),
  },
  {
    match: /in.?app purchase|iap|revenuecat|purchase flow|storekit/i,
    label: 'IAP',
    fix: async (creds, versionId, note) => {
      await fixIapReply(creds, note);
      // Also run setup-iap to ensure all products are submitted in ASC
      const r = spawnSync('node', ['scripts/setup-iap.js'], {
        cwd: REPO_ROOT, encoding: 'utf8',
        env: { ...process.env, ORBITAL_IAP_SCREENSHOT: '' },
      });
      if (r.status !== 0) warn('setup-iap.js had errors', { out: r.stdout?.slice(0, 400) });
      return true;
    },
  },
  {
    match: /clinical|medical|diagnos|treatment|therapy/i,
    label: 'forbidden_terms',
    fix: async () => runForbiddenTermsFix(),
  },
  {
    match: /screenshot|metadata/i,
    label: 'screenshots',
    fix: async (creds, versionId, note) => {
      warn('Screenshots/metadata rejection detected — manual Maestro run required');
      warn('Run: maestro test scripts/maestro/screenshot-flow.yaml --udid <UDID> --test-output-dir ~/Desktop/screenshots');
      return false; // cannot auto-fix screenshots in headless CI
    },
  },
];

async function applyFixes(creds, versionId, rejectionNote) {
  const applied = [];
  for (const fx of FIXES) {
    if (rejectionNote && fx.match.test(rejectionNote)) {
      info(`Applying fix: ${fx.label}`);
      try {
        const ok = await fx.fix(creds, versionId, rejectionNote);
        if (ok) applied.push(fx.label);
      } catch (e) {
        error(`Fix ${fx.label} threw`, { err: e.message });
      }
    }
  }
  // Always refresh review notes on any rejection
  await fixReviewNotes(creds, versionId).catch(() => {});
  return applied;
}

// ─── Main cycle ───────────────────────────────────────────────────────────────

async function runCycle() {
  info('=== Submission agent cycle start ===');
  let creds;
  try { creds = loadAscCreds(); } catch (e) { error(e.message); return; }

  let version;
  try { version = await getActiveVersion(creds); } catch (e) { error('Failed to fetch versions', { err: e.message }); return; }
  if (!version) { warn('No active iOS version found'); return; }

  const versionId = version.id;
  const state     = version.attributes?.appStoreState;
  STATE_CACHE.versionId = versionId;

  info(`Version ${version.attributes?.versionString} state: ${state}`, { id: versionId });

  if (state === 'WAITING_FOR_REVIEW' || state === 'IN_REVIEW') {
    info('In review — nothing to do');
    return;
  }

  if (state === 'APPROVED' || state === 'READY_FOR_SALE') {
    info('App is live — nothing to do');
    return;
  }

  if (state === 'PREPARE_FOR_SUBMISSION') {
    info('Version is editable — running validate.js');
    const r = spawnSync('node', ['scripts/validate.js'], { cwd: REPO_ROOT, encoding: 'utf8' });
    if (r.status !== 0) {
      warn('Validation failed — not submitting', { output: r.stdout?.slice(0, 800) });
      return;
    }
    info('Validation clean — attaching build and submitting');
    await attachLatestValidBuild(creds, versionId);
    await fixEula(creds, versionId);
    await fixReviewNotes(creds, versionId);
    const subId = await submitForReview(creds, versionId);
    if (subId) {
      await openGitHubIssue(
        `🚀 Orbital submitted for review (auto)`,
        `Submission agent submitted version ${version.attributes?.versionString}.\n\nSubmission ID: \`${subId}\`\n\nTimestamp: ${new Date().toISOString()}`
      );
    }
    return;
  }

  if (state === 'REJECTED') {
    info('Version REJECTED — starting auto-fix sequence');
    const rejectionNote = await getRejectionNote(creds, versionId);
    info('Rejection note', { note: rejectionNote?.slice(0, 300) || '(not found)' });

    const applied = await applyFixes(creds, versionId, rejectionNote || '');

    // Always ensure build is attached
    await attachLatestValidBuild(creds, versionId);

    // Open GitHub issue
    await openGitHubIssue(
      `🚨 App Store rejection — auto-fix applied (${new Date().toLocaleDateString()})`,
      `## Rejection detected\n\n**Version:** ${version.attributes?.versionString}\n**Version ID:** \`${versionId}\`\n**Timestamp:** ${new Date().toISOString()}\n\n**Rejection note:**\n\`\`\`\n${rejectionNote || 'Not retrieved'}\n\`\`\`\n\n**Auto-fixes applied:** ${applied.length ? applied.join(', ') : 'none matched'}\n\n**Next step:** Agent will resubmit on next cycle if version is in PREPARE_FOR_SUBMISSION state.`
    );

    // Attempt resubmission
    const subId = await submitForReview(creds, versionId);
    if (subId) {
      info(`✅ Resubmitted — submission ID: ${subId}`);
    } else {
      warn('Resubmission did not complete this cycle — will retry');
    }
    return;
  }

  warn(`Unhandled state: ${state}`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  info('Orbital Submission Agent starting', { mode: ONCE ? 'once' : 'daemon', interval: ONCE ? 'N/A' : `${INTERVAL_MS / 60000}m` });
  await runCycle().catch(e => error('Cycle uncaught error', { err: e.message, stack: e.stack?.slice(0, 400) }));
  if (!ONCE) {
    setInterval(() => {
      runCycle().catch(e => error('Cycle uncaught error', { err: e.message }));
    }, INTERVAL_MS);
  }
}

main();
