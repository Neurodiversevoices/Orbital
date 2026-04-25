import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import CapacityGaugeWeb from '../../components/web/CapacityGaugeWeb';
import CapacityAvatar from '../../components/avatar/CapacityAvatar.web';

export default function TodayWeb() {
  const router = useRouter();
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <CapacityAvatar userId="demo-user" capacity="RESOURCED" size={40} />
        <Text testID="screen-today" style={s.eyebrow}>YOUR CAPACITY · LIVE</Text>
      </View>
      <CapacityGaugeWeb size={340} />
      <Text style={s.label}>Right now</Text>
      <Text style={s.headline}>Your nervous system has a signature.</Text>
      <Text style={s.body}>Live demo — sign in to log your real capacity.</Text>
      <View style={s.ctaRow}>
        <Pressable testID="cta-signin" accessibilityRole="button" style={s.btnPrimary} onPress={() => router.push('/signin' as any)}>
          <Text style={s.btnPrimaryText}>Sign In</Text>
        </Pressable>
        <Pressable testID="cta-patterns" accessibilityRole="button" style={s.btnGhost} onPress={() => router.push('/(tabs)/patterns' as any)}>
          <Text style={s.btnGhostText}>See Patterns →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#01020A' },
  content: { alignItems: 'center', padding: 24, paddingTop: 40, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  eyebrow: { color: '#8A94AA', fontSize: 11, letterSpacing: 4, fontWeight: '600' },
  label: { color: '#8A94AA', fontSize: 12, letterSpacing: 2, marginTop: 16, marginBottom: 32 },
  headline: { color: '#E9EEF8', fontSize: 28, fontWeight: '600', textAlign: 'center', maxWidth: 480, lineHeight: 34, marginBottom: 16 },
  body: { color: '#8A94AA', fontSize: 16, textAlign: 'center', maxWidth: 420, lineHeight: 24, marginBottom: 40 },
  ctaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  btnPrimary: { backgroundColor: '#4FD1E8', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  btnPrimaryText: { color: '#01020A', fontSize: 16, fontWeight: '600' },
  btnGhost: { borderWidth: 1, borderColor: 'rgba(150,175,220,0.20)', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  btnGhostText: { color: '#E9EEF8', fontSize: 16, fontWeight: '500' },
});
