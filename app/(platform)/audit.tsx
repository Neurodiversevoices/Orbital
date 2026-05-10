/**
 * Orbital Platform — Audit Log Viewer
 *
 * Reverse-chronological list of platform-level AuditEvent rows with simple
 * actor/action filters. Mock-backed for now; the wire-up will read from
 * Supabase audit_events (existing) plus the in-memory queue from trustCore.
 *
 * NOTE: this is intentionally separate from the existing /audit modal,
 * which lives at app/audit.tsx and serves a different audience (legacy
 * compliance dump). The platform-tier viewer here is curated for the
 * Trust Core dashboard.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchAuditEvents,
  getQueuedAuditEvents,
} from '../../lib/platform/trustCore';
import type { AuditEvent } from '../../lib/platform/types';
import { colors } from '../../theme/colors';

const TEAL = colors.primary;

// =============================================================================
// ROW
// =============================================================================

function AuditRow({ event }: { event: AuditEvent }): React.ReactElement {
  return (
    <View
      style={styles.row}
      accessibilityLabel={`Audit event: ${event.action} by ${event.actor} on ${event.target}`}
    >
      <View style={styles.rowHeader}>
        <Text style={styles.action} maxFontSizeMultiplier={1.5}>
          {event.action}
        </Text>
        <Text style={styles.timestamp} maxFontSizeMultiplier={1.5}>
          {new Date(event.timestamp).toLocaleString()}
        </Text>
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.actor} maxFontSizeMultiplier={1.5}>
          BY {event.actor.toUpperCase()}
        </Text>
        <Text
          style={styles.target}
          numberOfLines={1}
          maxFontSizeMultiplier={1.5}
        >
          → {event.target}
        </Text>
      </View>
      {event.metadata && Object.keys(event.metadata).length > 0 ? (
        <Text
          style={styles.metadata}
          numberOfLines={2}
          maxFontSizeMultiplier={1.5}
        >
          {JSON.stringify(event.metadata)}
        </Text>
      ) : null}
    </View>
  );
}

// =============================================================================
// SCREEN
// =============================================================================

export default function AuditLogScreen(): React.ReactElement {
  const [actorFilter, setActorFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const fetched = await fetchAuditEvents(200);
        // Merge any local-queue events that haven't flushed yet so the UI
        // stays current even when the network is slow.
        const queued = getQueuedAuditEvents();
        const seen = new Set(fetched.map((e) => e.id));
        const merged = [
          ...fetched,
          ...queued.filter((e) => !seen.has(e.id)),
        ];
        if (!cancelled) setEvents(merged);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo<ReadonlyArray<AuditEvent>>(() => {
    const normActor = actorFilter.trim().toLowerCase();
    const normAction = actionFilter.trim().toLowerCase();
    const out = events.filter((e) => {
      if (normActor && !e.actor.toLowerCase().includes(normActor)) return false;
      if (normAction && !e.action.toLowerCase().includes(normAction))
        return false;
      return true;
    });
    return [...out].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [actorFilter, actionFilter, events]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow} maxFontSizeMultiplier={1.5}>
          AUDIT LOG
        </Text>
        <Text style={styles.title} maxFontSizeMultiplier={1.5}>
          Every action, observable.
        </Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.5}>
          Reverse-chronological. Filter by actor or action below.
        </Text>

        {/* FILTERS */}
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel} maxFontSizeMultiplier={1.5}>
              ACTOR
            </Text>
            <TextInput
              value={actorFilter}
              onChangeText={setActorFilter}
              placeholder="user, system…"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              accessibilityLabel="Filter audit log by actor"
              autoCapitalize="none"
              autoCorrect={false}
              maxFontSizeMultiplier={1.5}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel} maxFontSizeMultiplier={1.5}>
              ACTION
            </Text>
            <TextInput
              value={actionFilter}
              onChangeText={setActionFilter}
              placeholder="capacity.logged…"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              accessibilityLabel="Filter audit log by action"
              autoCapitalize="none"
              autoCorrect={false}
              maxFontSizeMultiplier={1.5}
            />
          </View>
        </View>

        {(actorFilter || actionFilter) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear filters"
            onPress={() => {
              setActorFilter('');
              setActionFilter('');
            }}
            style={({ pressed }) => [
              styles.clearLink,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={styles.clearLinkText} maxFontSizeMultiplier={1.5}>
              Clear filters
            </Text>
          </Pressable>
        )}

        {loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText} maxFontSizeMultiplier={1.5}>
              Loading…
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText} maxFontSizeMultiplier={1.5}>
              No events match these filters.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((e) => (
              <AuditRow key={e.id} event={e} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 64,
  },
  eyebrow: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    letterSpacing: 1.76,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 26,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 24,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterField: { flex: 1 },
  filterLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.44,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    height: 44,
    backgroundColor: colors.backgroundSubtle,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  clearLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 12,
  },
  clearLinkText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    letterSpacing: 1.76,
    color: TEAL,
    textTransform: 'uppercase',
  },

  list: { gap: 12 },
  row: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    shadowColor: colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  action: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 14,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  timestamp: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: colors.textSecondary,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  actor: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.44,
    color: colors.textSecondary,
  },
  target: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  metadata: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 6,
  },

  emptyCard: {
    backgroundColor: colors.backgroundSubtle,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
});
