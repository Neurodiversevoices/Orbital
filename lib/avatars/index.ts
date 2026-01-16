/**
 * Avatar Library
 *
 * 100 pre-generated avatar options for B2C users.
 * Uses DiceBear API for consistent, unique SVG avatars.
 */

// =============================================================================
// AVATAR STYLES
// =============================================================================

type AvatarStyle = 'thumbs' | 'shapes' | 'icons' | 'initials';

interface AvatarOption {
  id: string;
  url: string;
  style: AvatarStyle;
}

// =============================================================================
// AVATAR GENERATION
// =============================================================================

const DICEBEAR_BASE = 'https://api.dicebear.com/7.x';

function generateAvatarUrl(style: string, seed: number | string): string {
  return `${DICEBEAR_BASE}/${style}/svg?seed=${seed}&backgroundColor=0a0b10`;
}

// =============================================================================
// AVATAR LIBRARY - 100 Avatars
// =============================================================================

// Generate 25 avatars per style for variety
const styles: { style: AvatarStyle; dicebearStyle: string }[] = [
  { style: 'thumbs', dicebearStyle: 'thumbs' },
  { style: 'shapes', dicebearStyle: 'shapes' },
  { style: 'icons', dicebearStyle: 'icons' },
  { style: 'initials', dicebearStyle: 'fun-emoji' },
];

export const AVATAR_LIBRARY: AvatarOption[] = [];

// Generate 25 avatars per style (4 styles × 25 = 100 total)
styles.forEach(({ style, dicebearStyle }, styleIndex) => {
  for (let i = 1; i <= 25; i++) {
    const seed = `orbital-${styleIndex}-${i}`;
    AVATAR_LIBRARY.push({
      id: `${style}-${i}`,
      url: generateAvatarUrl(dicebearStyle, seed),
      style,
    });
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get avatar by ID
 */
export function getAvatarById(id: string): AvatarOption | undefined {
  return AVATAR_LIBRARY.find(a => a.id === id);
}

/**
 * Get avatars by style
 */
export function getAvatarsByStyle(style: AvatarStyle): AvatarOption[] {
  return AVATAR_LIBRARY.filter(a => a.style === style);
}

/**
 * Get random avatar
 */
export function getRandomAvatar(): AvatarOption {
  const index = Math.floor(Math.random() * AVATAR_LIBRARY.length);
  return AVATAR_LIBRARY[index];
}

/**
 * Get avatar URL by ID (convenience function)
 */
export function getAvatarUrl(id: string): string | null {
  const avatar = getAvatarById(id);
  return avatar?.url ?? null;
}

// =============================================================================
// STYLE LABELS
// =============================================================================

export const AVATAR_STYLE_LABELS: Record<AvatarStyle, string> = {
  thumbs: 'Thumbs Up',
  shapes: 'Geometric',
  icons: 'Icons',
  initials: 'Fun Emoji',
};

export const AVATAR_STYLES: AvatarStyle[] = ['thumbs', 'shapes', 'icons', 'initials'];

export type { AvatarStyle, AvatarOption };
