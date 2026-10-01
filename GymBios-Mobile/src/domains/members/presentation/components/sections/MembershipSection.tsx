import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';
import {
  daysUntil,
  describeDaysLeft,
  formatMemberDate,
  getMemberExpiry,
  getPaymentStatusTone,
  titleCase,
} from '../../utils/memberDisplay';
import { DetailCard, DetailField, DetailGrid } from './DetailCard';

interface MembershipSectionProps {
  member: Member;
}

const FROZEN_COLOR = '#0284c7';

function periodProgress(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return null;
  return Math.min(1, Math.max(0, (Date.now() - s) / (e - s)));
}

export function MembershipSection({ member }: MembershipSectionProps) {
  const theme = useTheme();

  const expiry = getMemberExpiry(member);
  const daysLeft = daysUntil(expiry);
  const progress = periodProgress(member.startDate, expiry);
  const expired = daysLeft !== null && daysLeft < 0;
  const barColor = expired ? '#dc2626' : daysLeft !== null && daysLeft <= 7 ? '#ea580c' : BrandColors.teal;
  const paymentTone = getPaymentStatusTone(member.paymentStatus);

  return (
    <DetailCard title="Membership" icon="award">
      <View style={[styles.planBox, { backgroundColor: theme.backgroundSelected }]}>
        <View style={styles.planHeader}>
          <View style={styles.planName}>
            <Typography variant="caption" color="textSecondary">
              Current plan
            </Typography>
            <Typography variant="bodySmallBold" numberOfLines={1}>
              {member.membershipPlanName ?? (titleCase(member.membershipType) || '—')}
            </Typography>
          </View>
          <Typography variant="caption" style={[styles.daysLeft, { color: barColor }]}>
            {describeDaysLeft(daysLeft)}
          </Typography>
        </View>
        {progress !== null ? (
          <View style={[styles.track, { backgroundColor: theme.border }]}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: barColor }]} />
          </View>
        ) : null}
        <View style={styles.periodRow}>
          <Typography variant="caption" color="textSecondary">
            {formatMemberDate(member.startDate)}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {formatMemberDate(expiry)}
          </Typography>
        </View>
      </View>

      {member.isFrozen ? (
        <View style={[styles.frozenBox, { backgroundColor: `${FROZEN_COLOR}14`, borderColor: `${FROZEN_COLOR}40` }]}>
          <Feather name="pause-circle" size={14} color={FROZEN_COLOR} />
          <Typography variant="caption" style={[styles.frozenText, { color: FROZEN_COLOR }]}>
            Frozen {formatMemberDate(member.freezeStartDate)} → {formatMemberDate(member.freezeEndDate)}
          </Typography>
        </View>
      ) : null}

      <DetailGrid>
        <DetailField label="Membership type" value={titleCase(member.membershipType)} />
        <DetailField
          label="Plan fee"
          value={
            member.membershipPlanPrice !== undefined ? (
              <Typography variant="bodySmallBold">
                <CurrencyValue amount={member.membershipPlanPrice} />
              </Typography>
            ) : undefined
          }
        />
        <DetailField
          label="Payment status"
          value={
            <Typography variant="bodySmallBold" style={{ color: paymentTone.color }}>
              {paymentTone.label}
            </Typography>
          }
        />
        <DetailField
          label="Freeze days used"
          value={member.freezeDaysUsed !== undefined ? String(member.freezeDaysUsed) : undefined}
        />
      </DetailGrid>
    </DetailCard>
  );
}

const styles = StyleSheet.create({
  planBox: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.two,
    marginBottom: Spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  planName: {
    flex: 1,
    gap: Spacing.half,
  },
  daysLeft: {
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  frozenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    marginBottom: Spacing.md,
  },
  frozenText: {
    fontWeight: '600',
  },
});
