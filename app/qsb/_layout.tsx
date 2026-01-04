/**
 * QSB Route Layout
 *
 * Stack navigator for all QSB detail screens.
 */

import { Stack } from 'expo-router';
import { colors } from '../../theme';

export default function QSBLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="capacity-index" />
      <Stack.Screen name="load-friction" />
      <Stack.Screen name="recovery-elasticity" />
      <Stack.Screen name="early-drift" />
      <Stack.Screen name="intervention-sensitivity" />
    </Stack>
  );
}
