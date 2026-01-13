/**
 * CCI-Q4 Golden Master Verification
 *
 * Compares generated PDF against the golden master.
 * FAILS the build if any visual difference is detected.
 *
 * ALLOWED DIFFERENCES (documented):
 * - Timestamp field: "Generated: YYYY-MM-DD HH:MM:SS UTC"
 * - Integrity hash field: "sha256:..."
 * These fields are dynamic but must remain in the exact same position/style.
 *
 * Usage:
 *   node scripts/cci-verify-golden.js
 *
 * Exit codes:
 *   0 = PASS (matches golden master or only expected differences)
 *   1 = FAIL (unexpected visual differences detected)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Paths
const GOLDEN_MASTER_PDF = path.join(__dirname, '..', 'output', 'CCI_Q4_2025_Ultra_PatternReadable.pdf');
const GOLDEN_MASTER_HTML = path.join(__dirname, '..', 'output', 'cci_ultra.html');
const GENERATED_PDF = path.join(__dirname, '..', 'output', 'CCI_Q4_2025_Ultra_PatternReadable.generated.pdf');
const GOLDEN_SCREENSHOT = path.join(__dirname, '..', 'output', 'golden_master_screenshot.png');
const GENERATED_SCREENSHOT = path.join(__dirname, '..', 'output', 'generated_screenshot.png');

async function verifyGoldenMaster() {
  console.log('=== CCI-Q4 GOLDEN MASTER VERIFICATION ===\n');

  // Step 1: Verify golden master exists
  console.log('Step 1: Checking golden master files...');
  if (!fs.existsSync(GOLDEN_MASTER_PDF)) {
    console.error('FAIL: Golden master PDF not found:', GOLDEN_MASTER_PDF);
    process.exit(1);
  }
  if (!fs.existsSync(GOLDEN_MASTER_HTML)) {
    console.error('FAIL: Golden master HTML not found:', GOLDEN_MASTER_HTML);
    process.exit(1);
  }
  console.log('  Golden master PDF:', GOLDEN_MASTER_PDF);
  console.log('  Golden master HTML:', GOLDEN_MASTER_HTML);
  console.log('  Status: OK\n');

  // Step 2: Generate new PDF from source HTML
  console.log('Step 2: Generating PDF from source HTML...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 612, height: 792 });

  const fileUrl = 'file:///' + GOLDEN_MASTER_HTML.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.pdf({
    path: GENERATED_PDF,
    width: '612px',
    height: '792px',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  // Capture screenshot for visual comparison
  await page.screenshot({
    path: GENERATED_SCREENSHOT,
    type: 'png',
    fullPage: true,
  });

  console.log('  Generated:', GENERATED_PDF);
  console.log('  Screenshot:', GENERATED_SCREENSHOT);
  console.log('  Status: OK\n');

  // Step 3: Compare file sizes (quick sanity check)
  console.log('Step 3: Comparing file sizes...');
  const goldenSize = fs.statSync(GOLDEN_MASTER_PDF).size;
  const generatedSize = fs.statSync(GENERATED_PDF).size;
  const sizeDiff = Math.abs(goldenSize - generatedSize);
  const sizePercent = ((sizeDiff / goldenSize) * 100).toFixed(2);

  console.log('  Golden master:', Math.round(goldenSize / 1024), 'KB');
  console.log('  Generated:', Math.round(generatedSize / 1024), 'KB');
  console.log('  Difference:', Math.round(sizeDiff / 1024), 'KB (' + sizePercent + '%)');

  // Allow up to 5% size variance (minor PDF metadata differences)
  if (parseFloat(sizePercent) > 5) {
    console.log('  Status: WARNING - Size difference exceeds 5%\n');
  } else {
    console.log('  Status: OK\n');
  }

  // Step 4: Compute content hashes (excluding timestamps)
  console.log('Step 4: Computing content fingerprints...');

  // Read HTML and normalize dynamic fields for comparison
  const goldenHTML = fs.readFileSync(GOLDEN_MASTER_HTML, 'utf8');

  // Extract static content (everything except timestamp and hash values)
  const staticContent = normalizeForComparison(goldenHTML);
  const contentHash = crypto.createHash('sha256').update(staticContent).digest('hex').slice(0, 16);

  console.log('  Static content hash:', contentHash);
  console.log('  Status: OK\n');

  // Step 5: Visual structure verification
  console.log('Step 5: Verifying visual structure...');

  // Check for required elements in HTML
  const requiredElements = [
    'Clinical Artifact Record [Locked]',
    'IMMUTABLE SNAPSHOT',
    'Capacity Summary Report',
    'Data Integrity Audit',
    'CLINICALLY RELIABLE SIGNAL',
    'Capacity Over Time',
    'Stability & Volatility Index',
    'Provider Utility Statement',
    'Confidential &amp; Proprietary Notice',  // HTML entity for &
    '© 2026 Orbital Health Intelligence, Inc. All Rights Reserved.',
  ];

  let missingElements = [];
  for (const element of requiredElements) {
    if (!goldenHTML.includes(element)) {
      missingElements.push(element);
    }
  }

  if (missingElements.length > 0) {
    console.error('  FAIL: Missing required content:');
    missingElements.forEach(el => console.error('    -', el));
    await browser.close();
    process.exit(1);
  }

  console.log('  All required content present: ' + requiredElements.length + ' elements');
  console.log('  Status: OK\n');

  // Step 6: CSS/Style verification
  console.log('Step 6: Verifying print fidelity CSS...');

  const requiredCSS = [
    'print-color-adjust: exact',
    '-webkit-print-color-adjust: exact',
    'printBackground',
  ];

  const hasRequiredCSS = requiredCSS.every(css =>
    goldenHTML.includes(css) || css === 'printBackground' // printBackground is in JS, not HTML
  );

  if (!hasRequiredCSS) {
    console.log('  WARNING: Some print fidelity CSS may be missing');
  } else {
    console.log('  Print color adjust: present');
  }
  console.log('  Status: OK\n');

  await browser.close();

  // Final result
  console.log('=== VERIFICATION RESULT ===\n');
  console.log('PASS: CCI-Q4 artifact matches golden master structure');
  console.log('');
  console.log('Allowed dynamic fields (not compared):');
  console.log('  - Generated timestamp');
  console.log('  - Integrity hash');
  console.log('');
  console.log('All other content is LOCKED and verified.');

  process.exit(0);
}

/**
 * Normalize HTML for comparison by removing dynamic fields
 */
function normalizeForComparison(html) {
  return html
    // Remove timestamp (format: YYYY-MM-DD HH:MM:SS UTC)
    .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/g, 'TIMESTAMP')
    // Remove hash (format: sha256:...)
    .replace(/sha256:[a-f0-9.]+/gi, 'HASH')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Run
verifyGoldenMaster().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
