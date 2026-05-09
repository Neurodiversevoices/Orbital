import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home, BarChart2, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme';
import { useAuth } from '../../lib/supabase';
import { isProfileSetupComplete } from '../profile-setup';

// HIG: light selection haptic on tab change. iOS-only — Android haptic API parity is inconsistent.
const tabPressHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.selectionAsync().catch(() => {});
  }
};

const tabPressListeners = { tabPress: tabPressHaptic };

export default function TabLayout() {
  const router = useRouter();
  const auth = useAuth();
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Check if B2C user needs profile setup
  useEffect(() => {
    const checkProfileSetup = async () => {
      if (auth.isAuthenticated) {
        const isComplete = await isProfileSetupComplete();
        if (!isComplete) {
          // Redirect to profile setup
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.cardBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
        }}
        listeners={tabPressListeners}
      />
      <Tabs.Screen
        name="patterns"
        options={{
          tabBarAccessibilityLabel: 'Patterns',
          tabBarIcon: ({ color, size }) => (
            <BarChart2 color={color} size={size} />
          ),
        }}
        listeners={tabPressListeners}
      />
      <Tabs.Screen
        name="brief"
        options={{
          tabBarAccessibilityLabel: 'Brief',
          tabBarIcon: ({ color, size }) => (
            <FileText color={color} size={size} />
          ),
        }}
        listeners={tabPressListeners}
      />
    </Tabs>
  );
}
