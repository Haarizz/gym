import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../domain/Member';
import {
  daysUntil,
  describeDaysLeft,
  formatMemberDate,
  getInitials,
  getMemberExpiry,
  getMemberStatusTone,
  getPaymentStatusTone,
  titleCase,
} from '../utils/memberDisplay';
import { TonePill } from './TonePill';

interface MemberCardProps {
  member: Member;
  onPress?: (member: Member) => void;
  onCall?: (member: Member) => void;
}

const EXPIRING_SOON_DAYS = 7;

export const MemberCard = memo(function MemberCard({
  member,
  onPress,
  onCall,
}: MemberCardProps) {
  const theme = useTheme();

  const statusTone = getMemberStatusTone(member);
  const paymentTone = getPaymentStatusTone(member.paymentStatus);
  const expiry = getMemberExpiry(member);
  const daysLeft = daysUntil(expiry);
  const expiryColor =
    daysLeft === null
      ? theme.textSecondary
      : daysLeft < 0
        ? '#dc2626'
        : daysLeft <= EXPIRING_SOON_DAYS
          ? '#ea580c'
          : theme.textSecondary;

  return (
    <Pressable onPress={() => onPress?.(member)}>
      <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userRow}>
            <Avatar
              initials={getInitials(member.name)}
              imageUrl={member.photoUrl}
              size={48}
              backgroundColor={BrandColors.teal}
              textColor={BrandColors.white}
            />
            <View style={styles.info}>
              <Typography variant="bodySmallBold" numberOfLines={1}>
                {member.name}
              </Typography>
              <Typography variant="caption" color="textSecondary" numberOfLines={1}>
                {member.memberId}
                {member.membershipPlanName ? ` · ${member.membershipPlanName}` : ''}
              </Typography>
            </View>
          </View>
          <TonePill tone={statusTone} />
        </View>

        {/* Membership metrics */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricTile, { backgroundColor: theme.backgroundSelected }]}>
            <View style={styles.metricLabelRow}>
              <Feather name="calendar" size={12} color={theme.textSecondary} />
              <Typography variant="caption" color="textSecondary" style={styles.metricLabel}>
                Expires
              </Typography>
            </View>
            <Typography variant="bodySmallBold" numberOfLines={1}>
              {formatMemberDate(expiry)}
            </Typography>
            <Typography variant="caption" style={[styles.metricHint, { color: expiryColor }]} numberOfLines={1}>
              {describeDaysLeft(daysLeft)}
            </Typography>
          </View>
          <View style={[styles.metricTile, { backgroundColor: theme.backgroundSelected }]}>
            <View style={styles.metricLabelRow}>
              <Feather name="credit-card" size={12} color={theme.textSecondary} />
              <Typography variant="caption" color="textSecondary" style={styles.metricLabel}>
                Payment
              </Typography>
            </View>
            <Typography variant="bodySmallBold" style={{ color: paymentTone.color }} numberOfLines={1}>
              {paymentTone.label}
            </Typography>
            <Typography variant="caption" color="textSecondary" style={styles.metricHint} numberOfLines={1}>
              {titleCase(member.membershipType) || '—'} plan
            </Typography>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.actions, { borderTopColor: theme.border }]}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryAction,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
            onPress={() => onPress?.(member)}
            accessibilityRole="button"
          >
            <Typography variant="bodySmallBold" style={{ color: theme.primaryText }}>
              View Profile
            </Typography>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryAction,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}
            onPress={() => onCall?.(member)}
            accessibilityRole="button"
            accessibilityLabel={`Call ${member.name}`}
          >
            <Feather name="phone" size={16} color={theme.text} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    padding: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    paddingRight: Spacing.two,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metricTile: {
    flex: 1,
    borderRadius: Radius.sm,
    padding: Spacing.two,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  metricLabel: {
    fontSize: 11,
  },
  metricHint: {
    fontSize: 11,
    marginTop: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.md,
    borderTopWidth: 0.5,
  },
  primaryAction: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
