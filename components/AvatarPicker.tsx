/**
 * AvatarPicker Component
 *
 * Grid-based avatar selection for B2C users.
 * Displays 100 pre-generated avatars organized by style.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import {
  AVATAR_LIBRARY,
  AVATAR_STYLES,
  AVATAR_STYLE_LABELS,
  type AvatarOption,
  type AvatarStyle,
} from '../lib/avatars';

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarPickerProps {
  /** Currently selected avatar ID */
  selectedId: string | null;
  /** Callback when avatar is selected */
  onSelect: (avatar: AvatarOption) => void;
  /** Optional height constraint */
  maxHeight?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AvatarPicker({
  selectedId,
  onSelect,
  maxHeight = 400,
}: AvatarPickerProps) {
  const { width } = useWindowDimensions();
  const [activeStyle, setActiveStyle] = useState<AvatarStyle | 'all'>('all');

  // Calculate grid dimensions
  const padding = spacing.md * 2;
  const gap = spacing.sm;
  const columns = 5;
  const availableWidth = Math.min(width - padding, 500);
  const avatarSize = (availableWidth - gap * (columns - 1)) / columns;

  // Filter avatars by style
  const displayedAvatars =
    activeStyle === 'all'
      ? AVATAR_LIBRARY
      : AVATAR_LIBRARY.filter((a) => a.style === activeStyle);

  return (
    <View style={styles.container}>
      {/* Style Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        <Pressable
          style={[styles.tab, activeStyle === 'all' && styles.tabActive]}
          onPress={() => setActiveStyle('all')}
        >
          <Text
            style={[
              styles.tabText,
              activeStyle === 'all' && styles.tabTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>
        {AVATAR_STYLES.map((style) => (
          <Pressable
            key={style}
            style={[styles.tab, activeStyle === style && styles.tabActive]}
            onPress={() => setActiveStyle(style)}
          >
            <Text
              style={[
                styles.tabText,
                activeStyle === style && styles.tabTextActive,
              ]}
            >
              {AVATAR_STYLE_LABELS[style]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Avatar Grid */}
      <ScrollView
        style={[styles.gridContainer, { maxHeight }]}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={[styles.grid, { gap }]}>
          {displayedAvatars.map((avatar) => {
            const isSelected = selectedId === avatar.id;
            return (
              <Pressable
                key={avatar.id}
                style={[
                  styles.avatarItem,
                  { width: avatarSize, height: avatarSize },
                  isSelected && styles.avatarItemSelected,
                ]}
                onPress={() => onSelect(avatar)}
              >
                <Image
                  source={{ uri: avatar.url }}
                  style={[
                    styles.avatarImage,
                    { width: avatarSize - 8, height: avatarSize - 8 },
                  ]}
                  resizeMode="cover"
                />
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Selection hint */}
      <Text style={styles.hint}>
        {selectedId
          ? 'Tap another avatar to change'
          : 'Tap an avatar to select'}
      </Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  tabsContainer: {
    marginBottom: spacing.md,
  },
  tabsContent: {
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  tabTextActive: {
    color: '#000',
  },
  gridContainer: {
    width: '100%',
  },
  gridContent: {
    paddingBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  avatarItem: {
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarItemSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,229,255,0.1)',
  },
  avatarImage: {
    borderRadius: borderRadius.sm,
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default AvatarPicker;
