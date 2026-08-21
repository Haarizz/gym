import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export interface MembershipPlanItem {
  id: string;
  name: string;
  duration: string;
  durationMonths: number;
  price: number;
  originalPrice?: number;
  taxPct: number;
  features: string[];
  popular?: boolean;
  offer?: string;
}

interface PlanCardProps {
  plan: MembershipPlanItem;
  onSelect: (plan: MembershipPlanItem) => void;
}

export function PlanCard({ plan, onSelect }: PlanCardProps) {
  return (
    <View style={[styles.card, plan.popular && styles.popularCard]}>
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}

      <View style={styles.header}>
        <View>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.durationText}>{plan.duration}</Text>
        </View>
        <View style={styles.priceContainer}>
          {plan.originalPrice && (
            <Text style={styles.originalPrice}>₹{plan.originalPrice.toLocaleString()}</Text>
          )}
          <Text style={styles.price}>₹{plan.price.toLocaleString()}</Text>
          {plan.offer && <Text style={styles.offerBadge}>{plan.offer}</Text>}
        </View>
      </View>

      <View style={styles.featuresList}>
        {plan.features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Feather name="check" size={14} color={BrandColors.teal} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.selectButton,
          plan.popular ? styles.selectButtonPopular : styles.selectButtonRegular,
          pressed && styles.pressed,
        ]}
        onPress={() => onSelect(plan)}
      >
        <Text
          style={[
            styles.selectButtonText,
            plan.popular ? styles.selectButtonTextPopular : styles.selectButtonTextRegular,
          ]}
        >
          Select {plan.name}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: 'relative',
    marginBottom: Spacing.three,
  },
  popularCard: {
    borderColor: BrandColors.memberGold,
    backgroundColor: '#FEFCE8',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: Spacing.four,
    backgroundColor: BrandColors.memberGold,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  planName: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  durationText: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: TypographyScale.small,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  offerBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.sm,
    marginTop: 2,
  },
  featuresList: {
    gap: Spacing.two,
    marginVertical: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  featureText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  selectButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  selectButtonPopular: {
    backgroundColor: BrandColors.memberGold,
  },
  selectButtonRegular: {
    backgroundColor: '#F1F5F9',
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectButtonTextPopular: {
    color: '#FFFFFF',
  },
  selectButtonTextRegular: {
    color: BrandColors.textPrimary,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
