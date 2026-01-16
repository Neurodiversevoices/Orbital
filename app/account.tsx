/**
 * Account Settings Screen
 *
 * Display name, avatar, and session management.
 * User identity is stored locally (privacy-first).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  User,
  Camera,
  Shield,
  ChevronRight,
  Smartphone,
  Clock,
  Check,
  Pencil,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import { useIdentity, getInitials, getAvatarColor } from '../lib/profile';
import { useAuth } from '../lib/supabase';
import { AvatarPicker } from '../components/AvatarPicker';
import { type AvatarOption } from '../lib/avatars';

export default function AccountScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { identity, isLoading, updateName, updateAvatar, refresh } = useIdentity(auth.user?.email);

  // Local form state
  const [nameInput, setNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);

  // Initialize from identity
  useEffect(() => {
    if (!isLoading) {
      setNameInput(identity.displayName || '');
    }
  }, [isLoading, identity.displayName]);

  // Derived display values
  const email = auth.user?.email ?? null;
  const initials = getInitials(identity.displayName, email);
  const avatarColor = getAvatarColor(identity.displayName || email);

  // Handle save
  const handleSave = async () => {
    const trimmed = nameInput.trim();
    if (trimmed === (identity.displayName || '')) return;

    setIsSaving(true);
    try {
      await updateName(trimmed || null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch {
      Alert.alert('Error', 'Failed to save display name');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Account</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.avatarSection}>
          <Pressable
            style={styles.avatarPressable}
            onPress={() => setShowAvatarPicker(true)}
          >
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              {identity.avatarUrl ? (
                <Image source={{ uri: identity.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
            <View style={styles.editBadge}>
              <Pencil size={12} color="#000" />
            </View>
          </Pressable>
          <Pressable onPress={() => setShowAvatarPicker(true)}>
            <Text style={styles.avatarHint}>
              Tap to change avatar
            </Text>
          </Pressable>
        </Animated.View>

        {/* Display Name Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={18} color="rgba(255,255,255,0.6)" />
            <Text style={styles.sectionTitle}>Display Name</Text>
            <Text style={styles.optionalBadge}>Optional</Text>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              onBlur={handleSave}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              maxLength={50}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {showSuccess && (
              <View style={styles.successBadge}>
                <Check size={14} color="#4CAF50" />
              </View>
            )}
          </View>

          <Text style={styles.helperText}>
            This name is stored locally on your device only.
            It's never synced to the cloud or shared with others.
          </Text>
        </Animated.View>

        {/* Email Section (read-only) */}
        {auth.user?.email && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={18} color="rgba(255,255,255,0.6)" />
              <Text style={styles.sectionTitle}>Email</Text>
            </View>

            <View style={styles.emailRow}>
              <Text style={styles.emailText}>{auth.user.email}</Text>
              <View style={styles.verifiedBadge}>
                <Check size={12} color="#4CAF50" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>

            <Text style={styles.helperText}>
              Used for account recovery and cloud sync.
            </Text>
          </Animated.View>
        )}

        {/* Session Management */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
          <Text style={styles.sectionLabel}>SESSION MANAGEMENT</Text>

          <Pressable
            style={styles.row}
            onPress={() => router.push('/active-sessions')}
          >
            <View style={styles.iconContainer}>
              <Smartphone size={20} color="rgba(255,255,255,0.6)" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Active Sessions</Text>
              <Text style={styles.rowSublabel}>View and manage device sessions</Text>
            </View>
            <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
          </Pressable>
        </Animated.View>

        {/* Privacy Info */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.infoCard}>
          <Shield size={20} color="#4CAF50" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Privacy-First Identity</Text>
            <Text style={styles.infoText}>
              Your display name and avatar are stored locally on this device.
              They never leave your device or sync to any server.
            </Text>
          </View>
        </Animated.View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal
        visible={showAvatarPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowAvatarPicker(false)} style={styles.modalClose}>
              <X size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.modalTitle}>Choose Avatar</Text>
            <Pressable
              onPress={async () => {
                if (selectedAvatarId) {
                  const avatar = require('../lib/avatars').getAvatarById(selectedAvatarId);
                  if (avatar) {
                    await updateAvatar(avatar.url, 'preset');
                  }
                }
                setShowAvatarPicker(false);
              }}
              style={styles.modalSave}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            <AvatarPicker
              selectedId={selectedAvatarId}
              onSelect={(avatar: AvatarOption) => setSelectedAvatarId(avatar.id)}
              maxHeight={500}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '600',
    color: '#fff',
  },
  avatarHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  avatarPressable: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalClose: {
    padding: spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalSave: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  optionalBadge: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  successBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(76,175,80,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    height: 48,
  },
  emailText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76,175,80,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4CAF50',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  rowSublabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
    padding: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.5)',
  },
});
