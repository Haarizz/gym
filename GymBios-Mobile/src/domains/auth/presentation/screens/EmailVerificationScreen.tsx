import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { BrandColors } from '@/core/theme';
import { Button, GlassBlob, Input, Typography } from '@/shared/components';

import type { createUsePendingRegistration, createUseResendOtp, createUseVerifyOtp } from '../hooks/useAuthFlow';
import { MEMBER_AUTH_HREF } from '../navigation/routes';

interface EmailVerificationScreenProps {
  useVerifyOtp: ReturnType<typeof createUseVerifyOtp>;
  useResendOtp: ReturnType<typeof createUseResendOtp>;
  usePendingRegistration: ReturnType<typeof createUsePendingRegistration>;
}

function secondsUntil(iso: string | undefined): number {
  if (!iso) return 0;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
}

export function EmailVerificationScreen({ useVerifyOtp, useResendOtp, usePendingRegistration }: EmailVerificationScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    registrationToken?: string;
    maskedEmail?: string;
    otpExpiresAt?: string;
    resendAvailableAt?: string;
  }>();

  // Route params are the fast path right after registration, but they're
  // ephemeral — lost on a reload of this screen (a dev Fast Refresh, or the
  // app being relaunched mid-verification). The persisted handle in
  // SecureStore (written by AuthRepositoryImpl the moment registration
  // succeeds) is the fallback that makes this screen recoverable either way.
  const { pending, isLoaded: isPendingLoaded } = usePendingRegistration();

  const registrationToken = params.registrationToken || pending?.registrationToken || '';
  const maskedEmail = params.maskedEmail || pending?.maskedEmail;
  const initialResendAvailableAt = params.resendAvailableAt || pending?.resendAvailableAt;
  const hasNoRegistration = isPendingLoaded && !registrationToken;

  const [otp, setOtp] = useState('');
  const [resendAvailableAt, setResendAvailableAt] = useState(initialResendAvailableAt);
  const [cooldown, setCooldown] = useState(() => secondsUntil(initialResendAvailableAt));

  useEffect(() => {
    if (!resendAvailableAt && initialResendAvailableAt) {
      setResendAvailableAt(initialResendAvailableAt);
    }
  }, [initialResendAvailableAt, resendAvailableAt]);

  const { verifyOtp, isVerifying, errorMessage: verifyError } = useVerifyOtp();
  const { resendOtp, isResending, resendResult, errorMessage: resendError } = useResendOtp();

  useEffect(() => {
    if (resendResult?.resendAvailableAt) {
      setResendAvailableAt(resendResult.resendAvailableAt);
    }
  }, [resendResult]);

  useEffect(() => {
    setCooldown(secondsUntil(resendAvailableAt));
    const interval = setInterval(() => {
      setCooldown(secondsUntil(resendAvailableAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendAvailableAt]);

  const isAlreadyVerified = verifyError?.toLowerCase().includes('already verified') ?? false;

  const onVerify = () => {
    verifyOtp({ registrationToken, otp });
  };

  const onResend = () => {
    resendOtp(registrationToken);
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
          <Typography style={styles.panelTitle}>Verify your email</Typography>
          <Typography style={styles.panelSub}>
            We sent a 6-digit code to {maskedEmail ?? 'your email'}. Enter it below to finish creating your account.
          </Typography>

          {hasNoRegistration ? (
            <View style={styles.verifiedBanner}>
              <Typography style={styles.verifiedBannerText}>
                We couldn't find an in-progress registration on this device. Please register again.
              </Typography>
              <Button
                label="Back to registration"
                size="lg"
                onPress={() => router.replace(MEMBER_AUTH_HREF)}
                style={styles.btnPrimary}
              />
            </View>
          ) : isAlreadyVerified ? (
            <View style={styles.verifiedBanner}>
              <Typography style={styles.verifiedBannerText}>
                Your account is ready — sign in to continue.
              </Typography>
              <Button
                label="Go to sign in"
                size="lg"
                onPress={() => router.replace(MEMBER_AUTH_HREF)}
                style={styles.btnPrimary}
              />
            </View>
          ) : (
            <>
              <Input
                variant="glass"
                label="Verification code"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                value={otp}
                onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
                error={verifyError && !isAlreadyVerified ? verifyError : undefined}
              />

              <Button
                label="Verify"
                size="lg"
                loading={isVerifying}
                disabled={otp.length !== 6 || !registrationToken}
                onPress={onVerify}
                style={styles.btnPrimary}
              />

              <View style={styles.resendRow}>
                {resendError ? <Typography style={styles.resendError}>{resendError}</Typography> : null}
                <Button
                  label={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                  variant="ghost"
                  size="md"
                  loading={isResending}
                  disabled={cooldown > 0 || isResending || !registrationToken}
                  onPress={onResend}
                />
              </View>

              <Typography style={styles.backLink} onPress={() => router.replace(MEMBER_AUTH_HREF)}>
                Wrong email? Go back
              </Typography>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export function createEmailVerificationScreen(
  useVerifyOtp: ReturnType<typeof createUseVerifyOtp>,
  useResendOtp: ReturnType<typeof createUseResendOtp>,
  usePendingRegistration: ReturnType<typeof createUsePendingRegistration>,
) {
  return function EmailVerificationScreenContainer() {
    return (
      <EmailVerificationScreen
        useVerifyOtp={useVerifyOtp}
        useResendOtp={useResendOtp}
        usePendingRegistration={usePendingRegistration}
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
    borderTopColor: 'rgba(255,255,255,0.6)',
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
  resendRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  resendError: {
    fontSize: 12.5,
    color: '#d4183d',
    marginBottom: 6,
    textAlign: 'center',
  },
  backLink: {
    marginTop: 20,
    fontSize: 13,
    color: '#0E6653',
    fontWeight: '600',
    textAlign: 'center',
  },
  verifiedBanner: {
    marginTop: 12,
    alignItems: 'stretch',
  },
  verifiedBannerText: {
    fontSize: 14,
    color: '#14241F',
    textAlign: 'center',
    marginBottom: 8,
  },
});
