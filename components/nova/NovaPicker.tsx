// NovaPicker — 4 modal-style dropdowns + 6-stop time-of-day slider.
import { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, FlatList, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { useHaptics } from '../../lib/haptics/useHaptics';
import {
  TIME_OF_DAY_STOPS, type Catalog, type CatalogEntry, type NovaCombo, type TimeOfDay,
} from '../../lib/nova/wardrobeApi';

type Field = 'outfit' | 'scene' | 'action' | 'mood';
const FIELD_KEY: Record<Field, keyof NovaCombo> = {
  outfit: 'outfit_id', scene: 'scene_id', action: 'action_id', mood: 'mood_id',
};

interface Props { catalog: Catalog | null; value: NovaCombo; onChange: (n: NovaCombo) => void }

const labelFor = (list: CatalogEntry[] | undefined, id: string | null) =>
  !id || !list ? 'Choose' : list.find(e => e.id === id)?.label ?? 'Choose';

export function NovaPicker({ catalog, value, onChange }: Props) {
  const haptics = useHaptics();
  const [open, setOpen] = useState<Field | null>(null);
  const [query, setQuery] = useState('');

  const list = useMemo<CatalogEntry[]>(() => {
    if (!catalog || !open) return [];
    const src = open === 'outfit' ? catalog.outfits
      : open === 'scene' ? catalog.scenes
      : open === 'action' ? catalog.actions : catalog.moods;
    if (!query) return src;
    const q = query.toLowerCase();
    return src.filter(e => e.label.toLowerCase().includes(q));
  }, [catalog, open, query]);

  const pick = (field: Field, id: string) => {
    haptics.tick();
    onChange({ ...value, [FIELD_KEY[field]]: id });
    setOpen(null); setQuery('');
  };
  const pickTime = (stop: TimeOfDay) => { haptics.tick(); onChange({ ...value, time_of_day: stop }); };
  const openField = (f: Field) => { haptics.press(); setOpen(f); };

  return (
    <View style={s.root}>
      <Row label="Outfit" value={labelFor(catalog?.outfits, value.outfit_id)} onPress={() => openField('outfit')} />
      <Row label="Scene"  value={labelFor(catalog?.scenes,  value.scene_id)}  onPress={() => openField('scene')} />
      <Row label="Action" value={labelFor(catalog?.actions, value.action_id)} onPress={() => openField('action')} />
      <Row label="Mood"   value={labelFor(catalog?.moods,   value.mood_id)}   onPress={() => openField('mood')} />

      <Text style={s.sliderLabel}>Time of day</Text>
      <View style={s.sliderTrack}>
        {TIME_OF_DAY_STOPS.map(stop => {
          const active = value.time_of_day === stop;
          return (
            <Pressable
              key={stop} onPress={() => pickTime(stop)}
              style={[s.stop, active && s.stopActive]}
              accessibilityRole="button"
              accessibilityLabel={`Time of day ${stop.replace('_', ' ')}`}
            >
              <Text style={[s.stopText, active && s.stopTextActive]}>
                {stop.replace('_', ' ')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Modal visible={open !== null} animationType="slide" transparent onRequestClose={() => setOpen(null)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{open?.toUpperCase()}</Text>
              <Pressable onPress={() => setOpen(null)} accessibilityRole="button">
                <Text style={s.sheetClose}>Close</Text>
              </Pressable>
            </View>
            <TextInput
              value={query} onChangeText={setQuery} placeholder="Search"
              placeholderTextColor={colors.textSecondary} style={s.search}
            />
            <FlatList
              data={list} keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <Pressable onPress={() => open && pick(open, item.id)} style={s.option} accessibilityRole="button">
                  <Text style={s.optionText}>{item.label}</Text>
                  {item.category ? <Text style={s.optionCategory}>{item.category}</Text> : null}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={s.emptyList}>{catalog ? 'No matches' : 'Loading catalog...'}</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.row} accessibilityRole="button">
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={1}>{value}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  rowLabel: { color: colors.textSecondary, fontFamily: 'DMSans_500Medium', fontSize: 13, letterSpacing: 0.5 },
  rowValue: {
    color: colors.textPrimary, fontFamily: 'DMSans_500Medium', fontSize: 14,
    flexShrink: 1, marginLeft: 12, textAlign: 'right',
  },
  sliderLabel: {
    color: colors.textSecondary, fontFamily: 'DMSans_500Medium',
    fontSize: 12, letterSpacing: 1, marginTop: 8, marginLeft: 4,
  },
  sliderTrack: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stop: {
    paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  stopActive: { backgroundColor: 'rgba(0,255,255,0.12)', borderColor: colors.accent },
  stopText: { color: colors.textSecondary, fontFamily: 'DMSans_500Medium', fontSize: 12, textTransform: 'capitalize' },
  stopTextActive: { color: colors.accent },
  backdrop: { flex: 1, backgroundColor: 'rgba(1,2,10,0.85)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 16, maxHeight: '80%', borderTopWidth: 1, borderTopColor: colors.cardBorder,
  },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { color: colors.textPrimary, fontFamily: 'DMSans_700Bold', fontSize: 14, letterSpacing: 1.2 },
  sheetClose: { color: colors.accent, fontFamily: 'DMSans_500Medium', fontSize: 14 },
  search: {
    backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.textPrimary, fontFamily: 'DMSans_500Medium', fontSize: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.cardBorder,
  },
  option: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  optionText: { color: colors.textPrimary, fontFamily: 'DMSans_500Medium', fontSize: 15 },
  optionCategory: { color: colors.textSecondary, fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 2 },
  emptyList: { color: colors.textSecondary, fontFamily: 'DMSans_500Medium', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});
