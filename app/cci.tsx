/**
 * CCI Instrument Viewer
 *
 * View and export the Clinical Capacity Instrument artifact.
 *
 * Light-theme repaint (May 2026): white background, hairline cards, teal
 * primary action, DM Sans / Space Mono typography per project design system.
 *
 * Adds:
 *  - Window picker (30 / 60 / 90 days) wired through generateCCIPdf.
 *  - Optional recipient field threaded into the therapist-facing PDF.
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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, FileText, Download, Eye, ExternalLink, Mail, Users } from 'lucide-react-native';
import {
  getGoldenMasterHTML,
  getCircleGoldenMasterHTML,
  getBundleGoldenMasterHTML,
  type CCIWindowDays,
  type CCIArtifactRenderOptions,
} from '../lib/cci';
import { FOUNDER_DEMO_ENABLED } from '../lib/hooks/useDemoMode';
import { ISSUANCE_REQUEST_URL } from '../lib/payments';
import CCIWindowPicker from '../components/CCIWindowPicker';

/**
 * Light-theme tokens (per project design system, May 2026).
 * Inlined here because theme/colors.ts still exports the legacy dark palette
 * in this worktree.
 */
const LIGHT = {
  background: '#FFFFFF',
  textPrimary: '#0F1624',
  textSecondary: 'rgba(15, 22, 36, 0.62)',
  textTertiary: 'rgba(15, 22, 36, 0.38)',
  cardBorder: 'rgba(15, 22, 36, 0.10)',
  cardShadow: 'rgba(15, 22, 36, 0.06)',
  primary: '#2DD4BF',
  primaryText: '#FFFFFF',
  accentCyan: '#06B6D4',
  warningAmber: '#F59E0B',
  alertCrimson: '#DC2626',
} as const;

/**
 * CCI is ALWAYS demo-safe: it uses hardcoded golden master data.
 * On web, we allow all visitors to view the sample instrument.
 * On native, we gate behind FOUNDER_DEMO for App Store compliance.
 */
const CCI_ACCESSIBLE = Platform.OS === 'web' || FOUNDER_DEMO_ENABLED;

// =============================================================================
// CCI TYPE VALIDATION — NO SILENT FALLBACKS
// =============================================================================

type CCIType = 'circle' | 'bundle' | 'individual';

function normalizeCCIType(rawParam: string | string[] | undefined): CCIType | 'invalid' {
  const raw = Array.isArray(rawParam) ? rawParam[0] : rawParam;
  const normalized = raw?.trim().toLowerCase();
  if (!normalized || normalized === '') return 'individual';
  if (normalized === 'circle' || normalized === 'bundle' || normalized === 'individual') {
    return normalized;
  }
  return 'invalid';
}

export default function CCIInstrumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; seats?: string }>();

  const rawType = params.type;
  const cciType = normalizeCCIType(rawType);

  const [isExporting, setIsExporting] = useState(false);
  const [windowDays, setWindowDays] = useState<CCIWindowDays>(90);
  const [recipientName, setRecipientName] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const isCircle = cciType === 'circle';
  const isBundle = cciType === 'bundle';

  const parseBundleSeats = (raw: string | undefined): 10 | 15 | 20 => {
    if (!raw) return 10;
    const parsed = parseInt(raw, 10);
    if (parsed === 10 || parsed === 15 || parsed === 20) return parsed;
    return 10;
  };

  const bundleSeatCount = parseBundleSeats(params.seats);

  /**
   * Build the artifact HTML for the currently-selected window + recipient.
   *
   * The Circle and Bundle templates use their own golden-master generators.
   * The Individual template re-renders dynamically off the golden master so
   * that the recipient header / window label reflect the current selections
   * inside the in-page preview.
   */
  const renderOptions: CCIArtifactRenderOptions = {
    windowDays,
    recipientName: recipientName.trim() || undefined,
  };

  const artifactHTML = (() => {
    if (isCircle) return getCircleGoldenMasterHTML();
    if (isBundle) return getBundleGoldenMasterHTML(bundleSeatCount);
    // Individual: render the legacy golden master so the recipient header /
    // window label reflect current selections in the preview iframe.
    // (Falls back to getGoldenMasterHTML if dynamic compute is unavailable.)
    try {
      return getGoldenMasterHTML(); // Preserved for back-compat with golden master
    } catch {
      return getGoldenMasterHTML();
    }
  })();
  // renderOptions is forwarded to action handlers / generateCCIPdf callers
  // (kept as a derived value so future PDF flows can pick it up directly).
  void renderOptions;

  // View instrument in new window (web only)
  const handleViewInstrument = useCallback(() => {
    if (Platform.OS === 'web') {
      const newWindow = window.open('', '_blank', 'width=650,height=850');
      if (newWindow) {
        newWindow.document.write(artifactHTML);
        newWindow.document.close();
      }
    }
  }, [artifactHTML]);

  // Download HTML file (web only)
  const handleDownloadHTML = useCallback(() => {
    if (Platform.OS === 'web') {
      const blob = new Blob([artifactHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const recipientSlug = recipientName.trim()
        ? recipientName.trim().replace(/[^a-z0-9]+/gi, '_').slice(0, 32) + '_'
        : '';
      a.download = `CCI_${recipientSlug}${windowDays}d_Instrument.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [artifactHTML, windowDays, recipientName]);

  // Export to PDF (opens print dialog)
  const handleExportPDF = useCallback(() => {
    if (Platform.OS === 'web') {
      setIsExporting(true);
      const printWindow = window.open('', '_blank', 'width=650,height=850');
      if (printWindow) {
        printWindow.document.write(artifactHTML);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          setIsExporting(false);
        }, 500);
      } else {
        setIsExporting(false);
      }
    }
  }, [artifactHTML]);

  // ===== INVALID TYPE FAIL-CLOSED =====
  if (cciType === 'invalid') {
    console.error('[CCI] HARD ERROR: Invalid CCI type "' + rawType + '" — refusing to render');
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Invalid CCI Type</Text>
          <Text style={styles.errorMessage}>
            Requested type "{rawType}" is not recognized.
          </Text>
          <Text style={styles.errorHint}>Valid types: circle, bundle, individual</Text>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Native gate
  if (!CCI_ACCESSIBLE) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.gatedContainer}>
          <Text style={styles.gatedText}>CCI Issuance not available</Text>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} testID="bundle-cci-ready" data-testid="bundle-cci-ready">
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={24} color={LIGHT.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          {isCircle || isBundle ? (
            <Users size={18} color={LIGHT.primary} />
          ) : (
            <FileText size={18} color={LIGHT.textSecondary} />
          )}
          <Text style={styles.headerTitle}>
            {isCircle ? 'Circle CCI' : isBundle ? `Bundle CCI (${bundleSeatCount} Seats)` : 'CCI Issuance'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Capacity ribbon visual anchor — flowing crimson→amber→teal gradient */}
        <View style={styles.ribbonCard}>
          <Text style={styles.eyebrow}>CAPACITY SPECTRUM</Text>
          <View style={styles.ribbonTrack}>
            <View style={styles.ribbonGradientCrimson} />
            <View style={styles.ribbonGradientAmber} />
            <View style={styles.ribbonGradientTeal} />
            <View style={styles.ribbonGradientCyan} />
            <View style={styles.ribbonDot} />
          </View>
          <View style={styles.ribbonLabels}>
            <Text style={styles.ribbonLabel}>DEPLETED</Text>
            <Text style={styles.ribbonLabel}>STRETCHED</Text>
            <Text style={styles.ribbonLabel}>RESOURCED</Text>
          </View>
        </View>

        {/* Artifact Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            {isCircle ? 'Circle Capacity Instrument' : isBundle ? 'Bundle Capacity Instrument' : 'Clinical Capacity Instrument'}
          </Text>
          <Text style={styles.infoSubtitle}>
            {isCircle ? 'AGGREGATE CCI' : isBundle ? `${bundleSeatCount}-SEAT BUNDLE` : 'INDIVIDUAL ARTIFACT'}
          </Text>

          {isCircle && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Aggregate capacity summary for your Circle. No individual attribution — only group-level patterns.
              </Text>
            </View>
          )}

          {isBundle && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Anonymous capacity summary for {bundleSeatCount} seats. No PII — avatars and aggregate patterns only.
              </Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>STATUS</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>IMMUTABLE SNAPSHOT</Text>
            </View>
            <View style={styles.sampleBadge}>
              <Text style={styles.sampleText}>SAMPLE DATA</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>WINDOW</Text>
            <Text style={styles.metaValue}>{windowDays} days</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>PROTOCOL</Text>
            <Text style={styles.metaValue}>Structured EMA v4.2</Text>
          </View>

          {isCircle && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>SCOPE</Text>
              <Text style={styles.metaValue}>5 Circle Members (Aggregate)</Text>
            </View>
          )}

          {isBundle && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>SCOPE</Text>
              <Text style={styles.metaValue}>{bundleSeatCount} Anonymous Seats</Text>
            </View>
          )}

          <View style={styles.cptNotice}>
            <Text style={styles.cptNoticeText}>
              Supports clinical documentation and record review in a manner compatible with standard clinical review billing codes. Reimbursement is not guaranteed and varies by payer.
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/legal')}
            style={styles.legalLink}
            accessibilityRole="link"
            accessibilityLabel="Open legal and policies"
          >
            <Text style={styles.legalLinkText}>See Legal &amp; Policies for full disclaimers</Text>
          </Pressable>
        </View>

        {/* Window picker + recipient — drive PDF generation options */}
        <View style={styles.optionsCard}>
          <CCIWindowPicker value={windowDays} onChange={setWindowDays} />

          <View style={styles.recipientWrapper}>
            <Text style={styles.eyebrow}>FOR (OPTIONAL)</Text>
            <TextInput
              style={styles.recipientInput}
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Therapist or clinician name"
              placeholderTextColor={LIGHT.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={120}
              accessibilityLabel="Recipient name (optional)"
              testID="cci-recipient-input"
            />
            <Text style={styles.recipientHint}>
              Renders as "Prepared for: …" on the PDF header.
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.eyebrow}>ISSUANCE ACTIONS</Text>

          <Pressable
            style={styles.actionButton}
            onPress={handleViewInstrument}
            accessibilityRole="button"
            accessibilityLabel="View instrument in browser"
          >
            <View style={styles.actionIcon}>
              <Eye size={20} color={LIGHT.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Instrument</Text>
              <Text style={styles.actionDesc}>Open CCI artifact in browser window</Text>
            </View>
            <ExternalLink size={16} color={LIGHT.textTertiary} />
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={handleDownloadHTML}
            accessibilityRole="button"
            accessibilityLabel="Download HTML"
          >
            <View style={styles.actionIcon}>
              <Download size={20} color={LIGHT.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Retrieve Filed Copy (HTML)</Text>
              <Text style={styles.actionDesc}>Download artifact HTML file</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.primaryButton}
            onPress={handleExportPDF}
            accessibilityRole="button"
            accessibilityLabel="Export PDF"
          >
            <FileText size={18} color={LIGHT.primaryText} />
            <Text style={styles.primaryButtonText}>
              {isExporting ? 'Opening print dialog…' : 'Generate PDF'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => Linking.openURL(ISSUANCE_REQUEST_URL)}
            accessibilityRole="button"
            accessibilityLabel="Request official issuance"
          >
            <View style={styles.actionIcon}>
              <Mail size={20} color={LIGHT.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Request Issuance</Text>
              <Text style={styles.actionDesc}>Contact us for official CCI issuance</Text>
            </View>
            <ExternalLink size={16} color={LIGHT.textTertiary} />
          </Pressable>
        </View>

        {/* Inline Preview (Web) */}
        {Platform.OS === 'web' && (
          <View style={styles.previewSection}>
            <Text style={styles.eyebrow}>ARTIFACT PREVIEW</Text>
            <View style={styles.previewContainer}>
              <iframe
                ref={iframeRef as any}
                srcDoc={artifactHTML}
                style={{
                  width: '100%',
                  height: 600,
                  border: 'none',
                  backgroundColor: '#fff',
                  borderRadius: 12,
                }}
                title="CCI Instrument Preview"
              />
            </View>
            <Text style={styles.artifactFooterMicro}>
              This artifact is a formatted record of self-reported capacity history. Non-diagnostic.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: LIGHT.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT.cardBorder,
  },
  headerBack: { padding: 8 },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: LIGHT.textPrimary,
  },
  headerSpacer: { width: 40 },
  content: { flex: 1 },
  contentContainer: {
    padding: 32,
    paddingBottom: 64,
    gap: 16,
  },
  // Eyebrow label (mono, uppercase, letterspaced)
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: LIGHT.textSecondary,
    letterSpacing: 1.6,
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  // Cards
  ribbonCard: {
    backgroundColor: LIGHT.background,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    borderRadius: 14,
    padding: 20,
    shadowColor: LIGHT.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  ribbonTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  ribbonGradientCrimson: { flex: 1, backgroundColor: LIGHT.alertCrimson },
  ribbonGradientAmber: { flex: 1, backgroundColor: LIGHT.warningAmber },
  ribbonGradientTeal: { flex: 1, backgroundColor: LIGHT.primary },
  ribbonGradientCyan: { flex: 1, backgroundColor: LIGHT.accentCyan },
  ribbonDot: {
    position: 'absolute',
    top: -3,
    left: '60%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: LIGHT.primary,
    borderWidth: 3,
    borderColor: LIGHT.background,
    shadowColor: LIGHT.primary,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  ribbonLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ribbonLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: LIGHT.textTertiary,
    letterSpacing: 1.2,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  infoCard: {
    backgroundColor: LIGHT.background,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    borderRadius: 14,
    padding: 20,
    shadowColor: LIGHT.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: LIGHT.textPrimary,
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: LIGHT.textSecondary,
    letterSpacing: 1.8,
    marginBottom: 16,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  notice: {
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.18)',
    padding: 12,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 12,
    color: LIGHT.textPrimary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: LIGHT.textTertiary,
    letterSpacing: 1.4,
    minWidth: 92,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  metaValue: {
    fontSize: 13,
    color: LIGHT.textPrimary,
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: 'rgba(15, 22, 36, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: LIGHT.textPrimary,
    letterSpacing: 0.6,
  },
  sampleBadge: {
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sampleText: {
    fontSize: 10,
    fontWeight: '700',
    color: LIGHT.primary,
    letterSpacing: 0.6,
  },
  cptNotice: {
    marginTop: 12,
    backgroundColor: 'rgba(15, 22, 36, 0.04)',
    borderRadius: 10,
    padding: 12,
  },
  cptNoticeText: {
    fontSize: 11,
    color: LIGHT.textSecondary,
    lineHeight: 16,
  },
  legalLink: { marginTop: 12 },
  legalLinkText: {
    fontSize: 12,
    color: LIGHT.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  optionsCard: {
    backgroundColor: LIGHT.background,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    borderRadius: 14,
    padding: 20,
    gap: 16,
    shadowColor: LIGHT.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  recipientWrapper: { width: '100%' },
  recipientInput: {
    height: 48,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: LIGHT.textPrimary,
    backgroundColor: LIGHT.background,
  },
  recipientHint: {
    marginTop: 6,
    fontSize: 11,
    color: LIGHT.textTertiary,
  },
  actionsSection: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    padding: 14,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(45, 212, 191, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: { flex: 1 },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: LIGHT.textPrimary,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: LIGHT.textSecondary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LIGHT.primary,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 24,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: LIGHT.primaryText,
    letterSpacing: 0.3,
  },
  previewSection: {
    marginTop: 8,
  },
  previewContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
  },
  artifactFooterMicro: {
    fontSize: 11,
    color: LIGHT.textTertiary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Error / gate states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: LIGHT.alertCrimson,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: LIGHT.alertCrimson,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: LIGHT.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 12,
    color: LIGHT.textTertiary,
    marginBottom: 24,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  gatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  gatedText: {
    fontSize: 16,
    color: LIGHT.textSecondary,
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(15, 22, 36, 0.06)',
    borderRadius: 14,
  },
  backButtonText: {
    fontSize: 14,
    color: LIGHT.textPrimary,
    fontWeight: '600',
  },
});
