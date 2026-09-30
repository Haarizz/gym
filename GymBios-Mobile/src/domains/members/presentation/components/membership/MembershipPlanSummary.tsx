import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { CurrencyValue } from '@/core/providers';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { MembershipPlan } from '@/domains/membershipPlans';

interface MembershipPlanSummaryProps {
  plan: MembershipPlan;
}

export function MembershipPlanSummary({ plan }: MembershipPlanSummaryProps) {
  const theme = useTheme();
  const isFamily = plan.planType?.toUpperCase() === 'FAMILY';

  const hasOffer = plan.offerActive && plan.offerDiscountAmount > 0;

  return (
    <View style={[styles.container, { borderColor: theme.primary }]}>
      <Typography
        variant="bodySmallBold"
        style={[styles.name, { color: theme.primary }]}
      >
        {plan.name}
      </Typography>

      <View style={styles.metrics}>
        <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
          <Typography variant="caption" color="textSecondary">
            Duration
          </Typography>
          <Typography variant="bodySmallBold">
            {plan.durationValue} {plan.durationType}
          </Typography>
        </View>

        <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
          <Typography variant="caption" color="textSecondary">
            Price
          </Typography>
          <Typography variant="bodySmallBold">
            <CurrencyValue amount={hasOffer ? plan.effectivePrice : plan.price} decimals={2} />
          </Typography>
          {hasOffer && (
            <Typography variant="caption" style={styles.originalPrice}>
              <CurrencyValue amount={plan.price} decimals={2} />
            </Typography>
          )}
        </View>

        <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
          <Typography variant="caption" color="textSecondary">
            {isFamily ? 'Family Size' : 'Visits'}
          </Typography>
          <Typography variant="bodySmallBold">
            {isFamily
              ? plan.maxFamilyMembers
                ? `Up to ${plan.maxFamilyMembers}`
                : '—'
              : plan.maxSessions !== undefined
                ? String(plan.maxSessions)
                : 'Unlimited'}
          </Typography>
        </View>
      </View>

      {!!plan.description && (
        <Typography
          variant="caption"
          color="textSecondary"
          numberOfLines={2}
          style={styles.description}
        >
          {plan.description}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  name: {
    marginBottom: 2,
  },
  metrics: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metricBox: {
    flex: 1,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    gap: Spacing.half,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
  },
  description: {
    marginTop: Spacing.one,
  },
});