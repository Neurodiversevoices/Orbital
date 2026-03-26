#!/usr/bin/env node
/**
 * Sync RevenueCat products + entitlement attachments from lib/subscription/pricing.ts.
 *
 * Requires REVENUECAT_SECRET_API_KEY (sk_...) — NOT the SDK public key (appl_...).
 * Optional: REVENUECAT_PROJECT_ID, REVENUECAT_APP_ID (iOS app entity in RC)
 * Optional: load .env via dotenv if present (not a dependency — simple file parse)
 */
const fs = require('fs');
const path = require('path');
const { buildCatalog } = require('./lib/parse-pricing.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const RC_API = 'https://api.revenuecat.com/v2';

function loadDotEnv() {
  const p = path.join(REPO_ROOT, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined)
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

function rcHeaders(secret) {
  return {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  };
}

async function rcFetch(secret, method, urlPath, body) {
  const url = urlPath.startsWith('http') ? urlPath : `${RC_API}${urlPath}`;
  const res = await fetch(url, {
    method,
    headers: rcHeaders(secret),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const e = new Error(`RevenueCat ${method} ${url} → ${res.status}`);
    e.detail = json;
    e.status = res.status;
    throw e;
  }
  return json;
}

async function rcListAll(secret, pathPrefix) {
  const items = [];
  let next = pathPrefix;
  while (next) {
    const chunk = await rcFetch(secret, 'GET', next);
    const list = chunk.items || [];
    items.push(...list);
    next = chunk.next_page || null;
    if (next && next.startsWith('/')) next = `${RC_API}${next}`;
  }
  return items;
}

function productTypeForCatalogItem(item) {
  if (item.kind === 'subscription') return 'subscription';
  return 'non_consumable';
}

/** Map store product id → entitlement lookup_key (user-requested coarse buckets) */
function entitlementForProductId(productId) {
  if (/^orbital_pro_|^orbital_individual_/.test(productId)) return 'pro_access';
  if (/^orbital_family_monthly|^orbital_family_annual$/.test(productId))
    return 'family_access';
  if (/^orbital_family_plus_/.test(productId)) return 'family_plus_access';
  if (/^orbital_circle_/.test(productId)) return 'circle_access';
  if (/^orbital_bundle_\d+_annual$/.test(productId)) {
    if (productId.includes('10')) return 'bundle_10_access';
    if (productId.includes('15')) return 'bundle_15_access';
    if (productId.includes('20')) return 'bundle_20_access';
  }
  if (/^orbital_admin_addon_/.test(productId)) return 'admin_addon';
  if (/^orbital_cci_/.test(productId)) return 'cci_purchased';
  if (/^orbital_family_extra_seat_/.test(productId)) return 'family_extra_seat';
  return null;
}

/** Optional finer QCR bucket */
function qcrEntitlement(productId) {
  if (/orbital_qcr_individual|orbital_qcr_quarterly/.test(productId))
    return 'qcr_individual';
  if (/orbital_qcr_circle/.test(productId)) return 'qcr_circle';
  if (/orbital_qcr_bundle/.test(productId)) return 'qcr_bundle';
  return null;
}

async function main() {
  loadDotEnv();
  let secret =
    process.env.REVENUECAT_SECRET_API_KEY ||
    process.env.REVENUECAT_API_SECRET_KEY ||
    '';
  if (!secret.startsWith('sk_')) {
    const pub = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
    console.error(
      JSON.stringify({
        error:
          'Set REVENUECAT_SECRET_API_KEY (sk_...) in .env. EXPO_PUBLIC_REVENUECAT_IOS_KEY is the public SDK key and cannot manage products.',
        hint: pub ? `Public key prefix: ${pub.slice(0, 8)}...` : 'No public key in env',
      }, null, 2)
    );
    process.exit(1);
  }

  const { items } = buildCatalog(REPO_ROOT);

  const projects = await rcListAll(secret, '/projects');
  const projectId =
    process.env.REVENUECAT_PROJECT_ID || projects[0]?.id;
  if (!projectId) throw new Error('No RevenueCat project found');

  const apps = await rcListAll(
    secret,
    `/projects/${projectId}/apps`
  );
  const appStoreApp =
    apps.find((a) => a.type === 'app_store') || apps[0];
  const appId = process.env.REVENUECAT_APP_ID || appStoreApp?.id;
  if (!appId) {
    const e = new Error('No RevenueCat iOS app; set REVENUECAT_APP_ID');
    e.apps = apps;
    throw e;
  }

  const existingProducts = await rcListAll(
    secret,
    `/projects/${projectId}/products`
  );
  const byStore = new Map(
    existingProducts.map((p) => [p.store_identifier, p])
  );

  const created = [];
  for (const item of items) {
    if (byStore.has(item.productId)) continue;
    const body = {
      store_identifier: item.productId,
      app_id: appId,
      type: productTypeForCatalogItem(item),
      display_name: item.label.slice(0, 120),
    };
    try {
      const row = await rcFetch(
        secret,
        'POST',
        `/projects/${projectId}/products`,
        body
      );
      const rid = row.id || row.product?.id;
      created.push({
        productId: item.productId,
        rcId: rid,
      });
      if (rid) byStore.set(item.productId, { id: rid, store_identifier: item.productId });
    } catch (e) {
      if (e.status === 409) continue;
      created.push({
        productId: item.productId,
        error: e.message,
        detail: e.detail,
      });
    }
  }

  try {
    const offerings = await rcListAll(
      secret,
      `/projects/${projectId}/offerings`
    );
    if (!offerings.some((o) => o.lookup_key === 'default')) {
      await rcFetch(secret, 'POST', `/projects/${projectId}/offerings`, {
        lookup_key: 'default',
        display_name: 'Default',
      });
    }
  } catch (e) {
    created.push({
      step: 'offerings',
      error: e.message,
      detail: e.detail,
    });
  }

  const entitlements = await rcListAll(
    secret,
    `/projects/${projectId}/entitlements`
  );
  const entByLookup = new Map(
    entitlements.map((e) => [e.lookup_key, e])
  );

  const attachPlan = new Map();
  for (const item of items) {
    const p = byStore.get(item.productId);
    if (!p?.id) continue;
    const coarse = entitlementForProductId(item.productId);
    const qc = qcrEntitlement(item.productId);
    const keys = new Set();
    if (coarse) keys.add(coarse);
    if (qc) keys.add(qc);
    if (/orbital_qcr_/.test(item.productId)) keys.add('qcr_access');
    for (const lk of keys) {
      if (!attachPlan.has(lk)) attachPlan.set(lk, []);
      attachPlan.get(lk).push(p.id);
    }
  }

  const attached = [];
  for (const [lookupKey, productIds] of attachPlan) {
    const ent = entByLookup.get(lookupKey);
    if (!ent) {
      attached.push({ lookupKey, skip: 'entitlement missing in RC' });
      continue;
    }
    const uniq = [...new Set(productIds)];
    try {
      for (let i = 0; i < uniq.length; i += 50) {
        await rcFetch(
          secret,
          'POST',
          `/projects/${projectId}/entitlements/${ent.id}/actions/attach_products`,
          { product_ids: uniq.slice(i, i + 50) }
        );
      }
      attached.push({ lookupKey, count: uniq.length });
    } catch (e) {
      attached.push({
        lookupKey,
        error: e.message,
        detail: e.detail,
      });
    }
  }

  console.log(
    JSON.stringify({ projectId, appId, created, entitlementAttach: attached }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
