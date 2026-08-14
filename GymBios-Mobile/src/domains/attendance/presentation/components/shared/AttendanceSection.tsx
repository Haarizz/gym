import { StyleSheet, View } from 'react-native';

import { BrandColors, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface AttendanceSectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function AttendanceSection({ title, children, action }: AttendanceSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Typography variant="bodySmallBold" style={styles.title}>
          {title}
        </Typography>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
