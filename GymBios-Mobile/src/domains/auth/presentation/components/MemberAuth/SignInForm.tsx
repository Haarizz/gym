import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldErrors } from 'react-hook-form';

import { Button, Input, Typography } from '@/shared/components';
import { toast } from '@/shared/components/Toasts/toastStore';
import { loginSchema, type LoginValues } from './schemas';
import { SocialAuthButtons } from './SocialAuthButtons';
import { FORGOT_PASSWORD_HREF } from '../../navigation/routes';

const LOGIN_FIELD_ORDER: (keyof LoginValues)[] = ['username', 'password'];

interface SignInFormProps {
  isLoading: boolean;
  onLogin: (values: LoginValues) => void;
  onSwitchToSignup: () => void;
  onGoogleSignIn?: () => void;
  isGoogleLoading?: boolean;
  isGoogleAvailable?: boolean;
  onAppleSignIn?: () => void;
  isAppleLoading?: boolean;
  isAppleAvailable?: boolean;
}

export function SignInForm({
  isLoading,
  onLogin,
  onSwitchToSignup,
  onGoogleSignIn,
  isGoogleLoading,
  isGoogleAvailable,
  onAppleSignIn,
  isAppleLoading,
  isAppleAvailable,
}: SignInFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
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

  const onInvalid = (formErrors: FieldErrors<LoginValues>) => {
    const firstField = LOGIN_FIELD_ORDER.find((field) => formErrors[field]?.message);
    if (firstField) toast.error(formErrors[firstField]!.message as string);
  };

  const onForgotPassword = () => {
    router.push(FORGOT_PASSWORD_HREF);
  };

  return (
    <View style={styles.panel}>
      <Typography style={styles.panelTitle}>{t('auth.welcomeBack')}</Typography>
      <Typography style={styles.panelSub}>{t('auth.signInSubtitle')}</Typography>

      <View style={styles.fields}>
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              variant="glass"
              label={t('auth.usernameOrEmail')}
              placeholder="e.g. arjun.k"
              autoCapitalize="none"
              autoComplete="username"
              returnKeyType="next"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.username?.message}
              hideErrorText
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              variant="glass"
              label={t('auth.password')}
              placeholder={t('auth.enterPassword')}
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
              hideErrorText
            />
          )}
        />
      </View>

      <View style={styles.rowBetween}>
        <Pressable style={styles.remember}>
          <View style={styles.checkbox} />
          <Typography style={styles.rememberText}>{t('auth.rememberMe')}</Typography>
        </Pressable>
        <Pressable onPress={onForgotPassword}>
          <Typography style={styles.link}>{t('auth.forgotPassword')}</Typography>
        </Pressable>
      </View>

      <Button label={t('auth.signIn')} size="lg" loading={isLoading} onPress={handleSubmit(onLogin, onInvalid)} style={styles.btnPrimary} />

      {onGoogleSignIn && onAppleSignIn && (isGoogleAvailable || isAppleAvailable) ? (
        <>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Typography style={styles.dividerText}>{t('auth.or')}</Typography>
            <View style={styles.dividerLine} />
          </View>

          <SocialAuthButtons
            onGoogleSignIn={onGoogleSignIn}
            isGoogleLoading={!!isGoogleLoading}
            isGoogleAvailable={!!isGoogleAvailable}
            onAppleSignIn={onAppleSignIn}
            isAppleLoading={!!isAppleLoading}
            isAppleAvailable={!!isAppleAvailable}
          />
        </>
      ) : null}

      <Pressable style={styles.switchLine} onPress={onSwitchToSignup}>
        <Typography style={styles.switchText}>
          <Trans i18nKey="auth.newToGymBios" components={{ link: <Typography style={styles.switchLink} /> }} />
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
    backgroundColor: '#1B5A4C',
    borderRadius: 16,
    shadowColor: '#1b5a4c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 6,
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
});
