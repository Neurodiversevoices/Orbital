import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import CapacityAvatar, { capacityFromValue } from '../components/avatar/CapacityAvatar.web';

const TAGS = [
  { id: 'meetings',  label: 'Meetings' },
  { id: 'sensory',   label: 'Sensory' },
  { id: 'social',    label: 'Social' },
  { id: 'physical',  label: 'Physical' },
  { id: 'sleep',     label: 'Sleep' },
  { id: 'masking',   label: 'Masking' },
  { id: 'emotional', label: 'Emotional' },
  { id: 'context',   label: 'Context-switch' },
];

export default function Log() {
  const router = useRouter();
  const [value, setValue] = useState(0.55);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<null | { state: string; insight: string }>(null);
  const cap = capacityFromValue(value);
  const stateColor = cap === 'RESOURCED' ? '#4FD1E8' : cap === 'DEPLETED' ? '#E5484D' : '#F2B134';

  const toggle = (id: string) => setTags(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id].slice(0, 4));

  const onSave = () => {
    const insight =
      cap === 'DEPLETED'
        ? 'You logged depleted. Lowest-cost recovery: 20-min low-stim + water + protein.'
        : cap === 'ELEVATED'
        ? 'You\'re in elevated. Most people restore best with 20 min low-stim within 90 min.'
        : 'You\'re resourced. Use this band for the work that costs the most cognitive load.';
    setSaved({ state: cap, insight });
  };

  if (saved) {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content} testID="screen-log-saved">
        <View style={s.savedHeader}>
          <CapacityAvatar userId="demo-user" capacity={saved.state as any} size={72} haloPulse />
          <Text style={s.savedEyebrow}>LOGGED · {saved.state}</Text>
        </View>
        <Text style={s.savedQ}>Pattern detected.</Text>
        <Text style={s.savedBody}>{saved.insight}</Text>
        <View style={s.card}>
          <Text style={s.cardEyebrow}>WHAT NEXT</Text>
          <Pressable style={s.btnGhost} onPress={() => router.push('/patterns' as any)}>
            <Text style={s.btnGhostTxt}>See your patterns →</Text>
          </Pressable>
          <Pressable style={s.btn} onPress={() => router.push('/' as any)}>
            <Text style={s.btnTxt}>Back to today</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} testID="screen-log">
      <View style={s.header}>
        <CapacityAvatar userId="demo-user" capacity={cap} size={48} />
        <View>
          <Text style={s.headerEyebrow}>LOG · RIGHT NOW</Text>
          <Text style={s.headerQ}>How's your capacity?</Text>
        </View>
      </View>

      {/* Capacity value display */}
      <View style={s.valueRow}>
        <Text style={[s.valueNum, { color: stateColor }]}>{Math.round(value * 100)}</Text>
        <Text style={[s.valueState, { color: stateColor }]}>{cap}</Text>
      </View>

      {/* Slider — native HTML range input */}
      <input
        type="range"
        min="0" max="1" step="0.01"
        value={value}
        onChange={(e: any) => setValue(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: stateColor, height: 8, marginBottom: 28, cursor: 'pointer' } as any}
        data-testid="capacity-slider"
      />

      <Text style={s.tagsLabel}>WHAT'S DRIVING IT? (UP TO 4)</Text>
      <View style={s.tags}>
        {TAGS.map(t => {
          const on = tags.includes(t.id);
          return (
            <Pressable
              key={t.id}
              testID={`tag-${t.id}`}
              onPress={() => toggle(t.id)}
              style={[s.tag, on && { borderColor: stateColor, backgroundColor: `${stateColor}18` }]}
            >
              <Text style={[s.tagTxt, on && { color: stateColor }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="A note (optional)"
        placeholderTextColor="#8A94AA"
        style={s.note}
        testID="note-input"
      />

      <Pressable testID="cta-save" style={[s.btn, { backgroundColor: stateColor }]} onPress={onSave}>
        <Text style={s.btnTxt}>Save log</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#01020A' },
  content: { padding: 24, maxWidth: 540, alignSelf: 'center', width: '100%', paddingTop: 40, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  headerEyebrow: { color: '#8A94AA', fontSize: 10, letterSpacing: 3, fontWeight: '600', marginBottom: 4 },
  headerQ: { color: '#E9EEF8', fontSize: 22, fontWeight: '600' },
  valueRow: { alignItems: 'center', marginBottom: 16 },
  valueNum: { fontSize: 80, fontWeight: '600', lineHeight: 88 },
  valueState: { fontSize: 12, letterSpacing: 4, fontWeight: '600', marginTop: -8 },
  tagsLabel: { color: '#8A94AA', fontSize: 10, letterSpacing: 2, fontWeight: '600', marginBottom: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  tag: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(20,24,38,0.55)', borderWidth: 1, borderColor: 'rgba(150,175,220,0.15)' },
  tagTxt: { color: '#E9EEF8', fontSize: 13, fontWeight: '500' },
  note: { backgroundColor: 'rgba(20,24,38,0.55)', borderWidth: 1, borderColor: 'rgba(150,175,220,0.15)', borderRadius: 12, padding: 14, color: '#E9EEF8', fontSize: 14, marginBottom: 24 },
  btn: { padding: 18, borderRadius: 14, alignItems: 'center' },
  btnTxt: { color: '#01020A', fontSize: 17, fontWeight: '700' },
  savedHeader: { alignItems: 'center', marginBottom: 24, gap: 12 },
  savedEyebrow: { color: '#4FD1E8', fontSize: 11, letterSpacing: 4, fontWeight: '600' },
  savedQ: { color: '#E9EEF8', fontSize: 28, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  savedBody: { color: '#8A94AA', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  card: { padding: 20, borderRadius: 14, backgroundColor: 'rgba(20,24,38,0.55)', borderWidth: 1, borderColor: 'rgba(150,175,220,0.10)', gap: 10 },
  cardEyebrow: { color: '#4FD1E8', fontSize: 11, letterSpacing: 2, fontWeight: '600', marginBottom: 6 },
  btnGhost: { padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(150,175,220,0.20)' },
  btnGhostTxt: { color: '#E9EEF8', fontSize: 15, fontWeight: '600' },
});
