import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
      title={existingUsername ? 'Update Credentials' : 'Grant Access'}
      subtitle="Set app login credentials"
      onClose={onClose}
    >
      <View style={styles.container}>
        <Input
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="Enter app username"
          autoCapitalize="none"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter app password"
          secureTextEntry
        />
        <Button
          label={existingUsername ? 'Update Credentials' : 'Grant Access'}
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