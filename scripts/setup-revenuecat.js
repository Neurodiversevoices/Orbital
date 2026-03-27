#!/usr/bin/env node
// @ts-check
'use strict';

/**
 * setup-revenuecat.js — Orbital RevenueCat v2 full sync
 *
 * Idempotent. Safe to re-run. 409 = already exists = success.
 *
 * Requires: REVENUECAT_V2_SECRET_KEY in .env
 * Usage: node scripts/setup-revenuecat.js
 */

require('dotenv').config();

const RC_BASE = 'https://api.revenuecat.com/v2';
const API_KEY = process.env.REVENUECAT_V2_SECRET_KEY;
const PROJECT_ID = 'proj31f67056';
const APP_ID = 'appf2abf7d9c1'; // iOS App Store app (com.erparris.orbital)

if (!API_KEY) {
  console.error('\n❌  REVENUECAT_V2_SECRET_KEY not set in .env');
  console.error('    1. Go to app.revenuecat.com → Project Settings → API keys');
  console.error('    2. Create a new Secret key (v2)');
  console.error('    3. Add REVENUECAT_V2_SECRET_KEY=<key> to .env\n');
  process.exit(1);
}

const HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @param {string} url @param {RequestInit} [opts] @param {number} [retries] */
async function rcFetch(url, opts = {}, retries = 3) {
  const res = await fetch(`${RC_BASE}${url}`, {
    ...opts,
    headers: { ...HEADERS, ...(opts.headers || {}) },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (res.status === 429 && retries > 0) {
    const backoff = data?.backoff_ms ?? 21000;
    console.log(`  ⏳ Rate limited — waiting ${backoff}ms…`);
    await sleep(backoff + 1000);
    return rcFetch(url, opts, retries - 1);
  }

  return { status: res.status, ok: res.ok || res.status === 409, data };
}

function ok(label, status, data) {
  const existed = status === 409;
  const id = data?.id ?? data?.object ?? '';
  console.log(`  ${existed ? '⟳' : '✓'} ${label}${id ? ` [${id}]` : ''}${existed ? ' (already existed)' : ''}`);
  return data;
}

function fail(label, status, data) {
  console.error(`  ✗ ${label} — HTTP ${status}: ${JSON.stringify(data).slice(0, 200)}`);
  // Non-fatal: log and continue so a single failure doesn't abort the whole run
}

async function upsert(label, url, body) {
  const { status, ok: isOk, data } = await rcFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (isOk) return ok(label, status, data);
  fail(label, status, data);
  return null;
}

async function getList(url) {
  const items = [];
  const sep = url.includes('?') ? '&' : '?';
  let nextUrl = `${url}${sep}limit=100`;
  while (nextUrl) {
    const { data } = await rcFetch(nextUrl);
    const page = data?.items ?? [];
    items.push(...page);
    nextUrl = data?.next_page ?? null;
    if (nextUrl && !nextUrl.startsWith('/')) nextUrl = null;
  }
  return items;
}

// ─── Canonical product → entitlement → package mapping ──────────────────────
//
// [store_product_id, entitlement_id, package_type, product_type]
// product_type: 'subscription' | 'non_consumable' | 'consumable'
//
const PRODUCT_MAP = [
  // Pro (Individual) — subscription
  ['orbital_pro_monthly',         'pro_access',           'MONTHLY',  'subscription'],
  ['orbital_pro_annual',          'pro_access',           'ANNUAL',   'subscription'],

  // Family — subscription
  ['orbital_family_monthly',      'family_access',        'MONTHLY',  'subscription'],
  ['orbital_family_annual',       'family_access',        'ANNUAL',   'subscription'],

  // Family+ — subscription
  ['orbital_family_plus_monthly', 'family_plus_access',   'MONTHLY',  'subscription'],
  ['orbital_family_plus_annual',  'family_plus_access',   'ANNUAL',   'subscription'],

  // Circle — subscription
  ['orbital_circle_monthly',      'circle_access',        'MONTHLY',  'subscription'],
  ['orbital_circle_annual',       'circle_access',        'ANNUAL',   'subscription'],

  // Bundles — annual-only subscription
  ['orbital_bundle_10_annual',    'bundle_10_access',     'ANNUAL',   'subscription'],
  ['orbital_bundle_15_annual',    'bundle_15_access',     'ANNUAL',   'subscription'],
  ['orbital_bundle_20_annual',    'bundle_20_access',     'ANNUAL',   'subscription'],

  // Admin add-on — subscription
  ['orbital_admin_addon_monthly', 'admin_addon',          'MONTHLY',  'subscription'],
  ['orbital_admin_addon_annual',  'admin_addon',          'ANNUAL',   'subscription'],

  // CCI milestone tiers — non-consumable one-time
  ['orbital_cci_30',              'cci_purchased',        'LIFETIME', 'non_consumable'],
  ['orbital_cci_60',              'cci_purchased',        'LIFETIME', 'non_consumable'],
  ['orbital_cci_90',              'cci_purchased',        'LIFETIME', 'non_consumable'],
  ['orbital_cci_bundle',          'cci_purchased',        'LIFETIME', 'non_consumable'],

  // CCI group — non-consumable one-time
  ['orbital_cci_circle_all',      'cci_circle_purchased', 'LIFETIME', 'non_consumable'],
  ['orbital_cci_bundle_all',      'cci_bundle_purchased', 'LIFETIME', 'non_consumable'],

  // QCR reports — non-consumable one-time
  ['orbital_qcr_individual',      'qcr_individual',       'LIFETIME', 'non_consumable'],
  ['orbital_qcr_circle',          'qcr_circle',           'LIFETIME', 'non_consumable'],
  ['orbital_qcr_bundle',          'qcr_bundle',           'LIFETIME', 'non_consumable'],
];

// All unique entitlement IDs (including legacy aliases kept for migration)
const ALL_ENTITLEMENTS = [
  // Active
  'pro_access',
  'family_access',
  'family_plus_access',
  'circle_access',
  'bundle_10_access',
  'bundle_15_access',
  'bundle_20_access',
  'admin_addon',
  'cci_purchased',
  'cci_circle_purchased',
  'cci_bundle_purchased',
  'qcr_individual',
  'qcr_circle',
  'qcr_bundle',
  // Legacy (keep for subscriber migration)
  'individual_access',
  'free_access',
];

// Default offering identifier
const DEFAULT_OFFERING_ID = 'default';

// ─── Step 1: Get project ──────────────────────────────────────────────────────

async function getProjectId() {
  const { data } = await rcFetch('/projects');
  const project = data?.items?.find((p) => p.id === PROJECT_ID) ?? data?.items?.[0];
  if (!project?.id) {
    console.error('❌  Could not list projects. Check your v2 API key.');
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
  console.log(`  ✓ Project: ${project.name} [${project.id}]`);
  console.log(`  ✓ App: Orbital iOS [${APP_ID}]`);
  return project.id;
}

// ─── Step 2: Create / verify products ────────────────────────────────────────

async function syncProducts(projectId) {
  console.log('\n📦  Products');

  // Fetch existing to build a lookup by store_identifier
  const existing = await getList(`/projects/${projectId}/products`);
  /** @type {Map<string, string>} store_identifier → rc_product_id */
  const productIdMap = new Map(
    existing.map((p) => [p.store_identifier, p.id])
  );

  for (const [storeId, , , productType] of PRODUCT_MAP) {
    if (productIdMap.has(storeId)) {
      console.log(`  ⟳ ${storeId} (already exists)`);
      continue;
    }

    const res = await rcFetch(`/projects/${projectId}/products`, {
      method: 'POST',
      body: JSON.stringify({
        store_identifier: storeId,
        type: productType,
        app_id: APP_ID,
      }),
    });

    if (res.ok) {
      const id = res.data?.id;
      if (id) {
        ok(storeId, res.status, res.data);
        productIdMap.set(storeId, id);
      } else {
        // 409 with error body — id not returned; map will be filled by post-fetch below
        console.log(`  ⟳ ${storeId} (exists, id resolving…)`);
      }
    } else {
      fail(storeId, res.status, res.data);
    }
  }

  // Re-fetch to ensure map is complete
  const refreshed = await getList(`/projects/${projectId}/products`);
  refreshed.forEach((p) => {
    if (!productIdMap.has(p.store_identifier)) productIdMap.set(p.store_identifier, p.id);
  });

  return productIdMap;
}

// ─── Step 3: Create / verify entitlements ─────────────────────────────────────

async function syncEntitlements(projectId) {
  console.log('\n🔑  Entitlements');

  const existing = await getList(`/projects/${projectId}/entitlements`);
  /** @type {Map<string, string>} lookup_key → rc_entitlement_id */
  const entitlementIdMap = new Map(existing.map((e) => [e.lookup_key, e.id]));

  for (const identifier of ALL_ENTITLEMENTS) {
    if (entitlementIdMap.has(identifier)) {
      console.log(`  ⟳ ${identifier} (already exists)`);
      continue;
    }

    const res = await rcFetch(`/projects/${projectId}/entitlements`, {
      method: 'POST',
      body: JSON.stringify({
        lookup_key: identifier,
        display_name: identifier.replace(/_/g, ' '),
      }),
    });

    if (res.ok) {
      ok(identifier, res.status, res.data);
      entitlementIdMap.set(identifier, res.data.id);
    } else {
      fail(identifier, res.status, res.data);
    }
  }

  return entitlementIdMap;
}

// ─── Step 4: Attach products to entitlements ──────────────────────────────────

async function attachProductsToEntitlements(projectId, productIdMap, entitlementIdMap) {
  console.log('\n🔗  Product → Entitlement attachments');

  // Group by entitlement to batch attach
  /** @type {Map<string, string[]>} entitlementId → [productId] */
  const byEntitlement = new Map();
  for (const [storeId, entitlementIdentifier] of PRODUCT_MAP) {
    const productId = productIdMap.get(storeId);
    const entitlementId = entitlementIdMap.get(entitlementIdentifier);
    if (!productId) { console.log(`  ⚠  No product ID for ${storeId} — skipping`); continue; }
    if (!entitlementId) { console.log(`  ⚠  No entitlement ID for ${entitlementIdentifier} — skipping`); continue; }
    if (!byEntitlement.has(entitlementId)) byEntitlement.set(entitlementId, []);
    byEntitlement.get(entitlementId).push(productId);
  }

  for (const [entitlementId, productIds] of byEntitlement) {
    const label = [...entitlementIdMap.entries()].find(([, v]) => v === entitlementId)?.[0] ?? entitlementId;
    const res = await rcFetch(
      `/projects/${projectId}/entitlements/${entitlementId}/actions/attach_products`,
      { method: 'POST', body: JSON.stringify({ product_ids: productIds }) }
    );
    if (res.ok) ok(`attach ${productIds.length} products → ${label}`, res.status, res.data);
    else fail(`attach products → ${label}`, res.status, res.data);
  }
}

// ─── Step 5: Create default offering ──────────────────────────────────────────

async function syncOffering(projectId) {
  console.log('\n📋  Offerings');

  const existing = await getList(`/projects/${projectId}/offerings`);
  let offering = existing.find((o) => o.lookup_key === DEFAULT_OFFERING_ID);

  if (offering) {
    console.log(`  ⟳ offering "${DEFAULT_OFFERING_ID}" [${offering.id}] (already exists)`);
  } else {
    const res = await rcFetch(`/projects/${projectId}/offerings`, {
      method: 'POST',
      body: JSON.stringify({
        lookup_key: DEFAULT_OFFERING_ID,
        display_name: 'Default Offering',
        metadata: {},
      }),
    });
    if (res.ok) {
      ok(DEFAULT_OFFERING_ID, res.status, res.data);
      offering = res.data;
    } else {
      fail(DEFAULT_OFFERING_ID, res.status, res.data);
      return null;
    }
  }

  return offering;
}

// ─── Step 6: Create packages + attach products ────────────────────────────────
//
// RC packages live under an offering. Each package_type is unique per offering.
// Packages reference products so the SDK can present them.
//
// Key packages for the default offering.
// NOTE: $rc_annual / $rc_monthly are pre-created by RC with test-store products.
// After connecting the iOS app in RC dashboard, re-assign them manually, or
// they will auto-update when the store syncs. We create named custom packages below.
//
const PACKAGES = [
  // Custom named packages — these always work regardless of pre-existing RC packages
  {
    identifier: 'pro_annual',
    display_name: 'Pro Annual',
    package_type: 'ANNUAL',
    products: ['orbital_pro_annual'],
  },
  {
    identifier: 'pro_monthly',
    display_name: 'Pro Monthly',
    package_type: 'MONTHLY',
    products: ['orbital_pro_monthly'],
  },
  // Custom packages for other tiers
  {
    identifier: 'family_annual',
    display_name: 'Family Annual',
    package_type: 'ANNUAL',
    products: ['orbital_family_annual'],
  },
  {
    identifier: 'family_monthly',
    display_name: 'Family Monthly',
    package_type: 'MONTHLY',
    products: ['orbital_family_monthly'],
  },
  {
    identifier: 'family_plus_annual',
    display_name: 'Family+ Annual',
    package_type: 'ANNUAL',
    products: ['orbital_family_plus_annual'],
  },
  {
    identifier: 'family_plus_monthly',
    display_name: 'Family+ Monthly',
    package_type: 'MONTHLY',
    products: ['orbital_family_plus_monthly'],
  },
  {
    identifier: 'circle_annual',
    display_name: 'Circle Annual',
    package_type: 'ANNUAL',
    products: ['orbital_circle_annual'],
  },
  {
    identifier: 'circle_monthly',
    display_name: 'Circle Monthly',
    package_type: 'MONTHLY',
    products: ['orbital_circle_monthly'],
  },
  {
    identifier: 'bundle_10',
    display_name: 'Bundle 10 Seats',
    package_type: 'ANNUAL',
    products: ['orbital_bundle_10_annual'],
  },
  {
    identifier: 'bundle_15',
    display_name: 'Bundle 15 Seats',
    package_type: 'ANNUAL',
    products: ['orbital_bundle_15_annual'],
  },
  {
    identifier: 'bundle_20',
    display_name: 'Bundle 20 Seats',
    package_type: 'ANNUAL',
    products: ['orbital_bundle_20_annual'],
  },
  {
    identifier: 'cci_30',
    display_name: 'CCI 30-Day Report',
    package_type: 'LIFETIME',
    products: ['orbital_cci_30'],
  },
  {
    identifier: 'cci_60',
    display_name: 'CCI 60-Day Report',
    package_type: 'LIFETIME',
    products: ['orbital_cci_60'],
  },
  {
    identifier: 'cci_90',
    display_name: 'CCI 90-Day Report',
    package_type: 'LIFETIME',
    products: ['orbital_cci_90'],
  },
  {
    identifier: 'cci_bundle',
    display_name: 'CCI Full Bundle',
    package_type: 'LIFETIME',
    products: ['orbital_cci_bundle'],
  },
];

async function syncPackages(projectId, offering, productIdMap) {
  if (!offering) return;
  const offeringId = offering.id;
  console.log('\n📦  Packages');

  // List existing packages for this offering
  const existing = await getList(`/projects/${projectId}/offerings/${offeringId}/packages`);
  const existingByKey = new Map(existing.map((p) => [p.lookup_key, p]));

  for (const pkg of PACKAGES) {
    if (existingByKey.has(pkg.identifier)) {
      // Package exists — just ensure products are attached
      const existingPkg = existingByKey.get(pkg.identifier);
      if (existingPkg) await attachProductsToPackage(projectId, existingPkg.id, pkg.products, productIdMap);
      console.log(`  ⟳ package ${pkg.identifier} (already exists)`);
      continue;
    }

    const res = await rcFetch(`/projects/${projectId}/offerings/${offeringId}/packages`, {
      method: 'POST',
      body: JSON.stringify({
        lookup_key: pkg.identifier,
        display_name: pkg.display_name,
        position: PACKAGES.indexOf(pkg) + 1,
      }),
    });

    if (res.ok) {
      ok(pkg.identifier, res.status, res.data);
      await attachProductsToPackage(projectId, res.data.id, pkg.products, productIdMap);
    } else {
      fail(pkg.identifier, res.status, res.data);
    }
  }
}

async function attachProductsToPackage(projectId, packageId, storeIds, productIdMap) {
  const products = [];
  for (const storeId of storeIds) {
    const productId = productIdMap.get(storeId);
    if (!productId) { console.log(`    ⚠  No product ID for ${storeId}`); continue; }
    products.push({ product_id: productId, eligibility_criteria: 'all' });
  }
  if (!products.length) return;

  const res = await rcFetch(`/projects/${projectId}/packages/${packageId}/actions/attach_products`, {
    method: 'POST',
    body: JSON.stringify({ products }),
  });

  if (res.ok) {
    console.log(`    ✓ attached ${products.length} product(s) to package`);
  } else if (res.status !== 409) {
    fail(`  attach products to package`, res.status, res.data);
  }
}

// ─── Step 7: Report ───────────────────────────────────────────────────────────

async function report(projectId) {
  console.log('\n📊  Final verification');

  const [products, entitlements, offerings] = await Promise.all([
    getList(`/projects/${projectId}/products`),
    getList(`/projects/${projectId}/entitlements`),
    getList(`/projects/${projectId}/offerings`),
  ]);

  console.log(`\n  Products:      ${products.length}`);
  console.log(`  Entitlements:  ${entitlements.length}`);
  console.log(`  Offerings:     ${offerings.length}`);

  for (const offering of offerings) {
    const packages = await getList(`/projects/${projectId}/offerings/${offering.id}/packages`);
    console.log(`\n  Offering: ${offering.lookup_key} [${offering.id}]`);
    for (const pkg of packages) {
      console.log(`    · ${pkg.lookup_key} [${pkg.id}]`);
    }
  }

  console.log('\n✅  RevenueCat sync complete.\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀  Orbital RevenueCat v2 sync\n');

  const projectId = await getProjectId();

  const productIdMap = await syncProducts(projectId);
  const entitlementIdMap = await syncEntitlements(projectId);
  await attachProductsToEntitlements(projectId, productIdMap, entitlementIdMap);
  const offering = await syncOffering(projectId);
  await syncPackages(projectId, offering, productIdMap);
  await report(projectId);
}

main().catch((err) => {
  console.error('\n❌  Fatal:', err.message ?? err);
  process.exit(1);
});
