import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { borderRadius } from './spacing';

export const glowStyles = {
  // Soft glow for iOS (light theme — subtle teal)
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.35,
  shadowRadius: 18,
  // Android elevation
  elevation: 6,
};

export const createGlow = (color: string, intensity: number = 1) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.35 * intensity,
  shadowRadius: 18 * intensity,
  elevation: Math.round(6 * intensity),
});

/**
 * Light-surface "glass" — solid white card with hairline border + soft shadow.
 * Replaces the legacy translucent dark glass.
 */
export const glassStyle = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
});

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
