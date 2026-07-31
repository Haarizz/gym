import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function FormSection({ title, children, style }: FormSectionProps) {
  return (
    <View style={[styles.card, style]}>
      <Typography variant="subtitle" style={styles.title}>
        {title}
      </Typography>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.white,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    shadowColor: BrandColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    marginBottom: Spacing.two,
  },
  content: {
    gap: Spacing.two,
  },
});