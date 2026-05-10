/**
 * Profile Tab — user identity, navigation hub for account/settings/etc.
 *
 * Skeleton: avatar + email header, linkable rows, sign-out at bottom.
 * Light theme per CLAUDE.md May 2026 spec.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  User as UserIcon,
  Settings as SettingsIcon,
  CreditCard,
  Heart,
  Users,
  Shield,
  HelpCircle,
  LogOut,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../lib/supabase';

// =============================================================================
// LIGHT THEME TOKENS
// =============================================================================
const LIGHT = {
  background: '#FFFFFF',
  textPrimary: '#0F1624',
  textSecondary: 'rgba(15, 22, 36, 0.62)',
  textTertiary: 'rgba(15, 22, 36, 0.38)',
  hairline: 'rgba(15, 22, 36, 0.10)',
  cardShadow: 'rgba(15, 22, 36, 0.06)',
  accent: '#2DD4BF',
  crimson: '#DC2626',
};

// CLAUDE.md prefers JetBrains Mono; only Space Mono is loaded in the app.
const MONO_FONT = 'SpaceMono_400Regular';
const SANS_FONT = 'DMSans_700Bold';

const SUPPORT_URL = 'https://orbitalhealth.app/support';

// =============================================================================
// SETTINGS ROW
// =============================================================================
interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  accessibilityHint?: string;
}

function SettingsRow({
  icon: Icon,
  label,
  onPress,
  destructive,
  accessibilityHint,
}: SettingsRowProps) {
  const tint = destructive ? LIGHT.crimson : LIGHT.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: 'rgba(15,22,36,0.04)' },
      ]}
    >
      <View style={styles.rowIcon}>
        <Icon color={tint} size={20} />
      </View>
      <Text
        style={[styles.rowLabel, destructive && { color: LIGHT.crimson }]}
        maxFontSizeMultiplier={1.5}
      >
        {label}
      </Text>
      {!destructive && <ChevronRight color={LIGHT.textTertiary} size={18} />}
    </Pressable>
  );
}

// =============================================================================
// MAIN
// =============================================================================
export default function ProfileScreen() {
  const router = useRouter();
  const auth = useAuth();
  const user = auth.user;

  const email = user?.email ?? 'Anonymous';
  const memberSinceLabel = useMemo(() => {
    const created = user?.created_at;
    if (!created) return 'Member since —';
    try {
      return `Member since ${new Date(created).toLocaleDateString([], {
        month: 'short',
        year: 'numeric',
      })}`;
    } catch {
      return 'Member since —';
    }
  }, [user?.created_at]);

  const initials = useMemo(() => {
    if (!email || email === 'Anonymous') return '?';
    const part = email.split('@')[0] || '?';
    return part.slice(0, 2).toUpperCase();
  }, [email]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth.signOut();
          } catch {
            // ignore — sign-out errors are surfaced by auth state listeners
          }
        },
      },
    ]);
  }, [auth]);

  const openSupport = useCallback(() => {
    Linking.openURL(SUPPORT_URL).catch(() => {
      Alert.alert('Could not open support page', SUPPORT_URL);
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — avatar + email + member since */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <View
            style={styles.avatar}
            accessibilityRole="image"
            accessibilityLabel={`Avatar for ${email}`}
          >
            <Text style={styles.avatarText} maxFontSizeMultiplier={1.5}>
              {initials}
            </Text>
          </View>
          <Text
            style={styles.email}
            maxFontSizeMultiplier={1.5}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {email}
          </Text>
          <Text style={styles.memberSince} maxFontSizeMultiplier={1.5}>
            {memberSinceLabel}
          </Text>
        </Animated.View>

        {/* Linkable rows */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow} maxFontSizeMultiplier={1.5}>
            ACCOUNT
          </Text>
          <View style={styles.card}>
            <SettingsRow
              icon={UserIcon}
              label="Account"
              onPress={() => router.push('/account')}
              accessibilityHint="Manage account details"
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={SettingsIcon}
              label="Settings"
              onPress={() => router.push('/settings')}
              accessibilityHint="App settings"
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={CreditCard}
              label="Subscription"
              onPress={() => router.push('/upgrade')}
              accessibilityHint="Manage subscription"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow} maxFontSizeMultiplier={1.5}>
            DATA & CONNECTIONS
          </Text>
          <View style={styles.card}>
            <SettingsRow
              icon={Heart}
              label="Apple Health"
              onPress={() => router.push('/health')}
              accessibilityHint="Connect Apple Health"
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={Users}
              label="Circles"
              onPress={() => router.push('/circles')}
              accessibilityHint="Manage circles"
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={Shield}
              label="Privacy"
              onPress={() => router.push('/your-data')}
              accessibilityHint="Manage your data"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow} maxFontSizeMultiplier={1.5}>
            SUPPORT
          </Text>
          <View style={styles.card}>
            <SettingsRow
              icon={HelpCircle}
              label="Help & support"
              onPress={openSupport}
              accessibilityHint="Open support page in browser"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <SettingsRow
              icon={LogOut}
              label="Sign out"
              onPress={handleSignOut}
              destructive
              accessibilityHint="Sign out of your account"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LIGHT.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 48,
  },

  header: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(45,212,191,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontFamily: SANS_FONT,
    fontSize: 32,
    fontWeight: '700',
    color: LIGHT.accent,
  },
  email: {
    fontFamily: SANS_FONT,
    fontSize: 18,
    fontWeight: '700',
    color: LIGHT.textPrimary,
    marginBottom: 4,
  },
  memberSince: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: LIGHT.textSecondary,
  },

  section: { marginBottom: 20 },
  sectionEyebrow: {
    fontFamily: MONO_FONT,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: LIGHT.textSecondary,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LIGHT.hairline,
    overflow: 'hidden',
    shadowColor: LIGHT.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
  },
  rowIcon: {
    width: 28,
    alignItems: 'center',
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: LIGHT.textPrimary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: LIGHT.hairline,
    marginLeft: 56,
  },
});
