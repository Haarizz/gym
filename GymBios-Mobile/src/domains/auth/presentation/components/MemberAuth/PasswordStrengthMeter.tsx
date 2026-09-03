import { StyleSheet, View } from 'react-native';
import { Typography } from '@/shared/components';

export function calculatePasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) || /[A-Z]/.test(password)) score++;
  return Math.min(score, 4);
}

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strengthScore = calculatePasswordStrength(password);
  const strengthColors = ['#D65454', '#E2762B', '#EFA80D', '#16815F'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  return (
    <>
      <View style={styles.strength}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.strengthBar,
              {
                backgroundColor:
                  index < strengthScore
                    ? strengthColors[Math.max(strengthScore - 1, 0)]
                    : '#E3E9E5',
              },
            ]}
          />
        ))}
      </View>
      <Typography style={styles.strengthLabel}>
        {password.length === 0
          ? 'Use 8+ characters'
          : strengthLabels[Math.max(strengthScore - 1, 0)]}
      </Typography>
    </>
  );
}

const styles = StyleSheet.create({
  strength: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 11.5,
    color: '#9AA6A1',
    marginTop: 6,
  },
});
