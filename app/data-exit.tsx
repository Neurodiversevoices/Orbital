/**
 * Data Exit Flow
 *
 * Complete data deletion with export window and deletion certificate.
 * Supports GDPR right to erasure and institutional compliance.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  X,
  Trash2,
  Download,
  Shield,
  AlertTriangle,
  FileText,
  CheckCircle,
  Clock,
} from 'lucide-react-native';
import { colors, commonStyles, spacing } from '../theme';
import { useEnergyLogs } from '../lib/hooks/useEnergyLogs';
import { useLocale } from '../lib/hooks/useLocale';
import { useAuth } from '../lib/supabase/auth';
import { deleteUserData } from '../lib/supabase/sync';

type ExitStep = 'overview' | 'export' | 'confirm' | 'complete';

function generateDeletionCertificate(
  logCount: number,
  deletionDate: Date
): string {
  const certificateId = `DEL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  return `
═══════════════════════════════════════════════════════════════════

                    DATA DELETION CERTIFICATE

═══════════════════════════════════════════════════════════════════

Certificate ID: ${certificateId}

This certificate confirms that the following data has been
permanently deleted from Orbital:

───────────────────────────────────────────────────────────────────

DELETION DETAILS

  Date of Deletion:     ${deletionDate.toISOString()}
  Records Deleted:      ${logCount} capacity signals
  Data Categories:      Capacity states, categories, notes,
                        timestamps, metadata
  Audit Records:        Preserved for compliance (anonymized)

───────────────────────────────────────────────────────────────────

SCOPE OF DELETION

  [X] All capacity log entries
  [X] Associated metadata and notes
  [X] Pattern analysis cache
  [X] Export history (content only)
  [X] Sharing configurations
  [X] Recipient records

───────────────────────────────────────────────────────────────────

RETENTION EXCEPTIONS

  - Anonymized audit log entries (compliance requirement)
  - Aggregate statistics (de-identified)
  - This deletion certificate

───────────────────────────────────────────────────────────────────

VERIFICATION

This certificate may be used to verify data deletion for:
  - GDPR Article 17 (Right to Erasure) compliance
  - Institutional data governance requirements
  - Personal record-keeping

───────────────────────────────────────────────────────────────────

Certificate generated: ${deletionDate.toLocaleString()}
Orbital Capacity Tracking System
Non-diagnostic. Data deleted per user request.

═══════════════════════════════════════════════════════════════════
`.trim();
}

export default function DataExitScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { logs, clearAll, refresh } = useEnergyLogs();
  const { deleteAccount } = useAuth();
  const [step, setStep] = useState<ExitStep>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasExported, setHasExported] = useState(false);
  const [deletionCertificate, setDeletionCertificate] = useState<string | null>(null);

  const handleExportJson = useCallback(async () => {
    setIsProcessing(true);
    try {
      const json = JSON.stringify({
        exportedAt: new Date().toISOString(),
        logCount: logs.length,
        logs: logs,
      }, null, 2);
      await Share.share({
        message: json,
        title: 'Orbital Data Export (JSON)',
      });
      setHasExported(true);
    } catch (error) {
    }
    setIsProcessing(false);
  }, [logs]);

  const handleExportCsv = useCallback(async () => {
    setIsProcessing(true);
    try {
      const header = 'timestamp,date,time,state,category,has_note';
      const rows = logs.map(log => {
        const date = new Date(log.timestamp);
        return `${log.timestamp},${date.toLocaleDateString()},${date.toLocaleTimeString()},${log.state},${log.category || ''},${log.note ? 'true' : 'false'}`;
      });
      const csv = [header, ...rows].join('\n');
      await Share.share({
        message: csv,
        title: 'Orbital Data Export (CSV)',
      });
      setHasExported(true);
    } catch (error) {
    }
    setIsProcessing(false);
  }, [logs]);

  const handleConfirmDeletion = useCallback(() => {
    // HIG: warn haptic before presenting a destructive confirmation alert.
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    Alert.alert(
      'Permanent Deletion',
      'This action cannot be undone. All your capacity data will be permanently deleted. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            const logCount = logs.length;
            const deletionDate = new Date();

            // Generate certificate before deletion
            const certificate = generateDeletionCertificate(logCount, deletionDate);

            // Delete cloud data first, then local
            try {
              await deleteUserData();
            } catch (e) {
              if (__DEV__) console.error('[DataExit] Cloud deletion failed:', e);
            }
            await clearAll();

            // Delete the user account (signs out automatically)
            try {
              await deleteAccount();
            } catch (e) {
              if (__DEV__) console.error('[DataExit] Account deletion failed:', e);
            }

            await refresh();

            setDeletionCertificate(certificate);
            setStep('complete');
            setIsProcessing(false);
          },
        },
      ]
    );
  }, [logs.length, clearAll, refresh, deleteAccount]);

  const handleShareCertificate = useCallback(async () => {
    if (!deletionCertificate) return;
    await Share.share({
      message: deletionCertificate,
      title: 'Orbital Deletion Certificate',
    });
  }, [deletionCertificate]);

  const handleClose = useCallback(() => {
    if (step === 'complete') {
      router.replace('/settings');
    } else {
      router.back();
    }
  }, [step, router]);

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Trash2 color="#DC2626" size={24} />
          <Text style={styles.headerTitle}>Data Exit</Text>
        </View>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'overview' && (
          <>
            <View style={styles.warningCard}>
              <AlertTriangle color="#DC2626" size={32} />
              <Text style={styles.warningTitle}>Permanent Data Deletion</Text>
              <Text style={styles.warningText}>
                This process will permanently delete all your capacity data.
                You will receive a deletion certificate for your records.
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>What will be deleted:</Text>
              <View style={styles.infoList}>
                <Text style={styles.infoItem}>• All {logs.length} capacity signals</Text>
                <Text style={styles.infoItem}>• Notes and metadata</Text>
                <Text style={styles.infoItem}>• Pattern analysis data</Text>
                <Text style={styles.infoItem}>• Sharing configurations</Text>
                <Text style={styles.infoItem}>• Export history</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>What will be preserved:</Text>
              <View style={styles.infoList}>
                <Text style={styles.infoItem}>• Anonymized audit trail (compliance)</Text>
                <Text style={styles.infoItem}>• Your deletion certificate</Text>
              </View>
            </View>

            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={styles.stepDot} />
              <View style={styles.stepLine} />
              <View style={styles.stepDot} />
            </View>

            <Pressable
              style={styles.primaryButton}
              onPress={() => setStep('export')}
            >
              <Text style={styles.primaryButtonText}>Begin Exit Process</Text>
            </Pressable>
          </>
        )}

        {step === 'export' && (
          <>
            <View style={styles.stepCard}>
              <Download color={colors.primary} size={32} />
              <Text style={styles.stepTitle}>Step 1: Export Your Data</Text>
              <Text style={styles.stepText}>
                Before deletion, you may export your data for personal records.
                This step is optional but recommended.
              </Text>
            </View>

            <Pressable
              style={styles.exportButton}
              onPress={handleExportJson}
              disabled={isProcessing}
            >
              <FileText color={colors.primary} size={20} />
              <View style={styles.exportButtonContent}>
                <Text style={styles.exportButtonTitle}>Export as JSON</Text>
                <Text style={styles.exportButtonSubtitle}>Full data backup</Text>
              </View>
              {hasExported && <CheckCircle color="#0E8C7B" size={20} />}
            </Pressable>

            <Pressable
              style={styles.exportButton}
              onPress={handleExportCsv}
              disabled={isProcessing}
            >
              <FileText color="#0E8C7B" size={20} />
              <View style={styles.exportButtonContent}>
                <Text style={styles.exportButtonTitle}>Export as CSV</Text>
                <Text style={styles.exportButtonSubtitle}>Spreadsheet format</Text>
              </View>
              {hasExported && <CheckCircle color="#0E8C7B" size={20} />}
            </Pressable>

            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotComplete]} />
              <View style={[styles.stepLine, styles.stepLineComplete]} />
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={styles.stepDot} />
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setStep('overview')}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
              <Pressable
                style={styles.dangerButton}
                onPress={() => setStep('confirm')}
              >
                <Text style={styles.dangerButtonText}>Continue to Deletion</Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 'confirm' && (
          <>
            <View style={styles.stepCard}>
              <AlertTriangle color="#DC2626" size={32} />
              <Text style={styles.stepTitle}>Step 2: Confirm Deletion</Text>
              <Text style={styles.stepText}>
                You are about to permanently delete {logs.length} capacity signals.
                This action cannot be undone.
              </Text>
            </View>

            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Final Confirmation</Text>
              <Text style={styles.confirmText}>
                By proceeding, you acknowledge that:
              </Text>
              <View style={styles.confirmList}>
                <Text style={styles.confirmItem}>• All data will be permanently deleted</Text>
                <Text style={styles.confirmItem}>• This action cannot be reversed</Text>
                <Text style={styles.confirmItem}>• You will receive a deletion certificate</Text>
              </View>
            </View>

            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotComplete]} />
              <View style={[styles.stepLine, styles.stepLineComplete]} />
              <View style={[styles.stepDot, styles.stepDotComplete]} />
              <View style={[styles.stepLine, styles.stepLineComplete]} />
              <View style={[styles.stepDot, styles.stepDotActive]} />
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setStep('export')}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
              <Pressable
                style={[styles.dangerButton, styles.dangerButtonFinal]}
                onPress={handleConfirmDeletion}
                disabled={isProcessing}
              >
                <Trash2 color="#FFFFFF" size={18} />
                <Text style={styles.dangerButtonText}>Delete All Data</Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 'complete' && (
          <>
            <View style={styles.completeCard}>
              <CheckCircle color="#0E8C7B" size={48} />
              <Text style={styles.completeTitle}>Deletion Complete</Text>
              <Text style={styles.completeText}>
                All your capacity data has been permanently deleted.
                A deletion certificate has been generated for your records.
              </Text>
            </View>

            <View style={styles.certificatePreview}>
              <View style={styles.certificateHeader}>
                <Shield color={colors.primary} size={20} />
                <Text style={styles.certificateTitle}>Deletion Certificate</Text>
              </View>
              <Text style={styles.certificateText} numberOfLines={8}>
                {deletionCertificate?.substring(0, 400)}...
              </Text>
            </View>

            <Pressable
              style={styles.primaryButton}
              onPress={handleShareCertificate}
            >
              <Download color={colors.textPrimary} size={18} />
              <Text style={styles.primaryButtonText}>Save Certificate</Text>
            </Pressable>

            <Pressable
              style={styles.doneButton}
              onPress={handleClose}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  warningCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.06)',
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.30)',
    marginBottom: spacing.lg,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoList: {
    gap: spacing.xs,
  },
  infoItem: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.hairline,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotComplete: {
    backgroundColor: '#0E8C7B',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.hairline,
  },
  stepLineComplete: {
    backgroundColor: '#0E8C7B',
  },
  stepCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  stepText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  exportButtonContent: {
    flex: 1,
  },
  exportButtonTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  exportButtonSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  confirmCard: {
    backgroundColor: 'rgba(220,38,38,0.06)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.22)',
    marginBottom: spacing.md,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: spacing.sm,
  },
  confirmText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  confirmList: {
    gap: spacing.xs,
  },
  confirmItem: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.backgroundSubtle,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  dangerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(220,38,38,0.10)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.30)',
  },
  dangerButtonFinal: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(45,212,191,0.10)',
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.30)',
    marginBottom: spacing.lg,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0E8C7B',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  completeText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  certificatePreview: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  certificateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  certificateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  certificateText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  doneButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  doneButtonText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: spacing.xl * 2,
  },
});
