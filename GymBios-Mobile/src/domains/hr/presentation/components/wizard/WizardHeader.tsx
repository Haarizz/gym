import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface WizardHeaderProps {
  title: string;
  subtitle?: string;
}

export function WizardHeader({ title, subtitle }: WizardHeaderProps) {
  return (
    <View style={styles.container}>
      <Typography variant="title">{title}</Typography>
      {subtitle && (
        <Typography variant="bodySmall" color="textSecondary">
          {subtitle}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
});