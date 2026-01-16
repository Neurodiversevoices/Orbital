import { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Home, BarChart2, FileText } from 'lucide-react-native';
import { colors } from '../../theme';
import { useAuth } from '../../lib/supabase';
import { isProfileSetupComplete } from '../profile-setup';

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
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="patterns"
        options={{
          tabBarIcon: ({ color, size }) => (
            <BarChart2 color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="brief"
        options={{
          tabBarIcon: ({ color, size }) => (
            <FileText color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
