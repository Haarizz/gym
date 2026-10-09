import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { BrandColors } from '@/core/theme';
import { Button, GlassBlob, Input, Typography } from '@/shared/components';

import type { createUseCompleteSocialRegistration, createUsePendingSocialRegistration } from '../hooks/useSocialAuthFlow';
import { socialUsernameSchema, type SocialUsernameValues } from '../components/MemberAuth/schemas';
import { MEMBER_AUTH_HREF } from '../navigation/routes';

interface SocialUsernameScreenProps {
  useCompleteSocialRegistration: ReturnType<typeof createUseCompleteSocialRegistration>;
  usePendingSocialRegistration: ReturnType<typeof createUsePendingSocialRegistration>;
}

export function SocialUsernameScreen({
  useCompleteSocialRegistration,
  usePendingSocialRegistration,
}: SocialUsernameScreenProps) {
  const router = useRouter();

  // The pending handle was persisted by AuthRepositoryImpl the moment the
  // NEEDS_USERNAME response arrived — read from there (not route params),
  // so this screen resumes correctly even after an app restart, exactly
  // like EmailVerificationScreen's pending-registration fallback.
  const { pending, isLoaded } = usePendingSocialRegistration();
  const { completeRegistration, isCompleting, errorMessage } = useCompleteSocialRegistration();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SocialUsernameValues>({
    resolver: zodResolver(socialUsernameSchema),
    defaultValues: { username: '', fullName: '' },
  });

  useEffect(() => {
    if (pending) {
      reset({
        username: pending.suggestedUsername ?? '',
        fullName: pending.prefillFullName ?? '',
      });
    }
  }, [pending, reset]);

  const hasNoPending = isLoaded && !pending;

  const onSubmit = (values: SocialUsernameValues) => {
    if (!pending) return;
    completeRegistration({
      provider: pending.provider,
      pendingToken: pending.pendingToken,
      username: values.username.trim(),
      fullName: values.fullName.trim() || null,
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.background}>
        <LinearGradient colors={[BrandColors.teal, '#0F3A30', '#0c2721']} style={StyleSheet.absoluteFill as any} />
        <GlassBlob color={BrandColors.memberGold} size={260} opacity={0.5} top={210} left={-90} />
        <GlassBlob color="#fff" size={220} opacity={0.16} top={undefined} bottom={120} right={-80} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <View style={styles.headerArea}>
          <Typography style={styles.brand}>GymBios</Typography>
        </View>

        <View style={styles.sheet}>
          <Typography style={styles.panelTitle}>Choose a username</Typography>
          <Typography style={styles.panelSub}>
            {pending ? `Almost done, ${pending.maskedEmail}.` : 'Finish setting up your account.'}
          </Typography>

          {hasNoPending ? (
            <View style={styles.banner}>
              <Typography style={styles.bannerText}>
                We couldn&apos;t find an in-progress sign-in on this device. Please sign in again.
              </Typography>
              <Button label="Back to sign in" size="lg" onPress={() => router.replace(MEMBER_AUTH_HREF)} style={styles.btnPrimary} />
            </View>
          ) : (
            <>
              <View style={styles.fields}>
                <Controller
                  control={control}
                  name="fullName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      variant="glass"
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
                  name="username"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      variant="glass"
                      label="Username"
                      placeholder="Choose a username"
                      autoCapitalize="none"
                      autoComplete="username"
                      returnKeyType="done"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.username?.message}
                    />
                  )}
                />
              </View>

              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Typography style={styles.errorBannerText}>{errorMessage}</Typography>
                </View>
              ) : null}

              <Button
                label="Finish creating account"
                size="lg"
                loading={isCompleting}
                disabled={!pending}
                onPress={handleSubmit(onSubmit)}
                style={styles.btnPrimary}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export function createSocialUsernameScreen(
  useCompleteSocialRegistration: ReturnType<typeof createUseCompleteSocialRegistration>,
  usePendingSocialRegistration: ReturnType<typeof createUsePendingSocialRegistration>,
) {
  return function SocialUsernameScreenContainer() {
    return (
      <SocialUsernameScreen
        useCompleteSocialRegistration={useCompleteSocialRegistration}
        usePendingSocialRegistration={usePendingSocialRegistration}
      />
    );
  };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  background: { ...StyleSheet.absoluteFill },
  keyboard: { flex: 1 },
  headerArea: {
    paddingTop: 72,
    paddingBottom: 24,
    alignItems: 'center',
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  sheet: {
    flex: 1,
    backgroundColor: 'rgba(242,244,247,0.86)',
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 26,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
  },
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
  btnPrimary: {
    marginTop: 16,
    backgroundColor: '#1B5A4C',
    borderRadius: 16,
    shadowColor: '#1b5a4c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 6,
  },
  errorBanner: {
    backgroundColor: '#fff1f2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#d4183d',
  },
  banner: {
    marginTop: 12,
    alignItems: 'stretch',
  },
  bannerText: {
    fontSize: 14,
    color: '#14241F',
    textAlign: 'center',
    marginBottom: 8,
  },
});
