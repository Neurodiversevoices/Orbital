/**
 * CCI Clinical Artifact v1 — React Native Component
 *
 * Faithful translation of cci-clinical-artifact-v1.jsx (web reference)
 * into React Native View/Text/StyleSheet.
 *
 * 6-Section Layout:
 *  1. ID Header — Report ID, client ID, provider, period, version
 *  2. 90-Day Baseline — Above / Near / Below
 *  3. 30-Day Direction — Increasing / Stable / Decreasing
 *  4. Areas Showing Most Change — 3 directional items
 *  5. Coverage — X of Y days
 *  6. Governance Footer — §3060(a) CDS exclusion, FHIR readiness
 *
 * Colors are artifact-specific (NOT from theme/colors.ts).
 * Max width 380px targets EHR sidebar display.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CCIV1Data, BaselineClassification, DirectionClassification, AreaChangeDirection } from '../lib/cci/generateCCIV1Data';

// =============================================================================
// ARTIFACT-SPECIFIC COLOR PALETTE
// =============================================================================

const COLORS = {
  bg: '#01020A',
  cardBg: '#0A0C14',
  border: '#1A1D2E',
  borderAccent: '#2A2D3E',
  textPrimary: '#E8E9ED',
  textSecondary: '#8B8FA3',
  textMuted: '#5A5E72',
  cyan: '#56CCF2',
  cyanMuted: 'rgba(86, 204, 242, 0.08)',
  cyanBorder: 'rgba(86, 204, 242, 0.15)',
  amber: '#D4A843',
  amberMuted: 'rgba(212, 168, 67, 0.08)',
  amberBorder: 'rgba(212, 168, 67, 0.15)',
  crimson: '#C94444',
  crimsonMuted: 'rgba(201, 68, 68, 0.08)',
  crimsonBorder: 'rgba(201, 68, 68, 0.15)',
  white04: 'rgba(255,255,255,0.04)',
  white06: 'rgba(255,255,255,0.06)',
} as const;

// =============================================================================
// COLOR MAPPINGS
// =============================================================================

type ClassificationKey =
  | BaselineClassification
  | DirectionClassification
  | AreaChangeDirection;

interface ColorSet {
  color: string;
  bg: string;
  border: string;
}

const BASELINE_COLORS: Record<BaselineClassification, ColorSet> = {
  Above: { color: COLORS.cyan, bg: COLORS.cyanMuted, border: COLORS.cyanBorder },
  Near: { color: COLORS.amber, bg: COLORS.amberMuted, border: COLORS.amberBorder },
  Below: { color: COLORS.crimson, bg: COLORS.crimsonMuted, border: COLORS.crimsonBorder },
};

const DIRECTION_COLORS: Record<DirectionClassification, ColorSet & { icon: string }> = {
  Increasing: { color: COLORS.cyan, bg: COLORS.cyanMuted, border: COLORS.cyanBorder, icon: '↑' },
  Stable: { color: COLORS.amber, bg: COLORS.amberMuted, border: COLORS.amberBorder, icon: '→' },
  Decreasing: { color: COLORS.crimson, bg: COLORS.crimsonMuted, border: COLORS.crimsonBorder, icon: '↓' },
};

const AREA_DIRECTION_COLORS: Record<AreaChangeDirection, { color: string; icon: string }> = {
  Increased: { color: COLORS.cyan, icon: '↑' },
  Decreased: { color: COLORS.crimson, icon: '↓' },
  'Remained Stable': { color: COLORS.amber, icon: '→' },
};

// =============================================================================
// HELPERS
// =============================================================================

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getBaselineBarWidth(baseline: BaselineClassification): string {
  switch (baseline) {
    case 'Above': return '85%';
    case 'Near': return '50%';
    case 'Below': return '20%';
  }
}

// =============================================================================
// PROPS
// =============================================================================

export interface CCIClinicalArtifactProps {
  data: CCIV1Data;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function SectionDivider() {
  return <View style={styles.divider} />;
}

function MonoLabel({ children }: { children: string }) {
  return <Text style={styles.monoLabel}>{children}</Text>;
}

function StatusChip({
  label,
  colorSet,
}: {
  label: string;
  colorSet: ColorSet;
}) {
  return (
    <View
      style={[
        styles.statusChip,
        {
          backgroundColor: colorSet.bg,
          borderColor: colorSet.border,
        },
      ]}
    >
      <Text style={[styles.statusChipText, { color: colorSet.color }]}>
        {label}
      </Text>
    </View>
  );
}

/** Section 1: ID Header */
function IDHeader({ data }: { data: CCIV1Data }) {
  return (
    <View style={styles.sectionPadding}>
      {/* Top row: title + report ID */}
      <View style={styles.headerTopRow}>
        <View>
          <Text style={styles.headerTitle}>Clinical Capacity Instrument</Text>
          <Text style={styles.headerSubtitle}>
            {data.instrumentVersion} • {data.fhirResourceType}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.reportIdText}>{data.reportId}</Text>
          <Text style={styles.headerDateText}>
            {formatDisplayDate(data.generatedDate)}
          </Text>
        </View>
      </View>

      {/* Metadata grid */}
      <View style={styles.metaGrid}>
        <View style={styles.metaCell}>
          <MonoLabel>Client ID</MonoLabel>
          <Text style={styles.metaValue}>{data.clientId}</Text>
        </View>
        <View style={styles.metaCell}>
          <MonoLabel>Provider</MonoLabel>
          <Text style={styles.metaValueSmall}>{data.providerName}</Text>
        </View>
        <View style={styles.metaCell}>
          <MonoLabel>Period</MonoLabel>
          <Text style={styles.metaValueSmall}>
            {formatDisplayDate(data.periodStart)} — {formatDisplayDate(data.periodEnd)}
          </Text>
        </View>
        <View style={styles.metaCell}>
          <MonoLabel>NPI</MonoLabel>
          <Text style={styles.metaValueSmall}>{data.providerNPI}</Text>
        </View>
      </View>
    </View>
  );
}

/** Section 2: 90-Day Baseline */
function BaselineSection({ baseline }: { baseline: BaselineClassification }) {
  const colorSet = BASELINE_COLORS[baseline];
  return (
    <View style={styles.sectionPadding}>
      <View style={styles.sectionRow}>
        <MonoLabel>90-Day Baseline</MonoLabel>
        <StatusChip label={baseline} colorSet={colorSet} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: getBaselineBarWidth(baseline) as any,
              backgroundColor: colorSet.color,
            },
          ]}
        />
        {/* Tick marks */}
        <View style={[styles.tickMark, { left: '20%' }]} />
        <View style={[styles.tickMark, { left: '50%' }]} />
        <View style={[styles.tickMark, { left: '80%' }]} />
      </View>
    </View>
  );
}

/** Section 3: 30-Day Direction */
function DirectionSection({ direction }: { direction: DirectionClassification }) {
  const dirSet = DIRECTION_COLORS[direction];
  return (
    <View style={styles.sectionPadding}>
      <View style={styles.sectionRow}>
        <MonoLabel>30-Day Direction</MonoLabel>
        <View
          style={[
            styles.statusChip,
            {
              backgroundColor: dirSet.bg,
              borderColor: dirSet.border,
            },
          ]}
        >
          <Text style={[styles.directionIcon, { color: dirSet.color }]}>
            {dirSet.icon}
          </Text>
          <Text style={[styles.statusChipText, { color: dirSet.color }]}>
            {direction}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Section 4: Areas Showing Most Change */
function AreasOfChangeSection({ areas }: { areas: CCIV1Data['areasOfChange'] }) {
  return (
    <View style={styles.sectionPadding}>
      <MonoLabel>Areas Showing Most Change</MonoLabel>
      <View style={styles.areasList}>
        {areas.map((item, i) => {
          const dirStyle =
            AREA_DIRECTION_COLORS[item.direction] ??
            AREA_DIRECTION_COLORS['Remained Stable'];
          return (
            <View
              key={`${item.area}-${i}`}
              style={[
                styles.areaRow,
                { borderLeftColor: dirStyle.color },
              ]}
            >
              <Text style={styles.areaName}>{item.area}</Text>
              <View style={styles.areaDirectionContainer}>
                <Text style={[styles.areaDirectionIcon, { color: dirStyle.color }]}>
                  {dirStyle.icon}
                </Text>
                <Text style={[styles.areaDirectionText, { color: dirStyle.color }]}>
                  {item.direction}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Section 5: Coverage */
function CoverageSection({
  days,
  total,
}: {
  days: number;
  total: number;
}) {
  const pct = Math.round((days / total) * 100);
  const gradientColor = pct > 70 ? COLORS.cyan : COLORS.amber;

  return (
    <View style={styles.sectionPadding}>
      <View style={styles.sectionRow}>
        <MonoLabel>Coverage</MonoLabel>
        <Text style={styles.coverageValue}>
          {days} of {total} days
        </Text>
      </View>

      {/* Coverage bar */}
      <View style={styles.coverageTrack}>
        <View
          style={[
            styles.coverageFill,
            {
              width: `${pct}%` as any,
              backgroundColor: gradientColor,
            },
          ]}
        />
      </View>
      <Text style={styles.coveragePctText}>{pct}% DATA COVERAGE</Text>
    </View>
  );
}

/** Section 6: Governance Footer */
function GovernanceFooter({ data }: { data: CCIV1Data }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        This instrument is generated from self-reported capacity check-ins and
        does not constitute a pattern identification conclusion, support recommendation, or
        observational tool output. Excluded from Clinical Decision Support
        requirements under 21st Century Cures Act Section 3060(a). Provider
        interpretation required.
      </Text>
      <View style={styles.footerBottomRow}>
        <Text style={styles.footerMeta}>
          ORBITAL HEALTH • {data.instrumentVersion}
        </Text>
        <Text style={styles.footerMeta}>FHIR DocumentReference Ready</Text>
      </View>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CCIClinicalArtifact({ data }: CCIClinicalArtifactProps) {
  return (
    <View style={styles.outerContainer}>
      {/* Context label */}
      <Text style={styles.contextLabel}>
        EHR Sidebar • Clinical Capacity Instrument
      </Text>

      {/* Main card */}
      <View style={styles.card}>
        <IDHeader data={data} />
        <SectionDivider />
        <BaselineSection baseline={data.baseline90Day} />
        <SectionDivider />
        <DirectionSection direction={data.direction30Day} />
        <SectionDivider />
        <AreasOfChangeSection areas={data.areasOfChange} />
        <SectionDivider />
        <CoverageSection days={data.coverageDays} total={data.coverageTotal} />
        <GovernanceFooter data={data} />
      </View>

      {/* FHIR metadata tag */}
      <View style={styles.fhirMetaRow}>
        <Text style={styles.fhirMetaText}>resourceType: DocumentReference</Text>
        <Text style={styles.fhirMetaText}>status: current</Text>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },

  // Context label
  contextLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: 8,
    paddingLeft: 2,
  },

  // Card
  card: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
  },

  // Section spacing
  sectionPadding: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  // Shared section row (label left, chip right)
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Mono label
  monoLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    fontWeight: '400',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
  },

  // Status chip
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusChipText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.5,
  },

  // ── Section 1: ID Header ──
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.15,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  reportIdText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.cyan,
  },
  headerDateText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Metadata grid
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    padding: 10,
    backgroundColor: COLORS.white04,
    borderRadius: 6,
    gap: 8,
  },
  metaCell: {
    width: '47%',
  },
  metaValue: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  metaValueSmall: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: 2,
  },

  // ── Section 2: Baseline progress bar ──
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.white04,
    marginTop: 10,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 2,
    opacity: 0.6,
  },
  tickMark: {
    position: 'absolute',
    top: -1,
    width: 1,
    height: 6,
    backgroundColor: COLORS.borderAccent,
  },

  // ── Section 3: Direction ──
  directionIcon: {
    fontSize: 15,
    lineHeight: 16,
  },

  // ── Section 4: Areas of Change ──
  areasList: {
    marginTop: 10,
    gap: 6,
  },
  areaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white04,
    borderRadius: 6,
    borderLeftWidth: 2,
  },
  areaName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  areaDirectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  areaDirectionIcon: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 13,
  },
  areaDirectionText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
  },

  // ── Section 5: Coverage ──
  coverageValue: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  coverageTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white04,
    overflow: 'hidden',
    marginTop: 8,
  },
  coverageFill: {
    height: '100%',
    borderRadius: 3,
    opacity: 0.7,
  },
  coveragePctText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },

  // ── Section 6: Governance Footer ──
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white06,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 8,
    lineHeight: 14,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  footerBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  footerMeta: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 8,
    color: COLORS.textMuted,
  },

  // ── FHIR metadata tag ──
  fhirMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 2,
    opacity: 0.6,
  },
  fhirMetaText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 8,
    color: COLORS.textMuted,
  },
});
