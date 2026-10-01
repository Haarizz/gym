import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';
import { useMembershipPlans, type MembershipPlan } from '@/domains/membershipPlans';
import type { Member } from '../../../domain/Member';
import { formatMemberDate } from '../../utils/memberDisplay';

interface RenewMembershipBottomSheetProps {
  visible: boolean;
  member: Member;
  onClose: () => void;
  /** Hands the chosen plan to the caller, which collects payment and submits. */
  onContinue: (plan: MembershipPlan) => void;
}

export function planPrice(plan: MembershipPlan): number {
  return plan.effectivePrice ?? plan.price;
}

/**
 * Mirrors MemberService.computeExpiry: the backend extends from the current expiry
 * (or today when there is none) by the plan's duration — this is only a preview.
 */
export function previewRenewedExpiry(member: Member, plan: MembershipPlan): Date | null {
  const value = parseInt(plan.durationValue, 10);
  if (Number.isNaN(value)) return null;
  const current = member.expiryDate ?? member.endDate;
  const base = current ? new Date(current) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base);
  switch ((plan.durationType ?? '').toLowerCase()) {
    case 'monthly':
    case 'months':
      next.setMonth(next.getMonth() + value);
      break;
    case 'annual':
    case 'annually':
    case 'years':
      next.setFullYear(next.getFullYear() + value);
      break;
    case 'weekly':
    case 'weeks':
      next.setDate(next.getDate() + value * 7);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + value * 3);
      break;
    default:
      next.setDate(next.getDate() + value);
  }
  return next;
}

function findCurrentPlan(member: Member, plans: MembershipPlan[]) {
  return (
    plans.find((p) => member.membershipPlanId !== undefined && Number(p.id) === member.membershipPlanId) ??
    plans.find((p) => p.name === member.membershipPlanName)
  );
}

export function RenewMembershipBottomSheet({
  visible,
  member,
  onClose,
  onContinue,
}: RenewMembershipBottomSheetProps) {
  const theme = useTheme();
  const { plans: allPlans, loading, error } = useMembershipPlans();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const plans = useMemo(
    () => allPlans.filter((p) => !p.status || p.status.toLowerCase() === 'active'),
    [allPlans],
  );

  const currentPlan = findCurrentPlan(member, plans);
  // Default to the member's current plan until something else is picked.
  const selected =
    plans.find((p) => String(p.id) === selectedId) ?? (selectedId === null ? currentPlan : undefined);
  const newExpiry = selected ? previewRenewedExpiry(member, selected) : null;

  const isFamily = member.membershipType?.toUpperCase() === 'FAMILY';
  const isMinor = member.familyRole?.toUpperCase() === 'MINOR';
  const title = isMinor
    ? 'Renew Minor Membership'
    : isFamily
      ? 'Renew Family Membership'
      : 'Renew Membership';

  return (
    <AppBottomSheet visible={visible} title={title} subtitle={member.name} onClose={onClose}>
      <View style={styles.container}>
        <Typography variant="bodySmallBold">Choose a plan</Typography>

        {loading && plans.length === 0 ? (
          <Typography variant="bodySmall" color="textSecondary">
            Loading plans...
          </Typography>
        ) : error ? (
          <Typography variant="bodySmall" color="error">
            Failed to load plans.
          </Typography>
        ) : plans.length === 0 ? (
          <Typography variant="bodySmall" color="textSecondary">
            No active plans are available for this branch.
          </Typography>
        ) : (
          <View style={styles.planList}>
            {plans.map((plan) => {
              const isSelected = selected?.id === plan.id;
              const isCurrent = currentPlan?.id === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedId(String(plan.id))}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.planCard,
                    { borderColor: isSelected ? BrandColors.teal : theme.border },
                    isSelected && styles.planCardSelected,
                  ]}
                >
                  <Feather
                    name={isSelected ? 'check-circle' : 'circle'}
                    size={18}
                    color={isSelected ? BrandColors.teal : theme.textSecondary}
                  />
                  <View style={styles.planInfo}>
                    <View style={styles.planNameRow}>
                      <Typography variant="bodySmallBold" numberOfLines={1} style={styles.planName}>
                        {plan.name}
                      </Typography>
                      {isCurrent ? (
                        <View style={styles.currentTag}>
                          <Typography variant="caption" style={styles.currentTagText}>
                            CURRENT
                          </Typography>
                        </View>
                      ) : null}
                    </View>
                    <Typography variant="caption" color="textSecondary" numberOfLines={1}>
                      {plan.duration || `${plan.durationValue} ${plan.durationType}`}
                      {plan.offerActive && plan.offerLabel ? ` · ${plan.offerLabel}` : ''}
                    </Typography>
                  </View>
                  <View style={styles.priceCol}>
                    <Typography variant="bodySmallBold">
                      <CurrencyValue amount={planPrice(plan)} />
                    </Typography>
                    {plan.offerActive && plan.offerDiscountAmount > 0 ? (
                      <Typography variant="caption" color="textSecondary" style={styles.strike}>
                        <CurrencyValue amount={plan.price} />
                      </Typography>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {selected ? (
          <View style={[styles.summary, { backgroundColor: theme.backgroundSelected }]}>
            <View style={styles.summaryRow}>
              <Typography variant="caption" color="textSecondary">
                Current expiry
              </Typography>
              <Typography variant="bodySmallBold">
                {formatMemberDate(member.expiryDate ?? member.endDate)}
              </Typography>
            </View>
            <View style={styles.summaryRow}>
              <Typography variant="caption" color="textSecondary">
                New expiry
              </Typography>
              <Typography variant="bodySmallBold" style={{ color: BrandColors.teal }}>
                {newExpiry ? formatMemberDate(newExpiry.toISOString()) : '—'}
              </Typography>
            </View>
            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.border }]}>
              <Typography variant="bodySmallBold">Amount due</Typography>
              <Typography variant="subtitle">
                <CurrencyValue amount={planPrice(selected)} />
              </Typography>
            </View>
          </View>
        ) : null}

        <Button
          label="Continue to Payment"
          onPress={() => selected && onContinue(selected)}
          disabled={!selected}
          size="lg"
        />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  planList: {
    gap: Spacing.two,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  planCardSelected: {
    backgroundColor: 'rgba(50,127,116,0.06)',
  },
  planInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  planName: {
    flexShrink: 1,
  },
  currentTag: {
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: 'rgba(50,127,116,0.12)',
  },
  currentTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: BrandColors.teal,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  summary: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRow: {
    borderTopWidth: 0.5,
    paddingTop: Spacing.two,
  },
});
