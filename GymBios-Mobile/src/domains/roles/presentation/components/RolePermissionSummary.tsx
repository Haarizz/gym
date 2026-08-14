import { StyleSheet, View } from 'react-native';
import { Typography } from '@/shared/components/Typography';
import { Spacing, BrandColors } from '@/core/theme';

interface RolePermissionSummaryProps {
  selectedCount: number;
}

export function RolePermissionSummary({ selectedCount }: RolePermissionSummaryProps) {
  return (
    <View style={styles.container}>
      <Typography variant="caption" style={styles.title}>
        MODULE PERMISSIONS
      </Typography>
      <Typography variant="caption" style={styles.count}>
        {selectedCount} selected
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  title: {
    fontWeight: '700',
    letterSpacing: 0.8,
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
  },
  count: {
    fontFamily: 'monospace',
    fontWeight: '600',
    color: BrandColors.tealDark,
  },
});
