/**
 * Bundle CCI PDF Export Script
 *
 * Generates PDF for Bundle CCI artifact using the HTML generator from
 * lib/cci/bundleArtifact.ts, which uses lib/cci/summaryChart.ts as
 * the SINGLE SOURCE OF TRUTH for chart rendering.
 *
 * Usage:
 *   npx tsx scripts/bundle-cci-export-pdf.ts [seat-count] [output-path]
 *
 * Examples:
 *   npm run bundle:export
 *   npm run bundle:export -- 15
 *   npm run bundle:export -- 20 output/bundle-20.pdf
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { generateBundleCCIArtifactHTML } from '../lib/cci/bundleArtifact';

// =============================================================================
// PDF EXPORT
// =============================================================================

async function exportBundleCCIPDF(
  seatCount: 10 | 15 | 20,
  outputPath?: string
): Promise<void> {
  console.log('=== BUNDLE CCI PDF EXPORT ===\n');
  console.log('Seat Count:', seatCount);
  console.log('Source: lib/cci/bundleArtifact.ts -> lib/cci/summaryChart.ts (Single Source of Truth)\n');

  // Generate HTML using the artifact generator (which uses summaryChart.ts)
  console.log('Generating Bundle CCI HTML via bundleArtifact.ts...');
  const html = generateBundleCCIArtifactHTML(seatCount);

  // Ensure output directory exists
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write HTML to temp file
  const tempHtmlPath = path.join(outputDir, `bundle-cci-${seatCount}-temp.html`);
  fs.writeFileSync(tempHtmlPath, html);
  console.log('Temp HTML:', tempHtmlPath);

  // Default output path
  const defaultOutput = path.join(outputDir, `bundle-cci-${seatCount}.pdf`);
  const pdfPath = outputPath || defaultOutput;
  console.log('Output PDF:', pdfPath);
  console.log('');

  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 612, height: 792 });

  const fileUrl = 'file:///' + tempHtmlPath.replace(/\\/g, '/');
  console.log('Loading:', fileUrl);

  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  console.log('Generating PDF...\n');

  await page.pdf({
    path: pdfPath,
    width: '612px',
    height: '792px',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();

  // Clean up temp file
  fs.unlinkSync(tempHtmlPath);

  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log('=== SUCCESS ===\n');
    console.log('PDF generated:');
    console.log('  Path:', pdfPath);
    console.log('  Size:', Math.round(stats.size / 1024), 'KB');
    console.log('  Seats:', seatCount);
    console.log('\nChart rendering: lib/cci/summaryChart.ts -> renderSummaryChartSVG()');
  } else {
    console.error('ERROR: PDF was not created');
    process.exit(1);
  }
}

// =============================================================================
// MAIN
// =============================================================================

const seatCountArg = parseInt(process.argv[2] || '10') as 10 | 15 | 20;
const outputArg = process.argv[3];

if (![10, 15, 20].includes(seatCountArg)) {
  console.error('ERROR: Seat count must be 10, 15, or 20');
  process.exit(1);
}

exportBundleCCIPDF(seatCountArg, outputArg).catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
