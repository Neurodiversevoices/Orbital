/**
 * CCI-Q4 Instrument Viewer
 *
 * View and export the Clinical Capacity Instrument (CCI-Q4) artifact.
 *
 * GOLDEN MASTER LOCKED: Visual output matches output/CCI_Q4_2025_Ultra_PatternReadable.pdf exactly.
 * Do NOT modify styling, layout, or content.
 *
 * Language: "Issuance" / "Artifact" / "Instrument" — NOT "Report"
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, FileText, Download, Eye, ExternalLink, Mail, Users } from 'lucide-react-native';
import { colors, spacing, borderRadius, commonStyles } from '../theme';
import { generateCCIArtifactHTML, getGoldenMasterHTML, getCircleGoldenMasterHTML, getBundleGoldenMasterHTML } from '../lib/cci';
import { FOUNDER_DEMO_ENABLED } from '../lib/hooks/useDemoMode';
import { ISSUANCE_REQUEST_URL } from '../lib/payments';

/**
 * CCI-Q4 is ALWAYS demo-safe: it uses hardcoded golden master data.
 * On web, we allow all visitors to view the sample instrument.
 * On native, we gate behind FOUNDER_DEMO for App Store compliance.
 */
const CCI_ACCESSIBLE = Platform.OS === 'web' || FOUNDER_DEMO_ENABLED;

export default function CCIInstrumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; seats?: string }>();

  // ========== TRACE LOGGING: CCI Type Resolution ==========
  console.log('[CCI-TRACE] ===== CCI ARTIFACT TYPE RESOLUTION =====');
  console.log('[CCI-TRACE] Raw params object:', JSON.stringify(params));
  console.log('[CCI-TRACE] params.type value:', params.type, '(typeof:', typeof params.type, ')');
  console.log('[CCI-TRACE] params.seats value:', params.seats);
  console.log('[CCI-TRACE] params.type === "circle":', params.type === 'circle');
  console.log('[CCI-TRACE] params.type === "bundle":', params.type === 'bundle');
  // =========================================================

  const cciType = params.type === 'circle' ? 'circle' : params.type === 'bundle' ? 'bundle' : 'individual';

  // ========== TRACE LOGGING: Decision Result ==========
  console.log('[CCI-TRACE] Resolved cciType:', cciType);
  if (params.type && params.type !== cciType) {
    console.error('[CCI-TRACE] ⚠️ TYPE MISMATCH: params.type was', params.type, 'but resolved to', cciType);
  }
  if (params.type === 'bundle' && cciType !== 'bundle') {
    console.error('[CCI-TRACE] 🚨 BUNDLE→INDIVIDUAL CONVERSION DETECTED HERE');
  }
  // ====================================================

  const isCircle = cciType === 'circle';
  const isBundle = cciType === 'bundle';
  const bundleSeatCount = (parseInt(params.seats || '10') as 10 | 15 | 20) || 10;

  // ========== TRACE LOGGING: Final Decision ==========
  console.log('[CCI-TRACE] isCircle:', isCircle);
  console.log('[CCI-TRACE] isBundle:', isBundle);
  console.log('[CCI-TRACE] bundleSeatCount:', bundleSeatCount);
  console.log('[CCI-TRACE] Will call:', isCircle ? 'getCircleGoldenMasterHTML()' : isBundle ? `getBundleGoldenMasterHTML(${bundleSeatCount})` : 'getGoldenMasterHTML()');
  console.log('[CCI-TRACE] =======================================');
  // ===================================================

  const [isViewing, setIsViewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Gate: Web always accessible; native requires founder demo
  if (!CCI_ACCESSIBLE) {
    return (
      <SafeAreaView style={commonStyles.screen}>
        <View style={styles.gatedContainer}>
          <Text style={styles.gatedText}>CCI Issuance not available</Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Get the golden master HTML (exact match to PDF)
  // Use appropriate artifact based on type: circle, bundle, or individual
  // ========== TRACE LOGGING: Artifact Selection ==========
  console.log('[CCI-TRACE] About to select artifact HTML...');
  // NO SILENT FALLBACK: explicit path selection with logging
  let artifactHTML: string;
  if (isCircle) {
    console.log('[CCI-TRACE] → Calling getCircleGoldenMasterHTML()');
    artifactHTML = getCircleGoldenMasterHTML();
  } else if (isBundle) {
    console.log('[CCI-TRACE] → Calling getBundleGoldenMasterHTML(' + bundleSeatCount + ')');
    artifactHTML = getBundleGoldenMasterHTML(bundleSeatCount);
  } else {
    console.log('[CCI-TRACE] → Calling getGoldenMasterHTML() [INDIVIDUAL]');
    if (params.type) {
      console.error('[CCI-TRACE] 🚨 WARNING: params.type was "' + params.type + '" but fell through to individual artifact!');
    }
    artifactHTML = getGoldenMasterHTML();
  }
  console.log('[CCI-TRACE] artifactHTML length:', artifactHTML?.length || 0);
  console.log('[CCI-TRACE] artifactHTML contains "BUNDLE":', artifactHTML?.includes('BUNDLE') || false);
  console.log('[CCI-TRACE] artifactHTML contains "Bundle":', artifactHTML?.includes('Bundle') || false);
  console.log('[CCI-TRACE] artifactHTML contains "mini-chart-card":', artifactHTML?.includes('mini-chart-card') || false);
  // ========================================================

  // View instrument in new window (web only)
  const handleViewInstrument = useCallback(() => {
    if (Platform.OS === 'web') {
      const newWindow = window.open('', '_blank', 'width=650,height=850');
      if (newWindow) {
        newWindow.document.write(artifactHTML);
        newWindow.document.close();
      }
    }
    setIsViewing(true);
  }, [artifactHTML]);

  // Download HTML file (web only)
  const handleDownloadHTML = useCallback(() => {
    if (Platform.OS === 'web') {
      const blob = new Blob([artifactHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CCI_Q4_2025_Instrument.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [artifactHTML]);

  // Export to PDF (opens print dialog)
  const handleExportPDF = useCallback(() => {
    if (Platform.OS === 'web') {
      setIsExporting(true);
      const printWindow = window.open('', '_blank', 'width=650,height=850');
      if (printWindow) {
        printWindow.document.write(artifactHTML);
        printWindow.document.close();
        // Wait for content to load, then trigger print
        setTimeout(() => {
          printWindow.print();
          setIsExporting(false);
        }, 500);
      } else {
        setIsExporting(false);
      }
    }
  }, [artifactHTML]);

  return (
    <SafeAreaView style={commonStyles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          {isCircle || isBundle ? (
            <Users size={18} color="#00E5FF" />
          ) : (
            <FileText size={18} color="#7A9AAA" />
          )}
          <Text style={styles.headerTitle}>
            {isCircle ? 'Circle CCI-Q4' : isBundle ? `Bundle CCI (${bundleSeatCount} Seats)` : 'CCI-Q4 Issuance'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Artifact Info Card */}
        <View style={[styles.infoCard, (isCircle || isBundle) && styles.infoCardCircle]}>
          <Text style={styles.infoTitle}>
            {isCircle ? 'Circle Capacity Instrument' : isBundle ? 'Bundle Capacity Instrument' : 'Clinical Capacity Instrument'}
          </Text>
          <Text style={[styles.infoSubtitle, (isCircle || isBundle) && styles.infoSubtitleCircle]}>
            {isCircle ? 'AGGREGATE CCI-Q4' : isBundle ? `${bundleSeatCount}-SEAT BUNDLE` : 'Q4 2025 Artifact'}
          </Text>

          {isCircle && (
            <View style={styles.circleNotice}>
              <Text style={styles.circleNoticeText}>
                This is an aggregate capacity summary for your Circle. No individual attribution — only group-level patterns.
              </Text>
            </View>
          )}

          {isBundle && (
            <View style={styles.circleNotice}>
              <Text style={styles.circleNoticeText}>
                Anonymous capacity summary for {bundleSeatCount} seats. No PII — avatars and aggregate patterns only.
              </Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>IMMUTABLE SNAPSHOT</Text>
            </View>
            <View style={styles.sampleBadge}>
              <Text style={styles.sampleText}>SAMPLE DATA</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Observation Window:</Text>
            <Text style={styles.metaValue}>Oct 1, 2025 – Dec 31, 2025</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Protocol:</Text>
            <Text style={styles.metaValue}>Structured EMA v4.2</Text>
          </View>

          {isCircle && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Scope:</Text>
              <Text style={styles.metaValue}>5 Circle Members (Aggregate)</Text>
            </View>
          )}

          {isBundle && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Scope:</Text>
              <Text style={styles.metaValue}>{bundleSeatCount} Anonymous Seats</Text>
            </View>
          )}

          {/* CPT 90885 Reimbursement Notice — PATCH 1 */}
          <View style={styles.cptNotice}>
            <Text style={styles.cptNoticeText}>
              Supports clinical documentation and record review (e.g., CPT 90885 review).
              Reimbursement is not guaranteed and varies by payer.
            </Text>
          </View>

          {/* Legal Reference — PATCH 2 */}
          <Pressable onPress={() => router.push('/legal')} style={styles.legalLink}>
            <Text style={styles.legalLinkText}>
              See Legal & Policies for full disclaimers
            </Text>
          </Pressable>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Issuance Actions</Text>

          {/* View Instrument */}
          <Pressable style={styles.actionButton} onPress={handleViewInstrument}>
            <View style={styles.actionIcon}>
              <Eye size={20} color="#00E5FF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Instrument</Text>
              <Text style={styles.actionDesc}>Open CCI artifact in browser window</Text>
            </View>
            <ExternalLink size={16} color="rgba(255,255,255,0.4)" />
          </Pressable>

          {/* Retrieve Filed Copy */}
          <Pressable style={styles.actionButton} onPress={handleDownloadHTML}>
            <View style={styles.actionIcon}>
              <Download size={20} color="#00E5FF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Retrieve Filed Copy (HTML)</Text>
              <Text style={styles.actionDesc}>Download artifact HTML file</Text>
            </View>
          </Pressable>

          {/* Export PDF */}
          <Pressable
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={handleExportPDF}
          >
            <View style={[styles.actionIcon, styles.actionIconPrimary]}>
              <FileText size={20} color="#000" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, styles.actionTitlePrimary]}>Export PDF</Text>
              <Text style={[styles.actionDesc, styles.actionDescPrimary]}>
                {isExporting ? 'Opening print dialog...' : 'Save as PDF via print dialog'}
              </Text>
            </View>
          </Pressable>

          {/* Request Issuance */}
          <Pressable
            style={styles.actionButton}
            onPress={() => Linking.openURL(ISSUANCE_REQUEST_URL)}
          >
            <View style={styles.actionIcon}>
              <Mail size={20} color="#00E5FF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Request Issuance</Text>
              <Text style={styles.actionDesc}>Contact us for official CCI issuance</Text>
            </View>
            <ExternalLink size={16} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>

        {/* Golden Master Notice */}
        <View style={styles.goldenMasterNotice}>
          <Text style={styles.goldenMasterTitle}>Golden Master Reference</Text>
          <Text style={styles.goldenMasterText}>
            output/CCI_Q4_2025_Ultra_PatternReadable.pdf
          </Text>
          <Text style={styles.goldenMasterDesc}>
            This artifact must match the golden master PDF exactly. Any visual deviation is a breaking change.
          </Text>
        </View>

        {/* Inline Preview (Web) */}
        {Platform.OS === 'web' && (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Artifact Preview</Text>
            <View style={styles.previewContainer}>
              <iframe
                ref={iframeRef as any}
                srcDoc={artifactHTML}
                style={{
                  width: '100%',
                  height: 600,
                  border: 'none',
                  backgroundColor: '#fff',
                  borderRadius: 4,
                }}
                title="CCI-Q4 Instrument Preview"
              />
            </View>
            <Text style={styles.artifactFooterMicro}>
              This artifact is a formatted record of self-reported capacity history. It contains no interpretation.
            </Text>
          </View>
        )}
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBack: {
    padding: spacing.sm,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  gatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  gatedText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(122,154,170,0.2)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoCardCircle: {
    borderColor: 'rgba(0,229,255,0.3)',
    backgroundColor: 'rgba(0,229,255,0.03)',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 12,
    color: '#7A9AAA',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoSubtitleCircle: {
    color: '#00E5FF',
  },
  circleNotice: {
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderRadius: 6,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  circleNoticeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metaLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginRight: spacing.sm,
  },
  metaValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  cptNotice: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(122,154,170,0.1)',
    borderRadius: 6,
    padding: spacing.sm,
  },
  cptNoticeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 16,
  },
  legalLink: {
    marginTop: spacing.sm,
  },
  legalLinkText: {
    fontSize: 11,
    color: '#7A9AAA',
    textDecorationLine: 'underline',
  },
  statusBadge: {
    backgroundColor: 'rgba(122,154,170,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7A9AAA',
    letterSpacing: 0.5,
  },
  sampleBadge: {
    backgroundColor: 'rgba(0,229,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  sampleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00E5FF',
    letterSpacing: 0.5,
  },
  actionsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  actionButtonPrimary: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,229,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionIconPrimary: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 2,
  },
  actionTitlePrimary: {
    color: '#000',
  },
  actionDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  actionDescPrimary: {
    color: 'rgba(0,0,0,0.6)',
  },
  instructionsCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  instructionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.sm,
  },
  codeBlock: {
    backgroundColor: '#0D0E12',
    borderRadius: 4,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  codeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    color: '#00E5FF',
  },
  instructionsNote: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  goldenMasterNotice: {
    backgroundColor: 'rgba(122,154,170,0.08)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(122,154,170,0.2)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  goldenMasterTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7A9AAA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  goldenMasterText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xs,
  },
  goldenMasterDesc: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  previewSection: {
    marginTop: spacing.md,
  },
  previewContainer: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  artifactFooterMicro: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
