import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  GraduationCap,
  Users,
  User,
  Heart,
  AlertCircle,
  Eye,
  ListTodo,
  LogOut,
  Shield,
  FileText,
  Download,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { colors, commonStyles, spacing } from '../theme';
import { useEnergyLogs } from '../lib/hooks/useEnergyLogs';
import {
  getSchoolZoneModeSettings,
  getSchoolZoneConfigs,
  joinSchoolZone,
  leaveSchoolZone,
  saveSchoolZoneModeSettings,
} from '../lib/storage';
import {
  calculateSchoolZoneAggregate,
  generateSchoolSummaryCard,
  formatSchoolSummaryCardAsText,
} from '../lib/aggregateUtils';
import type {
  SchoolZoneModeSettings,
  SchoolZoneConfig,
  SchoolZoneAggregate,
  SchoolRole,
  SchoolSummaryCard,
  Category,
} from '../types';

const categoryIcons: Record<Category, React.ComponentType<any>> = {
  sensory: Eye,
  demand: ListTodo,
  social: Users,
};

const roleIcons: Record<SchoolRole, React.ComponentType<any>> = {
  student: User,
  caregiver: Heart,
  educator: GraduationCap,
};

const roleLabels: Record<SchoolRole, string> = {
  student: 'Student',
  caregiver: 'Parent / Caregiver',
  educator: 'Educator / Support Staff',
};

export default function SchoolZoneScreen() {
  const router = useRouter();
  const { logs } = useEnergyLogs();

  const [settings, setSettings] = useState<SchoolZoneModeSettings | null>(null);
  const [configs, setConfigs] = useState<SchoolZoneConfig[]>([]);
  const [schoolCode, setSchoolCode] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [selectedRole, setSelectedRole] = useState<SchoolRole | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [summaryCard, setSummaryCard] = useState<SchoolSummaryCard | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [s, c] = await Promise.all([getSchoolZoneModeSettings(), getSchoolZoneConfigs()]);
    setSettings(s);
    setConfigs(c);
  };

  const currentSchool = useMemo(() => {
    if (!settings?.currentSchoolZoneId) return null;
    return configs.find((c) => c.id === settings.currentSchoolZoneId) || null;
  }, [settings, configs]);

  const aggregate = useMemo(() => {
    if (!currentSchool || settings?.role !== 'educator') return null;
    return calculateSchoolZoneAggregate(logs, currentSchool.id);
  }, [logs, currentSchool, settings?.role]);

  const handleJoinSchool = useCallback(async () => {
    if (!schoolCode.trim()) {
      Alert.alert('School Code Required', 'Please enter a school code to join.');
      return;
    }
    if (!selectedRole) {
      Alert.alert('Role Required', 'Please select your role.');
      return;
    }

    setIsJoining(true);
    try {
      await joinSchoolZone(schoolCode.trim(), schoolName.trim(), selectedRole);
      await loadData();
      setSchoolCode('');
      setSchoolName('');
      setSelectedRole(null);
      setShowJoinForm(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to join school zone. Please try again.');
    } finally {
      setIsJoining(false);
    }
  }, [schoolCode, schoolName, selectedRole]);

  const handleLeaveSchool = useCallback(async () => {
    if (!currentSchool) return;

    Alert.alert(
      'Leave School Zone',
      `Are you sure you want to leave ${currentSchool.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            await leaveSchoolZone(currentSchool.id);
            await loadData();
          },
        },
      ]
    );
  }, [currentSchool]);

  const handleGenerateSummary = useCallback(() => {
    const card = generateSchoolSummaryCard(logs, 'current_student', 14);
    setSummaryCard(card);
  }, [logs]);

  const handleShareSummary = useCallback(async () => {
    if (!summaryCard) return;

    const text = formatSchoolSummaryCardAsText(summaryCard);
    try {
      await Share.share({
        message: text,
        title: 'Capacity Summary Card',
      });
      // Update last generated timestamp
      await saveSchoolZoneModeSettings({
        lastSummaryGeneratedAt: Date.now(),
      });
    } catch (error) {
    }
  }, [summaryCard]);

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title} maxFontSizeMultiplier={1.5}>School Zone</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Privacy Notice */}
        <View style={styles.privacyBanner}>
          <Shield size={16} color="#0E8C7B" />
          <Text style={styles.privacyText} maxFontSizeMultiplier={1.5}>
            Student privacy first. Educators see aggregate data only. Notes are never shared.
          </Text>
        </View>

        {/* No School - Join Form */}
        {!currentSchool && !showJoinForm && (
          <View style={styles.emptyState}>
            <GraduationCap size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.5}>Join a School Zone</Text>
            <Text style={styles.emptyBody} maxFontSizeMultiplier={1.5}>
              Connect with your school to track capacity in an educational context. Students log
              their own capacity; educators see only aggregate class data.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => setShowJoinForm(true)}>
              <GraduationCap size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.5}>Enter School Code</Text>
            </Pressable>
          </View>
        )}

        {/* Join Form */}
        {!currentSchool && showJoinForm && (
          <View style={styles.joinForm}>
            <Text style={styles.formTitle} maxFontSizeMultiplier={1.5}>Join a School Zone</Text>
            <Text style={styles.formDescription} maxFontSizeMultiplier={1.5}>
              Enter the school code and select your role.
            </Text>

            <TextInput
              style={styles.input}
              value={schoolCode}
              onChangeText={setSchoolCode}
              placeholder="School Code (e.g., ELM-2024)"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
            />

            <TextInput
              style={styles.input}
              value={schoolName}
              onChangeText={setSchoolName}
              placeholder="School Name (optional)"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.roleLabel} maxFontSizeMultiplier={1.5}>I am a:</Text>
            <View style={styles.roleOptions}>
              {(['student', 'caregiver', 'educator'] as SchoolRole[]).map((role) => {
                const Icon = roleIcons[role];
                const isSelected = selectedRole === role;
                return (
                  <Pressable
                    key={role}
                    style={[styles.roleOption, isSelected && styles.roleOptionSelected]}
                    onPress={() => setSelectedRole(role)}
                  >
                    <Icon size={20} color={isSelected ? '#0E8C7B' : colors.textSecondary} />
                    <Text
                      style={[styles.roleOptionText, isSelected && styles.roleOptionTextSelected]}
                      maxFontSizeMultiplier={1.5}
                    >
                      {roleLabels[role]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.formButtons}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setShowJoinForm(false);
                  setSchoolCode('');
                  setSchoolName('');
                  setSelectedRole(null);
                }}
              >
                <Text style={styles.secondaryButtonText} maxFontSizeMultiplier={1.5}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, isJoining && styles.buttonDisabled]}
                onPress={handleJoinSchool}
                disabled={isJoining}
              >
                <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.5}>
                  {isJoining ? 'Joining...' : 'Join'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* School Dashboard */}
        {currentSchool && settings && (
          <>
            {/* School Header */}
            <View style={styles.schoolHeader}>
              <View style={styles.schoolInfo}>
                <Text style={styles.schoolName} maxFontSizeMultiplier={1.5}>{currentSchool.name}</Text>
                <Text style={styles.schoolMeta} maxFontSizeMultiplier={1.5}>
                  {roleLabels[settings.role || 'student']} | Code: {currentSchool.schoolCode}
                </Text>
              </View>
              <Pressable style={styles.leaveButton} onPress={handleLeaveSchool}>
                <LogOut size={16} color="#DC2626" />
                <Text style={styles.leaveButtonText} maxFontSizeMultiplier={1.5}>Leave</Text>
              </Pressable>
            </View>

            {/* Student View */}
            {settings.role === 'student' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>Your Capacity Logging</Text>
                <Text style={styles.cardBody} maxFontSizeMultiplier={1.5}>
                  Continue logging your capacity on the Home screen. Your individual entries are
                  private - only you can see them. Aggregate class data (without your name or
                  details) may be visible to educators.
                </Text>
                <Pressable style={styles.goHomeButton} onPress={() => router.push('/')}>
                  <Text style={styles.goHomeButtonText} maxFontSizeMultiplier={1.5}>Go to Home</Text>
                </Pressable>
              </View>
            )}

            {/* Caregiver View */}
            {settings.role === 'caregiver' && (
              <>
                <View style={styles.card}>
                  <View style={styles.cardTitleRow}>
                    <FileText size={18} color="#F59E0B" />
                    <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>School Summary Card</Text>
                  </View>
                  <Text style={styles.cardBody} maxFontSizeMultiplier={1.5}>
                    Generate a summary card to share with school staff. Shows capacity trends and
                    common drivers. Notes are excluded by default.
                  </Text>
                  <Pressable style={styles.generateButton} onPress={handleGenerateSummary}>
                    <Download size={18} color="#FFFFFF" />
                    <Text style={styles.generateButtonText} maxFontSizeMultiplier={1.5}>Generate Summary Card</Text>
                  </Pressable>
                </View>

                {/* Summary Card Preview */}
                {summaryCard && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle} maxFontSizeMultiplier={1.5}>Capacity Summary Card</Text>
                    <Text style={styles.summaryPeriod} maxFontSizeMultiplier={1.5}>
                      {summaryCard.dateRange.start} to {summaryCard.dateRange.end}
                    </Text>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>Average Capacity</Text>
                      <Text style={styles.summaryValue} maxFontSizeMultiplier={1.5}>{summaryCard.averageCapacity}%</Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>Trend</Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          {
                            color:
                              summaryCard.capacityTrend === 'improving'
                                ? '#2DD4BF'
                                : summaryCard.capacityTrend === 'declining'
                                ? '#DC2626'
                                : '#F59E0B',
                          },
                        ]}
                        maxFontSizeMultiplier={1.5}
                      >
                        {summaryCard.capacityTrend}
                      </Text>
                    </View>

                    <View style={styles.summarySection}>
                      <Text style={styles.summarySectionTitle} maxFontSizeMultiplier={1.5}>What Helps</Text>
                      {summaryCard.environmentFactors.helps.map((factor) => (
                        <View key={factor} style={styles.factorRow}>
                          <CheckCircle size={14} color="#2DD4BF" />
                          <Text style={styles.factorText} maxFontSizeMultiplier={1.5}>{factor.replace(/_/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.summarySection}>
                      <Text style={styles.summarySectionTitle} maxFontSizeMultiplier={1.5}>What Drains</Text>
                      {summaryCard.environmentFactors.drains.map((factor) => (
                        <View key={factor} style={styles.factorRow}>
                          <XCircle size={14} color="#DC2626" />
                          <Text style={styles.factorText} maxFontSizeMultiplier={1.5}>{factor.replace(/_/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>

                    <Pressable style={styles.shareButton} onPress={handleShareSummary}>
                      <Text style={styles.shareButtonText} maxFontSizeMultiplier={1.5}>Share Summary Card</Text>
                    </Pressable>

                    <Text style={styles.notesExcluded} maxFontSizeMultiplier={1.5}>Notes excluded for privacy</Text>
                  </View>
                )}
              </>
            )}

            {/* Educator View */}
            {settings.role === 'educator' && aggregate && (
              <>
                {/* Privacy Threshold Warning */}
                {!aggregate.hasEnoughStudents && (
                  <View style={styles.thresholdWarning}>
                    <AlertCircle size={20} color="#F59E0B" />
                    <View style={styles.thresholdContent}>
                      <Text style={styles.thresholdTitle} maxFontSizeMultiplier={1.5}>
                        Not enough students to protect privacy
                      </Text>
                      <Text style={styles.thresholdBody} maxFontSizeMultiplier={1.5}>
                        At least 10 students must log signals before aggregate data is displayed.
                        Current: {aggregate.studentCount} students.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Aggregate Data (only if threshold met) */}
                {aggregate.hasEnoughStudents && (
                  <>
                    {/* Capacity Distribution */}
                    <View style={styles.card}>
                      <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>Class Capacity Distribution</Text>
                      <View style={styles.distributionBar}>
                        {aggregate.capacityDistribution.plenty > 0 && (
                          <View
                            style={[
                              styles.distributionSegment,
                              {
                                flex: aggregate.capacityDistribution.plenty,
                                backgroundColor: '#2DD4BF',
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
                                backgroundColor: '#F59E0B',
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
                                backgroundColor: '#DC2626',
                                borderTopRightRadius: 4,
                                borderBottomRightRadius: 4,
                              },
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.distributionLegend}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#2DD4BF' }]} />
                          <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>
                            Plenty {aggregate.capacityDistribution.plenty}%
                          </Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                          <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>
                            Elevated {aggregate.capacityDistribution.elevated}%
                          </Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
                          <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>
                            Near Limit {aggregate.capacityDistribution.nearLimit}%
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Top Drivers */}
                    <View style={styles.card}>
                      <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>Common Load Drivers</Text>
                      <View style={styles.driversRow}>
                        {aggregate.topDrivers.map((driver) => {
                          const Icon = categoryIcons[driver.driver];
                          return (
                            <View key={driver.driver} style={styles.driverItem}>
                              <Icon size={20} color={colors.textSecondary} />
                              <Text style={styles.driverLabel} maxFontSizeMultiplier={1.5}>{driver.driver}</Text>
                              <Text style={styles.driverPercent} maxFontSizeMultiplier={1.5}>{driver.percentage}%</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {/* Stats Footer */}
                    <View style={styles.statsFooter}>
                      <Text style={styles.statsText} maxFontSizeMultiplier={1.5}>
                        {aggregate.studentCount} students | {aggregate.totalSignals} signals |
                        Confidence: {aggregate.participationConfidence}
                      </Text>
                    </View>
                  </>
                )}
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
    color: colors.textPrimary,
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
    backgroundColor: 'rgba(45,212,191,0.10)',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#0E8C7B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  joinForm: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  formDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  roleOptions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.backgroundSubtle,
  },
  roleOptionSelected: {
    borderColor: '#0E8C7B',
    backgroundColor: 'rgba(45,212,191,0.10)',
  },
  roleOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  roleOptionTextSelected: {
    color: '#0E8C7B',
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  schoolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  schoolInfo: {},
  schoolName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  schoolMeta: {
    fontSize: 12,
    color: colors.textTertiary,
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
    color: '#DC2626',
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
    color: colors.textTertiary,
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
  cardBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  goHomeButton: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: 'rgba(45,212,191,0.10)',
  },
  goHomeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0E8C7B',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#F59E0B',
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.30)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  summaryPeriod: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  summarySection: {
    marginTop: spacing.md,
  },
  summarySectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  factorText: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  shareButton: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    marginTop: spacing.md,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notesExcluded: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  thresholdWarning: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.30)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  thresholdContent: {
    flex: 1,
  },
  thresholdTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  thresholdBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  distributionBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSubtle,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  driverPercent: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statsFooter: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statsText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  bottomPadding: {
    height: 40,
  },
});
