/**
 * GlassCard
 *
 * Reusable glass refraction surface for cards.
 * Standardized tokens (CLAUDE.md design system):
 *   bg     rgba(255,255,255,0.07) (normal)
 *   border rgba(255,255,255,0.15)
 *   radius 10px (card token)
 *
 * `expo-blur` is intentionally NOT a dependency (no package.json
 * changes allowed). Surface is rendered with rgba + subtle shadow,
 * which renders identically on iOS / Android / web.
 */

import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

export type GlassIntensity = 'subtle' | 'normal' | 'strong';

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: GlassIntensity;
  /** Optional override for padding (default 16) */
  padding?: number;
  testID?: string;
}

const BG_BY_INTENSITY: Record<GlassIntensity, string> = {
  subtle: 'rgba(255,255,255,0.04)',
  normal: 'rgba(255,255,255,0.07)',
  strong: 'rgba(255,255,255,0.10)',
};

export function GlassCard({
  children,
  style,
  intensity = 'normal',
  padding = 16,
  testID,
}: GlassCardProps) {
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: BG_BY_INTENSITY[intensity],
          borderColor: 'rgba(255,255,255,0.15)',
          borderWidth: 1,
          borderRadius: 10,
          padding,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
