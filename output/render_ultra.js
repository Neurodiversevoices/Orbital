const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function renderUltraPDF() {
  console.log('=== CCI ULTRA PDF GENERATOR ===\n');

  const htmlFile = 'cci_ultra.html';
  const pdfFile = 'CCI_Q4_2025_Ultra_PatternReadable.pdf';
  const chartPng = 'chart_card_preview.png';

  const htmlPath = path.join(__dirname, htmlFile);
  const pdfPath = path.join(__dirname, pdfFile);
  const chartPngPath = path.join(__dirname, chartPng);

  console.log('PREFLIGHT CHECK:');
  console.log('  HTML:', htmlPath);
  console.log('  PDF:', pdfPath);
  console.log('  Chart PNG:', chartPngPath);
  console.log('');

  if (!fs.existsSync(htmlPath)) {
    console.error('FATAL: ' + htmlFile + ' not found');
    process.exit(1);
  }

  console.log('Preflight OK. Launching browser...\n');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport to exact page size
  await page.setViewportSize({ width: 612, height: 792 });

  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log('Loading:', fileUrl);

  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Wait for fonts to load
  await page.waitForTimeout(1000);

  console.log('Page loaded. Generating PDF...\n');

  // Generate PDF
  await page.pdf({
    path: pdfPath,
    width: '612px',
    height: '792px',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });

  console.log('PDF generated. Capturing chart preview...\n');

  // Capture chart card screenshot
  const chartCard = await page.$('.chart-card');
  if (chartCard) {
    await chartCard.screenshot({
      path: chartPngPath,
      type: 'png'
    });
    console.log('Chart preview captured.\n');
  } else {
    console.log('Warning: Could not find .chart-card element for preview.\n');
  }

  await browser.close();

  // Report results
  console.log('=== RESULTS ===\n');

  if (fs.existsSync(pdfPath)) {
    const pdfStats = fs.statSync(pdfPath);
    console.log('PDF:');
    console.log('  Path: ' + pdfPath);
    console.log('  Size: ' + Math.round(pdfStats.size / 1024) + ' KB');
    console.log('  Status: SUCCESS');
  } else {
    console.error('FATAL: PDF was not created');
    process.exit(1);
  }

  if (fs.existsSync(chartPngPath)) {
    const pngStats = fs.statSync(chartPngPath);
    console.log('\nChart Preview:');
    console.log('  Path: ' + chartPngPath);
    console.log('  Size: ' + Math.round(pngStats.size / 1024) + ' KB');
    console.log('  Status: SUCCESS');
  }

  console.log('\n=== DONE ===');
}

renderUltraPDF().catch(function(err) {
  console.error('FATAL:', err.message);
  process.exit(1);
});
