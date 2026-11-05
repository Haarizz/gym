import { format } from 'date-fns';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { Spacing } from '@/core/theme';
import { Text } from '@/shared/components/AppText';
import { Button } from '@/shared/components/Button';
import { DatePicker } from '@/shared/components/DatePicker';
import { FormSheet } from '@/shared/components/FormSheet';
import type { FollowUp } from '../../domain/FollowUp';

interface RescheduleFollowUpSheetProps {
  visible: boolean;
  followUp: FollowUp | null;
  onClose: () => void;
  onSubmit: (dueDate: string) => void;
  submitting?: boolean;
}

export function RescheduleFollowUpSheet({
  visible,
  followUp,
  onClose,
  onSubmit,
  submitting = false,
}: RescheduleFollowUpSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [error, setError] = useState('');

  // Reset each time the sheet opens for a follow-up (during render, not in an effect).
  const openKey = visible && followUp ? String(followUp.id) : null;
  const [lastOpenKey, setLastOpenKey] = useState(openKey);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey && followUp) {
      setDueDate(followUp.dueDate ? new Date(followUp.dueDate) : new Date());
      setError('');
    }
  }

  const handleSubmit = () => {
    if (!dueDate) {
      setError(t('followUps.msg.newDueDateRequired'));
      return;
    }
    // Local calendar date — toISOString() would shift it back a day in timezones ahead of UTC.
    onSubmit(format(dueDate, 'yyyy-MM-dd'));
  };

  if (!followUp) return null;

  return (
    <FormSheet
      visible={visible}
      title={t('followUps.rescheduleTitle')}
      icon="calendar"
      closeLabel={t('followUps.cancel')}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="outline"
            label={t('followUps.cancel')}
            onPress={onClose}
            disabled={submitting}
            style={styles.flex}
          />
          <Button
            label={t('followUps.reschedule')}
            onPress={handleSubmit}
            loading={submitting}
            style={styles.primaryButton}
          />
        </>
      }
    >
      <Text style={[styles.leadSubHeader, { color: theme.textSecondary }]}>
        {t('followUps.reschedulingFor')}{' '}
        <Text style={{ color: theme.text, fontWeight: '700' }}>{followUp.leadName}</Text>
      </Text>

      <DatePicker
        label={t('followUps.newDueDate')}
        required
        minimumDate={new Date()}
        value={dueDate}
        onChange={val => {
          setDueDate(val);
          setError('');
        }}
        error={error}
      />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  primaryButton: {
    flex: 2,
  },
  leadSubHeader: {
    fontSize: 14,
    marginBottom: Spacing.three,
  },
});
