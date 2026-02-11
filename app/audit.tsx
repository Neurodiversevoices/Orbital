/**
 * Audit Log Viewer
 *
 * Immutable record of all share/export/access actions.
 * Suitable for institutional compliance reviews.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Download, Shield, Eye, FileOutput, Share2, UserX, Clock } from 'lucide-react-native';
import { colors, commonStyles, spacing } from '../theme';
import { getAuditLog, getRecipients } from '../lib/storage';
import { AuditEntry, AuditAction, ShareRecipient } from '../types';
import { useLocale } from '../lib/hooks/useLocale';
import * as Sentry from '@sentry/react-native';

const ACTION_ICONS: Record<AuditAction, React.ComponentType<{ color: string; size: number }>> = {
  share_created: Share2,
  share_expired: Clock,
  share_revoked: UserX,
  share_accessed: Eye,
  export_generated: FileOutput,
};

const ACTION_COLORS: Record<AuditAction, string> = {
  share_created: '#00E5FF',
  share_expired: '#E8A830',
  share_revoked: '#F44336',
  share_accessed: '#4CAF50',
  export_generated: '#9C27B0',
};

export default function AuditScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [recipients, setRecipients] = useState<Map<string, ShareRecipient>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [auditEntries, recipientList] = await Promise.all([
        getAuditLog(),
        getRecipients(),
      ]);
      setEntries(auditEntries);
      setRecipients(new Map(recipientList.map(r => [r.id, r])));
    } catch (error) {
      Sentry.captureException(error, { tags: { screen: 'audit' } });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: AuditAction): string => {
    const labels: Record<AuditAction, string> = {
      share_created: 'Share created',
      share_expired: 'Share expired',
      share_revoked: 'Access revoked',
      share_accessed: 'Data accessed',
      export_generated: 'Export generated',
    };
    return labels[action];
  };

  const exportAuditLog = useCallback(async () => {
    if (entries.length === 0) {
      Alert.alert('No Data', 'No audit entries to export.');
      return;
    }

    const header = [
      '═══════════════════════════════════════════════════════════════════',
      '',
      '                    ORBITAL AUDIT LOG EXPORT',
      '',
      '═══════════════════════════════════════════════════════════════════',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Entries: ${entries.length}`,
      '',
      '───────────────────────────────────────────────────────────────────',
      '',
    ].join('\n');

    const body = entries.map(entry => {
      const lines = [
        `[${formatTimestamp(entry.timestamp)}]`,
        `  Action: ${getActionLabel(entry.action)}`,
      ];
      if (entry.recipientName) {
        lines.push(`  Recipient: ${entry.recipientName}`);
      }
      if (entry.details) {
        lines.push(`  Details: ${entry.details}`);
      }
      lines.push('');
      return lines.join('\n');
    }).join('\n');

    const footer = [
      '───────────────────────────────────────────────────────────────────',
      '',
      'This audit log is provided for compliance and review purposes.',
      'Non-diagnostic. Orbital capacity tracking system.',
      '',
      '═══════════════════════════════════════════════════════════════════',
    ].join('\n');

    const content = header + body + footer;

    try {
      await Share.share({
        message: content,
        title: 'Orbital Audit Log',
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [entries]);

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Shield color="#00E5FF" size={24} />
          <Text style={styles.headerTitle}>Audit Log</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={exportAuditLog} style={styles.exportButton}>
            <Download color="rgba(255,255,255,0.7)" size={20} />
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.textPrimary} size={24} />
          </Pressable>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Activity Record</Text>
        <Text style={styles.infoDesc}>
          Immutable log of all sharing, export, and access events.
          This record supports compliance auditing and institutional review.
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield color="rgba(255,255,255,0.2)" size={48} />
            <Text style={styles.emptyTitle}>No Activity Recorded</Text>
            <Text style={styles.emptyText}>
              Share and export actions will appear here.
            </Text>
          </View>
        ) : (
          entries.map((entry, index) => {
            const Icon = ACTION_ICONS[entry.action];
            const color = ACTION_COLORS[entry.action];

            return (
              <View key={entry.id} style={styles.entryRow}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                  <Icon color={color} size={18} />
                </View>
                <View style={styles.entryContent}>
                  <Text style={styles.entryAction}>{getActionLabel(entry.action)}</Text>
                  {entry.recipientName && (
                    <Text style={styles.entryRecipient}>{entry.recipientName}</Text>
                  )}
                  {entry.details && (
                    <Text style={styles.entryDetails}>{entry.details}</Text>
                  )}
                  <Text style={styles.entryTime}>{formatTimestamp(entry.timestamp)}</Text>
                </View>
                <View style={[styles.sequence, { backgroundColor: `${color}20` }]}>
                  <Text style={[styles.sequenceText, { color }]}>#{entries.length - index}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {entries.length} entries recorded
          </Text>
        </View>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exportButton: {
    padding: spacing.sm,
  },
  closeButton: {
    padding: spacing.sm,
  },
  infoCard: {
    marginHorizontal: spacing.md,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00E5FF',
    marginBottom: spacing.xs,
  },
  infoDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  entryContent: {
    flex: 1,
  },
  entryAction: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  entryRecipient: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  entryDetails: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  entryTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: spacing.xs,
  },
  sequence: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: spacing.sm,
  },
  sequenceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
});
