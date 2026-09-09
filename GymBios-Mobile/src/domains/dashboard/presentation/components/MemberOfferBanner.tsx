import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing, TypographyScale } from '@/core/theme';

// Purple gradient glass — translucent violet tint over a glass surface
const PURPLE_START = 'rgba(124,58,237,0.82)';
const PURPLE_END   = 'rgba(109,40,217,0.68)';

export function MemberOfferBanner() {
  const router = useRouter();

  return (
    <View style={styles.banner}>
      <LinearGradient
        colors={[PURPLE_START, PURPLE_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Shine streak overlay — matches reference .cta::after */}
      <View pointerEvents="none" style={styles.shineOverlay} />
      {/* Decorative radial blob */}
      <View pointerEvents="none" style={styles.blobDecor} />

      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <Feather name="gift" size={16} color="#FFFFFF" />
        </View>
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
    borderRadius: Radius.xl,
    padding: Spacing.four,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    shadowColor: 'rgba(109,40,217,0.45)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    position: 'relative',
  },
  shineOverlay: {
    position: 'absolute',
    top: '-40%',
    left: '-15%',
    width: '55%',
    height: '180%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ rotate: '22deg' }],
  },
  blobDecor: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 19,
    marginBottom: Spacing.three,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.full,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6D28D9',
  },
});
