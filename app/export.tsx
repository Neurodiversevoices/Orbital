import React from 'react';
import { View, StyleSheet, Pressable, Text, Alert, Share } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  X,
  FileText,
  Calendar,
  FileJson,
  FileSpreadsheet,
  ChevronRight,
  Briefcase,
  Building2,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles, spacing } from '../theme';
import { useExport } from '../lib/hooks/useExport';
import { useLocale } from '../lib/hooks/useLocale';
import { useInstitutional } from '../lib/hooks/useInstitutional';
import { generateExecutiveReport, formatExecutiveReportAsText } from '../lib/export';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ExportScreen() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const {
    isExporting,
    error,
    exportSummary90d,
    exportSummaryAnnual,
    exportJson,
    exportCsv,
  } = useExport();
  const { hasExecutiveReports, isEnterprise, tier } = useInstitutional();

  const handleExport90d = async () => {
    const success = await exportSummary90d(locale);
    if (!success && error === 'no_data') {
      Alert.alert(t.settings.noData, t.export.noData);
    }
  };

  const handleExportAnnual = async () => {
    const success = await exportSummaryAnnual(locale);
    if (!success && error === 'no_data') {
      Alert.alert(t.settings.noData, t.export.noData);
    }
  };

  const handleExportJson = async () => {
    const success = await exportJson();
    if (!success && error === 'no_data') {
      Alert.alert(t.settings.noData, t.export.noData);
    }
  };

  const handleExportCsv = async () => {
    const success = await exportCsv(false);
    if (!success && error === 'no_data') {
      Alert.alert(t.settings.noData, t.export.noData);
    }
  };

  const handleExportExecutiveQuarterly = async () => {
    try {
      const report = await generateExecutiveReport({ period: 'quarterly', format: 'summary_text', includeCharts: false, includeRecommendations: true }, locale);
      const text = formatExecutiveReportAsText(report, locale);
      await Share.share({
        message: text,
        title: locale === 'es' ? 'Informe Ejecutivo Trimestral' : 'Quarterly Executive Report',
      });
    } catch (error) {
      Alert.alert(t.settings.noData, t.export.noData);
    }
  };

  const handleExportExecutiveAnnual = async () => {
    try {
      const report = await generateExecutiveReport({ period: 'annual', format: 'summary_text', includeCharts: false, includeRecommendations: true }, locale);
      const text = formatExecutiveReportAsText(report, locale);
      await Share.share({
        message: text,
        title: locale === 'es' ? 'Informe Ejecutivo Anual' : 'Annual Executive Report',
      });
    } catch (error) {
      Alert.alert(t.settings.noData, t.export.noData);
    }
  };

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>{t.export.title}</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Summary Exports */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUMMARIES</Text>
          <ExportRow
            icon={FileText}
            label={t.export.ninetyDaySummary}
            sublabel={t.export.ninetyDaySublabel}
            onPress={handleExport90d}
            disabled={isExporting}
          />
          <ExportRow
            icon={Calendar}
            label={t.export.annualOverview}
            sublabel={t.export.annualSublabel}
            onPress={handleExportAnnual}
            disabled={isExporting}
          />
        </View>

        {/* Full Data Exports */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FULL DATA</Text>
          <ExportRow
            icon={FileJson}
            label={t.export.fullJson}
            sublabel={t.export.fullJsonSublabel}
            onPress={handleExportJson}
            disabled={isExporting}
          />
          <ExportRow
            icon={FileSpreadsheet}
            label={t.export.fullCsv}
            sublabel={t.export.fullCsvSublabel}
            onPress={handleExportCsv}
            disabled={isExporting}
          />
        </View>

        {/* Executive Reports - Only shown for enterprise/pilot tiers */}
        {hasExecutiveReports && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {locale === 'es' ? 'INFORMES EJECUTIVOS' : 'EXECUTIVE REPORTS'}
            </Text>
            <ExportRow
              icon={Briefcase}
              label={locale === 'es' ? 'Informe Trimestral' : 'Quarterly Report'}
              sublabel={locale === 'es' ? 'Resumen ejecutivo de 90 días' : '90-day executive summary'}
              onPress={handleExportExecutiveQuarterly}
              disabled={isExporting}
              enterprise
            />
            <ExportRow
              icon={Building2}
              label={locale === 'es' ? 'Informe Anual' : 'Annual Report'}
              sublabel={locale === 'es' ? 'Resumen ejecutivo completo del año' : 'Full year executive summary'}
              onPress={handleExportExecutiveAnnual}
              disabled={isExporting}
              enterprise
            />
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>{t.export.disclaimer}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ExportRow({
  icon: Icon,
  label,
  sublabel,
  onPress,
  disabled = false,
  enterprise = false,
}: {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  sublabel?: string;
  onPress: () => void;
  disabled?: boolean;
  enterprise?: boolean;
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

  const iconColor = enterprise ? '#00E5FF' : 'rgba(255,255,255,0.6)';
  const borderColor = enterprise ? 'rgba(0,229,255,0.2)' : colors.cardBorder;

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.row, animatedStyle, { borderColor }]}
    >
      <View style={[styles.iconContainer, enterprise && styles.iconContainerEnterprise]}>
        <Icon color={iconColor} size={20} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      <ChevronRight color="rgba(255,255,255,0.2)" size={18} />
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
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
  iconContainerEnterprise: {
    backgroundColor: 'rgba(0,229,255,0.1)',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  rowSublabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  disclaimerContainer: {
    marginTop: 'auto',
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
