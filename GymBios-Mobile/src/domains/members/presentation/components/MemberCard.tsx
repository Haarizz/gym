import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Card } from '@/shared/components/Card';
import { Typography } from '@/shared/components/Typography';
import { StatusBadge } from '@/shared/components/StatusBadge';
import type { Member } from '../../domain/Member';
import { MemberAvatar } from './MemberAvatar';
import { PaymentStatusBadge } from './PaymentStatusBadge';

interface MemberCardProps {
  member: Member;
  onPress?: (member: Member) => void;
}

export const MemberCard = memo(function MemberCard({
  member,
  onPress,
}: MemberCardProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={() => onPress?.(member)}>
      <Card style={styles.container}>
        <View style={styles.header}>
          <MemberAvatar
            name={member.name}
            photoUrl={member.photoUrl}
            size={48}
          />
          <View style={styles.info}>
            <Typography variant="bodySmallBold" style={styles.name} numberOfLines={1}>
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

        <View style={styles.metrics}>
          <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="caption" color="textSecondary">
              Expiry
            </Typography>
            <Typography variant="bodySmallBold">
              {member.endDate ?? '—'}
            </Typography>
          </View>
          <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="caption" color="textSecondary">
              Plan
            </Typography>
            <Typography variant="bodySmallBold" numberOfLines={1}>
              {member.membershipType}
            </Typography>
          </View>
        </View>
      </Card>
    </Pressable>
  );
});

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
  metrics: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  metricBox: {
    flex: 1,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    gap: Spacing.half,
  },
});