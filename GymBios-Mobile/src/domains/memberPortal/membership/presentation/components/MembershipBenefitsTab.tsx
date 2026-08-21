import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { MembershipDetails } from './MembershipStatusCard';

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
      {/* Plan Benefits Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Plan Benefits</Text>
        <View style={styles.benefitsGrid}>
          {membership.benefits && membership.benefits.length > 0 ? (
            membership.benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <Feather name="check-circle" size={16} color={BrandColors.teal} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No specific benefits listed for your plan.</Text>
          )}
        </View>
      </View>

      {/* Freeze Info Card */}
      {membership.freezeAvailable && (
        <View style={styles.freezeCard}>
          <View style={styles.freezeHeader}>
            <View style={styles.freezeIconCircle}>
              <Feather name="pause-circle" size={20} color="#2563EB" />
            </View>
            <View style={styles.freezeInfo}>
              <Text style={styles.freezeTitle}>Freeze Available</Text>
              <Text style={styles.freezeDesc}>
                Your plan includes {membership.freezeDaysAllowed} freeze days. Pause your
                membership temporarily without losing active days.
              </Text>
              <Pressable hitSlop={8} onPress={onOpenFreeze} style={styles.freezeLink}>
                <Text style={styles.freezeLinkText}>Request Membership Freeze →</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Early Renewal Banner */}
      {membership.renewalOfferAvailable && (
        <View style={styles.offerBanner}>
          <View style={styles.offerHeader}>
            <Feather name="gift" size={20} color="#FFFFFF" />
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
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
  },
  benefitsGrid: {
    gap: Spacing.three,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  benefitText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    fontStyle: 'italic',
  },
  freezeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  freezeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  freezeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freezeInfo: {
    flex: 1,
  },
  freezeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 2,
  },
  freezeDesc: {
    fontSize: 13,
    color: '#1E3A8A',
    lineHeight: 18,
  },
  freezeLink: {
    marginTop: Spacing.two,
  },
  freezeLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  offerBanner: {
    backgroundColor: '#8B5CF6',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  offerTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  offerDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  claimButton: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
  },
  claimButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  claimButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8B5CF6',
  },
});
