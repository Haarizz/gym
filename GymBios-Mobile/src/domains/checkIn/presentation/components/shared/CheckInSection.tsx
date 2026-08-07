import { View, StyleSheet } from 'react-native';
import { Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface CheckInSectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function CheckInSection({ title, subtitle, children, rightElement }: CheckInSectionProps) {
  return (
    <View style={styles.container}>
      {(title || subtitle || rightElement) && (
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {title && (
              <Typography variant="subtitle" style={styles.title}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="bodySmall" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </View>
          {rightElement && <View>{rightElement}</View>}
        </View>
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.half,
  },
  content: {
    paddingHorizontal: Spacing.four,
  }
});
