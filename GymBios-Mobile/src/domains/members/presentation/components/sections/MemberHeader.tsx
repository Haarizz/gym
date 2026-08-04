import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Card } from '@/shared/components/Card';
import { Typography } from '@/shared/components/Typography';
import { StatusBadge } from '@/shared/components/StatusBadge';
import type { Member } from '../../../domain/Member';
import { MemberAvatar } from '../MemberAvatar';
import { PaymentStatusBadge } from '../PaymentStatusBadge';

interface MemberHeaderProps {
  member: Member;
}

export function MemberHeader({ member }: MemberHeaderProps) {
  const theme = useTheme();

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <MemberAvatar
          name={member.name}
          photoUrl={member.photoUrl}
          size={72}
        />
        <View style={styles.info}>
          <Typography variant="subtitle" style={styles.name}>
            {member.name}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            ID: {member.memberId}
          </Typography>
          <Typography variant="caption" color="textSecondary" numberOfLines={1}>
            {member.membershipPlanName ?? member.membershipType}
          </Typography>
        </View>
      </View>

      <View style={styles.badges}>
        <StatusBadge status={member.status} />
        <PaymentStatusBadge status={member.paymentStatus} />
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: theme.backgroundElement }]}>
          <Typography variant="caption" color="textSecondary">Plan</Typography>
          <Typography variant="bodySmallBold" numberOfLines={1}>
            {member.membershipType}
          </Typography>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: theme.backgroundElement }]}>
          <Typography variant="caption" color="textSecondary">Start</Typography>
          <Typography variant="bodySmallBold">
            {member.startDate}
          </Typography>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: theme.backgroundElement }]}>
          <Typography variant="caption" color="textSecondary">Expiry</Typography>
          <Typography variant="bodySmallBold">
            {member.endDate ?? '—'}
          </Typography>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    marginBottom: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  summaryBox: {
    flex: 1,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    gap: Spacing.half,
  },
});