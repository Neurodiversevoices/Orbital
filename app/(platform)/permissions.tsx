/**
 * Orbital Platform — Permissions Ledger
 *
 * Lists every active PermissionGrant. Each row shows tool · scope · expiry
 * with a destructive "Revoke" affordance. All grants are revocable by
 * design (TrustPosture contract).
 *
 * Reads from the `permission_grants` table (migration 00017) via the
 * `fetchActiveGrants` helper in lib/platform/trustCore.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchActiveGrants, revokeGrant } from '../../lib/platform/trustCore';
import type { PermissionGrant } from '../../lib/platform/types';
import { colors } from '../../theme/colors';

const DANGER = '#DC2626';

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
        <Text style={styles.tool} maxFontSizeMultiplier={1.5}>
          {grant.tool.toUpperCase()}
        </Text>
        <Text style={styles.scope} maxFontSizeMultiplier={1.5}>
          {grant.scope}
        </Text>
        <Text style={styles.expiry} maxFontSizeMultiplier={1.5}>
          {formatExpiry(grant.expiresAt)}
        </Text>
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
        <Text style={styles.revokeText} maxFontSizeMultiplier={1.5}>
          Revoke
        </Text>
      </Pressable>
    </View>
  );
}

// =============================================================================
// SCREEN
// =============================================================================

export default function PermissionsScreen(): React.ReactElement {
  const [grants, setGrants] = useState<PermissionGrant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const next = await fetchActiveGrants();
      setGrants(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleRevoke = useCallback(
    async (id: string): Promise<void> => {
      try {
        await revokeGrant(id);
        // Optimistic local removal; reload to stay authoritative.
        setGrants((prev) => prev.filter((g) => g.id !== id));
        void reload();
      } catch (err) {
        console.warn('[permissions.tsx] revoke failed', err);
      }
    },
    [reload],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow} maxFontSizeMultiplier={1.5}>
          PERMISSIONS LEDGER
        </Text>
        <Text style={styles.title} maxFontSizeMultiplier={1.5}>
          Every grant. Always revocable.
        </Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.5}>
          Tools you have authorized to act on your data. Revocation is
          immediate and audit-logged.
        </Text>

        {loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText} maxFontSizeMultiplier={1.5}>
              Loading…
            </Text>
          </View>
        ) : grants.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText} maxFontSizeMultiplier={1.5}>
              No active permission grants.
            </Text>
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
  list: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    shadowColor: colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  rowMain: { flex: 1 },
  tool: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    letterSpacing: 1.76,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  scope: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 15,
    color: colors.textPrimary,
    marginTop: 4,
  },
  expiry: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.textTertiary,
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
