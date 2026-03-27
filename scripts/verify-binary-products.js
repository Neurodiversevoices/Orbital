#!/usr/bin/env node
/**
 * Verifies Products.storekit includes all PRODUCT_IDS from lib/subscription/pricing.ts
 * and that the Xcode project references the StoreKit file + scheme.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const storePath = path.join(root, 'ios', 'Orbital', 'Products.storekit');
const pricingPath = path.join(root, 'lib', 'subscription', 'pricing.ts');
const pbxPath = path.join(root, 'ios', 'Orbital.xcodeproj', 'project.pbxproj');
const schemePath = path.join(
  root,
  'ios',
  'Orbital.xcodeproj',
  'xcshareddata',
  'xcschemes',
  'Orbital.xcscheme',
);

function fail(msg) {
  console.error('BLOCKING:', msg);
  process.exit(1);
}

function ok(msg) {
  console.log('OK:', msg);
}

if (!fs.existsSync(storePath)) fail(`Missing ${storePath}`);
if (!fs.existsSync(pricingPath)) fail(`Missing ${pricingPath}`);

const pricingSrc = fs.readFileSync(pricingPath, 'utf8');
// Only IDs before legacy / removed SKUs (StoreKit file mirrors live ASC products).
const preLegacy = pricingSrc.split('// Legacy IDs')[0];
const productIdsFromTs = new Set();
const re = /:\s*'(orbital_[a-z0-9_]+)'/g;
let m;
while ((m = re.exec(preLegacy)) !== null) {
  productIdsFromTs.add(m[1]);
}

const sk = JSON.parse(fs.readFileSync(storePath, 'utf8'));
const inStore = new Set();
for (const p of sk.products || []) {
  if (p.productID) inStore.add(p.productID);
}
for (const g of sk.subscriptionGroups || []) {
  for (const s of g.subscriptions || []) {
    if (s.productID) inStore.add(s.productID);
  }
}

const missing = [...productIdsFromTs].filter((id) => !inStore.has(id));
if (missing.length) {
  fail(`Products.storekit missing IDs from pricing.ts: ${missing.join(', ')}`);
}
ok(`${inStore.size} product IDs in Products.storekit; all pricing.ts orbital_* IDs covered`);

const pbx = fs.readFileSync(pbxPath, 'utf8');
if (!pbx.includes('Products.storekit')) fail('project.pbxproj does not reference Products.storekit');
ok('project.pbxproj references Products.storekit');

const scheme = fs.readFileSync(schemePath, 'utf8');
if (!scheme.includes('StoreKitConfigurationFileReference')) {
  fail('Orbital.xcscheme missing StoreKitConfigurationFileReference');
}
if (!scheme.includes('Products.storekit')) fail('Orbital.xcscheme does not reference Products.storekit');
ok('Orbital.xcscheme wires StoreKit configuration');

console.log('\nREADY — StoreKit file + Xcode integration verified.');
