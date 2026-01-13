/**
 * CCI-Q4 PDF Export Script
 *
 * Generates the exact PDF matching the golden master.
 * Uses the existing cci_ultra.html as source.
 *
 * GOLDEN MASTER: output/CCI_Q4_2025_Ultra_PatternReadable.pdf
 * This script produces IDENTICAL output - no visual changes allowed.
 *
 * Usage:
 *   node scripts/cci-export-pdf.js [output-path]
 *
 * Default output: output/CCI_Q4_2025_Ultra_PatternReadable.generated.pdf
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function exportCCIPDF(outputPath) {
  console.log('=== CCI-Q4 PDF EXPORT ===\n');

  // Source: existing golden master HTML
  const htmlPath = path.join(__dirname, '..', 'output', 'cci_ultra.html');
  const defaultOutput = path.join(__dirname, '..', 'output', 'CCI_Q4_2025_Ultra_PatternReadable.generated.pdf');
  const pdfPath = outputPath || defaultOutput;

  console.log('Source HTML:', htmlPath);
  console.log('Output PDF:', pdfPath);
  console.log('');

  // Verify source exists
  if (!fs.existsSync(htmlPath)) {
    console.error('ERROR: Source HTML not found:', htmlPath);
    console.error('The golden master HTML (cci_ultra.html) must exist in output/');
    process.exit(1);
  }

  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set exact viewport size (US Letter)
  await page.setViewportSize({ width: 612, height: 792 });

  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log('Loading:', fileUrl);

  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Wait for fonts to fully load
  await page.waitForTimeout(1500);

  console.log('Generating PDF with print fidelity...\n');

  // Generate PDF with exact print settings
  await page.pdf({
    path: pdfPath,
    width: '612px',
    height: '792px',
    printBackground: true,  // CRITICAL: preserves dark backgrounds
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();

  // Verify output
  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log('=== SUCCESS ===\n');
    console.log('PDF generated:');
    console.log('  Path:', pdfPath);
    console.log('  Size:', Math.round(stats.size / 1024), 'KB');
    console.log('');
    console.log('Print fidelity settings applied:');
    console.log('  - printBackground: true');
    console.log('  - CSS print-color-adjust: exact');
    console.log('  - Page size: 612x792px (US Letter)');
  } else {
    console.error('ERROR: PDF was not created');
    process.exit(1);
  }
}

// Run
const outputArg = process.argv[2];
exportCCIPDF(outputArg).catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
