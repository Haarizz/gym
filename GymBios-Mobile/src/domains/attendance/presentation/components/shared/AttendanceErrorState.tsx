import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';

interface AttendanceErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function AttendanceErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: AttendanceErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Feather name="alert-triangle" size={32} color="#b91c1c" />
      </View>
      <Typography variant="bodySmallBold" style={styles.title}>
        Error
      </Typography>
      <Typography variant="bodySmall" color="textSecondary" style={styles.message}>
        {message}
      </Typography>
      {onRetry ? (
        <Button label="Try Again" onPress={onRetry} variant="secondary" style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
    fontSize: 16,
    color: '#b91c1c',
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: Spacing.two,
    minWidth: 140,
  },
});
