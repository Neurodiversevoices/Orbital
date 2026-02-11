/**
 * Active Sessions Screen
 *
 * View and manage device sessions.
 * Allows remote logout from other devices.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Smartphone,
  Monitor,
  Trash2,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import {
  getDeviceSessions,
  getCurrentSession,
  removeDeviceSession,
  clearAllSessions,
  formatSessionTime,
  getPlatformIcon,
  DeviceSession,
} from '../lib/session';
import { getAuditLog, getActionDescription, SessionAuditEntry } from '../lib/session';
import * as Sentry from '@sentry/react-native';

export default function ActiveSessionsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<SessionAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load sessions
  const loadData = useCallback(async () => {
    try {
      const [allSessions, current, log] = await Promise.all([
        getDeviceSessions(),
        getCurrentSession(),
        getAuditLog(),
      ]);

      setSessions(allSessions);
      setCurrentSessionId(current?.id ?? null);
      setAuditLog(log.slice(-10).reverse()); // Last 10, newest first
    } catch (error) {
      Sentry.captureException(error, { tags: { screen: 'active-sessions' } });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Remove a single session
  const handleRemoveSession = (session: DeviceSession) => {
    if (session.id === currentSessionId) {
      Alert.alert(
        'Cannot Remove',
        'You cannot remove your current session. Use Sign Out instead.',
      );
      return;
    }

    Alert.alert(
      'Remove Session',
      `Remove session from ${session.deviceName}? This will require re-authentication on that device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeDeviceSession(session.id);
            loadData();
          },
        },
      ],
    );
  };

  // Clear all other sessions
  const handleClearOthers = () => {
    const otherSessions = sessions.filter(s => s.id !== currentSessionId);
    if (otherSessions.length === 0) {
      Alert.alert('No Other Sessions', 'There are no other sessions to remove.');
      return;
    }

    Alert.alert(
      'Sign Out Other Devices',
      `This will sign out ${otherSessions.length} other device${otherSessions.length > 1 ? 's' : ''}. They will need to re-authenticate.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: async () => {
            for (const session of otherSessions) {
              await removeDeviceSession(session.id);
            }
            loadData();
          },
        },
      ],
    );
  };

  // Get icon component for platform
  const getPlatformIconComponent = (platform: 'ios' | 'android' | 'web') => {
    return platform === 'web' ? Monitor : Smartphone;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00E5FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Active Sessions</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#00E5FF"
          />
        }
      >
        {/* Current Session */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
          <Text style={styles.sectionLabel}>CURRENT SESSION</Text>
          {sessions.filter(s => s.id === currentSessionId).map(session => {
            const IconComponent = getPlatformIconComponent(session.platform);
            return (
              <View key={session.id} style={[styles.sessionCard, styles.currentSession]}>
                <View style={[styles.sessionIcon, styles.currentSessionIcon]}>
                  <IconComponent size={24} color="#4CAF50" />
                </View>
                <View style={styles.sessionInfo}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionName}>{session.deviceName}</Text>
                    <View style={styles.currentBadge}>
                      <CheckCircle size={12} color="#4CAF50" />
                      <Text style={styles.currentBadgeText}>This Device</Text>
                    </View>
                  </View>
                  <Text style={styles.sessionMeta}>
                    Active now
                  </Text>
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* Other Sessions */}
        {sessions.filter(s => s.id !== currentSessionId).length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>OTHER SESSIONS</Text>
              <Pressable onPress={handleClearOthers} style={styles.clearAllButton}>
                <Text style={styles.clearAllText}>Sign Out All</Text>
              </Pressable>
            </View>

            {sessions.filter(s => s.id !== currentSessionId).map((session, index) => {
              const IconComponent = getPlatformIconComponent(session.platform);
              return (
                <Animated.View
                  key={session.id}
                  entering={FadeInDown.delay(150 + index * 50).duration(400)}
                >
                  <View style={styles.sessionCard}>
                    <View style={styles.sessionIcon}>
                      <IconComponent size={24} color="rgba(255,255,255,0.6)" />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionName}>{session.deviceName}</Text>
                      <View style={styles.sessionMetaRow}>
                        <Clock size={12} color="rgba(255,255,255,0.4)" />
                        <Text style={styles.sessionMeta}>
                          Last active {formatSessionTime(session.lastActiveAt)}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleRemoveSession(session)}
                      style={styles.removeButton}
                    >
                      <Trash2 size={18} color="#F44336" />
                    </Pressable>
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

        {/* No Other Sessions */}
        {sessions.filter(s => s.id !== currentSessionId).length === 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.emptyState}>
            <Shield size={32} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyTitle}>No Other Sessions</Text>
            <Text style={styles.emptyText}>
              You're only signed in on this device.
            </Text>
          </Animated.View>
        )}

        {/* Recent Activity */}
        {auditLog.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
            <View style={styles.auditCard}>
              {auditLog.map((entry, index) => (
                <View
                  key={entry.id}
                  style={[
                    styles.auditRow,
                    index < auditLog.length - 1 && styles.auditRowBorder,
                  ]}
                >
                  <View style={styles.auditDot} />
                  <View style={styles.auditContent}>
                    <Text style={styles.auditAction}>
                      {getActionDescription(entry.action)}
                    </Text>
                    <Text style={styles.auditTime}>
                      {formatSessionTime(entry.timestamp)} · {entry.deviceName}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Security Info */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.infoCard}>
          <Shield size={20} color="#00E5FF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Session Security</Text>
            <Text style={styles.infoText}>
              Sessions automatically expire after 15 minutes of inactivity.
              You can manually sign out other devices at any time.
            </Text>
          </View>
        </Animated.View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  clearAllButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  clearAllText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  currentSession: {
    borderColor: 'rgba(76,175,80,0.3)',
    backgroundColor: 'rgba(76,175,80,0.05)',
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  currentSessionIcon: {
    backgroundColor: 'rgba(76,175,80,0.15)',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76,175,80,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#4CAF50',
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  sessionMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(244,67,54,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  auditCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
  },
  auditRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E5FF',
    marginTop: 5,
    marginRight: spacing.md,
  },
  auditContent: {
    flex: 1,
  },
  auditAction: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  auditTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    padding: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00E5FF',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.5)',
  },
});
