/**
 * Orbital Platform — Permissions Ledger
 *
 * Lists every active PermissionGrant. Each row shows tool · scope · expiry
 * with a destructive "Revoke" affordance. All grants are revocable by
 * design (TrustPosture contract).
 *
 * Backed by mock data until the `permission_grants` table lands.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { revokeGrant } from '../../lib/platform/trustCore';
import type { PermissionGrant } from '../../lib/platform/types';

const BACKGROUND = '#01020A';
const GLASS_BG = 'rgba(255,255,255,0.07)';
const GLASS_BORDER = 'rgba(255,255,255,0.15)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.7)';
const DANGER = '#DC2626';

// =============================================================================
// MOCK DATA
// =============================================================================

const NOW_ISO = new Date().toISOString();
const IN_30_DAYS = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const IN_7_DAYS = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const MOCK_GRANTS: ReadonlyArray<PermissionGrant> = [
  {
    id: 'grant_1',
    tool: 'gmail',
    scope: 'read:capacity-signals',
    expiresAt: IN_30_DAYS,
    grantedAt: NOW_ISO,
    revocable: true,
  },
  {
    id: 'grant_2',
    tool: 'calendar',
    scope: 'read:availability',
    expiresAt: IN_7_DAYS,
    grantedAt: NOW_ISO,
    revocable: true,
  },
  {
    id: 'grant_3',
    tool: 'supabase',
    scope: 'write:audit-events',
    expiresAt: null,
    grantedAt: NOW_ISO,
    revocable: true,
  },
];

// =============================================================================
// HELPERS
// =============================================================================

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry';
  const d = new Date(expiresAt);
  return `Expires ${d.toLocaleDateString()}`;
}

// =============================================================================
// ROW
// =============================================================================

interface RowProps {
  grant: PermissionGrant;
  onRevoke: (id: string) => void;
}

function GrantRow({ grant, onRevoke }: RowProps): React.ReactElement {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.tool}>{grant.tool.toUpperCase()}</Text>
        <Text style={styles.scope}>{grant.scope}</Text>
        <Text style={styles.expiry}>{formatExpiry(grant.expiresAt)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Revoke permission grant for ${grant.tool} ${grant.scope}`}
        onPress={() => onRevoke(grant.id)}
        style={({ pressed }) => [
          styles.revokeButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={styles.revokeText}>Revoke</Text>
      </Pressable>
    </View>
  );
}

// =============================================================================
// SCREEN
// =============================================================================

export default function PermissionsScreen(): React.ReactElement {
  const [grants, setGrants] = useState<PermissionGrant[]>([...MOCK_GRANTS]);

  const handleRevoke = useCallback(async (id: string): Promise<void> => {
    try {
      await revokeGrant(id);
      setGrants((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.warn('[permissions.tsx] revoke failed', err);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>PERMISSIONS LEDGER</Text>
        <Text style={styles.title}>Every grant. Always revocable.</Text>
        <Text style={styles.subtitle}>
          Tools you have authorized to act on your data. Revocation is
          immediate and audit-logged.
        </Text>

        {grants.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active permission grants.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {grants.map((g) => (
              <GrantRow key={g.id} grant={g} onRevoke={handleRevoke} />
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
  list: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: GLASS_BG,
    borderColor: GLASS_BORDER,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
  },
  rowMain: { flex: 1 },
  tool: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    letterSpacing: 1.76,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
  },
  scope: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 15,
    color: TEXT_PRIMARY,
    marginTop: 4,
  },
  expiry: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  revokeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DANGER,
  },
  revokeText: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 13,
    color: DANGER,
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
