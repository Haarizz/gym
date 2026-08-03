import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Typography variant="subtitle">{title}</Typography>
      {subtitle ? (
        <Typography variant="caption" color="textSecondary">
          {subtitle}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.half,
  },
});