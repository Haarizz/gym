import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Typography } from '@/shared/components';
import { BrandColors, Spacing } from '@/core/theme';

export function CommunityAnalyticsScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Typography variant="bodySmallBold" style={styles.title}>
        {t('analytics.community.title')}
      </Typography>
      <Typography variant="body" color="textSecondary">
        {t('analytics.community.emptyDescription')}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.screenBackground,
  },
  title: {
    marginBottom: Spacing.two,
  },
});
