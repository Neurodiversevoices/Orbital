/**
 * Orbital Platform — Route group layout
 *
 * Wraps every screen under app/(platform)/ with the SubBrandProvider so
 * the active sub-brand, posture, and accent color are available via
 * `useSubBrand()` / `useTrustPosture()`.
 *
 * Header is custom (`SubBrandChip`) so each screen can render a sticky
 * pill showing the current brand without re-implementing the chip.
 */

import React from 'react';
import { Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

import { SubBrandProvider, useSubBrand } from '../../lib/platform/SubBrandProvider';
import { colors } from '../../theme/colors';

// =============================================================================
// HEADER CHIP — shows current sub-brand + posture badges
// =============================================================================

/**
 * Display label for each ComplianceMode. Keeps the chip readable —
 * "SOC2" → "SOC 2", everything else uppercased as-is.
 */
const COMPLIANCE_LABELS: Record<string, string> = {
  soc2: 'SOC 2',
  hipaa: 'HIPAA',
  ferpa: 'FERPA',
  fedramp: 'FedRAMP',
};

function SubBrandChip(): React.ReactElement {
  const { config } = useSubBrand();
  const { complianceMode, auditLogging, tenancyIsolation } = config.posture;
  const complianceLabel =
    COMPLIANCE_LABELS[complianceMode] ?? complianceMode.toUpperCase();

  return (
    <View style={styles.chipRow} accessibilityRole="header">
      <View
        style={[styles.chip, { borderColor: config.themeAccent }]}
        accessibilityLabel={`Current sub-brand: ${config.label}`}
      >
        <View
          style={[styles.dot, { backgroundColor: config.themeAccent }]}
        />
        <Text
          style={styles.chipLabel}
          maxFontSizeMultiplier={1.5}
        >
          {config.label.toUpperCase()}
        </Text>
      </View>

      {complianceMode !== 'none' ? (
        <View
          style={styles.postureBadge}
          accessibilityLabel={`Compliance mode: ${complianceLabel}`}
        >
          <Text style={styles.postureText} maxFontSizeMultiplier={1.5}>
            {complianceLabel}
          </Text>
        </View>
      ) : null}

      {tenancyIsolation ? (
        <View style={styles.postureBadge}>
          <Text style={styles.postureText} maxFontSizeMultiplier={1.5}>
            TENANT
          </Text>
        </View>
      ) : null}

      {auditLogging ? (
        <View style={styles.postureBadge}>
          <Text style={styles.postureText} maxFontSizeMultiplier={1.5}>
            AUDIT
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// =============================================================================
// LAYOUT
// =============================================================================

function PlatformStack(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontFamily: 'DMSans_500Medium',
          fontWeight: '500',
          color: colors.textPrimary,
        },
        contentStyle: { backgroundColor: colors.background },
        headerRight: () => <SubBrandChip />,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Platform' }} />
      <Stack.Screen name="memory" options={{ title: 'Memory' }} />
      <Stack.Screen name="permissions" options={{ title: 'Permissions' }} />
      <Stack.Screen name="audit" options={{ title: 'Audit Log' }} />
      <Stack.Screen name="sub-brand" options={{ title: 'Pick Your Tier' }} />
    </Stack>
  );
}

export default function PlatformLayout(): React.ReactElement {
  return (
    <SubBrandProvider>
      <PlatformStack />
    </SubBrandProvider>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.backgroundSubtle,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.textPrimary,
  },
  postureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  postureText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.6,
    color: colors.textSecondary,
  },
});
