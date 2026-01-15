import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text, Alert, Modal, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  X,
  Trash2,
  Sparkles,
  ChevronRight,
  FileOutput,
  Share2,
  Scale,
  Globe,
  Check,
  Accessibility,
  FlaskConical,
  Shield,
  ShieldCheck,
  Info,
  Building2,
  LogOut,
  RotateCcw,
  GraduationCap,
  Database,
  Heart,
  Cloud,
  UserCircle,
  Briefcase,
  TrendingUp,
  Phone,
  Activity,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles, spacing, borderRadius } from '../theme';
import { useEnergyLogs } from '../lib/hooks/useEnergyLogs';
import { useLocale, interpolate } from '../lib/hooks/useLocale';
import { generateFakeData, clearFakeData } from '../lib/generateFakeData';
import { localeNames, Locale } from '../locales';
import { useDemoMode, FOUNDER_DEMO_ENABLED, DemoDuration } from '../lib/hooks/useDemoMode';
import { useAppMode } from '../lib/hooks/useAppMode';
import { useTutorial } from '../lib/hooks/useTutorial';
import { useAccess } from '../lib/access';
import { DELETION_DISCLOSURE } from '../lib/storage';
import { ProprietaryFooter } from '../components/legal';
import { APP_MODE_CONFIGS } from '../types';
import { ModeSelector } from '../components';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SettingsScreen() {
  const router = useRouter();
  const { logs, clearAll, refresh } = useEnergyLogs();
  const { t, locale, setLocale } = useLocale();
  const {
    isDemoMode,
    isLoading: isDemoLoading,
    isFounderDemo,
    enableDemoMode,
    disableDemoMode,
    reseedDemoData,
    clearDemoData,
  } = useDemoMode();
  const { resetTutorial } = useTutorial();
  const { currentMode, modeConfig, orgName, orgCode, leaveOrg } = useAppMode();
  const {
    qaFreeModeEnabled,
    enableQAFreeMode,
    disableQAFreeMode,
    tierLabel,
    limits,
    // FREE USER VIEW — Hard override
    freeUserViewActive,
    freeUserViewBanner,
    enableFreeUserView,
    disableFreeUserView,
  } = useAccess();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showDemoPicker, setShowDemoPicker] = useState(false);

  const handleToggleQAFreeMode = useCallback(async () => {
    setIsProcessing(true);
    try {
      if (qaFreeModeEnabled) {
        await disableQAFreeMode();
      } else {
        await enableQAFreeMode();
      }
    } finally {
      setIsProcessing(false);
    }
  }, [qaFreeModeEnabled, enableQAFreeMode, disableQAFreeMode]);

  // FREE USER VIEW toggle (hard override)
  const handleToggleFreeUserView = useCallback(async () => {
    setIsProcessing(true);
    try {
      if (freeUserViewActive) {
        await disableFreeUserView();
        // Force reload to re-evaluate all access checks
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        await enableFreeUserView();
        // Force reload to re-evaluate all access checks
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [freeUserViewActive, enableFreeUserView, disableFreeUserView]);

  const handleLanguageSelect = useCallback(async (newLocale: Locale) => {
    await setLocale(newLocale);
    setShowLanguagePicker(false);
  }, [setLocale]);

  const handleDemoSelect = useCallback(async (option: 'off' | DemoDuration) => {
    setShowDemoPicker(false);
    setIsProcessing(true);
    if (option === 'off') {
      await disableDemoMode();
    } else {
      await enableDemoMode(option);
    }
    await refresh();
    setIsProcessing(false);
  }, [enableDemoMode, disableDemoMode, refresh]);

  const handleGenerateData = useCallback(async () => {
    // Alert.alert doesn't work on web, just run directly
    setIsProcessing(true);
    console.log('[Orbital] Generate button pressed');
    try {
      await generateFakeData(0.5);
      await refresh();
      console.log('[Orbital] Generation complete');
    } catch (error) {
      console.error('[Orbital] Generation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [refresh]);

  const handleClearData = useCallback(async () => {
    if (logs.length === 0) {
      Alert.alert(t.settings.noData, t.settings.noDataToClear);
      return;
    }

    // Include retention disclosure in confirmation message
    const confirmMessage = `${interpolate(t.settings.clearConfirmMessage, { count: logs.length })}\n\n${DELETION_DISCLOSURE.short}`;

    Alert.alert(
      t.settings.clearConfirmTitle,
      confirmMessage,
      [
        { text: t.settings.cancel, style: 'cancel' },
        {
          text: t.settings.deleteAll,
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            await clearAll();
            setIsProcessing(false);
          },
        },
      ]
    );
  }, [logs.length, clearAll, t]);

  const handleReplayTutorial = useCallback(async () => {
    await resetTutorial();
    router.replace('/tutorial');
  }, [resetTutorial, router]);

  const demoT = (t as any).demo || {};
  const demoStatusLabel = isDemoMode ? (demoT.demoModeActive || 'Demo Active') : (demoT.demoMode || 'Demo Mode');
  const demoStatusSublabel = isDemoMode
    ? (demoT.demoModeActiveDesc || 'Using sample data')
    : (demoT.demoModeDesc || 'Load sample data');

  return (
    <SafeAreaView style={commonStyles.screen}>
      {/* FREE USER VIEW Banner — Always visible when active */}
      {freeUserViewActive && (
        <View style={styles.freeUserViewBanner}>
          <Text style={styles.freeUserViewBannerText}>{freeUserViewBanner}</Text>
        </View>
      )}
      {/* Demo Mode Banner */}
      {isDemoMode && !freeUserViewActive && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>{demoT.demoBanner || 'DEMO'}</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.logoContainer}>
          <View style={[styles.logoOrb, isDemoMode && styles.logoOrbDemo]}>
            <View style={[styles.logoInner, { backgroundColor: isDemoMode ? '#FF9800' : '#00E5FF' }]} />
          </View>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Explore Demo Modes Section - FOUNDER ONLY */}
        {isFounderDemo && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EXPLORE DEMO MODES</Text>
            <View style={[styles.modeCard, { borderColor: `${modeConfig.accentColor}40` }]}>
              <View style={styles.modeCardHeader}>
                <Text style={[styles.modeCardLabel, { color: modeConfig.accentColor }]}>
                  {modeConfig.label}
                </Text>
                {orgCode && (
                  <View style={[styles.orgCodeBadge, { backgroundColor: `${modeConfig.accentColor}20` }]}>
                    <Text style={[styles.orgCodeText, { color: modeConfig.accentColor }]}>{orgCode}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modeCardDescription}>{modeConfig.description}</Text>
              <Text style={styles.demoNotice}>Demo modes are read-only previews. No pricing or activation.</Text>
              {orgName && (
                <Text style={styles.orgNameText}>Organization: {orgName}</Text>
              )}
              <View style={styles.modeCardActions}>
                <ModeSelector />
                {modeConfig.requiresOrgCode && orgCode && (
                  <Pressable
                    style={styles.leaveOrgButton}
                    onPress={() => {
                      Alert.alert(
                        'Leave Organization',
                        `Are you sure you want to leave ${orgName || orgCode}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Leave', style: 'destructive', onPress: leaveOrg },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.leaveOrgText}>Leave Org</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}



        {/* DEVELOPER TOOLS — FREE USER VIEW (Hard Override) */}
        {isFounderDemo && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DEVELOPER TOOLS</Text>

            {/* Operator Admin View - Aggregate Signals */}
            <SettingsRow
              icon={TrendingUp}
              label="Operator Admin"
              sublabel="Aggregate signals by cohort (read-only)"
              onPress={() => router.push('/operator-admin')}
              disabled={isProcessing}
            />

            {/* FREE USER VIEW Active Banner */}
            {freeUserViewActive && (
              <View style={styles.freeUserViewActiveBanner}>
                <Text style={styles.freeUserViewActiveBannerText}>FREE USER VIEW ACTIVE</Text>
                <Text style={styles.freeUserViewActiveSubtext}>
                  All elevated access suppressed — identical to new user
                </Text>
              </View>
            )}

            {/* FREE USER VIEW Toggle */}
            <SettingsRow
              icon={FlaskConical}
              label={freeUserViewActive ? 'Exit Free User View' : 'View App as Free User'}
              sublabel={freeUserViewActive
                ? 'Tap to restore normal access'
                : 'Experience app as brand-new free user'
              }
              onPress={handleToggleFreeUserView}
              disabled={isProcessing}
              highlight={freeUserViewActive}
              danger={freeUserViewActive}
            />

            {/* Info box explaining what Free User View does */}
            <View style={styles.freeUserViewInfo}>
              <Text style={styles.freeUserViewInfoTitle}>What Free User View Blocks:</Text>
              <Text style={styles.freeUserViewInfoText}>
                • ALL Pro access{'\n'}
                • ALL Circles access{'\n'}
                • ALL Family access{'\n'}
                • ALL Institutional modes{'\n'}
                • Organization tab (HIDDEN){'\n'}
                • Briefings Org/Global scopes (HIDDEN){'\n'}
                • Sentinel demo charts (BLOCKED){'\n'}
                • CCI issuance (BLOCKED){'\n'}
                • Upgrade discounts (NONE){'\n'}
                • Admin privileges (NONE)
              </Text>
              <Text style={styles.freeUserViewInfoNote}>
                This is NOT a cosmetic toggle. Page reloads to re-evaluate permissions.
              </Text>
            </View>
          </View>
        )}

        {/* Founder QA Section (Legacy) — Only visible to founder */}
        {isFounderDemo && !freeUserViewActive && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FOUNDER QA (LEGACY)</Text>
            {qaFreeModeEnabled && (
              <View style={styles.qaFreeModeActiveBanner}>
                <Text style={styles.qaFreeModeActiveBannerText}>QA FREE MODE ACTIVE</Text>
                <Text style={styles.qaFreeModeActiveSubtext}>
                  You are experiencing Orbital as a Starter (Free) user
                </Text>
              </View>
            )}
            <SettingsRow
              icon={FlaskConical}
              label={qaFreeModeEnabled ? 'QA Free Mode (Active)' : 'QA Free Mode'}
              sublabel={qaFreeModeEnabled
                ? `Tier: ${tierLabel} · ${limits.maxSignalsPerMonth} signals/mo · ${limits.maxPatternHistoryDays}d history`
                : 'Test as Free user (allows institutional demos)'
              }
              onPress={handleToggleQAFreeMode}
              disabled={isProcessing}
              highlight={qaFreeModeEnabled}
            />
            <View style={styles.qaFreeModeInfo}>
              <Text style={styles.qaFreeModeInfoTitle}>What QA Free Mode Tests:</Text>
              <Text style={styles.qaFreeModeInfoText}>
                • No Pro entitlements{'\n'}
                • No Circle/Family/Bundle access{'\n'}
                • Limited signals ({limits.maxSignalsPerMonth}/month){'\n'}
                • Limited history ({limits.maxPatternHistoryDays} days){'\n'}
                • CCI at Free price ($199){'\n'}
                • Upgrade prompts visible{'\n'}
                • NOTE: Allows institutional demos
              </Text>
            </View>
          </View>
        )}

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.settings.preferencesSection}</Text>
          <SettingsRow
            icon={Globe}
            label={t.settings.language}
            sublabel={localeNames[locale]}
            onPress={() => setShowLanguagePicker(true)}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={Accessibility}
            label={t.accessibility?.title || 'Accessibility'}
            sublabel={t.accessibility?.subtitle || 'Customize your experience'}
            onPress={() => router.push('/accessibility')}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={RotateCcw}
            label="Replay Tutorial"
            sublabel="Review the onboarding guide"
            onPress={handleReplayTutorial}
            disabled={isProcessing}
          />
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.settings.dataSection}</Text>
          <SettingsRow
            icon={FileOutput}
            label={t.export.title}
            sublabel={interpolate(t.settings.exportSublabel, { count: logs.length })}
            onPress={() => router.push('/export')}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={Share2}
            label={t.sharing.title}
            sublabel={t.sharing.subtitle}
            onPress={() => router.push('/sharing')}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={Sparkles}
            label={t.settings.generateData}
            sublabel={t.settings.generateSublabel}
            onPress={handleGenerateData}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={Trash2}
            label={t.settings.clearData}
            sublabel={t.settings.clearSublabel}
            onPress={handleClearData}
            danger
            disabled={isProcessing}
          />
          {/* Demo Mode - FOUNDER-ONLY: only visible when EXPO_PUBLIC_FOUNDER_DEMO=1 */}
          {isFounderDemo && (
            <SettingsRow
              icon={FlaskConical}
              label={demoStatusLabel}
              sublabel={demoStatusSublabel}
              onPress={() => setShowDemoPicker(true)}
              disabled={isProcessing || isDemoLoading}
              highlight={isDemoMode}
            />
          )}
        </View>

        {/* Security & Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SECURITY & PRIVACY</Text>
          <SettingsRow
            icon={Cloud}
            label="Cloud Sync"
            sublabel="Account & backup settings"
            onPress={() => router.push('/cloud-sync')}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={Database}
            label="What Happens to My Data"
            sublabel="Plain-language data handling"
            onPress={() => router.push('/your-data')}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={ShieldCheck}
            label="Security Controls"
            sublabel="Data protection & access controls"
            onPress={() => router.push('/security-controls')}
            disabled={isProcessing}
          />
        </View>

        {/* Compliance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>COMPLIANCE</Text>
          <SettingsRow
            icon={Shield}
            label="Audit Log"
            sublabel="Sharing and export activity"
            onPress={() => router.push('/audit')}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={Scale}
            label={t.governance?.legal || 'Legal & Policies'}
            sublabel={t.governance?.legalSublabel || 'Terms, privacy, disclaimers'}
            onPress={() => router.push('/legal')}
            disabled={isProcessing}
          />
        </View>

        {/* Enterprise Section — DEMO PREVIEW ONLY */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ENTERPRISE (DEMO PREVIEW)</Text>
          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeText}>
              Sample institutional features. Contact Orbital for real access.
            </Text>
          </View>
          <SettingsRow
            icon={Activity}
            label="Sentinel Brief"
            sublabel="Demo preview — Volatility condition report"
            onPress={() => router.push('/sentinel-brief')}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={Briefcase}
            label="B2B Add-Ons"
            sublabel="Demo preview — Vertical signal authority licensing"
            onPress={() => router.push('/b2b-addons')}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={Phone}
            label="Executive Engagement"
            sublabel="Founder-led briefings — Available by request"
            onPress={() => router.push('/executive-engagement')}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={Users}
            label="Team Mode"
            sublabel="Demo preview — Contact Orbital for activation"
            onPress={() => router.push('/team-mode')}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={GraduationCap}
            label="School Zone"
            sublabel="Demo preview — Contact Orbital for activation"
            onPress={() => router.push('/school-zone')}
            disabled={isProcessing}
          />
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <SettingsRow
            icon={UserCircle}
            label="Profile"
            sublabel="Optional demographics for aggregate insights"
            onPress={() => router.push('/profile')}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={LogOut}
            label="Data Exit"
            sublabel="Export and delete all data"
            onPress={() => router.push('/data-exit')}
            disabled={isProcessing}
            danger
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.settings.aboutSection}</Text>
          <SettingsRow
            icon={Heart}
            label="Why Orbital Exists"
            sublabel="Our philosophy and principles"
            onPress={() => router.push('/why-orbital')}
            disabled={isProcessing}
          />
          <SettingsRow
            icon={Info}
            label="About Orbital"
            sublabel="Product charter and governance"
            onPress={() => router.push('/about')}
            disabled={isProcessing}
          />
          <View style={styles.aboutCard}>
            <View style={styles.versionRow}>
              <Text style={styles.appName}>{t.settings.appName}</Text>
              <Text style={styles.version}>v1.0.0</Text>
            </View>
            <Text style={styles.tagline}>{t.settings.tagline}</Text>
            <View style={styles.colorDots}>
              <View style={[styles.dot, { backgroundColor: '#00E5FF' }]} />
              <View style={[styles.dot, { backgroundColor: '#E8A830' }]} />
              <View style={[styles.dot, { backgroundColor: '#F44336' }]} />
            </View>
          </View>
        </View>

        {/* Proprietary Footer */}
        <ProprietaryFooter
          showTermsLink
          onTermsPress={() => router.push('/legal')}
        />
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLanguagePicker(false)}
        >
          <View style={styles.languagePickerContainer}>
            <View style={styles.languagePickerHeader}>
              <Text style={styles.languagePickerTitle}>{t.settings.language}</Text>
              <Pressable onPress={() => setShowLanguagePicker(false)}>
                <X color={colors.textPrimary} size={20} />
              </Pressable>
            </View>
            <ScrollView style={styles.languageList}>
              {(Object.keys(localeNames) as Locale[]).map((localeKey) => (
                <Pressable
                  key={localeKey}
                  style={[
                    styles.languageOption,
                    localeKey === locale && styles.languageOptionSelected,
                  ]}
                  onPress={() => handleLanguageSelect(localeKey)}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      localeKey === locale && styles.languageOptionTextSelected,
                    ]}
                  >
                    {localeNames[localeKey]}
                  </Text>
                  {localeKey === locale && (
                    <Check color="#00E5FF" size={18} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Demo Mode Picker Modal - FOUNDER-ONLY */}
      {isFounderDemo && (
        <Modal
          visible={showDemoPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDemoPicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDemoPicker(false)}
          >
            <View style={styles.languagePickerContainer}>
              <View style={styles.languagePickerHeader}>
                <Text style={styles.languagePickerTitle}>{demoT.demoMode || 'Demo Mode'}</Text>
                <Pressable onPress={() => setShowDemoPicker(false)}>
                  <X color={colors.textPrimary} size={20} />
                </Pressable>
              </View>
              <ScrollView style={styles.languageList}>
                <Pressable
                  style={[
                    styles.languageOption,
                    !isDemoMode && styles.languageOptionSelected,
                  ]}
                  onPress={() => handleDemoSelect('off')}
                >
                  <View>
                    <Text style={[styles.languageOptionText, !isDemoMode && styles.languageOptionTextSelected]}>
                      Off
                    </Text>
                    <Text style={styles.demoOptionSublabel}>Use real data</Text>
                  </View>
                  {!isDemoMode && <Check color="#00E5FF" size={18} />}
                </Pressable>
                <Pressable
                  style={[styles.languageOption, isDemoMode && styles.demoOptionSelected]}
                  onPress={() => handleDemoSelect('30d')}
                >
                  <View>
                    <Text style={[styles.languageOptionText, isDemoMode && styles.demoOptionTextSelected]}>
                      {demoT.duration?.['30d'] || '30 Days'}
                    </Text>
                    <Text style={styles.demoOptionSublabel}>~30 days of data</Text>
                  </View>
                </Pressable>
                <Pressable
                  style={[styles.languageOption, isDemoMode && styles.demoOptionSelected]}
                  onPress={() => handleDemoSelect('90d')}
                >
                  <View>
                    <Text style={[styles.languageOptionText, isDemoMode && styles.demoOptionTextSelected]}>
                      {demoT.duration?.['90d'] || '90 Days'}
                    </Text>
                    <Text style={styles.demoOptionSublabel}>~90 days of data</Text>
                  </View>
                </Pressable>
                <Pressable
                  style={[styles.languageOption, isDemoMode && styles.demoOptionSelected]}
                  onPress={() => handleDemoSelect('180d')}
                >
                  <View>
                    <Text style={[styles.languageOptionText, isDemoMode && styles.demoOptionTextSelected]}>
                      {demoT.duration?.['180d'] || '6 Months'}
                    </Text>
                    <Text style={styles.demoOptionSublabel}>~6 months of data</Text>
                  </View>
                </Pressable>
                <Pressable
                  style={[styles.languageOption, isDemoMode && styles.demoOptionSelected]}
                  onPress={() => handleDemoSelect('365d')}
                >
                  <View>
                    <Text style={[styles.languageOptionText, isDemoMode && styles.demoOptionTextSelected]}>
                      {demoT.duration?.['365d'] || '1 Year'}
                    </Text>
                    <Text style={styles.demoOptionSublabel}>~1 year of data</Text>
                  </View>
                </Pressable>
                {/* Multi-year options for institutional demos */}
                <Pressable
                  style={[styles.languageOption, isDemoMode && styles.demoOptionSelected]}
                  onPress={() => handleDemoSelect('3y')}
                >
                  <View>
                    <Text style={[styles.languageOptionText, isDemoMode && styles.demoOptionTextSelected]}>
                      {demoT.duration?.['3y'] || '3 Years'}
                    </Text>
                    <Text style={styles.demoOptionSublabel}>~3 years of data</Text>
                  </View>
                </Pressable>
                <Pressable
                  style={[styles.languageOption, isDemoMode && styles.demoOptionSelected]}
                  onPress={() => handleDemoSelect('5y')}
                >
                  <View>
                    <Text style={[styles.languageOptionText, isDemoMode && styles.demoOptionTextSelected]}>
                      {demoT.duration?.['5y'] || '5 Years'}
                    </Text>
                    <Text style={styles.demoOptionSublabel}>~5 years of data</Text>
                  </View>
                </Pressable>
                <Pressable
                  style={[styles.languageOption, isDemoMode && styles.demoOptionSelected]}
                  onPress={() => handleDemoSelect('10y')}
                >
                  <View>
                    <Text style={[styles.languageOptionText, isDemoMode && styles.demoOptionTextSelected]}>
                      {demoT.duration?.['10y'] || '10 Years'}
                    </Text>
                    <Text style={styles.demoOptionSublabel}>Full longitudinal record (recommended)</Text>
                  </View>
                </Pressable>
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  sublabel,
  onPress,
  danger = false,
  disabled = false,
  highlight = false,
}: {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  highlight?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  const handlePressIn = () => {
    if (!disabled) scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const iconColor = danger ? '#F44336' : highlight ? '#FF9800' : 'rgba(255,255,255,0.6)';
  const textColor = danger ? '#F44336' : highlight ? '#FF9800' : 'rgba(255,255,255,0.9)';

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.row, highlight && styles.rowHighlight, animatedStyle]}
    >
      <View style={[styles.iconContainer, danger && styles.iconContainerDanger, highlight && styles.iconContainerHighlight]}>
        <Icon color={iconColor} size={20} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
        {sublabel && <Text style={[styles.rowSublabel, highlight && styles.rowSublabelHighlight]}>{sublabel}</Text>}
      </View>
      <ChevronRight color={highlight ? '#FF9800' : 'rgba(255,255,255,0.2)'} size={18} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
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
  logoContainer: {
    alignItems: 'center',
  },
  logoOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
  },
  demoNotice: {
    backgroundColor: 'rgba(122,154,170,0.15)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  demoNoticeText: {
    fontSize: 11,
    color: '#7A9AAA',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerDanger: {
    backgroundColor: 'rgba(244,67,54,0.1)',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowSublabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  aboutCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  appName: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  version: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  colorDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  languagePickerContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: '100%',
    maxWidth: 320,
    maxHeight: 400,
  },
  languagePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  languagePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  languageList: {
    padding: spacing.sm,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.xs,
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(0,229,255,0.1)',
  },
  languageOptionText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  languageOptionTextSelected: {
    color: '#00E5FF',
    fontWeight: '500',
  },
  // Demo Mode Styles
  demoBanner: {
    backgroundColor: '#FF9800',
    paddingVertical: 4,
    alignItems: 'center',
  },
  demoBannerText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  logoOrbDemo: {
    borderColor: '#FF9800',
    borderWidth: 2,
  },
  rowHighlight: {
    borderColor: 'rgba(255,152,0,0.4)',
    backgroundColor: 'rgba(255,152,0,0.08)',
  },
  iconContainerHighlight: {
    backgroundColor: 'rgba(255,152,0,0.15)',
  },
  rowSublabelHighlight: {
    color: 'rgba(255,152,0,0.7)',
  },
  demoOptionSelected: {
    backgroundColor: 'rgba(255,152,0,0.1)',
  },
  demoOptionTextSelected: {
    color: '#FF9800',
    fontWeight: '500',
  },
  demoOptionSublabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  // Mode Card Styles
  modeCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  modeCardLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  orgCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  orgCodeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modeCardDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.xs,
  },
  orgNameText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.sm,
  },
  modeCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  leaveOrgButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(244,67,54,0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.3)',
  },
  leaveOrgText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
  },
  // Subscription Card Styles
  subscriptionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  starterBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  starterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  signalCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  subscriptionDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.md,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#00E5FF',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  redeemButtonText: {
    fontSize: 13,
    color: '#00E5FF',
  },
  // QA Free Mode Styles
  qaFreeModeActiveBanner: {
    backgroundColor: 'rgba(156,39,176,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(156,39,176,0.4)',
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  qaFreeModeActiveBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9C27B0',
    letterSpacing: 1,
  },
  qaFreeModeActiveSubtext: {
    fontSize: 11,
    color: 'rgba(156,39,176,0.8)',
    marginTop: 2,
  },
  qaFreeModeInfo: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  qaFreeModeInfoTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.xs,
  },
  qaFreeModeInfoText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 18,
  },
  // FREE USER VIEW Styles
  freeUserViewBanner: {
    backgroundColor: '#F44336',
    paddingVertical: 8,
    alignItems: 'center',
  },
  freeUserViewBannerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  freeUserViewActiveBanner: {
    backgroundColor: 'rgba(244,67,54,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(244,67,54,0.6)',
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  freeUserViewActiveBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F44336',
    letterSpacing: 1,
  },
  freeUserViewActiveSubtext: {
    fontSize: 12,
    color: 'rgba(244,67,54,0.8)',
    marginTop: 4,
  },
  freeUserViewInfo: {
    backgroundColor: 'rgba(244,67,54,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.2)',
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  freeUserViewInfoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: spacing.sm,
  },
  freeUserViewInfoText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  freeUserViewInfoNote: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(244,67,54,0.8)',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
