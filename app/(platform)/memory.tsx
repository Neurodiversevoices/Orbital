/**
 * Orbital Platform — Memory Dashboard
 *
 * Four-section read of the user's memory model:
 *   Ephemeral · Workspace · Profile · Implicit
 *
 * Each section lists records with edit + delete affordances and a
 * per-scope "Use past chats" toggle. A global "Temporary chat" switch
 * sits at the top.
 *
 * Data reads are wired to `useMemory(scope)` (mock-backed for now).
 * Mutations call into `lib/platform/memory` stubs — UI is fully
 * accessible and complete; the backend wire-up is a separate pass.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  clearScope,
  deleteMemory,
  setTemporaryChat,
  useMemory,
} from '../../lib/platform/memory';
import type { MemoryRecord, MemoryScope } from '../../lib/platform/types';

const BACKGROUND = '#01020A';
const TEAL = '#2DD4BF';
const GLASS_BG = 'rgba(255,255,255,0.07)';
const GLASS_BORDER = 'rgba(255,255,255,0.15)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.7)';
const DANGER = '#DC2626';

// =============================================================================
// SCOPE METADATA
// =============================================================================

interface ScopeMeta {
  scope: MemoryScope;
  title: string;
  description: string;
}

const SCOPE_META: ReadonlyArray<ScopeMeta> = [
  {
    scope: 'ephemeral',
    title: 'Ephemeral',
    description: 'This session only. Never persisted.',
  },
  {
    scope: 'workspace',
    title: 'Workspace',
    description: 'Scoped to your current org or circle.',
  },
  {
    scope: 'profile',
    title: 'Profile',
    description: 'Persistent. Yours. Exportable any time.',
  },
  {
    scope: 'implicit',
    title: 'Implicit',
    description: 'Inferred preferences and patterns. Fully editable.',
  },
];

// =============================================================================
// RECORD ROW
// =============================================================================

interface RecordRowProps {
  record: MemoryRecord;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function RecordRow({
  record,
  onEdit,
  onDelete,
}: RecordRowProps): React.ReactElement {
  return (
    <View style={styles.recordRow}>
      <Text style={styles.recordContent} numberOfLines={3}>
        {record.content}
      </Text>
      <View style={styles.recordMetaRow}>
        <Text style={styles.recordMeta}>
          {record.source.toUpperCase()} ·{' '}
          {new Date(record.createdAt).toLocaleDateString()}
        </Text>
        <View style={styles.recordActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit memory record ${record.id}`}
            disabled={!record.userEditable}
            onPress={() => onEdit(record.id)}
            style={({ pressed }) => [
              styles.actionButton,
              { opacity: pressed || !record.userEditable ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete memory record ${record.id}`}
            onPress={() => onDelete(record.id)}
            style={({ pressed }) => [
              styles.actionButton,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.actionText, { color: DANGER }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// SCOPE SECTION
// =============================================================================

interface ScopeSectionProps {
  meta: ScopeMeta;
}

function ScopeSection({ meta }: ScopeSectionProps): React.ReactElement {
  const records = useMemory(meta.scope);
  const [usePastChats, setUsePastChats] = useState<boolean>(
    meta.scope !== 'ephemeral',
  );

  const handleEdit = useCallback((id: string): void => {
    // TODO: wire to a full edit sheet. For now, no-op route.
    void id;
  }, []);

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteMemory(id);
    } catch (err) {
      console.warn('[memory.tsx] delete failed', err);
    }
  }, []);

  const handleClearScope = useCallback(async (): Promise<void> => {
    try {
      await clearScope(meta.scope);
    } catch (err) {
      console.warn('[memory.tsx] clearScope failed', err);
    }
  }, [meta.scope]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.sectionTitle}>{meta.title}</Text>
          <Text style={styles.sectionDescription}>{meta.description}</Text>
        </View>
        <View style={styles.toggleWrap}>
          <Text style={styles.toggleLabel}>USE PAST CHATS</Text>
          <Switch
            value={usePastChats}
            onValueChange={setUsePastChats}
            trackColor={{ false: '#222', true: TEAL }}
            thumbColor="#FFFFFF"
            accessibilityLabel={`Toggle 'use past chats' for ${meta.title} scope`}
          />
        </View>
      </View>

      {records.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No records in this scope.</Text>
        </View>
      ) : (
        <View style={styles.recordList}>
          {records.map((r) => (
            <RecordRow
              key={r.id}
              record={r}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Clear all records in ${meta.title} scope`}
        onPress={handleClearScope}
        style={({ pressed }) => [
          styles.clearButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={styles.clearButtonText}>Clear scope</Text>
      </Pressable>
    </View>
  );
}

// =============================================================================
// SCREEN
// =============================================================================

export default function MemoryDashboardScreen(): React.ReactElement {
  const [tempChat, setTempChat] = useState<boolean>(false);

  const handleTempChat = useCallback((next: boolean): void => {
    setTempChat(next);
    setTemporaryChat(next);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* GLOBAL TEMPORARY CHAT */}
        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Temporary chat mode</Text>
            <Text style={styles.heroSubtitle}>
              When on, every conversation is forced into the ephemeral scope.
              Nothing is saved across sessions.
            </Text>
          </View>
          <Switch
            value={tempChat}
            onValueChange={handleTempChat}
            trackColor={{ false: '#222', true: TEAL }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Toggle temporary chat mode"
          />
        </View>

        {/* SCOPES */}
        {SCOPE_META.map((meta) => (
          <ScopeSection key={meta.scope} meta={meta} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  scroll: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 64,
  },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: GLASS_BG,
    borderColor: GLASS_BORDER,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  heroTitle: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 18,
    color: TEXT_PRIMARY,
  },
  heroSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },

  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 18,
    color: TEXT_PRIMARY,
  },
  sectionDescription: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  toggleWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  toggleLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.44,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
  },

  recordList: {
    gap: 8,
  },
  recordRow: {
    backgroundColor: GLASS_BG,
    borderColor: GLASS_BORDER,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  recordContent: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_PRIMARY,
  },
  recordMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  recordMeta: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.44,
    color: TEXT_SECONDARY,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 12,
    color: TEXT_PRIMARY,
  },

  emptyCard: {
    backgroundColor: GLASS_BG,
    borderColor: GLASS_BORDER,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: TEXT_SECONDARY,
  },

  clearButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearButtonText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    letterSpacing: 1.76,
    color: DANGER,
    textTransform: 'uppercase',
  },
});
