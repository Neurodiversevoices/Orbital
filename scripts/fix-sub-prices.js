#!/usr/bin/env node
/**
 * fix-sub-prices.js
 *
 * Fixes subscriptions stuck in MISSING_METADATA by setting prices
 * for every ASC territory. Uses the price-point tier encoding to
 * construct all territory IDs from a single USA pagination pass.
 *
 * Usage: node scripts/fix-sub-prices.js
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO = path.resolve(__dirname, '..');
const eas = JSON.parse(fs.readFileSync(path.join(REPO, 'eas.json'), 'utf8'));
const ios = eas.submit.production.ios;
const KEY_ID = ios.ascApiKeyId;
const ISSUER_ID = ios.ascApiKeyIssuerId;
const P8 = fs.readFileSync(path.join(REPO, ios.ascApiKeyPath.replace(/^\.\//, '')), 'utf8');

function makeToken() {
  const hdr = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })).toString('base64url');
  const pld = Buffer.from(JSON.stringify({ iss: ISSUER_ID, aud: 'appstoreconnect-v1', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 1140 })).toString('base64url');
  const msg = hdr + '.' + pld;
  return msg + '.' + crypto.sign('sha256', Buffer.from(msg), { key: P8, dsaEncoding: 'ieee-p1363' }).toString('base64url');
}

let TOK = makeToken();
const sleep = ms => new Promise(r => setTimeout(r, ms));

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyData = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.appstoreconnect.apple.com', path, method,
      headers: { 'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json', ...(bodyData ? { 'Content-Length': Buffer.byteLength(bodyData) } : {}) },
    };
    const r = https.request(opts, res => {
      let out = ''; res.on('data', d => out += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(out) }); }
        catch { resolve({ status: res.statusCode, data: { raw: out } }); }
      });
    });
    r.on('error', reject);
    if (bodyData) r.write(bodyData);
    r.end();
  });
}

async function getAll(startPath) {
  const out = [];
  let next = startPath.startsWith('http') ? startPath : 'https://api.appstoreconnect.apple.com' + startPath;
  while (next) {
    const { data } = await req('GET', next.replace('https://api.appstoreconnect.apple.com', ''));
    out.push(...(data.data || []));
    next = data.links?.next || null;
  }
  return out;
}

// Encode tier ID the same way ASC does: base64url({"s":"SUBID","t":"TERRITORY","p":"TIER"})
function encodePricePointId(subId, territory, tier) {
  return Buffer.from(JSON.stringify({ s: subId, t: territory, p: tier })).toString('base64url');
}
function decodePricePointId(id) {
  try { return JSON.parse(Buffer.from(id, 'base64url').toString()); } catch { return null; }
}

// Subscriptions to fix: [productId, ascId, targetUSD]
const SUBS = [
  ['orbital_admin_addon_annual',      '6761197461', 290],
  ['orbital_admin_addon_monthly',     '6761197544', 29],
  ['orbital_bundle_10_annual',        '6761197686', 2700],
  ['orbital_bundle_15_annual',        '6761197625', 4000],
  ['orbital_bundle_20_annual',        '6761197460', 5200],
  ['orbital_circle_annual',           '6761197510', 790],
  ['orbital_circle_monthly',          '6761197684', 79],
  ['orbital_family_annual',           '6761197604', 490],
  ['orbital_family_extra_seat_annual','6761197981', 100],
  ['orbital_family_extra_seat_monthly','6761197898', 10],
  ['orbital_family_monthly',          '6761197652', 49],
  ['orbital_family_plus_annual',      '6761197685', 690],
  ['orbital_family_plus_monthly',     '6761197683', 69],
];

async function findTierForPrice(subId, targetUsd) {
  // Paginate through all USA price points to find the tier closest to targetUsd
  let best = null, bestDiff = Infinity;
  let nextPath = `/v1/subscriptions/${subId}/pricePoints?filter[territory]=USA&limit=200`;
  while (nextPath) {
    const { data } = await req('GET', nextPath);
    const pts = data.data || [];
    for (const p of pts) {
      const price = parseFloat(p.attributes?.customerPrice);
      const diff = Math.abs(price - targetUsd);
      if (diff < bestDiff) { bestDiff = diff; best = p; }
      if (price > targetUsd * 1.5) break; // well past target, stop
    }
    // If best found and we're well past target price, stop paginating
    if (best && parseFloat(best.attributes?.customerPrice) >= targetUsd * 0.99) break;
    const raw = data.links?.next;
    if (!raw) break;
    nextPath = raw.replace('https://api.appstoreconnect.apple.com', '');
  }
  if (!best) throw new Error(`No price point found for $${targetUsd} on sub ${subId}`);
  const decoded = decodePricePointId(best.id);
  if (!decoded?.p) throw new Error(`Could not decode price point id: ${best.id}`);
  return { tier: decoded.p, actualPrice: best.attributes?.customerPrice };
}

async function setAllTerritoryPrices(subId, productId, tier, territories) {
  let ok = 0, skip = 0, fail = 0;
  for (const terr of territories) {
    const ppId = encodePricePointId(subId, terr, tier);
    const { status, data } = await req('POST', '/v1/subscriptionPrices', {
      data: {
        type: 'subscriptionPrices',
        relationships: {
          subscription: { data: { type: 'subscriptions', id: subId } },
          subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: ppId } },
          territory: { data: { type: 'territories', id: terr } },
        },
      },
    });
    if (status === 201 || status === 200) { ok++; }
    else if (status === 409) { skip++; }
    else if (status === 429) {
      const backoff = data?.errors?.[0]?.backoff_ms ?? 21000;
      console.log(`    ⏳ rate limit on ${terr} — waiting ${backoff}ms`);
      await sleep(backoff + 500);
      // Retry once
      const r2 = await req('POST', '/v1/subscriptionPrices', {
        data: {
          type: 'subscriptionPrices',
          relationships: {
            subscription: { data: { type: 'subscriptions', id: subId } },
            subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: ppId } },
            territory: { data: { type: 'territories', id: terr } },
          },
        },
      });
      if (r2.status === 201 || r2.status === 200) ok++;
      else if (r2.status === 409) skip++;
      else { console.log(`    ✗ ${terr}: ${JSON.stringify(r2.data?.errors?.[0]?.detail)}`); fail++; }
    } else {
      const errDetail = data?.errors?.[0]?.detail || JSON.stringify(data).slice(0, 100);
      // Only log non-trivial errors
      if (!errDetail.includes('An error occurred')) {
        console.log(`    ✗ ${terr} (${status}): ${errDetail}`);
      }
      fail++;
    }
    // Small delay to avoid rate limiting
    await sleep(30);
  }
  return { ok, skip, fail };
}

async function submitSub(subId) {
  const { status, data } = await req('POST', '/v1/subscriptionSubmissions', {
    data: {
      type: 'subscriptionSubmissions',
      relationships: { subscription: { data: { type: 'subscriptions', id: subId } } },
    },
  });
  if (status === 200 || status === 201) return 'submitted';
  if (status === 409) return '409';
  return `error:${status}:${data?.errors?.[0]?.detail?.slice(0, 80)}`;
}

async function main() {
  console.log('🌍  Fetching all ASC territories...');
  const territories = (await getAll('/v1/territories?limit=200')).map(t => t.id);
  console.log(`  Found ${territories.length} territories\n`);

  for (const [productId, subId, targetUsd] of SUBS) {
    console.log(`📦  ${productId} ($${targetUsd}) [${subId}]`);
    
    // Find the correct price tier
    let tier, actualPrice;
    try {
      ({ tier, actualPrice } = await findTierForPrice(subId, targetUsd));
      console.log(`  ✓ Tier found: ${tier} (price: $${actualPrice})`);
    } catch (e) {
      console.log(`  ✗ Tier lookup failed: ${e.message}`);
      continue;
    }

    // Set prices for all territories
    console.log(`  Setting prices for ${territories.length} territories...`);
    const { ok, skip, fail } = await setAllTerritoryPrices(subId, productId, tier, territories);
    console.log(`  ✓ set=${ok} already_set=${skip} failed=${fail}`);

    // Submit for review
    const submitResult = await submitSub(subId);
    console.log(`  Submit: ${submitResult}`);
    console.log('');

    await sleep(500);
  }

  console.log('✅  Done. Re-run verify to check states.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
