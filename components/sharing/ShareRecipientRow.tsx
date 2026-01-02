import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { User, Stethoscope, Building2, GraduationCap, Heart, UserCircle, Trash2, Share2 } from 'lucide-react-native';
import { ShareRecipient, RecipientRole } from '../../types';
import { colors, spacing } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const roleIcons: Record<RecipientRole, React.ComponentType<any>> = {
  parent: User,
  clinician: Stethoscope,
  employer: Building2,
  school: GraduationCap,
  partner: Heart,
  other: UserCircle,
};

interface ShareRecipientRowProps {
  recipient: ShareRecipient;
  hasActiveShare: boolean;
  roleLabel: string;
  onShare: () => void;
  onDelete: () => void;
}

export function ShareRecipientRow({
  recipient,
  hasActiveShare,
  roleLabel,
  onShare,
  onDelete,
}: ShareRecipientRowProps) {
  const scale = useSharedValue(1);
  const Icon = roleIcons[recipient.role];

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
      <View style={styles.iconContainer}>
        <Icon size={20} color="rgba(255,255,255,0.6)" />
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{recipient.name}</Text>
        <Text style={styles.role}>{roleLabel}</Text>
      </View>
      <View style={styles.actions}>
        {!hasActiveShare && (
          <Pressable onPress={onShare} style={styles.actionButton} hitSlop={8}>
            <Share2 size={18} color="#00E5FF" />
          </Pressable>
        )}
        {hasActiveShare && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
        <Pressable onPress={onDelete} style={styles.actionButton} hitSlop={8}>
          <Trash2 size={18} color="rgba(255,255,255,0.25)" />
        </Pressable>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  role: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  activeBadge: {
    backgroundColor: 'rgba(0,229,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00E5FF',
  },
});
