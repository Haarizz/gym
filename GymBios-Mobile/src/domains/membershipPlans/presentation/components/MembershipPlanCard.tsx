import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { tOr } from '@/core/i18n/format';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
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

type DurationUnit = 'day' | 'week' | 'month' | 'year';

/** The server sends "Day"/"Daily", "Month"/"Monthly", … — normalise to one unit. */
function durationUnit(durationType: string): DurationUnit | null {
  const v = (durationType || '').toLowerCase();
  if (v.startsWith('da')) return 'day';
  if (v.startsWith('week')) return 'week';
  if (v.startsWith('month')) return 'month';
  if (v.startsWith('year') || v === 'annual' || v === 'annually') return 'year';
  return null;
}

export function MembershipPlanCard({ plan, onPress, onEdit, onDuplicate, onDelete }: MembershipPlanCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isFamily = plan.planType?.toUpperCase() === 'FAMILY';
  // The plan's running offer, priced by the server.
  const hasOffer = plan.offerActive && plan.offerDiscountAmount > 0;
  const planTypeKey = (plan.planType || '').toLowerCase().replace(/[^a-z]+/g, '_');

  const count = Number(plan.durationValue) || 0;
  const unit = durationUnit(plan.durationType);
  const durationText = unit
    ? {
        day: t('membershipPlans.card.durationDay', { count }),
        week: t('membershipPlans.card.durationWeek', { count }),
        month: t('membershipPlans.card.durationMonth', { count }),
        year: t('membershipPlans.card.durationYear', { count }),
      }[unit]
    : `${plan.durationValue} ${plan.durationType}`.trim();

  const capacityText = isFamily
    ? plan.maxFamilyMembers
      ? t('membershipPlans.card.familyMembers', { count: plan.maxFamilyMembers })
      : t('membershipPlans.card.unlimitedMembers')
    : plan.maxSessions != null
      ? t('membershipPlans.card.sessionsCount', { count: plan.maxSessions })
      : t('membershipPlans.card.unlimitedSessions');

  const meta: { icon: ComponentProps<typeof Feather>['name']; text: string }[] = [
    { icon: 'clock', text: durationText },
    { icon: isFamily ? 'users' : 'activity', text: capacityText },
  ];

  return (
    <Pressable
      onPress={() => onPress?.(plan)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}
    >
      {/* Name + price */}
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          <Typography variant="bodySmallBold" style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {plan.name}
          </Typography>
          <View style={styles.badges}>
            <PlanStatusBadge status={plan.status} />
            {!!plan.planType && (
              <View style={[styles.pill, { backgroundColor: isFamily ? '#ede9fe' : '#dbeafe' }]}>
                <Typography variant="caption" style={[styles.pillText, { color: isFamily ? '#5b21b6' : '#1d4ed8' }]}>
                  {tOr(`membershipPlans.misc2.options.${planTypeKey}`, plan.planType)}
                </Typography>
              </View>
            )}
            {hasOffer && (
              <View style={[styles.pill, styles.offerPill]}>
                <Feather name="tag" size={10} color="#c2410c" />
                <Typography variant="caption" style={[styles.pillText, styles.offerText]} numberOfLines={1}>
                  {plan.offerLabel || t('membershipPlans.card.offer')}
                </Typography>
              </View>
            )}
          </View>
        </View>

        <View style={styles.priceCol}>
          <Typography variant="subtitle" style={[styles.price, { color: BrandColors.teal }]}>
            <CurrencyValue amount={hasOffer ? plan.effectivePrice : plan.price} />
          </Typography>
          {hasOffer && (
            <Typography variant="caption" style={[styles.originalPrice, { color: theme.textSecondary }]}>
              <CurrencyValue amount={plan.price} />
            </Typography>
          )}
        </View>
      </View>

      {/* Duration + sessions / family size */}
      <View style={styles.metaRow}>
        {meta.map(m => (
          <View key={m.icon} style={[styles.metaItem, { backgroundColor: theme.background }]}>
            <Feather name={m.icon} size={13} color={theme.textSecondary} />
            <Typography variant="caption" style={{ color: theme.text }} numberOfLines={1}>
              {m.text}
            </Typography>
          </View>
        ))}
      </View>

      {!!plan.description && (
        <Typography variant="caption" color="textSecondary" numberOfLines={2}>
          {plan.description}
        </Typography>
      )}

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        <ActionButton
          icon="edit-2"
          label={t('membershipPlans.card.edit')}
          color={theme.text}
          onPress={() => onEdit?.(plan)}
        />
        <ActionButton
          icon="copy"
          label={t('membershipPlans.card.duplicate')}
          color={theme.text}
          onPress={() => onDuplicate?.(plan)}
        />
        <ActionButton
          icon="trash-2"
          label={t('membershipPlans.card.delete')}
          color="#dc2626"
          onPress={() => onDelete?.(plan)}
        />
      </View>
    </Pressable>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
    >
      <Feather name={icon} size={14} color={color} />
      <Typography variant="caption" style={[styles.actionLabel, { color }]}>
        {label}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.md,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  titleCol: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 16,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.full,
    maxWidth: 160,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  offerPill: {
    backgroundColor: '#ffedd5',
  },
  offerText: {
    color: '#c2410c',
    flexShrink: 1,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
  originalPrice: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.one,
  },
  actionLabel: {
    fontWeight: '600',
  },
});
