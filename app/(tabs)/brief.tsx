/**
 * Briefings Tab — B2C Only
 *
 * 1. Personal → Individual CCI Demo Brief (links to /cci)
 * 2. Circles  → Circle CCI Demo
 *
 * GOVERNANCE:
 * - All views are DEMO-ONLY (visible to all users)
 * - No Organization/Global tabs (those are B2B/enterprise)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Rect, Line, Text as SvgText, Defs, LinearGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import {
  User,
  Users,
  FileText,
  ChevronRight,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutGrid,
  Link2,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { useAccess } from '../../lib/access';

// =============================================================================
// TYPES
// =============================================================================

type BriefScope = 'personal' | 'circles';

interface ScopeTab {
  id: BriefScope;
  label: string;
  icon: React.ComponentType<{ color: string; size: number }>;
}

const SCOPE_TABS: ScopeTab[] = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'circles', label: 'Circles', icon: Users },
];

// =============================================================================
// DEMO DATA FOR CIRCLES
// =============================================================================

interface CircleMember {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  capacityState: 'resourced' | 'stretched' | 'depleted';
  trend: 'improving' | 'declining' | 'flat';
  participation: string;
  notes?: string;
  capacityHistory: number[]; // 90 days of capacity data (1=depleted, 2=stretched, 3=resourced)
}

// =============================================================================
// CAPACITY COLOR SYSTEM — Matches Individual CCI
// =============================================================================

// Get color based on capacity value (cyan=high, yellow=middle, red=low)
function getCapacityColor(value: number): string {
  if (value >= 2.5) return '#00D7FF'; // Cyan - Resourced
  if (value >= 2.0) return '#10B981'; // Green - Good
  if (value >= 1.5) return '#E8A830'; // Yellow - Stretched
  return '#F44336'; // Red - Depleted
}

// =============================================================================
// FABRICATED DEMO DATA — Simulating years of real user tracking
// =============================================================================

// Fabricate realistic 90-day capacity pattern for demo
// These patterns simulate what real users would see after months/years of tracking
const FABRICATED_HISTORIES: Record<string, number[]> = {
  // Mia: Stable in stretched range with some good days
  mia: [
    2.1, 2.0, 1.9, 2.0, 2.2, 2.3, 2.1, 2.0, 1.8, 1.9,
    2.0, 2.1, 2.2, 2.0, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8,
    1.9, 2.0, 2.1, 2.2, 2.1, 2.0, 2.0, 1.9, 2.0, 2.1,
    2.0, 1.9, 1.8, 1.9, 2.0, 2.1, 2.2, 2.1, 2.0, 1.9,
    2.0, 2.1, 2.0, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8, 1.9,
    2.0, 2.1, 2.2, 2.1, 2.0, 1.9, 2.0, 2.1, 2.0, 1.9,
    1.8, 1.9, 2.0, 2.1, 2.0, 1.9, 2.0, 2.1, 2.2, 2.1,
    2.0, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8, 1.9, 2.0, 2.1,
    2.0, 1.9, 2.0, 2.1, 2.2, 2.1, 2.0, 1.9, 2.0, 2.0,
  ],
  // Zach: Clear declining pattern - started resourced, now in sentinel range
  zach: [
    2.8, 2.7, 2.8, 2.6, 2.7, 2.5, 2.6, 2.4, 2.5, 2.3,
    2.4, 2.3, 2.2, 2.3, 2.1, 2.2, 2.0, 2.1, 2.0, 1.9,
    2.0, 1.9, 1.8, 1.9, 1.8, 1.7, 1.8, 1.7, 1.6, 1.7,
    1.6, 1.7, 1.6, 1.5, 1.6, 1.5, 1.6, 1.5, 1.4, 1.5,
    1.4, 1.5, 1.4, 1.5, 1.4, 1.3, 1.4, 1.3, 1.4, 1.3,
    1.4, 1.3, 1.4, 1.3, 1.2, 1.3, 1.2, 1.3, 1.4, 1.3,
    1.2, 1.3, 1.2, 1.3, 1.2, 1.3, 1.2, 1.1, 1.2, 1.3,
    1.2, 1.1, 1.2, 1.3, 1.2, 1.1, 1.2, 1.1, 1.2, 1.1,
    1.2, 1.1, 1.2, 1.1, 1.0, 1.1, 1.2, 1.1, 1.0, 1.1,
  ],
  // Lily: Improving pattern - started low, now resourced
  lily: [
    1.4, 1.5, 1.4, 1.5, 1.6, 1.5, 1.6, 1.7, 1.6, 1.7,
    1.8, 1.7, 1.8, 1.9, 1.8, 1.9, 2.0, 1.9, 2.0, 2.1,
    2.0, 2.1, 2.2, 2.1, 2.2, 2.3, 2.2, 2.3, 2.4, 2.3,
    2.4, 2.3, 2.4, 2.5, 2.4, 2.5, 2.4, 2.5, 2.6, 2.5,
    2.6, 2.5, 2.6, 2.5, 2.6, 2.7, 2.6, 2.7, 2.6, 2.7,
    2.6, 2.7, 2.8, 2.7, 2.8, 2.7, 2.8, 2.7, 2.8, 2.9,
    2.8, 2.7, 2.8, 2.9, 2.8, 2.7, 2.8, 2.9, 2.8, 2.9,
    2.8, 2.9, 2.8, 2.9, 2.8, 2.9, 3.0, 2.9, 2.8, 2.9,
    3.0, 2.9, 2.8, 2.9, 3.0, 2.9, 2.8, 2.9, 3.0, 2.9,
  ],
  // Tyler: Volatile pattern - unpredictable swings
  tyler: [
    2.2, 1.8, 2.4, 1.6, 2.6, 1.9, 2.1, 1.4, 2.5, 1.7,
    2.3, 1.5, 2.7, 1.8, 2.0, 1.3, 2.4, 1.6, 2.2, 1.9,
    2.5, 1.4, 2.1, 1.7, 2.6, 1.5, 2.3, 1.8, 2.0, 1.4,
    2.4, 1.6, 2.2, 1.9, 2.5, 1.3, 2.1, 1.7, 2.6, 1.5,
    2.3, 1.8, 2.0, 1.4, 2.4, 1.6, 2.2, 1.9, 2.5, 1.3,
    2.1, 1.7, 2.6, 1.5, 2.3, 1.8, 2.0, 1.4, 2.4, 1.6,
    2.2, 1.9, 2.5, 1.3, 2.1, 1.7, 2.6, 1.5, 2.3, 1.8,
    2.0, 1.4, 2.4, 1.6, 2.2, 1.9, 2.5, 1.3, 2.1, 1.7,
    2.6, 1.5, 2.3, 1.8, 2.0, 1.4, 2.4, 1.6, 2.2, 1.8,
  ],
  // Emma: Gradual decline with recent dip
  emma: [
    2.6, 2.5, 2.6, 2.5, 2.4, 2.5, 2.4, 2.3, 2.4, 2.3,
    2.4, 2.3, 2.2, 2.3, 2.2, 2.3, 2.2, 2.1, 2.2, 2.1,
    2.2, 2.1, 2.0, 2.1, 2.0, 2.1, 2.0, 1.9, 2.0, 1.9,
    2.0, 1.9, 2.0, 1.9, 1.8, 1.9, 1.8, 1.9, 1.8, 1.7,
    1.8, 1.7, 1.8, 1.7, 1.8, 1.7, 1.6, 1.7, 1.6, 1.7,
    1.6, 1.7, 1.6, 1.5, 1.6, 1.5, 1.6, 1.5, 1.6, 1.5,
    1.4, 1.5, 1.4, 1.5, 1.4, 1.5, 1.4, 1.3, 1.4, 1.3,
    1.4, 1.3, 1.4, 1.3, 1.2, 1.3, 1.2, 1.3, 1.2, 1.3,
    1.2, 1.1, 1.2, 1.1, 1.2, 1.1, 1.2, 1.1, 1.2, 1.2,
  ],
};

const DEMO_CIRCLE_MEMBERS: CircleMember[] = [
  { id: '1', name: 'Mia', username: 'Mia Anderson', avatar: 'https://i.pravatar.cc/100?u=mia', capacityState: 'stretched', trend: 'flat', participation: '6 / 7', notes: 'Sensory sensitivity noted', capacityHistory: FABRICATED_HISTORIES.mia },
  { id: '2', name: 'Zach', username: 'Zach Teguns', avatar: 'https://i.pravatar.cc/100?u=zach', capacityState: 'depleted', trend: 'declining', participation: '7 / 7', notes: 'Sleep disruption', capacityHistory: FABRICATED_HISTORIES.zach },
  { id: '3', name: 'Lily', username: 'Lily Teguns', avatar: 'https://i.pravatar.cc/100?u=lily', capacityState: 'resourced', trend: 'improving', participation: '5 / 5', notes: 'Steady progress', capacityHistory: FABRICATED_HISTORIES.lily },
  { id: '4', name: 'Tyler', username: 'Tyler Ramirez', avatar: 'https://i.pravatar.cc/100?u=tyler', capacityState: 'stretched', trend: 'flat', participation: '5 / 5', notes: 'Transition support', capacityHistory: FABRICATED_HISTORIES.tyler },
  { id: '5', name: 'Emma', username: 'Emily Zhang', avatar: 'https://i.pravatar.cc/100?u=emma', capacityState: 'depleted', trend: 'declining', participation: '5 / 5', notes: 'Schedule changes', capacityHistory: FABRICATED_HISTORIES.emma },
];

// =============================================================================
// CAPACITY TREND CHART COMPONENT (90-DAY, INDIVIDUAL CCI STYLE)
// =============================================================================

interface CapacityTrendChartProps {
  members: CircleMember[];
  width?: number;
}

function CapacityTrendChart({ members, width: containerWidth }: CapacityTrendChartProps) {
  // Responsive dimensions - use viewBox for scaling
  const viewBoxWidth = 500;
  const viewBoxHeight = 200;
  const padding = { top: 15, right: 70, bottom: 30, left: 5 };
  const graphWidth = viewBoxWidth - padding.left - padding.right;
  const graphHeight = viewBoxHeight - padding.top - padding.bottom;

  // Band heights (Resourced top, Stretched middle, Sentinel bottom)
  const bandHeight = graphHeight / 3;

  // Scale for 90 days
  const dataPoints = 90;
  const xScale = graphWidth / (dataPoints - 1);

  // Convert capacity value (1-3) to Y coordinate
  const valueToY = (value: number) => {
    // value 3 = top, value 1 = bottom
    const normalized = (value - 1) / 2; // 0 to 1
    return padding.top + graphHeight - (normalized * graphHeight);
  };

  // Generate smooth bezier curve path for a member's capacity history
  const generateSmoothPath = (history: number[]) => {
    if (history.length < 2) return '';

    const points = history.map((value, index) => ({
      x: padding.left + index * xScale,
      y: valueToY(value),
    }));

    // Create smooth bezier curve
    let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const tension = 0.3;

      // Control points for smooth curve
      const cp1x = prev.x + (curr.x - prev.x) * tension;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * tension;
      const cp2y = curr.y;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }

    return path;
  };

  // Get key data points for dots (monthly markers: day 0, 30, 60, 89)
  const getKeyPoints = (history: number[]) => {
    const indices = [0, 30, 60, 89];
    return indices.map(i => ({
      x: padding.left + i * xScale,
      y: valueToY(history[i]),
      value: history[i],
      color: getCapacityColor(history[i]),
    }));
  };

  return (
    <Svg
      width="100%"
      height={containerWidth ? containerWidth * 0.4 : 180}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background bands */}
      <Rect
        x={padding.left}
        y={padding.top}
        width={graphWidth}
        height={bandHeight}
        fill="rgba(0, 215, 255, 0.08)"
      />
      <Rect
        x={padding.left}
        y={padding.top + bandHeight}
        width={graphWidth}
        height={bandHeight}
        fill="rgba(232, 168, 48, 0.08)"
      />
      <Rect
        x={padding.left}
        y={padding.top + bandHeight * 2}
        width={graphWidth}
        height={bandHeight}
        fill="rgba(244, 67, 54, 0.08)"
      />

      {/* Grid lines */}
      <Line
        x1={padding.left}
        y1={padding.top + bandHeight}
        x2={padding.left + graphWidth}
        y2={padding.top + bandHeight}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={0.5}
        strokeDasharray="4,4"
      />
      <Line
        x1={padding.left}
        y1={padding.top + bandHeight * 2}
        x2={padding.left + graphWidth}
        y2={padding.top + bandHeight * 2}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={0.5}
        strokeDasharray="4,4"
      />

      {/* Member trend lines - smooth curves */}
      {members.map((member) => (
        <Path
          key={`line-${member.id}`}
          d={generateSmoothPath(member.capacityHistory)}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Colored dots at key data points for each member */}
      {members.map((member) =>
        getKeyPoints(member.capacityHistory).map((point, idx) => (
          <SvgCircle
            key={`dot-${member.id}-${idx}`}
            cx={point.x}
            cy={point.y}
            r={6}
            fill={point.color}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={1}
          />
        ))
      )}

      {/* Y-axis labels */}
      <SvgText
        x={padding.left + graphWidth + 8}
        y={padding.top + bandHeight / 2 + 4}
        fill="#00D7FF"
        fontSize={11}
        fontWeight="500"
      >
        Resourced
      </SvgText>
      <SvgText
        x={padding.left + graphWidth + 8}
        y={padding.top + bandHeight * 1.5 + 4}
        fill="#E8A830"
        fontSize={11}
        fontWeight="500"
      >
        Stretched
      </SvgText>
      <SvgText
        x={padding.left + graphWidth + 8}
        y={padding.top + bandHeight * 2.5 + 4}
        fill="#F44336"
        fontSize={11}
        fontWeight="500"
      >
        Sentinel
      </SvgText>

      {/* X-axis labels - months */}
      <SvgText
        x={padding.left}
        y={viewBoxHeight - 8}
        fill="rgba(255,255,255,0.5)"
        fontSize={10}
      >
        Oct
      </SvgText>
      <SvgText
        x={padding.left + graphWidth / 3}
        y={viewBoxHeight - 8}
        fill="rgba(255,255,255,0.5)"
        fontSize={10}
      >
        Nov
      </SvgText>
      <SvgText
        x={padding.left + (graphWidth * 2) / 3}
        y={viewBoxHeight - 8}
        fill="rgba(255,255,255,0.5)"
        fontSize={10}
      >
        Dec
      </SvgText>
      <SvgText
        x={padding.left + graphWidth - 5}
        y={viewBoxHeight - 8}
        fill="rgba(255,255,255,0.5)"
        fontSize={10}
      >
        Today
      </SvgText>
    </Svg>
  );
}

// =============================================================================
// SPARKLINE COMPONENT FOR TABLE ROWS — Matches Individual CCI Style
// =============================================================================

interface MemberSparklineProps {
  data: number[];
  width?: number;
  height?: number;
}

function MemberSparkline({ data, width = 100, height = 24 }: MemberSparklineProps) {
  // Use last 30 days for sparkline
  const sparkData = data.slice(-30);
  const xScale = width / (sparkData.length - 1);
  const minVal = 1;
  const maxVal = 3;

  // Convert value to Y coordinate
  const valueToY = (value: number) => {
    const normalized = (value - minVal) / (maxVal - minVal);
    return height - (normalized * height);
  };

  // Generate smooth bezier path
  const points = sparkData.map((value, index) => ({
    x: index * xScale,
    y: valueToY(value),
  }));

  let pathData = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const tension = 0.3;
    const cp1x = prev.x + (curr.x - prev.x) * tension;
    const cp2x = curr.x - (curr.x - prev.x) * tension;
    pathData += ` C ${cp1x.toFixed(1)} ${prev.y.toFixed(1)}, ${cp2x.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }

  // Key points for dots (start, middle, end)
  const keyIndices = [0, Math.floor(sparkData.length / 2), sparkData.length - 1];
  const keyPoints = keyIndices.map(i => ({
    x: i * xScale,
    y: valueToY(sparkData[i]),
    color: getCapacityColor(sparkData[i]),
  }));

  return (
    <Svg width={width} height={height}>
      {/* Smooth line */}
      <Path
        d={pathData}
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Colored dots at key points */}
      {keyPoints.map((point, idx) => (
        <SvgCircle
          key={idx}
          cx={point.x}
          cy={point.y}
          r={3}
          fill={point.color}
        />
      ))}
    </Svg>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BriefingsScreen() {
  const [scope, setScope] = useState<BriefScope>('personal');
  const { freeUserViewActive, freeUserViewBanner } = useAccess();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* FREE USER VIEW Banner */}
      {freeUserViewActive && (
        <View style={styles.freeUserViewBanner}>
          <Text style={styles.freeUserViewBannerText}>{freeUserViewBanner}</Text>
        </View>
      )}

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Briefings</Text>
        <Text style={styles.headerSubtitle}>
          {freeUserViewActive
            ? 'Personal capacity intelligence'
            : 'Capacity intelligence across scopes'}
        </Text>
      </Animated.View>

      {/* Scope Tabs */}
      <View style={styles.tabContainer}>
        {SCOPE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = scope === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setScope(tab.id)}
            >
              <Icon
                color={isActive ? '#00D7FF' : 'rgba(255,255,255,0.5)'}
                size={18}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content based on scope */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {scope === 'personal' && <PersonalBrief />}
        {scope === 'circles' && <CirclesCCIBrief />}
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// PERSONAL TAB — CCI Demo Brief
// =============================================================================

function PersonalBrief() {
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      {/* Demo Banner */}
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>DEMO / SAMPLE</Text>
      </View>

      {/* CCI Card */}
      <Pressable
        style={styles.cciCard}
        onPress={() => router.push('/cci')}
      >
        <View style={styles.cciHeader}>
          <View style={styles.cciIconContainer}>
            <FileText color="#00D7FF" size={28} />
          </View>
          <ChevronRight color="rgba(255,255,255,0.3)" size={24} />
        </View>

        <Text style={styles.cciTitle}>Clinical Capacity Instrument</Text>
        <Text style={styles.cciSubtitle}>CCI-Q4</Text>

        <Text style={styles.cciDescription}>
          Your personal capacity signal rendered as a clinical-grade instrument.
          Demo data shown — real issuance reflects your actual capacity patterns.
        </Text>

        <View style={styles.cciCta}>
          <Text style={styles.cciCtaText}>View CCI-Q4</Text>
          <ChevronRight color="#00D7FF" size={18} />
        </View>
      </Pressable>

      {/* Info Note */}
      <View style={styles.infoNote}>
        <Text style={styles.infoNoteText}>
          The CCI-Q4 artifact is generated from your capacity signals.
          {'\n'}More signals = more accurate instrument.
        </Text>
      </View>
    </Animated.View>
  );
}

// =============================================================================
// CIRCLES TAB — Circle CCI Demo (Pro Only)
// =============================================================================

function CirclesCCIBrief() {
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 768;

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      {/* Demo Banner */}
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>DEMO / SAMPLE</Text>
      </View>

      {/* Admin Breadcrumb */}
      <View style={styles.breadcrumb}>
        <LayoutGrid color="rgba(255,255,255,0.5)" size={14} />
        <Text style={styles.breadcrumbText}>Admin</Text>
        <Text style={styles.breadcrumbSeparator}>/</Text>
        <Text style={styles.breadcrumbActive}>Sensory Support Group</Text>
      </View>

      {/* Circle Header */}
      <View style={styles.circleHeader}>
        <View style={styles.circleHeaderLeft}>
          <Text style={styles.circleTitle}>SENSORY SUPPORT GROUP</Text>
          <Text style={styles.circleSubtitle}>Circle Coordinator: Emily Zhang</Text>
        </View>
        <View style={styles.circleHeaderRight}>
          <View style={styles.circleMemberBadge}>
            <Text style={styles.circleMemberBadgeText}>5 / 5 Members</Text>
          </View>
          <Pressable style={styles.lingsButton}>
            <Link2 color="#00D7FF" size={14} />
            <Text style={styles.lingsButtonText}>LINGS</Text>
          </Pressable>
        </View>
      </View>

      {/* CCI Description Row - Side by side on wide screens */}
      <View style={[styles.cciDescriptionRow, isWideScreen && styles.cciDescriptionRowWide]}>
        {/* Left: CCI Description */}
        <View style={[styles.circleCCICard, isWideScreen && { flex: 1, marginRight: spacing.md }]}>
          <Text style={styles.circleCCITitle}>CIRCLE CAPACITY INDEX (CCI)</Text>
          <Text style={styles.circleCCIDescription}>
            A non-diagnostic, aggregate snapshot of a group's{' '}
            <Text style={styles.circleCCIHighlight}>functional regulation bandwidth</Text>
            {' '}over time — reflecting how much emotional, cognitive, sensory, and social load the group can tolerate before regulation begins to degrade.
          </Text>
          <Text style={styles.circleCCINote}>
            This report summarizes patterns, not individuals. No diagnoses. No symptom scoring
          </Text>
        </View>

        {/* Right: Data Confidence */}
        <View style={[styles.dataConfidenceCard, isWideScreen && { flex: 0.4 }]}>
          <View style={styles.dataConfidenceHeader}>
            <CheckCircle color="#10B981" size={20} />
            <Text style={styles.dataConfidenceTitle}>Data Confidence:</Text>
            <Text style={styles.dataConfidenceValue}>High</Text>
          </View>
          <Text style={styles.dataConfidenceText}>
            Based on consistent participation and stable reporting patterns across members.
          </Text>
        </View>
      </View>

      {/* Two Column Layout - Table left, Chart right */}
      <View style={[styles.twoColumnContainer, isWideScreen && styles.twoColumnContainerWide]}>
        {/* LEFT COLUMN: Table + CTAs */}
        <View style={[styles.leftColumn, isWideScreen && { flex: 0.55 }]}>
          {/* Circle Status Table */}
          <View style={styles.circleStatusSection}>
            <Text style={styles.circleStatusTitle}>Circle Status</Text>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>MEMBER</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>CAPACITY STATE</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>30-DAY TREND</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.6 }]}>PARTICIPATION</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>NOTES</Text>
            </View>

            {/* Table Rows */}
            {DEMO_CIRCLE_MEMBERS.map((member) => (
              <View key={member.id} style={styles.tableRow}>
                {/* Member */}
                <View style={[styles.tableCell, { flex: 1.3, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  {member.avatar ? (
                    <Image source={{ uri: member.avatar }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{member.name[0]}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberUsername}>{member.username}</Text>
                  </View>
                </View>

                {/* Capacity State */}
                <View style={[styles.tableCell, { flex: 0.9 }]}>
                  <View style={[
                    styles.capacityBadge,
                    member.capacityState === 'resourced' && styles.capacityBadgeResourced,
                    member.capacityState === 'stretched' && styles.capacityBadgeStretched,
                    member.capacityState === 'depleted' && styles.capacityBadgeDepleted,
                  ]}>
                    <Text style={styles.capacityBadgeText}>
                      {member.capacityState.charAt(0).toUpperCase() + member.capacityState.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* 30 Day Trend Sparkline */}
                <View style={[styles.tableCell, { flex: 0.8, flexDirection: 'row', alignItems: 'center' }]}>
                  <MemberSparkline data={member.capacityHistory} />
                </View>

                {/* Participation */}
                <View style={[styles.tableCell, { flex: 0.6 }]}>
                  <Text style={styles.participationText}>{member.participation}</Text>
                </View>

                {/* Notes */}
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <Text style={styles.notesText}>{member.notes || '—'}</Text>
                </View>
              </View>
            ))}

            {/* Pagination hint */}
            <View style={styles.paginationHint}>
              <Text style={styles.paginationText}>1–5 of 5 members</Text>
            </View>
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <Pressable style={styles.ctaPrimary}>
              <Text style={styles.ctaPrimaryText}>Generate Circle Capacity Summary (CCI)</Text>
              <Text style={styles.ctaPriceText}>$399</Text>
            </Pressable>
            <Pressable style={styles.ctaSecondary}>
              <Text style={styles.ctaSecondaryText}>Generate Individual Capacity Summaries</Text>
              <Text style={styles.ctaSecondaryPrice}>$149 each</Text>
            </Pressable>
          </View>
        </View>

        {/* RIGHT COLUMN: Chart + Aggregate Info */}
        <View style={[styles.rightColumn, isWideScreen && { flex: 0.45, marginLeft: spacing.md }]}>
          {/* Capacity Trend Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>CAPACITY OVER TIME</Text>
              <Text style={styles.chartSubtitle}>— NORMALIZED, NON-DIAGNOSTIC</Text>
            </View>
            <CapacityTrendChart members={DEMO_CIRCLE_MEMBERS} />
            {/* Color Legend - Capacity based */}
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#00D7FF' }]} />
                <Text style={styles.legendText}>Resourced</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Good</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E8A830' }]} />
                <Text style={styles.legendText}>Stretched</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                <Text style={styles.legendText}>Depleted</Text>
              </View>
            </View>
          </View>

          {/* Aggregate Capacity Section */}
          <View style={styles.aggregateSection}>
            <Text style={styles.aggregateSectionTitle}>Aggregate Capacity Over Time</Text>
            <View style={styles.aggregateBullets}>
              <Text style={styles.aggregateBullet}>• Identifies patterns of rising or <Text style={styles.boldText}>sustained load</Text></Text>
              <Text style={styles.aggregateBullet}>• Supports pacing, scheduling, and environmental <Text style={styles.boldText}>adjustments</Text></Text>
              <Text style={styles.aggregateBullet}>• Informs <Text style={styles.boldText}>preventive interventions</Text> before dysregulation <Text style={styles.boldText}>escalates</Text></Text>
              <Text style={styles.aggregateBullet}>• <Text style={styles.boldText}>Complements</Text> — does <Text style={styles.boldText}>not replace</Text> — clinical judgment</Text>
            </View>
            <Text style={styles.aggregateDisclaimer}>
              Not a diagnostic tool. Not a symptom severity scale.
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Orbital – Assembled in the USA</Text>
      </View>
    </Animated.View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabActive: {
    backgroundColor: 'rgba(0,215,255,0.1)',
    borderColor: 'rgba(0,215,255,0.3)',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  tabLabelActive: {
    color: '#00D7FF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  demoBanner: {
    backgroundColor: '#7A9AAA',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  demoBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
  },

  // Personal Tab - CCI Card
  cciCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,215,255,0.2)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cciHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cciIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(0,215,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cciTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  cciSubtitle: {
    fontSize: 13,
    color: '#00D7FF',
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  cciDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  cciCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cciCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D7FF',
  },
  infoNote: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  infoNoteText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Circles Tab
  // Breadcrumb
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  breadcrumbText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  breadcrumbSeparator: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  breadcrumbActive: {
    fontSize: 12,
    color: '#00D7FF',
    fontWeight: '500',
  },

  circleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  circleHeaderLeft: {
    flex: 1,
  },
  circleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.5,
  },
  circleSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  circleMemberBadge: {
    backgroundColor: 'rgba(0,215,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,215,255,0.3)',
  },
  circleMemberBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00D7FF',
  },
  lingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,215,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,215,255,0.3)',
  },
  lingsButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00D7FF',
    letterSpacing: 0.5,
  },

  // Two Column Layout
  cciDescriptionRow: {
    marginBottom: spacing.md,
  },
  cciDescriptionRowWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  twoColumnContainer: {
    marginBottom: spacing.md,
  },
  twoColumnContainerWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },

  // Chart Container
  chartContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00D7FF',
    letterSpacing: 0.5,
  },
  chartSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  chartPlaceholder: {
    flex: 1,
    justifyContent: 'center',
  },
  chartBand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chartBandLine: {
    height: 3,
    flex: 1,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  chartBandLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 100,
  },
  chartXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  chartXLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },

  // Circle CCI Card
  circleCCICard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,215,255,0.2)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  circleCCITitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00D7FF',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  circleCCIDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  circleCCIHighlight: {
    color: '#00D7FF',
    fontWeight: '600',
  },
  circleCCINote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  dataConfidenceCard: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  dataConfidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  dataConfidenceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  dataConfidenceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  dataConfidenceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },

  // Circle Status Table
  circleStatusSection: {
    marginBottom: spacing.md,
  },
  circleStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  tableCell: {
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,215,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,215,255,0.3)',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D7FF',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  memberUsername: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  capacityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  capacityBadgeResourced: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  capacityBadgeStretched: {
    backgroundColor: 'rgba(232,168,48,0.2)',
    borderWidth: 1,
    borderColor: '#E8A830',
  },
  capacityBadgeDepleted: {
    backgroundColor: 'rgba(244,67,54,0.2)',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  capacityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  participationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  notesText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
  },
  paginationHint: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  paginationText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },

  // Aggregate Section
  aggregateSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  aggregateSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.md,
  },
  aggregateBullets: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  aggregateBullet: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  aggregateDisclaimer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },

  // CTA Section
  ctaSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ctaPrimary: {
    backgroundColor: 'rgba(0,215,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,215,255,0.3)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D7FF',
  },
  ctaPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00D7FF',
  },
  ctaSecondary: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaSecondaryText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  ctaSecondaryPrice: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
});
