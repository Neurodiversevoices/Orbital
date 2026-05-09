/**
 * Orbital Platform — Sub-Brand Picker
 *
 * Six cards: Personal · Workspace · Enterprise · Health · Edu · Gov.
 * Each card surfaces the trust posture (compliance · tenancy · audit ·
 * memory default) so the user can choose with eyes wide open.
 *
 * Tapping a card sets the active sub-brand via SubBrandProvider, which
 * persists to AsyncStorage under `orbital.subBrand`.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSubBrand } from '../../lib/platform/SubBrandProvider';
import {
  SUB_BRAND_CONFIGS,
  SUB_BRAND_ORDER,
} from '../../lib/platform/subBrandConfig';
import type { SubBrand, SubBrandConfig } from '../../lib/platform/types';

const BACKGROUND = '#01020A';
const GLASS_BG = 'rgba(255,255,255,0.07)';
const GLASS_BORDER = 'rgba(255,255,255,0.15)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.7)';

// =============================================================================
// POSTURE CHIPS
// =============================================================================

function postureChips(config: SubBrandConfig): string[] {
  const chips: string[] = [];
  if (config.posture.complianceMode !== 'none') {
    chips.push(config.posture.complianceMode.toUpperCase());
  }
  if (config.posture.tenancyIsolation) chips.push('TENANT ISOLATED');
  chips.push(config.posture.auditLogging ? 'AUDIT ON' : 'AUDIT OFF');
  chips.push(`MEMORY ${config.posture.memoryDefault.toUpperCase()}`);
  return chips;
}

// =============================================================================
// CARD
// =============================================================================

interface CardProps {
  config: SubBrandConfig;
  active: boolean;
  onSelect: (id: SubBrand) => void;
}

function BrandCard({
  config,
  active,
  onSelect,
}: CardProps): React.ReactElement {
  const chips = postureChips(config);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select ${config.label} tier. ${chips.join(', ')}`}
      accessibilityState={{ selected: active }}
      onPress={() => onSelect(config.id)}
      style={({ pressed }) => [
        styles.card,
        active && {
          borderColor: config.themeAccent,
          backgroundColor: 'rgba(255,255,255,0.10)',
        },
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[styles.dot, { backgroundColor: config.themeAccent }]}
        />
        <Text style={styles.cardTitle}>{config.label}</Text>
        {active ? (
          <Text style={[styles.activeFlag, { color: config.themeAccent }]}>
            ACTIVE
          </Text>
        ) : null}
      </View>

      <Text style={styles.cardTagline}>{config.tagline}</Text>

      <View style={styles.chipRow}>
        {chips.map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={styles.chipText}>{chip}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

// =============================================================================
// SCREEN
// =============================================================================

export default function SubBrandPickerScreen(): React.ReactElement {
  const { brand, setBrand } = useSubBrand();

  const handleSelect = useCallback(
    async (id: SubBrand): Promise<void> => {
      try {
        await setBrand(id);
      } catch (err) {
        console.warn('[sub-brand.tsx] setBrand failed', err);
      }
    },
    [setBrand],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>PICK YOUR TIER</Text>
        <Text style={styles.title}>Same engine. Six postures.</Text>
        <Text style={styles.subtitle}>
          Choose the trust posture that fits your context. You can change at
          any time.
        </Text>

        <View style={styles.list}>
          {SUB_BRAND_ORDER.map((id) => (
            <BrandCard
              key={id}
              config={SUB_BRAND_CONFIGS[id]}
              active={id === brand}
              onSelect={handleSelect}
            />
          ))}
        </View>
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

  list: { gap: 16 },
  card: {
    backgroundColor: GLASS_BG,
    borderColor: GLASS_BORDER,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardTitle: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 18,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  activeFlag: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    letterSpacing: 1.6,
  },
  cardTagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_SECONDARY,
    marginTop: 6,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.44,
    color: 'rgba(255,255,255,0.85)',
  },
});
