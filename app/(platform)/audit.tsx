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

const BACKGROUND = '#01020A';
const GLASS_BG = 'rgba(255,255,255,0.07)';
const GLASS_BORDER = 'rgba(255,255,255,0.15)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.7)';
const TEAL = '#2DD4BF';

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
        <Text style={styles.action}>{event.action}</Text>
        <Text style={styles.timestamp}>
          {new Date(event.timestamp).toLocaleString()}
        </Text>
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.actor}>BY {event.actor.toUpperCase()}</Text>
        <Text style={styles.target} numberOfLines={1}>
          → {event.target}
        </Text>
      </View>
      {event.metadata && Object.keys(event.metadata).length > 0 ? (
        <Text style={styles.metadata} numberOfLines={2}>
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
        <Text style={styles.eyebrow}>AUDIT LOG</Text>
        <Text style={styles.title}>Every action, observable.</Text>
        <Text style={styles.subtitle}>
          Reverse-chronological. Filter by actor or action below.
        </Text>

        {/* FILTERS */}
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>ACTOR</Text>
            <TextInput
              value={actorFilter}
              onChangeText={setActorFilter}
              placeholder="user, system…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
              accessibilityLabel="Filter audit log by actor"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>ACTION</Text>
            <TextInput
              value={actionFilter}
              onChangeText={setActionFilter}
              placeholder="capacity.logged…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
              accessibilityLabel="Filter audit log by action"
              autoCapitalize="none"
              autoCorrect={false}
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
            <Text style={styles.clearLinkText}>Clear filters</Text>
          </Pressable>
        )}

        {loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Loading…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No events match these filters.</Text>
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
  safe: { flex: 1, backgroundColor: BACKGROUND },
  scroll: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 64,
  },
  eyebrow: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    letterSpacing: 1.76,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 26,
    color: TEXT_PRIMARY,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_SECONDARY,
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
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    height: 44,
    backgroundColor: GLASS_BG,
    borderColor: GLASS_BORDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: TEXT_PRIMARY,
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
    backgroundColor: GLASS_BG,
    borderColor: GLASS_BORDER,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
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
    color: TEXT_PRIMARY,
    flexShrink: 1,
  },
  timestamp: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: TEXT_SECONDARY,
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
    color: TEXT_SECONDARY,
  },
  target: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    color: TEXT_SECONDARY,
    flexShrink: 1,
  },
  metadata: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 6,
  },

  emptyCard: {
    backgroundColor: GLASS_BG,
    borderColor: GLASS_BORDER,
    borderWidth: 1,
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
});
