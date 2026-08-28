import { StyleSheet, View } from 'react-native';
import { Typography } from '@/shared/components';
import { BrandColors, Spacing } from '@/core/theme';

export function CommunityAnalyticsScreen() {
  return (
    <View style={styles.container}>
      <Typography variant="bodySmallBold" style={styles.title}>
        Community Analytics
      </Typography>
      <Typography variant="body" color="textSecondary">
        Analytics for community engagement will appear here.
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
