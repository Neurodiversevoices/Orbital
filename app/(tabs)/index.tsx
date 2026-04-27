// TODAY PREMIUM v1 — System Status
import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter, Redirect } from 'expo-router';
import { Settings, Sparkles } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gauge } from '../../components/instrument/Gauge';
import { TodayTrendSparkline } from '../../components/today/TrendSparkline';
import { getFakeCapacityData, ALL_FAKE_DATA } from '../../lib/dev/fakeCapacityData';
import { computeDeltaAndMomentum, getSystemVoice, getDirective } from '../../lib/today/voice';
import { useAppMode } from '../../lib/hooks/useAppMode';
import { useTutorial } from '../../lib/hooks/useTutorial';
import { colors, spacing } from '../../theme';
import type { CapacityState } from '../../lib/capacity/types';

// In production, drive from Supabase baseline record
const BASELINE_DAY = 30;
const BASELINE_TARGET = 14;

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function momentumColor(m: 'rising' | 'flat' | 'falling'): string {
  return m === 'rising' ? '#5DD9D4' : m === 'falling' ? '#E5484D' : '#F5B547';
}

function momentumArrow(m: 'rising' | 'flat' | 'falling'): string {
  return m === 'rising' ? '↑' : m === 'falling' ? '↓' : '→';
}

function scoreToCapacityState(score: number): CapacityState {
  if (score >= 70) return 'RESOURCED';
  if (score >= 40) return 'ELEVATED';
  return 'DEPLETED';
}

type MetricStatus = 'good' | 'watch' | 'concern';

interface MetricInfo {
  label: string;
  title: string;
  value: string | null;
  statusLabel: string;
  status: MetricStatus;
}

const STATUS_COLOR: Record<MetricStatus, string> = { good: '#5DD9D4', watch: '#F5B547', concern: '#E5484D' };

function MetricCardPremium({ info }: { info: MetricInfo }) {
  const isLearning = BASELINE_DAY < BASELINE_TARGET;
  return (
    <View style={mc.card}>
      <Text style={mc.title}>{info.title}</Text>
      {isLearning ? (
        <Text style={mc.learning}>Learning · day {BASELINE_DAY} of {BASELINE_TARGET}</Text>
      ) : info.value ? (
        <>
          <Text style={mc.value}>{info.value}</Text>
          <Text style={[mc.status, { color: STATUS_COLOR[info.status] }]}>{info.statusLabel}</Text>
        </>
      ) : (
        <Text style={mc.learning}>Calibrating</Text>
      )}
    </View>
  );
}
const mc = StyleSheet.create({
  card: { flex:1, backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(255,255,255,0.06)', borderRadius:14, padding:14 },
  title: { fontFamily:'SpaceMono-Regular', fontSize:10, letterSpacing:2.5, color:'#7A8593', marginBottom:6 },
  learning: { fontFamily:'SpaceMono-Regular', fontSize:11, color:'#B8C0CC' },
  value: { fontFamily:'DMSans-Bold', fontSize:18, fontWeight:'600', color:'#FFFFFF', marginBottom:2 },
  status: { fontFamily:'SpaceMono-Regular', fontSize:10, letterSpacing:1 },
});

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasSeenTutorial, isLoading: tutorialLoading } = useTutorial();
  const { modeConfig } = useAppMode();

  const data14d = useMemo(() => getFakeCapacityData('14d', 42), []);
  const data7d  = useMemo(() => getFakeCapacityData('14d', 42).slice(-7), []);

  const { delta, momentum, todayScore } = useMemo(() => computeDeltaAndMomentum(data14d), [data14d]);
  const capacityState = scoreToCapacityState(todayScore);
  const hasSufficientData = BASELINE_DAY >= BASELINE_TARGET;

  const systemVoice = useMemo(() => {
    if (!hasSufficientData) return 'Establishing your signal. Each day teaches the system more about your patterns.';
    return getSystemVoice(capacityState, momentum);
  }, [capacityState, momentum, hasSufficientData]);

  const directive = useMemo(() => getDirective(capacityState), [capacityState]);

  const metricCards: MetricInfo[] = useMemo(() => {
    const lastRecord = data14d[data14d.length - 1];
    if (!lastRecord || !hasSufficientData) {
      return [
        { label:'Sleep', title:'RECOVERY SIGNAL', value:null, statusLabel:'', status:'watch' },
        { label:'HRV', title:'NERVOUS SYSTEM LOAD', value:null, statusLabel:'', status:'watch' },
        { label:'RHR', title:'CARDIAC DRIFT', value:null, statusLabel:'', status:'watch' },
      ];
    }
    const sleepStatus: MetricStatus = lastRecord.sleep_hours >= 7.5 ? 'good' : lastRecord.sleep_hours >= 6 ? 'watch' : 'concern';
    const hrvStatus: MetricStatus = lastRecord.hrv_ms >= 55 ? 'good' : lastRecord.hrv_ms >= 40 ? 'watch' : 'concern';
    const rhrStatus: MetricStatus = lastRecord.rhr_bpm <= 60 ? 'good' : lastRecord.rhr_bpm <= 68 ? 'watch' : 'concern';
    return [
      { label:'Sleep', title:'RECOVERY SIGNAL', value:`${lastRecord.sleep_hours}h`,
        statusLabel: sleepStatus==='good' ? '↑ above baseline' : sleepStatus==='concern' ? '↓ below baseline' : 'steady',
        status: sleepStatus },
      { label:'HRV', title:'NERVOUS SYSTEM LOAD', value:`${lastRecord.hrv_ms}ms`,
        statusLabel: hrvStatus==='concern' ? '↑ elevated load' : hrvStatus==='good' ? '↓ low load' : 'steady',
        status: hrvStatus },
      { label:'RHR', title:'CARDIAC DRIFT', value:`${lastRecord.rhr_bpm} bpm`,
        statusLabel: rhrStatus==='concern' ? '↑ elevated' : rhrStatus==='good' ? '↓ low' : 'steady',
        status: rhrStatus },
    ];
  }, [data14d, hasSufficientData]);

  const confidenceText = useMemo(() => {
    if (!hasSufficientData) return `Learning phase · Confidence ${Math.round((BASELINE_DAY / BASELINE_TARGET) * 100)}%`;
    return 'Confidence 92%';
  }, [hasSufficientData]);

  if (tutorialLoading) {
    return <SafeAreaView style={[s.screen,s.centered]}><ActivityIndicator color="#5DD9D4" size="large" /></SafeAreaView>;
  }
  if (hasSeenTutorial === false) return <Redirect href="/tutorial" />;

  const mColor = momentumColor(momentum);

  return (
    <SafeAreaView style={s.screen} edges={['top','left','right']}>
      <View style={s.root} testID="today-screen">
        {/* Header */}
        <Animated.View style={s.header}>
          <Pressable onPress={() => router.push('/upgrade' as any)} style={s.iconButton} accessibilityRole="button" accessibilityLabel="Plans">
            <Sparkles color="#FFD700" size={22} />
          </Pressable>
          <Text style={[s.title, { color: `${modeConfig.accentColor}CC` }]}>ORBITAL</Text>
          <Pressable onPress={() => router.push('/settings' as any)} style={s.iconButton} accessibilityRole="button" accessibilityLabel="Settings">
            <Settings color={colors.textSecondary} size={24} />
          </Pressable>
        </Animated.View>

        <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          {/* Eyebrow + date */}
          <Animated.View entering={FadeIn.delay(60).duration(350)} style={s.dateWrap}>
            <Text style={s.eyebrow}>SYSTEM STATUS</Text>
            <Text style={s.date}>{formatDate()}</Text>
          </Animated.View>

          {/* Gauge */}
          <Animated.View entering={FadeIn.delay(150).duration(400)} style={s.gaugeWrap} testID="focal-section">
            <Gauge score={todayScore} state={capacityState} />
          </Animated.View>

          {/* Delta / momentum row */}
          {hasSufficientData ? (
            <Animated.View entering={FadeIn.delay(180).duration(300)} style={s.deltaRow}>
              <Text style={s.deltaBase}>
                <Text style={{ color: mColor }}>{momentumArrow(momentum)} {delta >= 0 ? '+' : ''}{delta} vs baseline · </Text>
                <Text style={{ color: mColor }}>{momentum}</Text>
              </Text>
            </Animated.View>
          ) : (
            <View style={s.baselineChip}>
              <Text style={s.baselineChipText}>Building your baseline · day {BASELINE_DAY} of {BASELINE_TARGET}</Text>
            </View>
          )}

          {/* 7-day sparkline */}
          <Animated.View entering={FadeIn.delay(200).duration(350)} style={s.sparklineWrap}>
            <TodayTrendSparkline data={data7d} />
            <Text style={s.sparklineCaption}>LAST 7 DAYS</Text>
          </Animated.View>

          {/* System voice */}
          <Animated.View entering={FadeIn.delay(220).duration(350)} style={s.voiceWrap}>
            <View style={s.hairline} />
            <Text style={s.voiceText}>{systemVoice}</Text>
          </Animated.View>

          {/* Metric cards */}
          <Animated.View entering={FadeIn.delay(240).duration(400)} style={s.metricsRow}>
            {metricCards.map(info => <MetricCardPremium key={info.label} info={info} />)}
          </Animated.View>

          {/* Confidence chip */}
          <Animated.View entering={FadeIn.delay(260).duration(350)} style={s.confidenceWrap}>
            <View style={s.confidenceChip}>
              <Text style={s.confidenceText}>{confidenceText}</Text>
            </View>
          </Animated.View>

          {/* TODAY'S DIRECTIVE */}
          <Animated.View entering={FadeIn.delay(280).duration(400)} style={s.directiveCard}>
            <Text style={s.directiveEyebrow}>TODAY'S DIRECTIVE</Text>
            <Text style={s.directiveBody}>{directive}</Text>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex:1, backgroundColor:'#01020A' },
  centered: { justifyContent:'center', alignItems:'center' },
  root: { flex:1 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal: spacing.md },
  iconButton: { padding: spacing.sm },
  title: { fontSize:22, fontWeight:'200', letterSpacing:6, textTransform:'uppercase', color:'rgba(255,255,255,0.85)' },
  scroll: { flex:1 },
  content: { flexGrow:1, paddingHorizontal:20, paddingTop:4 },
  dateWrap: { alignItems:'center', marginBottom:4 },
  eyebrow: { fontFamily:'SpaceMono-Regular', fontSize:11, letterSpacing:2.5, color:'#7A8593' },
  date: { fontFamily:'DMSans-Regular', fontSize:14, color:'#B8C0CC', marginTop:4 },
  gaugeWrap: { alignItems:'center' },
  deltaRow: { alignItems:'center', marginBottom:8 },
  deltaBase: { fontFamily:'DMSans-Regular', fontSize:13, color:'#B8C0CC' },
  baselineChip: { alignSelf:'center', backgroundColor:'rgba(255,255,255,0.05)', borderRadius:999, paddingVertical:6, paddingHorizontal:14, marginBottom:8 },
  baselineChipText: { fontFamily:'SpaceMono-Regular', fontSize:11, letterSpacing:1, color:'#7A8593' },
  sparklineWrap: { alignItems:'center', marginBottom:4 },
  sparklineCaption: { fontFamily:'SpaceMono-Regular', fontSize:9, letterSpacing:2.5, color:'#7A8593', marginTop:8 },
  voiceWrap: { alignItems:'center', marginBottom:20 },
  hairline: { width:200, height:1, backgroundColor:'rgba(255,255,255,0.08)', marginBottom:16 },
  voiceText: { fontFamily:'DMSans-Regular', fontSize:16, color:'#FFFFFF', textAlign:'center', lineHeight:24, maxWidth:320 },
  metricsRow: { flexDirection:'row', gap:10, marginBottom:16 },
  confidenceWrap: { alignItems:'center', marginBottom:12 },
  confidenceChip: { backgroundColor:'rgba(93,217,212,0.06)', borderWidth:1, borderColor:'rgba(93,217,212,0.18)', borderRadius:999, paddingVertical:10, paddingHorizontal:18 },
  confidenceText: { fontFamily:'SpaceMono-Regular', fontSize:11, letterSpacing:2.5, color:'#5DD9D4' },
  directiveCard: { backgroundColor:'rgba(0,0,0,0.4)', borderWidth:1, borderColor:'rgba(93,217,212,0.18)', borderRadius:14, padding:16, marginHorizontal:0, marginTop:8 },
  directiveEyebrow: { fontFamily:'SpaceMono-Regular', fontSize:11, letterSpacing:2.5, color:'#5DD9D4', marginBottom:8 },
  directiveBody: { fontFamily:'DMSans-Regular', fontSize:16, color:'#FFFFFF', lineHeight:22 },
});
