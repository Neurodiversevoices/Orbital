const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function renderPDF() {
  console.log('=== QCR PDF GENERATOR ===\n');

  const htmlFile = 'qcr_q4_2025.html';
  const cssFile = 'qcr_q4_2025.css';
  const pdfFile = 'qcr_q4_2025.pdf';

  const htmlPath = path.join(__dirname, htmlFile);
  const cssPath = path.join(__dirname, cssFile);
  const pdfPath = path.join(__dirname, pdfFile);

  console.log('PREFLIGHT CHECK:');
  console.log('  HTML:', htmlPath);
  console.log('  CSS:', cssPath);
  console.log('  PDF:', pdfPath);
  console.log('');

  const htmlExists = fs.existsSync(htmlPath);
  const cssExists = fs.existsSync(cssPath);

  console.log('  HTML exists:', htmlExists ? 'YES' : 'NO');
  console.log('  CSS exists:', cssExists ? 'YES' : 'NO');
  console.log('');

  if (!htmlExists) {
    console.error('FATAL: ' + htmlFile + ' not found at ' + htmlPath);
    process.exit(1);
  }

  if (!cssExists) {
    console.error('FATAL: ' + cssFile + ' not found at ' + cssPath);
    process.exit(1);
  }

  console.log('Preflight OK. Launching browser...\n');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log('Loading:', fileUrl);

  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  console.log('Page loaded. Generating PDF...\n');

  await page.pdf({
    path: pdfPath,
    format: 'Letter',
    printBackground: true,
    margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' }
  });

  await browser.close();

  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log('SUCCESS');
    console.log('  Output: ' + pdfPath);
    console.log('  Size: ' + Math.round(stats.size / 1024) + ' KB');
  } else {
    console.error('FATAL: PDF was not created');
    process.exit(1);
  }
}

renderPDF().catch(function(err) {
  console.error('FATAL:', err.message);
  process.exit(1);
});
