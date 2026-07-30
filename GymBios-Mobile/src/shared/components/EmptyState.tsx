import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: keyof typeof Feather.glyphMap;
  buttonLabel?: string;
  onPress?: () => void;
}

export function EmptyState({
  title,
  description,
  icon = 'inbox',
  buttonLabel,
  onPress,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Feather name={icon} size={48} color={theme.textSecondary} style={styles.icon} />
      <Typography variant="subtitle" style={styles.title}>
        {title}
      </Typography>
      <Typography variant="bodySmall" color="textSecondary" style={styles.description}>
        {description}
      </Typography>
      {buttonLabel && onPress && (
        <Button label={buttonLabel} onPress={onPress} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  icon: {
    marginBottom: Spacing.three,
  },
  title: {
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  button: {
    minWidth: 160,
  },
});