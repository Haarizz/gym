import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';

interface SuspendMembershipBottomSheetProps {
  visible: boolean;
  memberName: string;
  onClose: () => void;
  /** Suspends this gym's membership; the reason is shown to the member in the app. */
  onSuspend: (reason?: string) => Promise<void>;
}

export function SuspendMembershipBottomSheet({
  visible,
  memberName,
  onClose,
  onSuspend,
}: SuspendMembershipBottomSheetProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    try {
      setSubmitting(true);
      await onSuspend(reason.trim() || undefined);
      setReason('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [reason, onSuspend, onClose]);

  return (
    <AppBottomSheet
      visible={visible}
      title={t('members.suspendSheet.title')}
      subtitle={memberName}
      onClose={onClose}
    >
      <View style={styles.container}>
        <Typography variant="caption" color="textSecondary">
          {t('members.suspendSheet.description')}
        </Typography>
        <Input
          label={t('members.suspendSheet.reasonLabel')}
          value={reason}
          onChangeText={setReason}
          placeholder={t('members.suspendSheet.reasonPlaceholder')}
          multiline
        />
        <Button
          label={t('members.suspendSheet.confirm')}
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
