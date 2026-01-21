/**
 * Health Check Endpoint
 *
 * Minimal page for uptime monitoring and deployment verification.
 * Returns a simple status page that can be scraped by monitoring tools.
 *
 * Usage:
 *   curl https://orbital-jet.vercel.app/health
 *   → Returns HTML with data-status="healthy" for parsing
 */

import { View, Text, StyleSheet } from 'react-native';
import { isSupabaseConfigured } from '../lib/supabase/client';

// Build-time constants for deployment verification
const BUILD_INFO = {
  version: '1.0.0',
  buildTime: new Date().toISOString(),
};

export default function HealthScreen() {
  const supabaseStatus = isSupabaseConfigured() ? 'configured' : 'not_configured';

  return (
    <View style={styles.container} data-testid="health-check" data-status="healthy">
      <Text style={styles.title}>Orbital Health Check</Text>
      <View style={styles.statusRow}>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value} data-testid="status">healthy</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.label}>Supabase:</Text>
        <Text style={styles.value} data-testid="supabase">{supabaseStatus}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.label}>Version:</Text>
        <Text style={styles.value} data-testid="version">{BUILD_INFO.version}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.label}>Timestamp:</Text>
        <Text style={styles.value} data-testid="timestamp">{new Date().toISOString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00D7FF',
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    width: 100,
  },
  value: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'monospace',
  },
});
