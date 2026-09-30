import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { CenterPlan } from '@/domains/discovery';

interface PlanCardProps {
  plan: CenterPlan;
  onSelect: (plan: CenterPlan) => void;
  /** Facility id → display name, so a plan's selectedFacilities read as names. */
  facilityNames?: Record<string, string>;
  /** Highlights the card with a gold border and a "MOST POPULAR" tag. */
  isPopular?: boolean;
}

function buildFeatures(plan: CenterPlan, facilityNames: Record<string, string>): string[] {
  const features: string[] = [];
  if (plan.description) features.push(plan.description);

  const facilities = plan.selectedFacilities || [];
  const named = facilities.map((id) => facilityNames[String(id)]).filter((n): n is string => !!n);
  named.forEach((name) => features.push(name));
  const unnamed = facilities.length - named.length;
  if (unnamed > 0) {
    features.push(named.length > 0 ? `+${unnamed} more facilities` : `Access to ${unnamed} facilities`);
  }

  if (plan.maxSessions) features.push(`Up to ${plan.maxSessions} sessions`);
  if (plan.maxFreezeDays) features.push(`Freeze up to ${plan.maxFreezeDays} days`);

  if (features.length === 0) features.push('Standard subscription features');
  return features;
}

export function PlanCard({
  plan,
  onSelect,
  facilityNames = {},
  isPopular = false,
}: PlanCardProps) {
  // The plan's running offer — priced by the server, so this is what the member pays.
  const hasOffer = plan.offerActive && plan.offerDiscountAmount > 0;
  const payPrice = hasOffer ? plan.effectivePrice : plan.price;
  const duration =
    plan.duration || [plan.durationValue, plan.durationType].filter(Boolean).join(' ');
  const features = buildFeatures(plan, facilityNames);

  return (
    <View style={[styles.card, isPopular && styles.popularCard]}>
      {isPopular && (
        <View style={styles.popularRow}>
          <Feather name="tag" size={12} color={BrandColors.trainerAmber} />
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.planName}>{plan.name}</Text>
          {!!duration && <Text style={styles.durationText}>{duration}</Text>}
          {hasOffer && (
            <View style={styles.offerPill}>
              <Text style={styles.offerText}>
                🎉 {plan.offerLabel ? `${plan.offerLabel} · ` : ''}Save <CurrencyValue amount={plan.offerDiscountAmount} />
              </Text>
            </View>
          )}
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}><CurrencyValue amount={payPrice} /></Text>
          {hasOffer && (
            <Text style={styles.originalPrice}><CurrencyValue amount={plan.price} /></Text>
          )}
        </View>
      </View>

      <View style={styles.featuresList}>
        {features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Feather name="check-circle" size={14} color={BrandColors.teal} style={styles.featureIcon} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.selectButtonWrapper, pressed && styles.pressed]}
        onPress={() => onSelect(plan)}
        accessibilityRole="button"
        accessibilityLabel={`Subscribe to ${plan.name}`}
      >
        <LinearGradient
          colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.selectButton}
        >
          <Text style={styles.selectButtonText}>Subscribe</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  popularCard: {
    borderColor: BrandColors.memberGold,
  },
  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.two,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.trainerAmber,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.two,
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  offerPill: {
    marginTop: 2,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  offerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#15803D',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  featuresList: {
    gap: 6,
    marginBottom: Spacing.three,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  featureIcon: {
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
  },
  selectButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
