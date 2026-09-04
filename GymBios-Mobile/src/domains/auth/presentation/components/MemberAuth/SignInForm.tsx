import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input, Typography } from '@/shared/components';
import { loginSchema, type LoginValues } from './schemas';

interface SignInFormProps {
  isLoading: boolean;
  errorMessage?: string;
  onLogin: (values: LoginValues) => void;
  onSwitchToSignup: () => void;
}

export function SignInForm({ isLoading, errorMessage, onLogin, onSwitchToSignup }: SignInFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onForgotPassword = () => {
    Alert.alert('Coming Soon', 'Forgot password flow will be available soon.');
  };

  return (
    <View style={styles.panel}>
      <Typography style={styles.panelTitle}>Welcome back</Typography>
      <Typography style={styles.panelSub}>
        Sign in to pick up where you left off.
      </Typography>

      <View style={styles.fields}>
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              variant="auth"
              label="Username or email"
              placeholder="e.g. arjun.k"
              autoCapitalize="none"
              autoComplete="username"
              returnKeyType="next"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.username?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              variant="auth"
              label="Password"
              placeholder="Enter your password"
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
            />
          )}
        />
      </View>

      <View style={styles.rowBetween}>
        <Pressable style={styles.remember}>
          <View style={styles.checkbox} />
          <Typography style={styles.rememberText}>Remember me</Typography>
        </Pressable>
        <Pressable onPress={onForgotPassword}>
          <Typography style={styles.link}>Forgot password?</Typography>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Typography style={styles.errorBannerText}>{errorMessage}</Typography>
        </View>
      ) : null}

      <Button
        label="Sign in"
        size="lg"
        loading={isLoading}
        onPress={handleSubmit(onLogin)}
        style={styles.btnPrimary}
      />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Typography style={styles.dividerText}>or</Typography>
        <View style={styles.dividerLine} />
      </View>

      <Pressable style={styles.switchLine} onPress={onSwitchToSignup}>
        <Typography style={styles.switchText}>
          New to GymBios? <Typography style={styles.switchLink}>Create an account</Typography>
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  remember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: '#9AA6A1',
    borderRadius: 3,
  },
  rememberText: {
    fontSize: 12.5,
    color: '#6E7C77',
  },
  link: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0E6653',
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
  errorBanner: {
    backgroundColor: '#fff1f2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#d4183d',
  },
});
