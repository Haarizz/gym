import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Glass, Radius, Spacing, TypographyScale } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { MembershipDetails } from './MembershipStatusCard';

// Purple gradient glass (offer banner)
const PURPLE_START = 'rgba(124,58,237,0.82)';
const PURPLE_END   = 'rgba(109,40,217,0.68)';

interface MembershipBenefitsTabProps {
  membership: MembershipDetails;
  onClaimOffer: () => void;
  onOpenFreeze: () => void;
}

export function MembershipBenefitsTab({
  membership,
  onClaimOffer,
  onOpenFreeze,
}: MembershipBenefitsTabProps) {
  return (
    <View style={styles.container}>
      {/* Plan Benefits — white glass */}
      <GlassSurface radius={Radius.lg} style={styles.card}>
        <Text style={styles.cardTitle}>Your Plan Benefits</Text>
        <View style={styles.benefitsGrid}>
          {membership.benefits && membership.benefits.length > 0 ? (
            membership.benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                {/* Glass check circle */}
                <View style={styles.checkCircle}>
                  <Feather name="check" size={11} color={BrandColors.teal} />
                </View>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No specific benefits listed for your plan.</Text>
          )}
        </View>
      </GlassSurface>

      {/* Freeze Info — info-banner recipe from reference */}
      {membership.freezeAvailable && (
        <View style={styles.freezeCard}>
          {/* Glass icon */}
          <View style={styles.freezeIconCircle}>
            <Feather name="pause-circle" size={18} color="#2563EB" />
          </View>
          <View style={styles.freezeInfo}>
            <Text style={styles.freezeTitle}>Freeze Available</Text>
            <Text style={styles.freezeDesc}>
              Your plan includes {membership.freezeDaysAllowed} freeze days. Pause your membership temporarily without losing active days.
            </Text>
            <Pressable hitSlop={8} onPress={onOpenFreeze} style={styles.freezeLink}>
              <Text style={styles.freezeLinkText}>Request Membership Freeze →</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Early Renewal Banner — purple glass */}
      {membership.renewalOfferAvailable && (
        <View style={styles.offerBanner}>
          <LinearGradient
            colors={[PURPLE_START, PURPLE_END]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Shine overlay */}
          <View pointerEvents="none" style={styles.shineOverlay} />

          <View style={styles.offerHeader}>
            <View style={styles.offerIconBox}>
              <Feather name="gift" size={15} color="#FFFFFF" />
            </View>
            <Text style={styles.offerTitle}>Early Renewal Offer! 🎉</Text>
          </View>
          <Text style={styles.offerDesc}>
            Renew now and get 15% off + 1 month free personal training sessions worth ₹6,000.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.claimButton, pressed && styles.claimButtonPressed]}
            onPress={onClaimOffer}
            accessibilityRole="button"
            accessibilityLabel="Claim Renewal Offer"
          >
            <Text style={styles.claimButtonText}>Claim Offer →</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  card: {
    padding: Spacing.four,
  },
  cardTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
    letterSpacing: -0.2,
  },
  benefitsGrid: {
    gap: Spacing.three,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  // Glass check circle — matching reference `.check`
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(27,90,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(27,90,76,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    fontStyle: 'italic',
  },
  // Freeze info-banner — reference `.info-banner` recipe: rgba(120,170,255,0.18)
  freezeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    backgroundColor: 'rgba(120,170,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(120,170,255,0.42)',
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  freezeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(120,170,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  freezeInfo: {
    flex: 1,
  },
  freezeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2451A6',
    marginBottom: 3,
  },
  freezeDesc: {
    fontSize: 12,
    color: '#3E5C93',
    lineHeight: 17,
    fontWeight: '500',
  },
  freezeLink: {
    marginTop: Spacing.two,
  },
  freezeLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  // Offer banner — purple glass
  offerBanner: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    shadowColor: 'rgba(109,40,217,0.45)',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    position: 'relative',
  },
  shineOverlay: {
    position: 'absolute',
    top: '-40%',
    left: '-15%',
    width: '55%',
    height: '180%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ rotate: '22deg' }],
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  offerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  offerDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 19,
    marginBottom: Spacing.three,
    fontWeight: '500',
  },
  claimButton: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.full,
  },
  claimButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  claimButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6D28D9',
  },
});
