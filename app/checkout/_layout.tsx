/**
 * Checkout Layout
 *
 * Minimal layout for checkout flow pages.
 */

import { Stack } from 'expo-router';

export default function CheckoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    />
  );
}
