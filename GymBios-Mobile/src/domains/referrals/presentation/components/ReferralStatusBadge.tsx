import React from 'react';
import { View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { ReferralStatus } from '../../domain/Referral';
import { useTranslation } from 'react-i18next';
import { translateValue } from '@/core/i18n/format';

interface ReferralStatusBadgeProps {
  status: ReferralStatus | string;
}

export function ReferralStatusBadge({ status }: ReferralStatusBadgeProps) {
  const { t } = useTranslation();
  const normalized = (status || '').toLowerCase();

  let bg = '#f1f5f9';
  let color = '#475569';
  let icon: keyof typeof Feather.glyphMap = 'help-circle';
  let label = translateValue('status', status, t('shared.values.status.unknown'));

  if (normalized === 'successful') {
    bg = '#dcfce7';
    color = '#15803d';
    icon = 'check-circle';
    label = t('shared.values.status.successful');
  } else if (normalized === 'pending') {
    bg = '#fef9c3';
    color = '#a16207';
    icon = 'clock';
    label = t('shared.values.status.pending');
  } else if (normalized === 'expired') {
    bg = '#fee2e2';
    color = '#b91c1c';
    icon = 'x-circle';
    label = t('shared.values.status.expired');
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
