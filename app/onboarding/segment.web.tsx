import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SEGMENTS, SegmentId } from '../../components/onboarding/segments';

export default function Segment() {
  const router = useRouter();
  const [picked, setPicked] = useState<SegmentId | null>(null);
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} testID="screen-onboarding-segment">
      <Text style={s.eyebrow}>STEP 2 OF 5</Text>
      <Text style={s.q}>What's running close to your limit?</Text>
      <Text style={s.hint}>Pick one. We'll tune Orbital to your context.</Text>
      <View style={s.list}>
        {SEGMENTS.map(seg => (
          <Pressable
            key={seg.id}
            testID={`seg-${seg.id}`}
            onPress={() => setPicked(seg.id)}
            style={[s.tile, picked === seg.id && { borderColor: seg.color, backgroundColor: `${seg.color}18` }]}
          >
            <View style={[s.dot, { backgroundColor: seg.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.tLabel}>{seg.label}</Text>
              <Text style={s.tSub}>{seg.sub}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Pressable
        testID="ob-continue"
        style={[s.btn, !picked && { opacity: 0.4 }]}
        disabled={!picked}
        onPress={() => {
          if (typeof window !== 'undefined' && picked) sessionStorage.setItem('orbital_segment', picked);
          router.push('/onboarding/drains' as any);
        }}
      >
        <Text style={s.btnTxt}>Continue →</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#01020A' },
  content: { padding: 24, maxWidth: 540, alignSelf: 'center', width: '100%', paddingTop: 60, paddingBottom: 60 },
  eyebrow: { color: '#8A94AA', fontSize: 11, letterSpacing: 4, fontWeight: '600', marginBottom: 16 },
  q: { color: '#E9EEF8', fontSize: 32, fontWeight: '600', lineHeight: 38, marginBottom: 8, letterSpacing: -0.5 },
  hint: { color: '#8A94AA', fontSize: 15, lineHeight: 22, marginBottom: 28 },
  list: { gap: 10, marginBottom: 28 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, backgroundColor: 'rgba(20,24,38,0.55)', borderWidth: 1, borderColor: 'rgba(150,175,220,0.10)', borderRadius: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  tLabel: { color: '#E9EEF8', fontSize: 16, fontWeight: '600', marginBottom: 3 },
  tSub: { color: '#8A94AA', fontSize: 13, lineHeight: 18 },
  btn: { backgroundColor: '#4FD1E8', padding: 18, borderRadius: 14, alignItems: 'center' },
  btnTxt: { color: '#01020A', fontSize: 17, fontWeight: '700' },
});
