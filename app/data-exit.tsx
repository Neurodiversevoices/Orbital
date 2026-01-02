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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
      console.error('Export failed:', error);
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
      console.error('Export failed:', error);
    }
    setIsProcessing(false);
  }, [logs]);

  const handleConfirmDeletion = useCallback(() => {
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

            // Perform deletion
            await clearAll();
            await refresh();

            setDeletionCertificate(certificate);
            setStep('complete');
            setIsProcessing(false);
          },
        },
      ]
    );
  }, [logs.length, clearAll, refresh]);

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
          <Trash2 color="#F44336" size={24} />
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
              <AlertTriangle color="#F44336" size={32} />
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
              <Download color="#00E5FF" size={32} />
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
              <FileText color="#00E5FF" size={20} />
              <View style={styles.exportButtonContent}>
                <Text style={styles.exportButtonTitle}>Export as JSON</Text>
                <Text style={styles.exportButtonSubtitle}>Full data backup</Text>
              </View>
              {hasExported && <CheckCircle color="#4CAF50" size={20} />}
            </Pressable>

            <Pressable
              style={styles.exportButton}
              onPress={handleExportCsv}
              disabled={isProcessing}
            >
              <FileText color="#4CAF50" size={20} />
              <View style={styles.exportButtonContent}>
                <Text style={styles.exportButtonTitle}>Export as CSV</Text>
                <Text style={styles.exportButtonSubtitle}>Spreadsheet format</Text>
              </View>
              {hasExported && <CheckCircle color="#4CAF50" size={20} />}
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
              <AlertTriangle color="#F44336" size={32} />
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
                <Trash2 color="#FFF" size={18} />
                <Text style={styles.dangerButtonText}>Delete All Data</Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 'complete' && (
          <>
            <View style={styles.completeCard}>
              <CheckCircle color="#4CAF50" size={48} />
              <Text style={styles.completeTitle}>Deletion Complete</Text>
              <Text style={styles.completeText}>
                All your capacity data has been permanently deleted.
                A deletion certificate has been generated for your records.
              </Text>
            </View>

            <View style={styles.certificatePreview}>
              <View style={styles.certificateHeader}>
                <Shield color="#00E5FF" size={20} />
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
              <Download color="#000" size={18} />
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
    color: 'rgba(255,255,255,0.9)',
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
    backgroundColor: 'rgba(244,67,54,0.1)',
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.3)',
    marginBottom: spacing.lg,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
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
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.sm,
  },
  infoList: {
    gap: spacing.xs,
  },
  infoItem: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepDotActive: {
    backgroundColor: '#00E5FF',
  },
  stepDotComplete: {
    backgroundColor: '#4CAF50',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepLineComplete: {
    backgroundColor: '#4CAF50',
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
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  stepText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
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
    color: 'rgba(255,255,255,0.9)',
  },
  exportButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  confirmCard: {
    backgroundColor: 'rgba(244,67,54,0.08)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.2)',
    marginBottom: spacing.md,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: spacing.sm,
  },
  confirmText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.sm,
  },
  confirmList: {
    gap: spacing.xs,
  },
  confirmItem: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
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
    backgroundColor: '#00E5FF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: spacing.md,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  dangerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(244,67,54,0.2)',
    borderRadius: 12,
    padding: spacing.md,
  },
  dangerButtonFinal: {
    backgroundColor: '#F44336',
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  completeCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    marginBottom: spacing.lg,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  completeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
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
    color: '#00E5FF',
  },
  certificateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  doneButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  doneButtonText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
  bottomSpacer: {
    height: spacing.xl * 2,
  },
});
