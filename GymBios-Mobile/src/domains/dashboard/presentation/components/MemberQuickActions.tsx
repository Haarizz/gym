import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Glass, Radius, Spacing, TypographyScale } from '@/core/theme';
import { GlassSurface } from '@/shared/components';

export function MemberQuickActions() {
  const router = useRouter();

  const actions = [
    {
      label: 'Book a Class',
      icon: 'calendar' as const,
      color: '#C9821E',        // dark amber — legible on glass
      bgColor: BrandColors.memberGold,
      onPress: () => router.push('/(member)/bookings' as any),
    },
    {
      label: 'My Trainer',
      icon: 'user' as const,
      color: '#1B5A4C',        // deep teal
      bgColor: BrandColors.teal,
      onPress: () => router.push('/(member)/trainer' as any),
    },
    {
      label: 'Membership',
      icon: 'credit-card' as const,
      color: '#b45309',        // warm amber
      bgColor: '#F59E0B',
      onPress: () => router.push('/(member)/membership' as any),
    },
    {
      label: 'Find Centers',
      icon: 'map-pin' as const,
      color: '#6D28D9',        // violet
      bgColor: '#8B5CF6',
      onPress: () => router.push('/(member)/centers' as any),
    },
  ];

  return (
    <GlassSurface radius={18} style={styles.card}>
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.grid}>
        {actions.map((action, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            {/* Glass-frosted button face */}
            <View style={styles.actionInner}>
              <View style={[styles.iconCircle, { backgroundColor: action.bgColor }]}>
                <Feather name={action.icon} size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.actionLabel, { color: action.color }]}>
                {action.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
  },
  title: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
    letterSpacing: -0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two + 2,
  },
  actionButton: {
    width: '47.5%',
    flexGrow: 1,
    overflow: 'hidden',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Glass.border,
    backgroundColor: Glass.fill,
  },
  actionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.1,
  },
});
