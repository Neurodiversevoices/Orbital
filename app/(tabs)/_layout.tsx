import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Activity, TrendingUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { useAuth } from '../../lib/supabase';
import { isProfileSetupComplete } from '../profile-setup';

export default function TabLayout() {
  const router = useRouter();
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    if (auth.isLoading) return;

    const checkProfileSetup = async () => {
      if (auth.isAuthenticated) {
        const isComplete = await isProfileSetupComplete();
        if (!isComplete) {
          setCheckingSetup(false);
          router.replace('/profile-setup');
          return;
        }
      }
      setCheckingSetup(false);
    };

    void checkProfileSetup();
  }, [auth.isAuthenticated, auth.isLoading, router]);

  const showProfileGate = auth.isLoading || (checkingSetup && auth.isAuthenticated);
  if (showProfileGate) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        testID="tabs-profile-gate"
        accessibilityLabel="Preparing your workspace"
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: 'rgba(255,255,255,0.10)',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#7A8593',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <Activity color={color} size={26} />,
          tabBarAccessibilityLabel: 'Today',
        }}
      />
      <Tabs.Screen
        name="patterns"
        options={{
          tabBarIcon: ({ color }) => <TrendingUp color={color} size={26} />,
          tabBarAccessibilityLabel: 'Patterns',
        }}
      />
      {/* Nova tab removed from Orbital app */}
      <Tabs.Screen name="nova" options={{ href: null }} />
      {/* Hidden screens — not shown in tab bar */}
      <Tabs.Screen name="empire-missions" options={{ href: null }} />
    </Tabs>
  );
}
