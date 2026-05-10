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
import { colors } from '../../theme/colors';

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
          backgroundColor: colors.backgroundSubtle,
        },
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[styles.dot, { backgroundColor: config.themeAccent }]}
        />
        <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>
          {config.label}
        </Text>
        {active ? (
          <Text
            style={[styles.activeFlag, { color: config.themeAccent }]}
            maxFontSizeMultiplier={1.5}
          >
            ACTIVE
          </Text>
        ) : null}
      </View>

      <Text style={styles.cardTagline} maxFontSizeMultiplier={1.5}>
        {config.tagline}
      </Text>

      <View style={styles.chipRow}>
        {chips.map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={styles.chipText} maxFontSizeMultiplier={1.5}>
              {chip}
            </Text>
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
        <Text style={styles.eyebrow} maxFontSizeMultiplier={1.5}>
          PICK YOUR TIER
        </Text>
        <Text style={styles.title} maxFontSizeMultiplier={1.5}>
          Same engine. Six postures.
        </Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.5}>
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

  list: { gap: 16 },
  card: {
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
    color: colors.textPrimary,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chipText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.44,
    color: colors.textSecondary,
  },
});
