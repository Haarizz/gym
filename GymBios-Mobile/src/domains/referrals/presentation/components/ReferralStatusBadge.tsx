import React from 'react';
import { View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { ReferralStatus } from '../../domain/Referral';

interface ReferralStatusBadgeProps {
  status: ReferralStatus | string;
}

export function ReferralStatusBadge({ status }: ReferralStatusBadgeProps) {
  const normalized = (status || '').toLowerCase();

  let bg = '#f1f5f9';
  let color = '#475569';
  let icon: keyof typeof Feather.glyphMap = 'help-circle';
  let label = status || 'Unknown';

  if (normalized === 'successful') {
    bg = '#dcfce7';
    color = '#15803d';
    icon = 'check-circle';
    label = 'Successful';
  } else if (normalized === 'pending') {
    bg = '#fef9c3';
    color = '#a16207';
    icon = 'clock';
    label = 'Pending';
  } else if (normalized === 'expired') {
    bg = '#fee2e2';
    color = '#b91c1c';
    icon = 'x-circle';
    label = 'Expired';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Feather name={icon} size={12} color={color} style={styles.icon} />
      <Typography variant="caption" style={[styles.text, { color }]}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
