import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BrandColors } from '@/core/theme';
import { Button, GlassBlob, Input, Typography } from '@/shared/components';
import { toast } from '@/shared/components/Toasts/toastStore';
import { MEMBER_AUTH_HREF } from '@/domains/auth/presentation/navigation/routes';

import { confirmPasswordReset, requestPasswordReset } from '../accountApi';

/**
 * Forgotten password for a GymBios account: a code goes to the account's verified
 * email, then the person sets a new password. Accounts without a verified email are
 * reset by GymBios support — never by a gym (plan §2).
 */
export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setBusy(true);
    try {
      const res = await requestPasswordReset(email.trim());
      setDevCode(res.devCode);
      setStep('reset');
    } catch {
      // Toasted by the API client.
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (password !== confirm) {
      toast.error(t('passwordReset.mismatch'));
      return;
    }
    setBusy(true);
    try {
      await confirmPasswordReset(email.trim(), code, password);
      toast.success(t('passwordReset.done'));
      router.replace(MEMBER_AUTH_HREF);
    } catch {
      // Toasted by the API client.
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.background}>
        <LinearGradient colors={[BrandColors.teal, '#0F3A30', '#0c2721']} style={StyleSheet.absoluteFill as any} />
        <GlassBlob color={BrandColors.memberGold} size={260} opacity={0.5} top={210} left={-90} />
        <GlassBlob color="#fff" size={220} opacity={0.16} top={undefined} bottom={120} right={-80} />
      </View>

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.headerArea}>
          <Typography style={styles.brand}>GymBios</Typography>
        </View>

        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
          <Typography style={styles.panelTitle}>{t('passwordReset.title')}</Typography>

          {step === 'email' ? (
            <>
              <Typography style={styles.panelSub}>{t('passwordReset.emailSubtitle')}</Typography>
              <Input
                variant="glass"
                label={t('passwordReset.email')}
                placeholder="you@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
              <Button
                label={t('passwordReset.sendCode')}
                size="lg"
                loading={busy}
                disabled={!email.trim()}
                onPress={sendCode}
                style={styles.btnPrimary}
              />
              <Typography style={styles.note}>{t('passwordReset.noEmailNote')}</Typography>
            </>
          ) : (
            <>
              <Typography style={styles.panelSub}>{t('passwordReset.codeSubtitle', { email: email.trim() })}</Typography>
              <View style={styles.fields}>
                <Input
                  variant="glass"
                  label={t('passwordReset.code')}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  value={code}
                  onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
                />
                {devCode ? <Typography style={styles.note}>{t('passwordReset.devCode', { code: devCode })}</Typography> : null}
                <Input
                  variant="glass"
                  label={t('passwordReset.newPassword')}
                  secureTextEntry
                  autoComplete="new-password"
                  value={password}
                  onChangeText={setPassword}
                />
                <Input
                  variant="glass"
                  label={t('passwordReset.confirmPassword')}
                  secureTextEntry
                  autoComplete="new-password"
                  value={confirm}
                  onChangeText={setConfirm}
                />
              </View>
              <Button
                label={t('passwordReset.reset')}
                size="lg"
                loading={busy}
                disabled={code.length !== 6 || password.length < 6 || !confirm}
                onPress={resetPassword}
                style={styles.btnPrimary}
              />
              <Button
                label={t('passwordReset.resend')}
                variant="ghost"
                size="md"
                disabled={busy}
                onPress={sendCode}
              />
            </>
          )}

          <Typography style={styles.backLink} onPress={() => router.replace(MEMBER_AUTH_HREF)}>
            {t('passwordReset.backToSignIn')}
          </Typography>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetContent: {
    padding: 24,
    paddingTop: 26,
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
  },
  note: {
    marginTop: 14,
    fontSize: 12.5,
    color: '#6E7C77',
  },
  backLink: {
    marginTop: 20,
    fontSize: 13,
    color: '#0E6653',
    fontWeight: '600',
    textAlign: 'center',
  },
});
