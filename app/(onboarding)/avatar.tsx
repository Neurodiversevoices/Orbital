import React, { useReducer } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { router } from 'expo-router';
import { OrbAvatar } from '@/components/instrument/avatar/OrbAvatar';
import { ORB_TUNINGS, type OrbTuningId } from '@/components/instrument/avatar/orbTunings';
import { useAuth, getSupabase } from '@/lib/supabase';

type State = { selected: OrbTuningId | null; saving: boolean };
type Action = { type: 'select'; id: OrbTuningId } | { type: 'saving' } | { type: 'done' };

function reducer(s: State, a: Action): State {
  if (a.type === 'select') return { ...s, selected: a.id };
  if (a.type === 'saving') return { ...s, saving: true };
  return s;
}

export default function AvatarSelectionScreen() {
  const [state, dispatch] = useReducer(reducer, { selected: null, saving: false });
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();

  async function handleContinue() {
    if (!state.selected || state.saving) return;
    dispatch({ type: 'saving' });
    try {
      if (user) {
        await getSupabase()
          .from('user_profiles')
          .upsert({ user_id: user.id, orb_tuning: state.selected }, { onConflict: 'user_id' });
      }
      router.replace('/(tabs)');
    } catch {
      router.replace('/(tabs)');
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#01020A' }}
      contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 80 }}
    >
      <Text
        testID="avatar-screen-heading"
        style={{
          fontFamily: 'SpaceMono',
          fontSize: 11,
          color: '#7A8593',
          letterSpacing: 2.5,
          marginTop: 56,
        }}
      >
        STEP 3 OF 3
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans',
          fontSize: 28,
          fontWeight: '700',
          color: '#fff',
          marginTop: 8,
          lineHeight: 34,
        }}
      >
        Pick an orb that feels right.
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans',
          fontSize: 15,
          color: '#B8C0CC',
          marginTop: 12,
          lineHeight: 22,
          maxWidth: 380,
        }}
      >
        Your orb shifts color with your capacity. Pick the seed mood — you can change it anytime.
      </Text>

      <View
        testID="avatar-grid"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          marginTop: 32,
          gap: 16,
        }}
      >
        {Object.values(ORB_TUNINGS).map((t) => {
          const active = state.selected === t.id;
          return (
            <Pressable
              key={t.id}
              testID={`avatar-tuning-${t.id}`}
              onPress={() => dispatch({ type: 'select', id: t.id })}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Orb tuning ${t.label}`}
              style={{
                width: '47%',
                alignItems: 'center',
                paddingVertical: 16,
                borderRadius: 16,
                borderWidth: active ? 2 : 1,
                borderColor: active ? '#2DD4BF' : 'rgba(255,255,255,0.08)',
                backgroundColor: active ? 'rgba(45,212,191,0.05)' : 'transparent',
              }}
            >
              <OrbAvatar
                size={reduceMotion ? 80 : 96}
                tuningId={t.id}
                state="elevated"
              />
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#fff',
                  marginTop: 12,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        testID="avatar-continue"
        onPress={handleContinue}
        disabled={!state.selected || state.saving}
        accessibilityRole="button"
        accessibilityLabel="Continue to app"
        style={{
          marginTop: 32,
          height: 54,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: state.selected ? '#2DD4BF' : 'rgba(255,255,255,0.08)',
        }}
      >
        <Text
          style={{
            fontFamily: 'DMSans',
            fontWeight: '700',
            fontSize: 16,
            color: state.selected ? '#01020A' : '#7A8593',
          }}
        >
          {state.saving ? 'Saving…' : 'Continue'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
