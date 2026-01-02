import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Alert,
  TextInput,
  ScrollView,
  Share,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  X,
  Plus,
  UserPlus,
  Clock,
  ChevronDown,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles, spacing } from '../theme';
import { useSharing } from '../lib/hooks/useSharing';
import { useLocale } from '../lib/hooks/useLocale';
import { ShareRecipientRow } from '../components/sharing/ShareRecipientRow';
import { ShareDurationPicker } from '../components/sharing/ShareDurationPicker';
import { RecipientRole, AuditAction } from '../types';
import { ShareDuration } from '../lib/sharing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type AddRecipientStep = 'closed' | 'name' | 'role' | 'duration';

const RECIPIENT_ROLES: RecipientRole[] = ['parent', 'clinician', 'employer', 'school', 'partner', 'other'];

export default function SharingScreen() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const {
    recipients,
    activeShares,
    auditLog,
    isLoading,
    addRecipient,
    deleteRecipient,
    createNewShare,
    revokeShare,
    getShareLink,
  } = useSharing();

  const [addStep, setAddStep] = useState<AddRecipientStep>('closed');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<RecipientRole>('clinician');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [shareDuration, setShareDuration] = useState<ShareDuration>(14);

  const handleAddRecipient = useCallback(async () => {
    if (!newName.trim()) return;

    const recipient = await addRecipient(newName.trim(), newRole);
    setSelectedRecipientId(recipient.id);
    setNewName('');
    setAddStep('duration');
  }, [newName, newRole, addRecipient]);

  const handleCreateShare = useCallback(async () => {
    if (!selectedRecipientId) return;

    const share = await createNewShare(selectedRecipientId, shareDuration);
    const link = getShareLink(share.accessToken);

    setAddStep('closed');
    setSelectedRecipientId(null);

    // Share the link
    await Share.share({
      message: link,
      title: t.sharing.shareCreated,
    });
  }, [selectedRecipientId, shareDuration, createNewShare, getShareLink, t]);

  const handleDeleteRecipient = useCallback((id: string, name: string) => {
    Alert.alert(
      t.sharing.deleteRecipientTitle,
      t.sharing.deleteRecipientMessage,
      [
        { text: t.sharing.cancel, style: 'cancel' },
        {
          text: t.sharing.delete,
          style: 'destructive',
          onPress: () => deleteRecipient(id),
        },
      ]
    );
  }, [deleteRecipient, t]);

  const handleShareRecipient = useCallback((id: string) => {
    setSelectedRecipientId(id);
    setAddStep('duration');
  }, []);

  const formatAuditDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const localeCode = locale === 'es' ? 'es-MX' : 'en-US';
    return date.toLocaleDateString(localeCode, { month: 'short', day: 'numeric' });
  }, [locale]);

  const getAuditActionText = useCallback((action: AuditAction, recipientName?: string) => {
    const actionText = t.sharing.auditActions[action];
    if (recipientName && action !== 'export_generated') {
      return `${actionText} ${recipientName}`;
    }
    return actionText;
  }, [t]);

  const durationLabels = {
    7: t.sharing.duration[7],
    14: t.sharing.duration[14],
    30: t.sharing.duration[30],
    90: t.sharing.duration[90],
  };

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View>
          <Text style={styles.headerTitle}>{t.sharing.title}</Text>
          <Text style={styles.headerSubtitle}>{t.sharing.subtitle}</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Add Recipient Flow */}
        {addStep === 'closed' && (
          <Pressable
            style={styles.addButton}
            onPress={() => setAddStep('name')}
          >
            <UserPlus size={20} color="#00E5FF" />
            <Text style={styles.addButtonText}>{t.sharing.addRecipient}</Text>
          </Pressable>
        )}

        {addStep === 'name' && (
          <View style={styles.addFlow}>
            <Text style={styles.addFlowLabel}>{t.sharing.addRecipient}</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.roleGrid}>
              {RECIPIENT_ROLES.map((role) => (
                <Pressable
                  key={role}
                  style={[
                    styles.roleButton,
                    newRole === role && styles.roleButtonSelected,
                  ]}
                  onPress={() => setNewRole(role)}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      newRole === role && styles.roleButtonTextSelected,
                    ]}
                  >
                    {t.sharing.recipientTypes[role]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.addFlowActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setAddStep('closed')}
              >
                <Text style={styles.cancelButtonText}>{t.sharing.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, !newName.trim() && styles.confirmButtonDisabled]}
                onPress={handleAddRecipient}
                disabled={!newName.trim()}
              >
                <Text style={styles.confirmButtonText}>{t.sharing.confirm}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {addStep === 'duration' && (
          <View style={styles.addFlow}>
            <Text style={styles.addFlowLabel}>{t.sharing.durationLabel}</Text>
            <ShareDurationPicker
              selected={shareDuration}
              onSelect={setShareDuration}
              labels={durationLabels}
            />
            <View style={styles.addFlowActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setAddStep('closed');
                  setSelectedRecipientId(null);
                }}
              >
                <Text style={styles.cancelButtonText}>{t.sharing.cancel}</Text>
              </Pressable>
              <Pressable
                style={styles.confirmButton}
                onPress={handleCreateShare}
              >
                <Text style={styles.confirmButtonText}>{t.sharing.createShare}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Recipients List */}
        {addStep === 'closed' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.sharing.recipientsSection}</Text>
            {recipients.length === 0 ? (
              <Text style={styles.emptyText}>{t.sharing.noRecipients}</Text>
            ) : (
              recipients.map((recipient) => {
                const hasActiveShare = activeShares.some(
                  (s) => s.recipientId === recipient.id
                );
                return (
                  <ShareRecipientRow
                    key={recipient.id}
                    recipient={recipient}
                    hasActiveShare={hasActiveShare}
                    roleLabel={t.sharing.recipientTypes[recipient.role]}
                    onShare={() => handleShareRecipient(recipient.id)}
                    onDelete={() => handleDeleteRecipient(recipient.id, recipient.name)}
                  />
                );
              })
            )}
          </View>
        )}

        {/* Audit Log */}
        {addStep === 'closed' && auditLog.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.sharing.auditSection}</Text>
            {auditLog.slice(0, 10).map((entry) => (
              <View key={entry.id} style={styles.auditRow}>
                <Clock size={14} color="rgba(255,255,255,0.3)" />
                <Text style={styles.auditText}>
                  {getAuditActionText(entry.action, entry.recipientName)}
                </Text>
                <Text style={styles.auditDate}>{formatAuditDate(entry.timestamp)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
    marginBottom: spacing.lg,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#00E5FF',
  },
  addFlow: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  addFlowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.md,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: spacing.md,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  roleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roleButtonSelected: {
    backgroundColor: 'rgba(0,229,255,0.15)',
    borderColor: '#00E5FF',
  },
  roleButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  roleButtonTextSelected: {
    color: '#00E5FF',
    fontWeight: '500',
  },
  addFlowActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
  confirmButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: '#00E5FF',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  auditText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  auditDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});
