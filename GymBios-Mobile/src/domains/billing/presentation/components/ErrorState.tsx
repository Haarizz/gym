import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Error state component for failed data loads.
 * Displays a retry button when a handler is provided.
 */
export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
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

      {onRetry && (
        <Button
          label="Try Again"
          onPress={onRetry}
          variant="secondary"
          style={styles.button}
        />
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
