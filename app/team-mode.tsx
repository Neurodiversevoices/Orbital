import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Lightbulb,
  Eye,
  ListTodo,
  UserPlus,
  LogOut,
  Shield,
} from 'lucide-react-native';
import { colors, commonStyles, spacing } from '../theme';
import { useEnergyLogs } from '../lib/hooks/useEnergyLogs';
import {
  getTeamModeSettings,
  getTeamConfigs,
  joinTeamByCode,
  leaveTeam,
} from '../lib/storage';
import {
  calculateTeamAggregate,
  generateTeamSuggestions,
} from '../lib/aggregateUtils';
import type {
  TeamModeSettings,
  TeamConfig,
  TeamAggregate,
  TeamActionSuggestion,
  Category,
} from '../types';
import * as Sentry from '@sentry/react-native';

const categoryIcons: Record<Category, React.ComponentType<any>> = {
  sensory: Eye,
  demand: ListTodo,
  social: Users,
};

export default function TeamModeScreen() {
  const router = useRouter();
  const { logs } = useEnergyLogs();

  const [settings, setSettings] = useState<TeamModeSettings | null>(null);
  const [configs, setConfigs] = useState<TeamConfig[]>([]);
  const [teamCode, setTeamCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [s, c] = await Promise.all([getTeamModeSettings(), getTeamConfigs()]);
      setSettings(s);
      setConfigs(c);
    } catch (error) {
      Sentry.captureException(error, { tags: { screen: 'team-mode' } });
    }
  };

  const currentTeam = useMemo(() => {
    if (!settings?.currentTeamId) return null;
    return configs.find((c) => c.id === settings.currentTeamId) || null;
  }, [settings, configs]);

  const aggregate = useMemo(() => {
    if (!currentTeam) return null;
    return calculateTeamAggregate(logs, currentTeam.id);
  }, [logs, currentTeam]);

  const suggestions = useMemo(() => {
    if (!aggregate) return [];
    return generateTeamSuggestions(aggregate);
  }, [aggregate]);

  const handleJoinTeam = useCallback(async () => {
    if (!teamCode.trim()) {
      Alert.alert('Team Code Required', 'Please enter a team code to join.');
      return;
    }

    setIsJoining(true);
    try {
      await joinTeamByCode(teamCode.trim(), teamName.trim());
      await loadData();
      setTeamCode('');
      setTeamName('');
      setShowJoinForm(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to join team. Please try again.');
    } finally {
      setIsJoining(false);
    }
  }, [teamCode, teamName]);

  const handleLeaveTeam = useCallback(async () => {
    if (!currentTeam) return;

    Alert.alert(
      'Leave Team',
      `Are you sure you want to leave ${currentTeam.name}? Your data will no longer be included in team aggregates.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            await leaveTeam(currentTeam.id);
            await loadData();
          },
        },
      ]
    );
  }, [currentTeam]);

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="rgba(255,255,255,0.8)" />
        </Pressable>
        <Text style={styles.title}>Team Mode</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Privacy Notice */}
        <View style={styles.privacyBanner}>
          <Shield size={16} color="#00E5FF" />
          <Text style={styles.privacyText}>
            Your individual data is never shown. Only aggregate team capacity is visible.
          </Text>
        </View>

        {/* No Team - Join Form */}
        {!currentTeam && !showJoinForm && (
          <View style={styles.emptyState}>
            <Users size={48} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyTitle}>Join a Team</Text>
            <Text style={styles.emptyBody}>
              Opt in to share your capacity signals with your team. Your individual entries remain
              private - only aggregate capacity is shared.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => setShowJoinForm(true)}>
              <UserPlus size={18} color="#000" />
              <Text style={styles.primaryButtonText}>Enter Team Code</Text>
            </Pressable>
          </View>
        )}

        {/* Join Form */}
        {!currentTeam && showJoinForm && (
          <View style={styles.joinForm}>
            <Text style={styles.formTitle}>Join a Team</Text>
            <Text style={styles.formDescription}>
              Enter the team code provided by your organization or ERG leader.
            </Text>

            <TextInput
              style={styles.input}
              value={teamCode}
              onChangeText={setTeamCode}
              placeholder="Team Code (e.g., ACME-2024)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="characters"
            />

            <TextInput
              style={styles.input}
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Team Name (optional)"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <View style={styles.formButtons}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setShowJoinForm(false);
                  setTeamCode('');
                  setTeamName('');
                }}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, isJoining && styles.buttonDisabled]}
                onPress={handleJoinTeam}
                disabled={isJoining}
              >
                <Text style={styles.primaryButtonText}>
                  {isJoining ? 'Joining...' : 'Join Team'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Team Dashboard */}
        {currentTeam && aggregate && (
          <>
            {/* Team Header */}
            <View style={styles.teamHeader}>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{currentTeam.name}</Text>
                <Text style={styles.teamCode}>Code: {currentTeam.teamCode}</Text>
              </View>
              <Pressable style={styles.leaveButton} onPress={handleLeaveTeam}>
                <LogOut size={16} color="#F44336" />
                <Text style={styles.leaveButtonText}>Leave</Text>
              </Pressable>
            </View>

            {/* Privacy Threshold Warning */}
            {!aggregate.hasEnoughParticipants && (
              <View style={styles.thresholdWarning}>
                <AlertCircle size={20} color="#E8A830" />
                <View style={styles.thresholdContent}>
                  <Text style={styles.thresholdTitle}>
                    Not enough participants to protect privacy
                  </Text>
                  <Text style={styles.thresholdBody}>
                    At least 10 team members must log signals before aggregate data is displayed.
                    Current: {aggregate.participantCount} participants.
                  </Text>
                </View>
              </View>
            )}

            {/* Aggregate Data (only if threshold met) */}
            {aggregate.hasEnoughParticipants && (
              <>
                {/* Capacity Distribution */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Team Capacity Distribution</Text>
                  <View style={styles.distributionBar}>
                    {aggregate.capacityDistribution.plenty > 0 && (
                      <View
                        style={[
                          styles.distributionSegment,
                          {
                            flex: aggregate.capacityDistribution.plenty,
                            backgroundColor: '#00E5FF',
                            borderTopLeftRadius: 4,
                            borderBottomLeftRadius: 4,
                          },
                        ]}
                      />
                    )}
                    {aggregate.capacityDistribution.elevated > 0 && (
                      <View
                        style={[
                          styles.distributionSegment,
                          {
                            flex: aggregate.capacityDistribution.elevated,
                            backgroundColor: '#E8A830',
                          },
                        ]}
                      />
                    )}
                    {aggregate.capacityDistribution.nearLimit > 0 && (
                      <View
                        style={[
                          styles.distributionSegment,
                          {
                            flex: aggregate.capacityDistribution.nearLimit,
                            backgroundColor: '#F44336',
                            borderTopRightRadius: 4,
                            borderBottomRightRadius: 4,
                          },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.distributionLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#00E5FF' }]} />
                      <Text style={styles.legendText}>
                        Plenty {aggregate.capacityDistribution.plenty}%
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#E8A830' }]} />
                      <Text style={styles.legendText}>
                        Elevated {aggregate.capacityDistribution.elevated}%
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                      <Text style={styles.legendText}>
                        Near Limit {aggregate.capacityDistribution.nearLimit}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Top Drivers */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Top Drivers</Text>
                  <View style={styles.driversRow}>
                    {aggregate.topDrivers.map((driver) => {
                      const Icon = categoryIcons[driver.driver];
                      return (
                        <View key={driver.driver} style={styles.driverItem}>
                          <Icon size={20} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.driverLabel}>{driver.driver}</Text>
                          <Text style={styles.driverPercent}>{driver.percentage}%</Text>
                        </View>
                      );
                    })}
                    {aggregate.topDrivers.length === 0 && (
                      <Text style={styles.noDataText}>No driver data available yet</Text>
                    )}
                  </View>
                </View>

                {/* Weekly Trend */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Weekly Trend</Text>
                  <View style={styles.trendRow}>
                    {aggregate.weeklyTrend === 'improving' && (
                      <>
                        <TrendingUp size={24} color="#00E5FF" />
                        <Text style={[styles.trendText, { color: '#00E5FF' }]}>Improving</Text>
                      </>
                    )}
                    {aggregate.weeklyTrend === 'declining' && (
                      <>
                        <TrendingDown size={24} color="#F44336" />
                        <Text style={[styles.trendText, { color: '#F44336' }]}>Declining</Text>
                      </>
                    )}
                    {aggregate.weeklyTrend === 'stable' && (
                      <>
                        <Minus size={24} color="#E8A830" />
                        <Text style={[styles.trendText, { color: '#E8A830' }]}>Stable</Text>
                      </>
                    )}
                    {aggregate.weeklyTrend === null && (
                      <Text style={styles.noDataText}>Not enough data for trend analysis</Text>
                    )}
                  </View>
                  <Text style={styles.confidenceLabel}>
                    Participation Confidence: {aggregate.participationConfidence}
                  </Text>
                </View>

                {/* Action Panel */}
                {suggestions.length > 0 && (
                  <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                      <Lightbulb size={18} color="#E8A830" />
                      <Text style={styles.cardTitle}>Suggested Actions</Text>
                    </View>
                    {suggestions.map((suggestion) => (
                      <View key={suggestion.id} style={styles.suggestionItem}>
                        <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                        <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Stats Footer */}
                <View style={styles.statsFooter}>
                  <Text style={styles.statsText}>
                    {aggregate.participantCount} participants | {aggregate.totalSignals} signals
                    this week
                  </Text>
                </View>
              </>
            )}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#00E5FF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#00E5FF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  joinForm: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.sm,
  },
  formDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.md,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginBottom: spacing.md,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  teamInfo: {},
  teamName: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  teamCode: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.sm,
  },
  leaveButtonText: {
    fontSize: 14,
    color: '#F44336',
  },
  thresholdWarning: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(232, 168, 48, 0.1)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  thresholdContent: {
    flex: 1,
  },
  thresholdTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8A830',
    marginBottom: 4,
  },
  thresholdBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  distributionBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: spacing.md,
  },
  distributionSegment: {
    height: '100%',
  },
  distributionLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  driversRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  driverItem: {
    alignItems: 'center',
    gap: 6,
  },
  driverLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'capitalize',
  },
  driverPercent: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  noDataText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  trendText: {
    fontSize: 18,
    fontWeight: '600',
  },
  confidenceLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'capitalize',
  },
  suggestionItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingVertical: spacing.sm,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  suggestionDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  statsFooter: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  bottomPadding: {
    height: 40,
  },
});
