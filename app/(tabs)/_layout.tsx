import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import {
  Circle,
  TrendingUp,
  Zap,
  Lightbulb,
  User,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../lib/supabase';
import { useBrandAccent } from '../../lib/platform/useBrandAccent';
import { isProfileSetupComplete } from '../profile-setup';

// Light theme tokens (per CLAUDE.md design system, May 2026)
const LIGHT = {
  background: '#FFFFFF',
  textSecondary: 'rgba(15, 22, 36, 0.62)',
  hairline: 'rgba(15, 22, 36, 0.10)',
  accentDefault: '#2DD4BF',
};

export default function TabLayout() {
  const router = useRouter();
  const auth = useAuth();
  const [checkingSetup, setCheckingSetup] = useState(true);
  // Brand accent — defaults to teal #2DD4BF when SubBrandProvider returns null.
  // Phase 6 wired this via useBrandAccent; tab bar follows the active sub-brand.
  const accent = useBrandAccent() || LIGHT.accentDefault;

  // Check if B2C user needs profile setup
  useEffect(() => {
    const checkProfileSetup = async () => {
      if (auth.isAuthenticated) {
        const isComplete = await isProfileSetupComplete();
        if (!isComplete) {
          router.replace('/profile-setup');
          return;
        }
      }
      setCheckingSetup(false);
    };

    checkProfileSetup();
  }, [auth.isAuthenticated, router]);

  // Don't render tabs while checking setup
  if (checkingSetup && auth.isAuthenticated) {
    return null;
  }

  // Haptic on tab switch (Phase 5 work — iOS only)
  const handleTabPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync().catch(() => {
        // ignore haptics failures
      });
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: LIGHT.background,
          borderTopColor: LIGHT.hairline,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: LIGHT.textSecondary,
        tabBarLabelStyle: {
          // CLAUDE.md prefers JetBrains Mono but only Space Mono is loaded
          // (see @expo-google-fonts/space-mono in package.json) — using
          // SpaceMono as the canonical mono until a JetBrains Mono load lands.
          fontFamily: 'SpaceMono_400Regular',
          fontSize: 11,
          letterSpacing: 1.76, // ~0.16em at 11pt
          textTransform: 'uppercase',
          marginTop: 2,
        },
        tabBarShowLabel: true,
      }}
      screenListeners={{
        tabPress: handleTabPress,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Field',
          tabBarAccessibilityLabel: 'Field',
          tabBarIcon: ({ color }) => <Circle color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="patterns"
        options={{
          title: 'Trends',
          tabBarAccessibilityLabel: 'Trends',
          tabBarIcon: ({ color }) => <TrendingUp color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="load"
        options={{
          title: 'Load',
          tabBarAccessibilityLabel: 'Load',
          tabBarIcon: ({ color }) => <Zap color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarAccessibilityLabel: 'Insights',
          tabBarIcon: ({ color }) => <Lightbulb color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
