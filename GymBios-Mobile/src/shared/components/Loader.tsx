import { ActivityIndicator, StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Typography } from '@/shared/components/Typography';

export interface LoaderProps extends ViewProps {
  message?: string;
}

export function Loader({ message, style, ...rest }: LoaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]} {...rest}>
      <ActivityIndicator size="large" color={theme.primary} />
      {message ? (
        <Typography variant="bodySmall" color="textSecondary" style={styles.message}>
          {message}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  message: {
    textAlign: 'center',
  },
});
