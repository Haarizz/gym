import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input, Typography } from '@/shared/components';
import { signupSchema, type SignupValues } from './schemas';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface SignUpFormProps {
  onSwitchToSignin: () => void;
}

export function SignUpForm({ onSwitchToSignin }: SignUpFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const signupPassword = watch('password', '');

  const onSignup = (values: SignupValues) => {
    Alert.alert('Coming Soon', 'Account creation will be available soon.');
  };

  return (
    <View style={styles.panel}>
      <Typography style={styles.panelTitle}>Create your account</Typography>
      <Typography style={styles.panelSub}>
        Join your gym's member app in under a minute.
      </Typography>

      <View style={styles.fields}>
        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              variant="auth"
              label="Full name"
              placeholder="Your full name"
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.fullName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              variant="auth"
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.passwordField}>
              <Input
                variant="auth"
                label="Password"
                placeholder="Create a password"
                secureTextEntry
                autoComplete="password-new"
                returnKeyType="done"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
              <PasswordStrengthMeter password={signupPassword} />
            </View>
          )}
        />
      </View>

      <Typography style={styles.terms}>
        By creating an account, you agree to GymBios's{' '}
        <Typography style={styles.termsLink}>Terms</Typography> and{' '}
        <Typography style={styles.termsLink}>Privacy Policy</Typography>.
      </Typography>

      <Button
        label="Create account"
        size="lg"
        onPress={handleSubmit(onSignup)}
        style={styles.btnPrimary}
      />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Typography style={styles.dividerText}>or</Typography>
        <View style={styles.dividerLine} />
      </View>

      <Pressable style={styles.switchLine} onPress={onSwitchToSignin}>
        <Typography style={styles.switchText}>
          Already a member? <Typography style={styles.switchLink}>Sign in</Typography>
        </Typography>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {},
  panelTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#14241F',
    marginBottom: 4,
  },
  panelSub: {
    fontSize: 13.5,
    color: '#6E7C77',
    marginBottom: 22,
  },
  fields: {
    gap: 16,
  },
  passwordField: {
    marginBottom: 8,
  },
  btnPrimary: {
    marginTop: 8,
    backgroundColor: '#0E6653', 
    borderRadius: 13,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E3E9E5',
  },
  dividerText: {
    fontSize: 12,
    color: '#9AA6A1',
  },
  switchLine: {
    alignItems: 'center',
  },
  switchText: {
    fontSize: 13,
    color: '#6E7C77',
  },
  switchLink: {
    fontWeight: '700',
    color: '#0E6653',
  },
  terms: {
    fontSize: 11.5,
    color: '#9AA6A1',
    lineHeight: 18,
    marginTop: 14,
    marginBottom: 18,
  },
  termsLink: {
    color: '#0E6653',
    fontWeight: '600',
    fontSize: 11.5,
  },
});
