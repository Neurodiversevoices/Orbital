/**
 * AUTH ROUTE LAYOUT
 *
 * Stack navigator for all auth screens (sign-in, OAuth callback).
 * Keeps gesture navigation disabled so the user cannot swipe back
 * out of the auth gate.
 */

import { Stack } from 'expo-router';

const BG = '#01020A';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: BG },
        animation: 'fade',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="callback" />
    </Stack>
  );
}
