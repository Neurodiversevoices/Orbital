#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..');

const required = [
  'components/orbital/CapacityGaugeDemo.jsx',
  'components/orbital/CapacityGaugeLive.jsx',
  'components/orbital/GaugeHUD.jsx',
  'lib/capacity/types.ts',
  'lib/capacity/calculateCapacity.ts',
  'lib/capacity/demoData.ts',
  'lib/health/appleHealthService.ts',
];

const results: Array<{ check: string; pass: boolean; detail?: string }> = [];

for (const f of required) {
  const exists = fs.existsSync(path.join(root, f));
  results.push({ check: `file:${f}`, pass: exists, detail: exists ? 'present' : 'MISSING' });
}

// Engine smoke test
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { calculateCapacity } = require(path.join(root, 'lib/capacity/calculateCapacity'));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DEMO_INPUT } = require(path.join(root, 'lib/capacity/demoData'));
  const r = calculateCapacity(DEMO_INPUT);
  results.push({
    check: 'engine_score_0_100',
    pass: typeof r.capacityScore === 'number' && r.capacityScore >= 0 && r.capacityScore <= 100,
    detail: `score=${r.capacityScore} state=${r.state} conf=${r.confidence?.toFixed(2)}`,
  });
  results.push({
    check: 'engine_has_factors',
    pass: Array.isArray(r.factorWeights) && r.factorWeights.length > 0,
    detail: r.factorWeights?.map((w: { name: string }) => w.name).join(', '),
  });
} catch (e: unknown) {
  results.push({ check: 'engine_runs', pass: false, detail: e instanceof Error ? e.message : String(e) });
}

// Today screen imports
for (const tf of ['app/(tabs)/index.web.tsx', 'app/(tabs)/index.tsx']) {
  const fp = path.join(root, tf);
  if (!fs.existsSync(fp)) continue;
  const src = fs.readFileSync(fp, 'utf8');
  results.push({ check: `${tf}:imports_CapacityGaugeLive`, pass: src.includes('CapacityGaugeLive') });
}

// Forbidden free strings
const freePattern = /free to (try|use)|100% free|free forever/gi;
let freeMisses = 0;
for (const dir of ['app', 'components', 'public']) {
  const dirPath = path.join(root, dir);
  if (!fs.existsSync(dirPath)) continue;
  const walk = (d: string): string[] => {
    const items = fs.readdirSync(d);
    return items.flatMap(i => {
      const p = path.join(d, i);
      if (i === 'node_modules') return [];
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) return walk(p);
        if (/\.(tsx?|jsx?|html?)$/.test(i)) {
          const src = fs.readFileSync(p, 'utf8');
          const m = src.match(freePattern);
          return m ? m.map(() => p) : [];
        }
      } catch { /* skip */ }
      return [];
    });
  };
  freeMisses += walk(dirPath).length;
}
results.push({ check: 'no_forbidden_free_strings', pass: freeMisses === 0, detail: `${freeMisses} hits` });

// AppState web guard
const idleTimeout = path.join(root, 'lib/session/idleTimeout.ts');
if (fs.existsSync(idleTimeout)) {
  const src = fs.readFileSync(idleTimeout, 'utf8');
  const appStateIdx = src.indexOf('AppState.addEventListener');
  const guardIdx = src.indexOf("Platform.OS === 'web'");
  // Guard should appear before the AppState call
  results.push({ check: 'appstate_web_gated', pass: guardIdx !== -1 && guardIdx < appStateIdx, detail: `guard@${guardIdx} call@${appStateIdx}` });
}

const passed = results.filter(r => r.pass).length;
const report = { score: `${passed}/${results.length}`, results };
console.log(JSON.stringify(report, null, 2));
process.exit(passed === results.length ? 0 : 1);
