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

const BACKGROUND = '#01020A';

// =============================================================================
// HEADER CHIP — shows current sub-brand + posture badges
// =============================================================================

function SubBrandChip(): React.ReactElement {
  const { config } = useSubBrand();
  const { complianceMode, auditLogging, tenancyIsolation } = config.posture;

  return (
    <View style={styles.chipRow} accessibilityRole="header">
      <View
        style={[styles.chip, { borderColor: config.themeAccent }]}
        accessibilityLabel={`Current sub-brand: ${config.label}`}
      >
        <View
          style={[styles.dot, { backgroundColor: config.themeAccent }]}
        />
        <Text style={styles.chipLabel}>{config.label.toUpperCase()}</Text>
      </View>

      {complianceMode !== 'none' ? (
        <View style={styles.postureBadge}>
          <Text style={styles.postureText}>
            {complianceMode.toUpperCase()}
          </Text>
        </View>
      ) : null}

      {tenancyIsolation ? (
        <View style={styles.postureBadge}>
          <Text style={styles.postureText}>TENANT</Text>
        </View>
      ) : null}

      {auditLogging ? (
        <View style={styles.postureBadge}>
          <Text style={styles.postureText}>AUDIT</Text>
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
        headerStyle: { backgroundColor: BACKGROUND },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontFamily: 'DMSans_500Medium',
          fontWeight: '500',
          color: '#FFFFFF',
        },
        contentStyle: { backgroundColor: BACKGROUND },
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
    backgroundColor: 'rgba(255,255,255,0.07)',
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
    color: '#FFFFFF',
  },
  postureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  postureText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
  },
});
