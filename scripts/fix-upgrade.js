const fs = require('fs');
const path = require('path');

const upgradePath = path.join(__dirname, '..', 'app', 'upgrade.tsx');
let content = fs.readFileSync(upgradePath, 'utf8');

// 1. Update header comment
content = content.replace(
  /\/\*\*\n \* Upgrade to Pro \(Beta\) Screen\n \*\n \* Lightweight subscription screen for Individual Pro tier\.\n \* \$9\/month beta pricing\.\n \*\//,
  `/**
 * Upgrade Screen - Orbital Individual & Pro Tiers
 *
 * Pricing:
 * - Individual: $19/mo or $179/yr (Core Capacity Signaling)
 * - Pro: $49/mo or $449/yr (Full Pattern History + Advanced Insights)
 *
 * Non-diagnostic capacity intelligence infrastructure.
 */`
);

// 2. Change "Free tier" to "Starter"
content = content.replace(/Free tier:/g, 'Starter:');

// 3. Change "Orbital Pro" to "Orbital Individual"
content = content.replace(/<Text style={styles\.heroTitle}>Orbital Pro<\/Text>/g,
  '<Text style={styles.heroTitle}>Orbital Individual</Text>');

// 4. Update feature description for support
content = content.replace(
  /Help shape the future of Orbital/g,
  'Non-diagnostic capacity intelligence infrastructure'
);

// 5. Change betaBadge styles name to tierBadge (but keep using same style)
// content = content.replace(/betaBadge/g, 'tierBadge');
// content = content.replace(/betaBadgeText/g, 'tierBadgeText');

fs.writeFileSync(upgradePath, content);
console.log('Upgrade.tsx updated successfully');
