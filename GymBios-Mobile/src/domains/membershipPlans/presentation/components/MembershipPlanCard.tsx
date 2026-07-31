import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Card } from '@/shared/components/Card';
import { Typography } from '@/shared/components/Typography';
import type { MembershipPlan } from '../../domain/MembershipPlan';
import { PlanStatusBadge } from './PlanStatusBadge';

interface MembershipPlanCardProps {
  plan: MembershipPlan;
  onPress?: (plan: MembershipPlan) => void;
  onEdit?: (plan: MembershipPlan) => void;
  onDuplicate?: (plan: MembershipPlan) => void;
  onDelete?: (plan: MembershipPlan) => void;
}

export function MembershipPlanCard({
  plan,
  onPress,
  onEdit,
  onDuplicate,
  onDelete,
}: MembershipPlanCardProps) {
  const theme = useTheme();
  const isFamily = plan.planType?.toUpperCase() === 'FAMILY';
  const discountedPrice =
    plan.discount > 0
      ? plan.price - (plan.price * plan.discount) / 100
      : plan.price;

  return (
    <Pressable onPress={() => onPress?.(plan)} style={styles.pressable}>
      <Card style={styles.container}>
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Typography variant="bodySmallBold" style={styles.name} numberOfLines={1}>
              {plan.name}
            </Typography>
            <View style={styles.badges}>
              <PlanStatusBadge status={plan.status} />
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: isFamily ? '#ede9fe' : '#dbeafe' },
                ]}
              >
                <Typography
                  variant="caption"
                  style={[
                    styles.typeBadgeText,
                    { color: isFamily ? '#5b21b6' : '#1d4ed8' },
                  ]}
                >
                  {plan.planType}
                </Typography>
              </View>
            </View>
          </View>

          {/* Overflow actions */}
          <View style={styles.actions}>
            <Pressable
              style={styles.actionBtn}
              hitSlop={8}
              onPress={() => onEdit?.(plan)}
            >
              <Feather name="edit-2" size={16} color={theme.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              hitSlop={8}
              onPress={() => onDuplicate?.(plan)}
            >
              <Feather name="copy" size={16} color={theme.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              hitSlop={8}
              onPress={() => onDelete?.(plan)}
            >
              <Feather name="trash-2" size={16} color="#dc2626" />
            </Pressable>
          </View>
        </View>

        {/* Metrics row */}
        <View style={styles.metrics}>
          <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="caption" color="textSecondary">Price</Typography>
            <Typography variant="bodySmallBold">
              {plan.discount > 0 ? (
                `$${discountedPrice.toFixed(0)}`
              ) : (
                `$${plan.price.toLocaleString()}`
              )}
            </Typography>
            {plan.discount > 0 && (
              <Typography variant="caption" style={styles.originalPrice}>
                ${plan.price}
              </Typography>
            )}
          </View>

          <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="caption" color="textSecondary">Duration</Typography>
            <Typography variant="bodySmallBold">
              {plan.durationValue} {plan.durationType}
            </Typography>
          </View>

          <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="caption" color="textSecondary">
              {isFamily ? 'Family Size' : 'Sessions'}
            </Typography>
            <Typography variant="bodySmallBold">
              {isFamily
                ? plan.maxFamilyMembers
                  ? `Up to ${plan.maxFamilyMembers}`
                  : '—'
                : plan.maxSessions !== undefined
                ? String(plan.maxSessions)
                : '∞'}
            </Typography>
          </View>
        </View>

        {/* Description if present */}
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
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  container: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerLeft: {
    flex: 1,
    gap: Spacing.one,
  },
  name: {
    marginBottom: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.full,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  actionBtn: {
    padding: Spacing.one,
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
    color: BrandColors.textSecondary,
  },
  description: {
    marginTop: Spacing.one,
  },
});
