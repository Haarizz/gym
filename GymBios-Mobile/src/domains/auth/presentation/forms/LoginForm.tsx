import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Spacing } from '@/core/theme';
import { Button, Input, Typography } from '@/shared/components';

import type { RoleLoginConfig } from '../config/roleConfig';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  config: RoleLoginConfig;
  onSubmit: (values: LoginFormValues) => void;
  loading?: boolean;
  errorMessage?: string;
}

export function LoginForm({ config, onSubmit, loading = false, errorMessage }: LoginFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: `${config.accentColor}18` },
          ]}
        >
          <Typography
            style={[
              styles.badgeText,
              { color: config.accentColor },
            ]}
          >
            {config.headerTitle}
          </Typography>
        </View>

        <Typography style={styles.title}>
          {config.title}
        </Typography>

        <Typography style={styles.subtitle}>
          {config.subtitle}
        </Typography>
      </View>

      {/* Fields */}
      <View style={styles.fields}>
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              variant="auth"
              label="Username"
              placeholder="Enter your username"
              autoCapitalize="none"
              autoComplete="username"
              keyboardType="default"
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

      {/* API error */}
      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Typography style={styles.errorBannerText}>{errorMessage}</Typography>
        </View>
      ) : null}

      {/* CTA */}
      <Button
        label="Sign In"
        size="lg"
        loading={loading}
        onPress={handleSubmit(onSubmit)}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 32,
    // iOS shadow
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    // Android elevation
    elevation: 8,
    gap: 0,
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 38,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 22,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  fields: {
    gap: 18,
    marginBottom: 24,
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
  button: {
    marginBottom: 20,
  },
  hintContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#94a3b8',
    textAlign: 'center',
  },
});
