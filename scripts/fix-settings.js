const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '..', 'app', 'settings.tsx');
let content = fs.readFileSync(settingsPath, 'utf8');

// 1. Add Gift icon import
content = content.replace(
  "import { Crown } from 'lucide-react-native';",
  "import { Crown, Gift } from 'lucide-react-native';"
);

// 2. Change freeBadge to starterBadge
content = content.replace(/freeBadge/g, 'starterBadge');
content = content.replace(/freeBadgeText/g, 'starterBadgeText');

// 3. Change FREE to STARTER
content = content.replace(/>FREE<\/Text>/g, '>STARTER</Text>');

// 4. Change $9/mo to $19/mo
content = content.replace(/\$9\/mo/g, '$19/mo');

fs.writeFileSync(settingsPath, content);
console.log('Settings.tsx updated successfully');
