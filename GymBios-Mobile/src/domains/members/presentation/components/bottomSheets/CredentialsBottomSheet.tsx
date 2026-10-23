import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';

/** Creates the member's own GymBios account — it belongs to them afterwards. */
interface CredentialsBottomSheetProps {
  visible: boolean;
  /** The member record's email the account will get, if any. */
  memberEmail?: string;
  onClose: () => void;
  onSubmit: (username: string, password: string) => Promise<void>;
}

export function CredentialsBottomSheet({
  visible,
  memberEmail,
  onClose,
  onSubmit,
}: CredentialsBottomSheetProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    try {
      setSubmitting(true);
      await onSubmit(username, password);
      setUsername('');
      setPassword('');
      onClose();
    } catch {
      // Toasted by the API client; keep the sheet open to fix and retry.
    } finally {
      setSubmitting(false);
    }
  }, [username, password, onSubmit, onClose]);

  return (
    <AppBottomSheet
      visible={visible}
      title={t('members.credentialsSheet.createTitle')}
      subtitle={t('members.credentialsSheet.createSubtitle')}
      onClose={onClose}
    >
      <View style={styles.container}>
        <Input
          label={t('members.credentialsSheet.usernameLabel')}
          value={username}
          onChangeText={setUsername}
          placeholder={t('members.credentialsSheet.usernamePlaceholder')}
          autoCapitalize="none"
        />
        <Input
          label={t('members.credentialsSheet.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          placeholder={t('members.credentialsSheet.passwordPlaceholder')}
          secureTextEntry
        />
        <Typography variant="caption" color="textSecondary" style={memberEmail ? undefined : styles.warning}>
          {memberEmail
            ? t('members.credentialsSheet.emailNote', { email: memberEmail })
            : t('members.credentialsSheet.noEmailNote')}
        </Typography>
        <Button
          label={t('members.credentialsSheet.createBtn')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!username.trim() || password.length < 6}
          size="lg"
        />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  warning: {
    color: '#b45309',
  },
});
