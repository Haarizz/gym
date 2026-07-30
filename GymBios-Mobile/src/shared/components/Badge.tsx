import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

export interface BadgeProps extends ViewProps {
  label: string;
  tone?: 'default' | 'muted' | 'success';
}

export function Badge({ label, tone = 'default', style, ...rest }: BadgeProps) {
  const toneStyles = {
    default: styles.default,
    muted: styles.muted,
    success: styles.success,
  }[tone];

  return (
    <View style={[styles.base, toneStyles, style]} {...rest}>
      <Typography variant="caption" style={styles.label}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  default: {
    backgroundColor: '#327f74',
  },
  muted: {
    backgroundColor: '#e5e7eb',
  },
  success: {
    backgroundColor: '#dcfce7',
  },
  label: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
});
