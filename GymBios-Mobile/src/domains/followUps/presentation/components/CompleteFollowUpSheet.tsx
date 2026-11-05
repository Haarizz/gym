import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { localizeOptions } from '@/core/i18n/format';
import { Spacing } from '@/core/theme';
import { Text } from '@/shared/components/AppText';
import { Button } from '@/shared/components/Button';
import { Dropdown } from '@/shared/components/Dropdown';
import { FormSheet } from '@/shared/components/FormSheet';
import { Input } from '@/shared/components/Input';
import type { FollowUp } from '../../domain/FollowUp';

interface CompleteFollowUpSheetProps {
  visible: boolean;
  /** Only the lead's name is shown, so callers outside the follow-ups domain can pass just that. */
  followUp: Pick<FollowUp, 'leadName'> | null;
  onClose: () => void;
  onSubmit: (outcome: string, notes: string) => void;
  submitting?: boolean;
}

const OUTCOME_OPTIONS = [
  { label: 'Successful', value: 'successful' },
  { label: 'No Response', value: 'no-response' },
  { label: 'Callback Requested', value: 'callback-requested' },
  { label: 'Not Interested', value: 'not-interested' },
  { label: 'Converted', value: 'converted' },
  { label: 'Rescheduled', value: 'rescheduled' },
];

export function CompleteFollowUpSheet({
  visible,
  followUp,
  onClose,
  onSubmit,
  submitting = false,
}: CompleteFollowUpSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [outcome, setOutcome] = useState('successful');
  const [notes, setNotes] = useState('');

  // Reset each time the sheet opens (during render, not in an effect).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setOutcome('successful');
      setNotes('');
    }
  }

  if (!followUp) return null;

  return (
    <FormSheet
      visible={visible}
      title={t('followUps.completeTitle')}
      icon="check-circle"
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
            label={t('followUps.complete')}
            onPress={() => onSubmit(outcome, notes.trim())}
            loading={submitting}
            style={styles.primaryButton}
          />
        </>
      }
    >
      <Text style={[styles.leadSubHeader, { color: theme.textSecondary }]}>
        {t('followUps.completingFor')}{' '}
        <Text style={{ color: theme.text, fontWeight: '700' }}>{followUp.leadName}</Text>
      </Text>

      <Dropdown
        label={t('followUps.outcome')}
        value={outcome}
        options={localizeOptions(OUTCOME_OPTIONS, { prefix: 'followUps.outcomes' })}
        onChange={setOutcome}
      />

      <Input
        label={t('followUps.completionNotes')}
        placeholder={t('followUps.outcomeNotesPlaceholder')}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={styles.notes}
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
  notes: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
