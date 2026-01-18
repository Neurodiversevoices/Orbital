/**
 * InitialsAvatar Component
 *
 * Displays user initials in a colored circle.
 * Used for privacy-first identity display (no photos).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface InitialsAvatarProps {
  /** Two-letter initials to display */
  initials: string;
  /** Background color (hex) */
  color: string;
  /** Size in pixels (default: 48) */
  size?: number;
  /** Optional border color for selected state */
  borderColor?: string;
}

export function InitialsAvatar({
  initials,
  color,
  size = 48,
  borderColor,
}: InitialsAvatarProps) {
  const fontSize = size * 0.4;
  const borderWidth = borderColor ? 3 : 0;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth,
          borderColor: borderColor || 'transparent',
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
});
