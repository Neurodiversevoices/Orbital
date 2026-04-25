// Native fallback for app/log.web.tsx
// On native, the log experience lives in app/(tabs)/index.tsx
import { Redirect } from 'expo-router';

export default function Log() {
  return <Redirect href="/(tabs)" />;
}
