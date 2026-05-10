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

const ACTION_ICONS: Record<AuditAction, React.ComponentType<{ color: string; size: number }>> = {
  share_created: Share2,
  share_expired: Clock,
  share_revoked: UserX,
  share_accessed: Eye,
  export_generated: FileOutput,
};

const ACTION_COLORS: Record<AuditAction, string> = {
  share_created: '#0E8C7B',
  share_expired: '#F59E0B',
  share_revoked: '#DC2626',
  share_accessed: '#0E8C7B',
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
    const [auditEntries, recipientList] = await Promise.all([
      getAuditLog(),
      getRecipients(),
    ]);
    setEntries(auditEntries);
    setRecipients(new Map(recipientList.map(r => [r.id, r])));
    setIsLoading(false);
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
    }
  }, [entries]);

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Shield color="#0E8C7B" size={24} />
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.5}>Audit Log</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={exportAuditLog} style={styles.exportButton}>
            <Download color={colors.textSecondary} size={20} />
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.textPrimary} size={24} />
          </Pressable>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle} maxFontSizeMultiplier={1.5}>Activity Record</Text>
        <Text style={styles.infoDesc} maxFontSizeMultiplier={1.5}>
          Immutable log of all sharing, export, and access events.
          This record supports compliance auditing and institutional review.
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText} maxFontSizeMultiplier={1.5}>Loading...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield color={colors.textTertiary} size={48} />
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.5}>No Activity Recorded</Text>
            <Text style={styles.emptyText} maxFontSizeMultiplier={1.5}>
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
                  <Text style={styles.entryAction} maxFontSizeMultiplier={1.5}>{getActionLabel(entry.action)}</Text>
                  {entry.recipientName && (
                    <Text style={styles.entryRecipient} maxFontSizeMultiplier={1.5}>{entry.recipientName}</Text>
                  )}
                  {entry.details && (
                    <Text style={styles.entryDetails} maxFontSizeMultiplier={1.5}>{entry.details}</Text>
                  )}
                  <Text style={styles.entryTime} maxFontSizeMultiplier={1.5}>{formatTimestamp(entry.timestamp)}</Text>
                </View>
                <View style={[styles.sequence, { backgroundColor: `${color}20` }]}>
                  <Text style={[styles.sequenceText, { color }]} maxFontSizeMultiplier={1.5}>#{entries.length - index}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText} maxFontSizeMultiplier={1.5}>
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
    color: colors.textPrimary,
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
    color: '#0E8C7B',
    marginBottom: spacing.xs,
  },
  infoDesc: {
    fontSize: 13,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
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
    color: colors.textPrimary,
  },
  entryRecipient: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  entryDetails: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  entryTime: {
    fontSize: 11,
    color: colors.textTertiary,
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
    color: colors.textTertiary,
  },
});
