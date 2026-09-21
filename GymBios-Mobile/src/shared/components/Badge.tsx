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

  const textStyles = {
    default: styles.labelDefault,
    muted: styles.labelMuted,
    success: styles.labelSuccess,
  }[tone];

  return (
    <View style={[styles.base, toneStyles, style]} {...rest}>
      <Typography variant="caption" style={[styles.label, textStyles]}>
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
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  labelDefault: {
    color: '#ffffff',
  },
  labelMuted: {
    color: '#374151',
  },
  labelSuccess: {
    color: '#166534',
  },
});
