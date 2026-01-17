/**
 * BundleSeatAvatar — Anonymous Seat Avatar with Capacity Indicator
 *
 * Displays a circular avatar for a bundle seat:
 * - No text, no initials, no names (anonymous)
 * - Color-coded avatar fill
 * - Capacity state ring indicator (cyan/amber/red)
 * - Pressable to show full chart modal
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { CAPACITY_COLORS } from '../lib/cci/summaryChart';
import type { BundleSeatData } from '../lib/cci/bundleDemoData';
import { getSeatCapacityState } from '../lib/cci/bundleDemoData';

// =============================================================================
// TYPES
// =============================================================================

export interface BundleSeatAvatarProps {
  /** Seat data with capacity history */
  seat: BundleSeatData;
  /** Avatar size in pixels */
  size?: number;
  /** Whether avatar is selected */
  selected?: boolean;
  /** Press handler for modal */
  onPress?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BundleSeatAvatar({
  seat,
  size = 40,
  selected = false,
  onPress,
}: BundleSeatAvatarProps) {
  const capacityState = getSeatCapacityState(seat);

  // Map capacity state to ring color
  const ringColor = {
    resourced: CAPACITY_COLORS.resourced,
    stretched: CAPACITY_COLORS.stretched,
    depleted: CAPACITY_COLORS.depleted,
  }[capacityState];

  const borderWidth = size > 32 ? 3 : 2;
  const innerSize = size - borderWidth * 2;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: ringColor,
          opacity: pressed ? 0.7 : 1,
        },
        selected && styles.selected,
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: seat.avatarColor,
          },
        ]}
      />
      {/* Center dot for visual interest */}
      <View
        style={[
          styles.centerDot,
          {
            width: size * 0.2,
            height: size * 0.2,
            borderRadius: size * 0.1,
          },
        ]}
      />
    </Pressable>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  inner: {
    position: 'absolute',
  },
  centerDot: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    position: 'absolute',
  },
  selected: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default BundleSeatAvatar;
