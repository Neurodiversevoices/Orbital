import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import {
  Eye,
  ListTodo,
  Users,
  Moon,
  Brain,
  Dumbbell,
  Pill,
  Utensils,
  Trash2,
} from 'lucide-react-native';
import { CapacityLog, Tag, CapacityState, Category } from '../types';
import { colors, spacing } from '../theme';
import { useLocale } from '../lib/hooks/useLocale';
import { TranslationKeys, Locale } from '../locales';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const stateColors: Record<CapacityState, string> = {
  resourced: '#00E5FF',
  stretched: '#E8A830',
  depleted: '#F44336',
};

const tagIcons: Record<string, React.ComponentType<any>> = {
  sensory: Eye,
  demand: ListTodo,
  social: Users,
  // Legacy tags
  sleep: Moon,
  stress: Brain,
  exercise: Dumbbell,
  meds: Pill,
  food: Utensils,
};

function getTagLabel(tag: string, t: TranslationKeys): string {
  // Categories have translations
  if (tag === 'sensory' || tag === 'demand' || tag === 'social') {
    return t.categories[tag as Category];
  }
  // Legacy tags - capitalize first letter
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

interface HistoryItemProps {
  log: CapacityLog;
  onDelete?: (id: string) => void;
}

function formatTime(timestamp: number, locale: Locale): string {
  const date = new Date(timestamp);
  const localeCode = locale === 'es' ? 'es-MX' : 'en-US';
  return date.toLocaleTimeString(localeCode, { hour: 'numeric', minute: '2-digit' });
}

function formatDate(timestamp: number, t: TranslationKeys, locale: Locale): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const localeCode = locale === 'es' ? 'es-MX' : 'en-US';

  if (date.toDateString() === today.toDateString()) {
    return t.time.today;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return t.time.yesterday;
  } else {
    return date.toLocaleDateString(localeCode, { month: 'short', day: 'numeric' });
  }
}

export function HistoryItem({ log, onDelete }: HistoryItemProps) {
  const scale = useSharedValue(1);
  const { t, locale } = useLocale();
  const color = stateColors[log.state];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
    >
      {/* Capacity state orb indicator */}
      <View style={styles.orbIndicator}>
        <View style={[styles.orbDot, { backgroundColor: color }]} />
        <View style={[styles.orbGlow, { shadowColor: color }]} />
      </View>

      {/* Time info */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>
          {formatTime(log.timestamp, locale)}
        </Text>
        <Text style={styles.dateText}>
          {formatDate(log.timestamp, t, locale)}
        </Text>
      </View>

      {/* Category/Tags & Note */}
      <View style={styles.detailsContainer}>
        {log.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {log.tags.map((tag) => {
              const Icon = tagIcons[tag];
              if (!Icon) return null;
              return (
                <View key={tag} style={[styles.tagChip, { borderColor: `${color}40` }]}>
                  <Icon size={12} color={color} strokeWidth={1.5} />
                  <Text style={[styles.tagLabel, { color }]}>{getTagLabel(tag, t)}</Text>
                </View>
              );
            })}
          </View>
        )}
        {log.note && (
          <Text style={styles.noteText} numberOfLines={1}>
            {log.note}
          </Text>
        )}
      </View>

      {/* Delete button */}
      {onDelete && (
        <Pressable
          onPress={() => onDelete(log.id)}
          style={styles.deleteButton}
          hitSlop={8}
        >
          <Trash2 size={16} color="rgba(255,255,255,0.25)" />
        </Pressable>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  orbIndicator: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  orbDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  orbGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  timeContainer: {
    marginRight: spacing.md,
  },
  timeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  dateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  detailsContainer: {
    flex: 1,
    gap: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  noteText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});
