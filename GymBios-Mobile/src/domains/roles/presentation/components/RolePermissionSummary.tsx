import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Typography } from '@/shared/components/Typography';
import { Spacing, BrandColors } from '@/core/theme';

interface RolePermissionSummaryProps {
  selectedCount: number;
}

export function RolePermissionSummary({ selectedCount }: RolePermissionSummaryProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Typography variant="caption" style={styles.title}>
        {t('roles.modulePermissions')}
      </Typography>
      <Typography variant="caption" style={styles.count}>
        {t('roles.selectedCount', { count: selectedCount })}
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
