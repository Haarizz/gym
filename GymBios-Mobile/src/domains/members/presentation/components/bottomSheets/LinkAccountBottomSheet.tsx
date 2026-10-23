import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';

interface LinkAccountBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Sends the link request; the account owner accepts it in their own app. */
  onSubmit: (identifier: string) => Promise<void>;
}

export function LinkAccountBottomSheet({ visible, onClose, onSubmit }: LinkAccountBottomSheetProps) {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    try {
      setSubmitting(true);
      await onSubmit(identifier.trim());
      setIdentifier('');
      onClose();
    } catch {
      // Toasted by the API client; keep the sheet open to fix and retry.
    } finally {
      setSubmitting(false);
    }
  }, [identifier, onSubmit, onClose]);

  return (
    <AppBottomSheet
      visible={visible}
      title={t('members.linkSheet.title')}
      subtitle={t('members.linkSheet.subtitle')}
      onClose={onClose}
    >
      <View style={styles.container}>
        <Input
          label={t('members.linkSheet.identifierLabel')}
          value={identifier}
          onChangeText={setIdentifier}
          placeholder={t('members.linkSheet.identifierPlaceholder')}
          autoCapitalize="none"
        />
        <Typography variant="caption" color="textSecondary">
          {t('members.linkSheet.hint')}
        </Typography>
        <Button
          label={t('members.linkSheet.send')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!identifier.trim()}
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
