/**
 * Assistant tab — Phase 1, Option A (inside governance/PROHIBITED_FEATURES.md).
 *
 * The embodied interface to what Orbital already does, all descriptive:
 * capacity reports, appointments / holds / reminders, honest absence, app help.
 * Replies come only from lib/assistant/templates.ts via a deterministic parser;
 * no model, no network. Identity is the neutral placeholder until the owner
 * designates one (lib/assistant/config.ts). AI disclosure is always visible.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, Send } from 'lucide-react-native';
import { colors } from '../../theme';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';
import { resolveIdentity } from '../../lib/assistant/config';
import { REFUSAL_TOPICS, T } from '../../lib/assistant/templates';
import { parseIntent, STATE_LABEL, type CapacityStateKey } from '../../lib/assistant/intent';
import { respond, type Appointment } from '../../lib/assistant/respond';
import { addAppointment, getAppointments } from '../../lib/assistant/appointments';

interface Turn {
  id: string;
  from: 'user' | 'assistant';
  text: string;
}

const STATES: CapacityStateKey[] = ['resourced', 'stretched', 'depleted'];

let turnSeq = 0;
const nextId = () => `t${++turnSeq}`;

export default function AssistantScreen() {
  const identity = resolveIdentity();
  const { logs, saveEntry } = useEnergyLogs();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([{ id: nextId(), from: 'assistant', text: T.greeting }]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    void getAppointments().then(setAppointments);
  }, []);

  const submit = useCallback(
    async (text: string) => {
      const intent = parseIntent(text);
      const { reply, effect } = respond(intent, {
        now: new Date(),
        logTimestamps: logs.map((l) => l.timestamp),
        appointments,
      });
      setTurns((prev) => [
        ...prev,
        ...(text.trim() ? [{ id: nextId(), from: 'user' as const, text: text.trim() }] : []),
        { id: nextId(), from: 'assistant', text: reply },
      ]);
      setInput('');
      if (effect.type === 'saveCapacity') await saveEntry(effect.state);
      if (effect.type === 'saveAppointment') setAppointments(await addAppointment(effect.appointment));
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    },
    [logs, appointments, saveEntry],
  );

  const voice = () => setTurns((prev) => [...prev, { id: nextId(), from: 'assistant', text: T.voiceStub }]);

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="assistant-screen">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.avatar} accessibilityLabel="Placeholder avatar, no likeness" testID="assistant-avatar">
            <View style={styles.ring2} />
            <View style={styles.ring3} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>{identity.displayName}</Text>
            <Text style={styles.disclosure} testID="assistant-disclosure">
              {identity.disclosure}
            </Text>
          </View>
        </View>

        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.thread}>
          {turns.map((t) => (
            <View key={t.id} style={[styles.bubble, t.from === 'user' ? styles.user : styles.assistant]}>
              <Text style={styles.bubbleText}>{t.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.chips}>
          {STATES.map((s) => (
            <Pressable
              key={s}
              testID={`assistant-chip-${s}`}
              accessibilityRole="button"
              accessibilityLabel={`Log ${STATE_LABEL[s]}`}
              onPress={() => void submit(`log ${STATE_LABEL[s].toLowerCase()}`)}
              style={[styles.chip, { borderColor: colors[s] }]}
            >
              <Text style={[styles.chipText, { color: colors[s] }]}>{STATE_LABEL[s]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputRow}>
          <Pressable onPress={voice} accessibilityLabel="Voice input (not switched on)" style={styles.iconBtn}>
            <Mic color={colors.textSecondary} size={22} />
          </Pressable>
          <TextInput
            testID="assistant-input"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => void submit(input)}
            placeholder="Log a state, book something, or ask about the app"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            returnKeyType="send"
          />
          <Pressable onPress={() => void submit(input)} accessibilityLabel="Send" style={styles.iconBtn} testID="assistant-send">
            <Send color={colors.accent} size={22} />
          </Pressable>
        </View>

        <Text style={styles.footer} testID="assistant-boundary">
          Won't {REFUSAL_TOPICS.join(', ')}.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring2: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(0,255,255,0.5)' },
  ring3: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent },
  headerText: { marginLeft: 12, flex: 1 },
  name: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
  disclosure: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  thread: { padding: 16, gap: 10 },
  bubble: { maxWidth: '85%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  user: { alignSelf: 'flex-end', backgroundColor: 'rgba(0,255,255,0.14)' },
  bubbleText: { color: colors.textPrimary, fontSize: 15, lineHeight: 21 },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, gap: 6 },
  iconBtn: { padding: 8 },
  input: {
    flex: 1,
    color: colors.textPrimary,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  footer: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', paddingVertical: 8, paddingHorizontal: 16 },
});
