import { StyleSheet, View } from 'react-native';

import { Button } from '@/shared/components';

interface SocialAuthButtonsProps {
  onGoogleSignIn: () => void;
  isGoogleLoading: boolean;
  isGoogleAvailable: boolean;
  onAppleSignIn: () => void;
  isAppleLoading: boolean;
  isAppleAvailable: boolean;
}

/** Shared "Continue with Google/Apple" row — used by both SignInForm and SignUpForm, below their existing divider. */
export function SocialAuthButtons({
  onGoogleSignIn,
  isGoogleLoading,
  isGoogleAvailable,
  onAppleSignIn,
  isAppleLoading,
  isAppleAvailable,
}: SocialAuthButtonsProps) {
  return (
    <View style={styles.container}>
      {isGoogleAvailable ? (
        <Button
          label="Continue with Google"
          variant="outline"
          size="lg"
          loading={isGoogleLoading}
          onPress={onGoogleSignIn}
          style={styles.button}
        />
      ) : null}
      {isAppleAvailable ? (
        <Button
          label="Continue with Apple"
          variant="outline"
          size="lg"
          loading={isAppleLoading}
          onPress={onAppleSignIn}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 18,
  },
  button: {
    borderColor: '#D8DEDA',
  },
});
