import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export function MemberQuickActions() {
  const router = useRouter();

  const actions = [
    {
      label: 'Book a Class',
      icon: 'calendar' as const,
      color: BrandColors.memberGold,
      bgColor: '#FEF3C7',
      onPress: () => router.push('/(member)/bookings' as any),
    },
    {
      label: 'My Trainer',
      icon: 'user' as const,
      color: BrandColors.teal,
      bgColor: '#CCFBF1',
      onPress: () => router.push('/(member)/trainer' as any),
    },
    {
      label: 'Membership',
      icon: 'credit-card' as const,
      color: BrandColors.trainerAmber,
      bgColor: '#FFEDD5',
      onPress: () => router.push('/(member)/membership' as any),
    },
    {
      label: 'Find Centers',
      icon: 'map-pin' as const,
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      onPress: () => router.push('/(member)/centers' as any),
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.grid}>
        {actions.map((action, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.actionButton,
              { borderColor: action.color },
              pressed && styles.pressed,
            ]}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View style={[styles.iconCircle, { backgroundColor: action.bgColor }]}>
              <Feather name={action.icon} size={18} color={action.color} />
            </View>
            <Text style={[styles.actionLabel, { color: action.color }]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two + 2,
  },
  actionButton: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: BrandColors.surface,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
