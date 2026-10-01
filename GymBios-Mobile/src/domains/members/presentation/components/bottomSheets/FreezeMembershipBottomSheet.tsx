import Feather from '@expo/vector-icons/Feather';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { DatePicker } from '@/shared/components/DatePicker';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';
import type { FreezeRequest } from '../../../application/freeze/MemberFreezeRepository';
import { formatMemberDate, startOfToday, toIsoDate } from '../../utils/memberDisplay';

interface FreezeMembershipBottomSheetProps {
  visible: boolean;
  member: Member;
  onClose: () => void;
  onFreeze: (id: number, request: FreezeRequest) => Promise<void>;
  onUnfreeze: (id: number) => Promise<void>;
}

const FROZEN_COLOR = '#0284c7';

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function FreezeMembershipBottomSheet({
  visible,
  member,
  onClose,
  onFreeze,
  onUnfreeze,
}: FreezeMembershipBottomSheetProps) {
  const theme = useTheme();
  const [startDate, setStartDate] = useState<Date | null>(() => startOfToday());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);

  // Start from a clean form each time the sheet opens.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setStartDate(startOfToday());
      setEndDate(null);
      setReason('');
      setError(undefined);
    }
  }

  const freezeDays =
    startDate && endDate
      ? Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000)
      : null;

  const handleFreeze = useCallback(async () => {
    if (!endDate) {
      setError('Select the date the freeze ends.');
      return;
    }
    if (startDate && endDate <= startDate) {
      setError('The freeze must end after it starts.');
      return;
    }
    try {
      setSubmitting(true);
      await onFreeze(member.id, {
        freezeStartDate: startDate ? toIsoDate(startDate) : undefined,
        freezeUntil: toIsoDate(endDate),
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch {
      // The API client already surfaced the server's message as a toast.
    } finally {
      setSubmitting(false);
    }
  }, [startDate, endDate, reason, member.id, onFreeze, onClose]);

  const handleUnfreeze = useCallback(async () => {
    try {
      setSubmitting(true);
      await onUnfreeze(member.id);
      onClose();
    } catch {
      // Toasted by the API client.
    } finally {
      setSubmitting(false);
    }
  }, [member.id, onUnfreeze, onClose]);

  return (
    <AppBottomSheet
      visible={visible}
      title={member.isFrozen ? 'Unfreeze Membership' : 'Freeze Membership'}
      subtitle={member.name}
      onClose={onClose}
    >
      <View style={styles.container}>
        {member.isFrozen ? (
          <>
            <View style={[styles.summary, { backgroundColor: `${FROZEN_COLOR}14`, borderColor: `${FROZEN_COLOR}40` }]}>
              <Feather name="pause-circle" size={16} color={FROZEN_COLOR} />
              <Typography variant="bodySmall" style={[styles.summaryText, { color: FROZEN_COLOR }]}>
                Frozen {formatMemberDate(member.freezeStartDate)} → {formatMemberDate(member.freezeEndDate)}
              </Typography>
            </View>
            <Typography variant="bodySmall" color="textSecondary">
              Unfreezing reactivates the membership today.
            </Typography>
            <Button
              label="Unfreeze Membership"
              onPress={handleUnfreeze}
              loading={submitting}
              size="lg"
            />
          </>
        ) : (
          <>
            <DatePicker
              label="Freeze from"
              placeholder="Select start date"
              value={startDate}
              onChange={(d) => {
                setStartDate(d);
                setError(undefined);
              }}
              minimumDate={startOfToday()}
            />
            <DatePicker
              label="Freeze until"
              placeholder="Select end date"
              value={endDate}
              onChange={(d) => {
                setEndDate(d);
                setError(undefined);
              }}
              minimumDate={addDays(startDate ?? startOfToday(), 1)}
              error={error}
              required
            />

            {freezeDays !== null && freezeDays > 0 ? (
              <View style={[styles.summary, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
                <Feather name="clock" size={16} color={theme.textSecondary} />
                <Typography variant="bodySmall" style={styles.summaryText}>
                  {freezeDays} day{freezeDays === 1 ? '' : 's'} — expiry is extended by the days frozen once it ends
                </Typography>
              </View>
            ) : null}

            <Input
              label="Reason"
              value={reason}
              onChangeText={setReason}
              placeholder="Optional, e.g. travel or injury"
            />
            <Button
              label="Freeze Membership"
              onPress={handleFreeze}
              loading={submitting}
              size="lg"
            />
          </>
        )}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  summaryText: {
    flex: 1,
    fontWeight: '600',
  },
});
