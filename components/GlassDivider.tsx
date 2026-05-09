/**
 * GlassDivider
 *
 * Thin separator with a soft gradient fade.
 * Pure-RN implementation (no extra deps): three stacked 1px slivers
 * stepped through low-alpha white to fake a gradient fade. Works on
 * iOS, Android, and web without expo-linear-gradient.
 */

import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

interface GlassDividerProps {
  style?: StyleProp<ViewStyle>;
  /** Total vertical space the divider occupies (default 16) */
  spacing?: number;
}

export function GlassDivider({ style, spacing = 16 }: GlassDividerProps) {
  return (
    <View
      style={[
        { paddingVertical: spacing / 2, alignItems: 'stretch' },
        style,
      ]}
    >
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)' }} />
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.10)' }} />
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)' }} />
    </View>
  );
}
