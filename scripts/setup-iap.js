#!/usr/bin/env node
/**
 * Sync App Store Connect IAPs + subscriptions from lib/subscription/pricing.ts.
 * Credentials: eas.json submit.production.ios + keys/*.p8
 * Env: ORBITAL_IAP_SCREENSHOT (optional PNG path for review screenshots on new IAPs)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildCatalog } = require('./lib/parse-pricing.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const ASC_BASE = 'https://api.appstoreconnect.apple.com';

function loadEasAscConfig() {
  const eas = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'eas.json'), 'utf8')
  );
  const ios = eas?.submit?.production?.ios;
  if (!ios?.ascApiKeyPath || !ios.ascApiKeyId || !ios.ascApiKeyIssuerId) {
    throw new Error('eas.json submit.production.ios ASC fields incomplete');
  }
  const keyPath = path.join(REPO_ROOT, ios.ascApiKeyPath.replace(/^\.\//, ''));
  return {
    appId: ios.ascAppId,
    keyId: ios.ascApiKeyId,
    issuerId: ios.ascApiKeyIssuerId,
    privateKey: fs.readFileSync(keyPath, 'utf8'),
  };
}

function createAscToken({ keyId, issuerId, privateKey }) {
  const header = Buffer.from(
    JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })
  ).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: issuerId,
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

async function ascFetch(token, method, urlPath, body) {
  const url = urlPath.startsWith('http') ? urlPath : `${ASC_BASE}${urlPath}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
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
    const err = new Error(`ASC ${method} ${url} → ${res.status}`);
    err.detail = json;
    err.status = res.status;
    throw err;
  }
  return json;
}

async function ascPaged(token, initialPath) {
  const out = [];
  let next = initialPath.startsWith('http')
    ? initialPath
    : `${ASC_BASE}${initialPath}`;
  while (next) {
    const chunk = await ascFetch(token, 'GET', next);
    if (chunk.data) out.push(...chunk.data);
    const raw = chunk.links?.next || null;
    next = raw
      ? raw.startsWith('http')
        ? raw
        : `${ASC_BASE}${raw}`
      : null;
  }
  return out;
}

function byProductId(rows, idField = 'productId') {
  const m = new Map();
  for (const r of rows) {
    const id = r.attributes?.[idField] || r.attributes?.productId;
    if (id) m.set(id, r);
  }
  return m;
}

function nearestUsdPricePoint(rows, target) {
  let best = null;
  let bestDiff = Infinity;
  for (const row of rows) {
    const p = parseFloat(row.attributes?.customerPrice);
    if (Number.isNaN(p)) continue;
    const d = Math.abs(p - target);
    if (d < bestDiff) {
      bestDiff = d;
      best = row;
    }
  }
  return best;
}

async function fetchIapPricePointsUSA(token, iapId) {
  const rows = [];
  let next = `${ASC_BASE}/v2/inAppPurchases/${iapId}/pricePoints?filter[territory]=USA&limit=200`;
  while (next) {
    const chunk = await ascFetch(token, 'GET', next);
    if (chunk.data) rows.push(...chunk.data);
    next = chunk.links?.next || null;
  }
  return rows;
}

async function fetchSubPricePointsUSA(token, subId) {
  const rows = [];
  let next = `${ASC_BASE}/v1/subscriptions/${subId}/pricePoints?filter[territory]=USA&limit=200`;
  while (next) {
    const chunk = await ascFetch(token, 'GET', next);
    if (chunk.data) rows.push(...chunk.data);
    next = chunk.links?.next || null;
  }
  return rows;
}

async function setIapPriceUSA(token, iapId, targetUsd) {
  const points = await fetchIapPricePointsUSA(token, iapId);
  const pick = nearestUsdPricePoint(points, targetUsd);
  if (!pick) throw new Error(`No USA price points for IAP ${iapId}`);
  const tempId = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  const body = {
    data: {
      type: 'inAppPurchasePriceSchedules',
      relationships: {
        inAppPurchase: { data: { type: 'inAppPurchases', id: iapId } },
        baseTerritory: { data: { type: 'territories', id: 'USA' } },
      },
    },
    included: [
      {
        type: 'inAppPurchasePrices',
        id: tempId,
        attributes: { startDate: null },
        relationships: {
          inAppPurchasePricePoint: {
            data: { type: 'inAppPurchasePricePoints', id: pick.id },
          },
        },
      },
    ],
  };
  try {
    await ascFetch(token, 'POST', '/v1/inAppPurchasePriceSchedules', body);
  } catch (e) {
    if (e.status === 409) return;
    throw e;
  }
}

async function setSubscriptionPriceUSA(token, subId, targetUsd) {
  const points = await fetchSubPricePointsUSA(token, subId);
  const pick = nearestUsdPricePoint(points, targetUsd);
  if (!pick) throw new Error(`No USA price points for subscription ${subId}`);
  const body = {
    data: {
      type: 'subscriptionPrices',
      relationships: {
        subscription: { data: { type: 'subscriptions', id: subId } },
        subscriptionPricePoint: {
          data: { type: 'subscriptionPricePoints', id: pick.id },
        },
        territory: { data: { type: 'territories', id: 'USA' } },
      },
    },
  };
  try {
    await ascFetch(token, 'POST', '/v1/subscriptionPrices', body);
  } catch (e) {
    if (e.status === 409) return;
    throw e;
  }
}

async function ensureIapLocalization(token, iapId, name, description) {
  let list = { data: [] };
  try {
    list = await ascFetch(
      token,
      'GET',
      `/v2/inAppPurchases/${iapId}/inAppPurchaseLocalizations?limit=50`
    );
  } catch {
    list = await ascFetch(
      token,
      'GET',
      `/v1/inAppPurchases/${iapId}/inAppPurchaseLocalizations?limit=50`
    );
  }
  const has = (list.data || []).some(
    (x) => x.attributes?.locale === 'en-US'
  );
  if (has) return;
  const desc =
    description.length > 45 ? description.slice(0, 45) : description;
  await ascFetch(token, 'POST', '/v1/inAppPurchaseLocalizations', {
    data: {
      type: 'inAppPurchaseLocalizations',
      attributes: { locale: 'en-US', name, description: desc },
      relationships: {
        inAppPurchaseV2: {
          data: { type: 'inAppPurchases', id: iapId },
        },
      },
    },
  });
}

async function ensureSubLocalization(token, subId, name, description) {
  const list = await ascFetch(
    token,
    'GET',
    `/v1/subscriptions/${subId}/subscriptionLocalizations?limit=50`
  );
  const has = (list.data || []).some(
    (x) => x.attributes?.locale === 'en-US'
  );
  if (has) return;
  const desc = description.length > 54 ? description.slice(0, 54) : description;
  await ascFetch(token, 'POST', '/v1/subscriptionLocalizations', {
    data: {
      type: 'subscriptionLocalizations',
      attributes: { locale: 'en-US', name, description: desc },
      relationships: {
        subscription: { data: { type: 'subscriptions', id: subId } },
      },
    },
  });
}

async function submitIap(token, iapId) {
  for (const rel of [
    ['inAppPurchaseV2', 'inAppPurchases'],
    ['inAppPurchase', 'inAppPurchases'],
  ]) {
    try {
      await ascFetch(token, 'POST', '/v1/inAppPurchaseSubmissions', {
        data: {
          type: 'inAppPurchaseSubmissions',
          relationships: {
            [rel[0]]: { data: { type: rel[1], id: iapId } },
          },
        },
      });
      return;
    } catch (e) {
      if (e.status === 409 || e.status === 422) return;
      if (rel[0] === 'inAppPurchase') throw e;
    }
  }
}

async function submitSub(token, subId) {
  try {
    await ascFetch(token, 'POST', '/v1/subscriptionSubmissions', {
      data: {
        type: 'subscriptionSubmissions',
        relationships: {
          subscription: { data: { type: 'subscriptions', id: subId } },
        },
      },
    });
  } catch (e) {
    if (e.status === 409 || e.status === 422) return;
    throw e;
  }
}

async function uploadIapScreenshot(token, iapId, pngPath) {
  const buf = fs.readFileSync(pngPath);
  const fileName = path.basename(pngPath);
  const reserve = await ascFetch(
    token,
    'POST',
    '/v1/inAppPurchaseAppStoreReviewScreenshots',
    {
      data: {
        type: 'inAppPurchaseAppStoreReviewScreenshots',
        attributes: { fileName, fileSize: buf.length },
        relationships: {
          inAppPurchaseV2: {
            data: { type: 'inAppPurchases', id: iapId },
          },
        },
      },
    }
  );
  const upload = reserve.data?.attributes?.uploadOperations?.[0];
  if (!upload) return;
  await fetch(upload.url, {
    method: upload.method || 'PUT',
    headers: upload.requestHeaders
      ? Object.fromEntries(
          upload.requestHeaders.map((h) => [h.name, h.value])
        )
      : {},
    body: buf,
  });
}

async function main() {
  const cfg = loadEasAscConfig();
  const token = createAscToken(cfg);
  const { items } = buildCatalog(REPO_ROOT);

  const iapRows = await ascPaged(
    token,
    `/v1/apps/${cfg.appId}/inAppPurchasesV2?limit=200`
  );
  const iapByPid = byProductId(iapRows);

  const groups = await ascPaged(
    token,
    `/v1/apps/${cfg.appId}/subscriptionGroups?limit=50`
  );
  if (!groups.length) throw new Error('No subscription group on app');
  const groupId = groups[0].id;

  const subs = await ascPaged(
    token,
    `/v1/subscriptionGroups/${groupId}/subscriptions?limit=200`
  );
  const subByPid = byProductId(subs);

  const report = { created: [], priced: [], skipped: [], errors: [] };
  const shot = process.env.ORBITAL_IAP_SCREENSHOT;

  for (const item of items) {
    try {
      if (item.kind === 'nonConsumable') {
        let row = iapByPid.get(item.productId);
        if (!row) {
          const created = await ascFetch(token, 'POST', '/v2/inAppPurchases', {
            data: {
              type: 'inAppPurchases',
              attributes: {
                name: item.label.slice(0, 64),
                productId: item.productId,
                inAppPurchaseType: 'NON_CONSUMABLE',
              },
              relationships: {
                app: { data: { type: 'apps', id: cfg.appId } },
              },
            },
          });
          row = created.data;
          iapByPid.set(item.productId, row);
          report.created.push({
            type: 'NON_CONSUMABLE',
            productId: item.productId,
            id: row.id,
          });
        }
        await ensureIapLocalization(
          token,
          row.id,
          item.label.slice(0, 30),
          `${item.label} — one-time purchase.`
        );
        await setIapPriceUSA(token, row.id, item.usd);
        report.priced.push({
          productId: item.productId,
          usd: item.usd,
          ascId: row.id,
        });
        if (shot && fs.existsSync(shot)) {
          try {
            await uploadIapScreenshot(token, row.id, shot);
          } catch (e) {
            report.errors.push({
              productId: item.productId,
              step: 'screenshot',
              message: String(e.message || e),
            });
          }
        }
        await submitIap(token, row.id);
      } else {
        let row = subByPid.get(item.productId);
        if (!row) {
          const created = await ascFetch(token, 'POST', '/v1/subscriptions', {
            data: {
              type: 'subscriptions',
              attributes: {
                name: item.label.slice(0, 64),
                productId: item.productId,
                subscriptionPeriod: item.period,
                groupLevel: 1,
              },
              relationships: {
                group: {
                  data: { type: 'subscriptionGroups', id: groupId },
                },
              },
            },
          });
          row = created.data;
          subByPid.set(item.productId, row);
          report.created.push({
            type: 'subscription',
            productId: item.productId,
            id: row.id,
            period: item.period,
          });
        }
        await ensureSubLocalization(
          token,
          row.id,
          item.label.slice(0, 40),
          `${item.label}. Cancel anytime.`
        );
        await setSubscriptionPriceUSA(token, row.id, item.usd);
        report.priced.push({
          productId: item.productId,
          usd: item.usd,
          ascId: row.id,
        });
        await submitSub(token, row.id);
      }
    } catch (e) {
      report.errors.push({
        productId: item.productId,
        message: e.message || String(e),
        detail: e.detail,
      });
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
