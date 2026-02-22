#!/usr/bin/env node
/**
 * Generate Orbital app icons from brand spec.
 * Brand: Deep Space #0A0A1A bg, Orbital Cyan #00FFFF accent.
 * No transparency, no rounded corners, square source.
 *
 * Usage: node scripts/generate-icons.js
 * Requires: npm install sharp (temp dev dep)
 */

const fs = require('fs');
const path = require('path');

const size = 1024;
const cx = size / 2;
const cy = size / 2;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00FFFF" stop-opacity="0.15"/>
      <stop offset="60%" stop-color="#00FFFF" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#00FFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orbCenter" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#33FFFF"/>
      <stop offset="100%" stop-color="#00CCDD"/>
    </radialGradient>
  </defs>
  <!-- Solid deep space background — no transparency -->
  <rect width="${size}" height="${size}" fill="#0A0A1A"/>
  <!-- Subtle ambient glow -->
  <circle cx="${cx}" cy="${cy}" r="420" fill="url(#glow)"/>
  <!-- Outer ring -->
  <circle cx="${cx}" cy="${cy}" r="380" fill="none" stroke="#00FFFF" stroke-width="18" opacity="0.5"/>
  <!-- Middle ring -->
  <circle cx="${cx}" cy="${cy}" r="280" fill="none" stroke="#00FFFF" stroke-width="22" opacity="0.7"/>
  <!-- Inner ring -->
  <circle cx="${cx}" cy="${cy}" r="180" fill="none" stroke="#00FFFF" stroke-width="16" opacity="0.85"/>
  <!-- Core orb — solid filled circle -->
  <circle cx="${cx}" cy="${cy}" r="90" fill="url(#orbCenter)"/>
  <!-- Core highlight -->
  <circle cx="${cx - 20}" cy="${cy - 20}" r="30" fill="#AAFFFF" opacity="0.3"/>
</svg>`;

const assetsDir = path.resolve(__dirname, '..', 'assets');
const svgPath = path.join(assetsDir, '_orbital-orb-source.svg');

fs.writeFileSync(svgPath, svg, 'utf8');
console.log(`SVG source written to ${svgPath}`);
console.log('Now run sharp-cli to convert to PNG icons.');
