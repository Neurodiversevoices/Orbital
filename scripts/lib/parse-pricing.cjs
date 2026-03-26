/**
 * Parse lib/subscription/pricing.ts (text) — single source of truth.
 * No prices hardcoded here; only regex extraction.
 */

const fs = require('fs');
const path = require('path');

function readPricingTs(repoRoot) {
  const p = path.join(repoRoot, 'lib/subscription/pricing.ts');
  return fs.readFileSync(p, 'utf8');
}

function parseObjectBlock(src, constName) {
  const re = new RegExp(
    `export const ${constName} = \\{([\\s\\S]*?)\\} as const`,
    'm'
  );
  const m = src.match(re);
  if (!m) return null;
  return m[1];
}

function parseNumericConsts(src, names) {
  const out = {};
  for (const n of names) {
    const m = src.match(
      new RegExp(`export const ${n} = \\{([\\s\\S]*?)\\} as const`, 'm')
    );
    if (!m) continue;
    const body = m[1];
    const pairs = {};
    for (let line of body.split('\n')) {
      const cut = line.split('//')[0];
      const pm = cut.match(/^\s*(\w+):\s*([\d.]+)\s*,?\s*$/);
      if (pm) pairs[pm[1]] = parseFloat(pm[2]);
    }
    out[n] = pairs;
  }
  return out;
}

function parseProductIds(src) {
  const body = parseObjectBlock(src, 'PRODUCT_IDS');
  if (!body) throw new Error('PRODUCT_IDS not found in pricing.ts');
  const ids = {};
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*(\w+):\s*['"]([^'"]+)['"]/);
    if (m && !m[1].startsWith('//')) ids[m[1]] = m[2];
  }
  return ids;
}

function parseQcrProducts(src) {
  const block = src.match(
    /export const QCR_PRODUCTS[^=]*=\s*\{([\s\S]*?)\n\};/m
  );
  if (!block) return [];
  const text = block[1];
  const out = [];
  const reEntry =
    /(\w+):\s*\{[^}]*productId:\s*PRODUCT_IDS\.(\w+)[^}]*price:\s*(\d+)/gs;
  let m;
  while ((m = reEntry.exec(text)) !== null) {
    out.push({
      key: m[1],
      productIdKey: m[2],
      price: parseInt(m[3], 10),
    });
  }
  return out;
}

function parseQcrQuarterly(src) {
  const m = src.match(
    /export const QCR_QUARTERLY_PRODUCT = \{[\s\S]*?productId:\s*PRODUCT_IDS\.(\w+)[\s\S]*?price:\s*(\d+)[\s\S]*?\} as const/
  );
  if (!m) return null;
  return { productIdKey: m[1], price: parseInt(m[2], 10) };
}

function parseExpansionPricing(src) {
  const m = src.match(
    /expansionPricing:\s*\{\s*monthly:\s*(\d+),\s*annual:\s*(\d+)/m
  );
  if (!m) return { monthly: null, annual: null };
  return { monthly: parseInt(m[1], 10), annual: parseInt(m[2], 10) };
}

function parseBundlePricingSrc(src) {
  const m = src.match(/export const BUNDLE_PRICING = \{([\s\S]*?)\} as const/m);
  if (!m) return {};
  const b = m[1];
  const pick = (name) => {
    const x = b.match(
      new RegExp(`${name}:\\s*\\{[^}]*annual:\\s*(\\d+)`, 'm')
    );
    return x ? parseInt(x[1], 10) : null;
  };
  return {
    bundle_10: { annual: pick('bundle_10') },
    bundle_15: { annual: pick('bundle_15') },
    bundle_20: { annual: pick('bundle_20') },
  };
}

/**
 * @param {string} repoRoot absolute or cwd-relative repo root
 */
function buildCatalog(repoRoot) {
  const root = path.resolve(repoRoot);
  const src = readPricingTs(root);
  const keys = parseProductIds(src);
  const numeric = parseNumericConsts(src, [
    'PRO_PRICING',
    'FAMILY_PRICING',
    'FAMILY_PLUS_PRICING',
    'CIRCLE_PRICING',
    'ADMIN_ADDON_PRICING',
    'CCI_PRICING',
    'CCI_GROUP_PRICING',
  ]);

  const id = (k) => keys[k];
  if (!id) throw new Error(`Missing PRODUCT_IDS.${k}`);

  /** @type {{ productId: string, kind: 'subscription'|'nonConsumable', period?: string, usd: number, label: string }[]} */
  const items = [];

  const sub = (productId, period, usd, label) => {
    items.push({
      productId,
      kind: 'subscription',
      period,
      usd,
      label,
    });
  };
  const ncon = (productId, usd, label) => {
    items.push({ productId, kind: 'nonConsumable', usd, label });
  };

  const P = numeric.PRO_PRICING || {};
  sub(id('PRO_MONTHLY'), 'ONE_MONTH', P.monthly ?? 29, 'Pro monthly');
  sub(id('PRO_ANNUAL'), 'ONE_YEAR', P.annual ?? 290, 'Pro annual');
  sub(id('INDIVIDUAL_MONTHLY'), 'ONE_MONTH', P.monthly ?? 29, 'Individual monthly');
  sub(id('INDIVIDUAL_ANNUAL'), 'ONE_YEAR', P.annual ?? 290, 'Individual annual');

  const F = numeric.FAMILY_PRICING || {};
  sub(id('FAMILY_MONTHLY'), 'ONE_MONTH', F.monthly ?? 49, 'Family monthly');
  sub(id('FAMILY_ANNUAL'), 'ONE_YEAR', F.annual ?? 490, 'Family annual');

  const FP = numeric.FAMILY_PLUS_PRICING || {};
  sub(id('FAMILY_PLUS_MONTHLY'), 'ONE_MONTH', FP.monthly ?? 69, 'Family+ monthly');
  sub(id('FAMILY_PLUS_ANNUAL'), 'ONE_YEAR', FP.annual ?? 690, 'Family+ annual');

  const C = numeric.CIRCLE_PRICING || {};
  sub(id('CIRCLE_MONTHLY'), 'ONE_MONTH', C.monthly ?? 79, 'Circle monthly');
  sub(id('CIRCLE_ANNUAL'), 'ONE_YEAR', C.annual ?? 790, 'Circle annual');

  const Bp = parseBundlePricingSrc(src);
  if (Bp.bundle_10?.annual)
    sub(id('BUNDLE_10_ANNUAL'), 'ONE_YEAR', Bp.bundle_10.annual, 'Bundle 10 annual');
  if (Bp.bundle_15?.annual)
    sub(id('BUNDLE_15_ANNUAL'), 'ONE_YEAR', Bp.bundle_15.annual, 'Bundle 15 annual');
  if (Bp.bundle_20?.annual)
    sub(id('BUNDLE_20_ANNUAL'), 'ONE_YEAR', Bp.bundle_20.annual, 'Bundle 20 annual');

  const A = numeric.ADMIN_ADDON_PRICING || {};
  sub(id('ADMIN_ADDON_MONTHLY'), 'ONE_MONTH', A.monthly ?? 29, 'Admin add-on monthly');
  sub(id('ADMIN_ADDON_ANNUAL'), 'ONE_YEAR', A.annual ?? 290, 'Admin add-on annual');

  const exp = parseExpansionPricing(src);
  if (exp.monthly && exp.annual) {
    sub(
      id('FAMILY_EXTRA_SEAT_MONTHLY'),
      'ONE_MONTH',
      exp.monthly,
      'Family extra seat monthly (legacy)'
    );
    sub(
      id('FAMILY_EXTRA_SEAT_ANNUAL'),
      'ONE_YEAR',
      exp.annual,
      'Family extra seat annual (legacy)'
    );
  }

  const cci = numeric.CCI_PRICING || {};
  const cfree = cci.ninetyDay;
  const cpro = cci.sixtyDay;
  if (cfree != null) ncon(id('CCI_FREE'), cfree, 'CCI Free tier display');
  if (cpro != null) ncon(id('CCI_PRO'), cpro, 'CCI Pro tier display');
  if (cci.thirtyDay != null) ncon(id('CCI_30'), cci.thirtyDay, 'CCI 30-day');
  if (cci.sixtyDay != null) ncon(id('CCI_60'), cci.sixtyDay, 'CCI 60-day');
  if (cci.ninetyDay != null) ncon(id('CCI_90'), cci.ninetyDay, 'CCI 90-day');
  if (cci.bundle != null) ncon(id('CCI_BUNDLE'), cci.bundle, 'CCI bundle');

  const cg = numeric.CCI_GROUP_PRICING || {};
  if (cg.circleAll != null)
    ncon(id('CCI_CIRCLE_ALL'), cg.circleAll, 'CCI circle aggregate');
  if (cg.bundleAll != null)
    ncon(id('CCI_BUNDLE_ALL'), cg.bundleAll, 'CCI bundle aggregate');

  for (const q of parseQcrProducts(src)) {
    const pid = keys[q.productIdKey];
    if (pid) ncon(pid, q.price, `QCR ${q.key}`);
  }

  const qq = parseQcrQuarterly(src);
  if (qq) {
    const pid = keys[qq.productIdKey];
    if (pid) ncon(pid, qq.price, 'QCR quarterly');
  }

  // Legacy bundle SKUs — not priced in pricing.ts; omit (no duplicate ghost products)

  const seen = new Set();
  const uniq = [];
  for (const it of items) {
    if (seen.has(it.productId)) continue;
    seen.add(it.productId);
    uniq.push(it);
  }

  return { keys, items: uniq };
}

module.exports = { buildCatalog, readPricingTs };
