import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { borderRadius } from './spacing';

export const glowStyles = {
  // Glow shadow for iOS
  shadowColor: colors.good,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: 20,
  // Android elevation
  elevation: 10,
};

export const createGlow = (color: string, intensity: number = 1) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8 * intensity,
  shadowRadius: 20 * intensity,
  elevation: Math.round(10 * intensity),
});

export const glassStyle = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
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
