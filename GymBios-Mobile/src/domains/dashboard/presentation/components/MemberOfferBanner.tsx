import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing, TypographyScale } from '@/core/theme';

export function MemberOfferBanner() {
  const router = useRouter();

  return (
    <View style={styles.banner}>
      <View style={styles.headerRow}>
        <Feather name="gift" size={20} color="#FFFFFF" />
        <Text style={styles.title}>Special Offer! 🎉</Text>
      </View>
      <Text style={styles.description}>
        Renew your membership now and get 15% off + 1 month free PT sessions.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => router.push('/(member)/membership' as any)}
        accessibilityRole="button"
        accessibilityLabel="Claim Offer"
      >
        <Text style={styles.buttonText}>Claim Offer →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#8B5CF6',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  button: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
  },
});
