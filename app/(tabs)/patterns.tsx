// PATTERNS PREMIUM v1 — Pattern Intelligence
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeroSparkline } from '../../components/patterns/HeroSparkline';
import { PatternCard } from '../../components/patterns/PatternCard';
import { Skeleton } from '../../components/Skeleton';
import { SkeletonRow } from '../../components/SkeletonRow';
import { ParallaxCard } from '../../components/ParallaxCard';
import { NovaPatternInsight, type NovaPattern } from '../../components/nova/NovaPatternInsight';
import { getFakeCapacityData, ALL_FAKE_DATA, type RangeKey } from '../../lib/dev/fakeCapacityData';

const RANGES: RangeKey[] = ['14d', '30d', '90d', '1y', 'all'];

const BASELINE_DAY = 30;

export default function PatternsScreen() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [seed, setSeed] = useState(42);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const data = useMemo(() => getFakeCapacityData(range, seed), [range, seed]);
  const all = useMemo(() => getFakeCapacityData('all', seed), [seed]);
  const data30d = useMemo(() => getFakeCapacityData('30d', seed), [seed]);
  const prevData30d = useMemo(() => {
    const full = getFakeCapacityData('all', seed);
    const now = Date.now(); const DAY = 86_400_000;
    return full.filter(r => { const t=new Date(r.date).getTime(); return t>=now-60*DAY && t<now-30*DAY; });
  }, [seed]);

  // Simulate initial fetch — replaced by Supabase pattern detection call later.
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true); setSeed(s=>s+1); setTimeout(()=>setRefreshing(false), 400);
  }, []);

  // Stats for sub-headline
  const sampleDays = all.length;
  const confidence = Math.min(99, Math.round(50 + (sampleDays / 1825) * 49));

  // Nova insight · derive a pattern + reflective message from the data so she
  // SHOWS UP on the Patterns tab (not a chatbot — she greets the user's signal).
  const novaInsight: { pattern: NovaPattern; message: string } | null = useMemo(() => {
    if (data30d.length < 14 || prevData30d.length < 14) return null;
    const avg = (rs: typeof data30d) => rs.reduce((a, r) => a + r.score, 0) / rs.length;
    const cur = avg(data30d);
    const prev = avg(prevData30d);
    // Monday vs rest-of-week deficit
    const mondays = data30d.filter(r => new Date(r.date).getDay() === 1);
    const others  = data30d.filter(r => new Date(r.date).getDay() !== 1);
    if (mondays.length >= 3 && others.length >= 3) {
      const mAvg = avg(mondays); const oAvg = avg(others);
      if (oAvg - mAvg >= 8) {
        return { pattern: 'weekday_pattern', message: 'Your Mondays run depleted. Pattern · not coincidence.' };
      }
    }
    // Trending direction
    if (cur - prev >= 5) {
      return { pattern: 'trending_up', message: 'Last 30 days are climbing. Whatever you changed · keep it.' };
    }
    if (prev - cur >= 5) {
      return { pattern: 'trending_down', message: 'Capacity is sliding. Worth naming what shifted.' };
    }
    return { pattern: 'weekend_recovery', message: 'Weekends are doing real work for you. Protect them.' };
  }, [data30d, prevData30d]);

  if (BASELINE_DAY < 14) {
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.emptyContent}>
          <Text style={s.eyebrow}>PATTERN INTELLIGENCE</Text>
          <Text style={s.headline}>What we've learned about you</Text>
          <View style={s.emptyCard}>
            <Text style={s.emptyEyebrow}>STILL LEARNING</Text>
            <Text style={s.emptyBody}>
              Pattern detection unlocks at day 14. Today is day {BASELINE_DAY}. Each entry teaches the system more.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="rgba(255,255,255,0.4)" />
        }
      >
        {/* Header */}
        <Text style={s.eyebrow}>PATTERN INTELLIGENCE</Text>
        <Text style={s.headline}>What we've learned{'\n'}about you</Text>
        <Text style={s.sub}>{sampleDays} days of signal · {confidence}% confidence</Text>

        {/* Time range chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {RANGES.map(r => (
            <Pressable key={r} onPress={() => setRange(r)} style={s.chipWrap}>
              <Text style={[s.chip, range === r && s.chipActive]}>{r.toUpperCase()}</Text>
              {range === r && <View style={s.chipUnderline} />}
            </Pressable>
          ))}
        </ScrollView>

        {/* Nova reflects on the user's signal · she shows up, not a chatbot */}
        {!isLoading && novaInsight && (
          <NovaPatternInsight pattern={novaInsight.pattern} message={novaInsight.message} />
        )}

        {isLoading ? (
          <>
            {/* Hero sparkline placeholder */}
            <View style={s.heroWrap}>
              <Skeleton height={160} radius={12} />
            </View>

            {/* Section heading */}
            <Text style={s.sectionHeading}>DETECTED PATTERNS</Text>

            {/* Pattern card placeholders */}
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : (
          <>
            {/* Hero sparkline · 3D parallax tilt on press */}
            <ParallaxCard intensity="subtle" style={s.heroWrap}>
              <HeroSparkline data={data} />
            </ParallaxCard>

            {/* Section heading */}
            <Text style={s.sectionHeading}>DETECTED PATTERNS</Text>

            {/* Pattern cards */}
            <PatternCard type="monday" data={all} />
            <PatternCard type="sleep" data={all} />
            <PatternCard type="trending" data={all} data30d={data30d} prevData30d={prevData30d} />
            <PatternCard type="seasonal" data={all} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex:1, backgroundColor:'#01020A' },
  scroll: { flex:1 },
  content: { paddingHorizontal:20, paddingTop:16, paddingBottom:100 },
  eyebrow: { fontFamily:'SpaceMono-Regular', fontSize:11, letterSpacing:2.5, color:'#7A8593', textAlign:'center', marginBottom:8 },
  headline: { fontFamily:'DMSans-Bold', fontSize:28, fontWeight:'700', color:'#FFFFFF', lineHeight:32, textAlign:'center', marginBottom:8 },
  sub: { fontFamily:'DMSans-Regular', fontSize:14, color:'#B8C0CC', textAlign:'center', marginBottom:24 },
  chipRow: { flexDirection:'row', gap:4, paddingBottom:4, marginBottom:20 },
  chipWrap: { paddingHorizontal:8, alignItems:'center', paddingBottom:4 },
  chip: { fontFamily:'SpaceMono-Regular', fontSize:11, letterSpacing:2.5, color:'#7A8593' },
  chipActive: { color:'#5DD9D4' },
  chipUnderline: { position:'absolute', bottom:0, left:'5%', right:'5%', height:2, backgroundColor:'#5DD9D4', borderRadius:1 },
  heroWrap: { marginBottom:24, borderRadius:12, overflow:'hidden' },
  sectionHeading: { fontFamily:'SpaceMono-Regular', fontSize:10, letterSpacing:2.5, color:'#7A8593', marginBottom:12, marginTop:8 },
  // Empty state
  emptyContent: { paddingHorizontal:24, paddingTop:60, alignItems:'center' },
  emptyCard: { backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(93,217,212,0.18)', borderRadius:16, padding:24, marginTop:32, width:'100%' },
  emptyEyebrow: { fontFamily:'SpaceMono-Regular', fontSize:11, letterSpacing:2.5, color:'#5DD9D4', marginBottom:12 },
  emptyBody: { fontFamily:'DMSans-Regular', fontSize:16, color:'#FFFFFF', lineHeight:24 },
});
