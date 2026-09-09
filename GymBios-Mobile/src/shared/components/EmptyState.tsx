import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Glass, Radius, Spacing } from '@/core/theme';
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
      {/* Glass icon box — matching reference .empty-icon */}
      <View style={styles.iconBox}>
        <Feather name={icon} size={24} color={theme.textSecondary} />
      </View>
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
  // Glass icon box — reference .empty-icon: white glass fill + glass border, rounded square
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Glass.fill,
    borderWidth: 1,
    borderColor: Glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
    shadowColor: Glass.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
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