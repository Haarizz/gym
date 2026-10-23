import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BrandColors, Spacing } from '@/core/theme';
import { Button, GlassBlob, GlassHeader, Input, Typography } from '@/shared/components';
import { toast } from '@/shared/components/Toasts/toastStore';
import { SettingsCard } from '@/domains/profile/presentation/components/SettingsSection';

import { useAccountMutations, useLinkRequests, useMyAccount, type CodeSent } from '../accountApi';
import { LinkRequestRow } from './LinkRequestRow';

interface AccountScreenProps {
  onBack: () => void;
}

/**
 * The person's own GymBios account: its email (add/change, verify with a code — a
 * verified email is what lets them reset a forgotten password themselves) and gyms
 * asking to link a membership to it. Nothing here belongs to a gym.
 */
export function AccountScreen({ onBack }: AccountScreenProps) {
  const { t } = useTranslation();
  const account = useMyAccount();
  const linkRequests = useLinkRequests();
  const { changeEmail, sendEmailCode, verifyEmail } = useAccountMutations();

  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [codeSent, setCodeSent] = useState<CodeSent | null>(null);
  const [code, setCode] = useState('');

  const onCodeSent = (sent: CodeSent) => {
    setCodeSent(sent);
    setCode('');
    setEditingEmail(false);
    toast.success(sent.emailed
      ? t('account.codeSent', { email: sent.maskedEmail })
      : t('account.codeNotEmailed'));
  };

  const data = account.data;
  const notGymBiosAccount = account.isError;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <GlassBlob color={BrandColors.teal} size={320} opacity={0.34} top={-40} right={-70} />
      <GlassBlob color={BrandColors.memberGold} size={280} opacity={0.26} top={380} left={-80} />
      <GlassHeader title={t('account.title')} subtitle={t('account.subtitle')} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {(linkRequests.data?.length ?? 0) > 0 && (
          <SettingsCard title={t('account.linkRequestsTitle')} icon="link">
            <Typography variant="caption" color="textSecondary" style={styles.hint}>
              {t('account.linkRequestsHint')}
            </Typography>
            {linkRequests.data!.map((request) => (
              <LinkRequestRow key={request.id} request={request} />
            ))}
          </SettingsCard>
        )}

        <SettingsCard title={t('account.emailCard')} icon="mail">
          {account.isLoading ? (
            <ActivityIndicator color={BrandColors.teal} />
          ) : notGymBiosAccount ? (
            <Typography variant="caption" color="textSecondary">{t('account.gymLoginOnly')}</Typography>
          ) : data ? (
            <View style={styles.section}>
              <View style={styles.row}>
                <Typography variant="caption" color="textSecondary">{t('account.username')}</Typography>
                <Typography style={styles.value}>{data.username}</Typography>
              </View>
              <View style={styles.row}>
                <Typography variant="caption" color="textSecondary">{t('account.email')}</Typography>
                <Typography style={styles.value}>{data.email ?? t('account.noEmail')}</Typography>
              </View>
              {data.email ? (
                <Typography style={[styles.status, { color: data.emailVerified ? '#16a34a' : '#d97706' }]}>
                  {data.emailVerified ? t('account.verified') : t('account.notVerified')}
                </Typography>
              ) : null}
              <Typography variant="caption" color="textSecondary">
                {data.email && data.emailVerified ? t('account.verifiedHint') : t('account.unverifiedHint')}
              </Typography>

              {editingEmail ? (
                <View style={styles.section}>
                  <Input
                    label={t('account.newEmail')}
                    value={emailDraft}
                    onChangeText={setEmailDraft}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                  <Button
                    label={t('account.saveAndSendCode')}
                    loading={changeEmail.isPending}
                    disabled={!emailDraft.trim()}
                    onPress={() => changeEmail.mutate(emailDraft.trim(), { onSuccess: onCodeSent })}
                  />
                  <Button label={t('account.cancel')} variant="ghost" onPress={() => setEditingEmail(false)} />
                </View>
              ) : (
                <View style={styles.actions}>
                  {data.email && !data.emailVerified && !codeSent ? (
                    <Button
                      label={t('account.sendCode')}
                      loading={sendEmailCode.isPending}
                      onPress={() => sendEmailCode.mutate(undefined, { onSuccess: onCodeSent })}
                    />
                  ) : null}
                  <Button
                    label={data.email ? t('account.changeEmail') : t('account.addEmail')}
                    variant="outline"
                    onPress={() => {
                      setEmailDraft(data.email ?? '');
                      setEditingEmail(true);
                    }}
                  />
                </View>
              )}

              {codeSent && data.email && !data.emailVerified && !editingEmail ? (
                <View style={styles.section}>
                  <Input
                    label={t('account.code')}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    value={code}
                    onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
                  />
                  {codeSent.devCode ? (
                    <Typography variant="caption" color="textSecondary">
                      {t('account.devCode', { code: codeSent.devCode })}
                    </Typography>
                  ) : null}
                  <Button
                    label={t('account.verify')}
                    loading={verifyEmail.isPending}
                    disabled={code.length !== 6}
                    onPress={() => verifyEmail.mutate(code, {
                      onSuccess: () => {
                        setCodeSent(null);
                        toast.success(t('account.emailVerified'));
                      },
                    })}
                  />
                  <Button
                    label={t('account.resendCode')}
                    variant="ghost"
                    loading={sendEmailCode.isPending}
                    onPress={() => sendEmailCode.mutate(undefined, { onSuccess: onCodeSent })}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </SettingsCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  section: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  value: {
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  status: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  hint: {
    marginBottom: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
