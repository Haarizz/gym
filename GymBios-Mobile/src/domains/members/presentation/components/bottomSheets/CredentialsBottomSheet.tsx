import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import type { SetCredentialsRequest } from '../../../application/access/MemberAccessRepository';

interface CredentialsBottomSheetProps {
  visible: boolean;
  memberId: number;
  existingUsername?: string;
  onClose: () => void;
  onSetCredentials: (id: number, request: SetCredentialsRequest) => Promise<void>;
}

export function CredentialsBottomSheet({
  visible,
  memberId,
  existingUsername,
  onClose,
  onSetCredentials,
}: CredentialsBottomSheetProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState(existingUsername ?? '');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    try {
      setSubmitting(true);
      await onSetCredentials(memberId, { appUsername: username, appPassword: password });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [username, password, memberId, onSetCredentials, onClose]);

  return (
    <AppBottomSheet
      visible={visible}
      title={existingUsername ? t('members.credentialsSheet.updateTitle') : t('members.credentialsSheet.grantTitle')}
      subtitle={t('members.credentialsSheet.subtitle')}
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
        <Button
          label={existingUsername ? t('members.credentialsSheet.updateBtn') : t('members.credentialsSheet.grantBtn')}
          onPress={handleSubmit}
          loading={submitting}
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
});