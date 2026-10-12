import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { CurrencyValue } from '@/core/providers';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { DatePicker } from '@/shared/components/DatePicker';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';
import type { FreezeAllowance, FreezeRequest } from '../../../application/freeze/MemberFreezeRepository';
import { formatMemberDate, startOfToday, toIsoDate } from '../../utils/memberDisplay';

interface FreezeMembershipBottomSheetProps {
  visible: boolean;
  member: Member;
  onClose: () => void;
  onFreeze: (id: number, request: FreezeRequest) => Promise<void>;
  onUnfreeze: (id: number) => Promise<void>;
  loadAllowance: (id: number) => Promise<FreezeAllowance>;
}

const FROZEN_COLOR = '#0284c7';

export function FreezeMembershipBottomSheet({
  visible,
  member,
  onClose,
  onFreeze,
  onUnfreeze,
  loadAllowance,
}: FreezeMembershipBottomSheetProps) {
  const theme = useTheme();
  const [startDate, setStartDate] = useState<Date | null>(() => startOfToday());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  const [allowance, setAllowance] = useState<FreezeAllowance | null>(null);
  const [waiveCharge, setWaiveCharge] = useState(false);
  const [overrideLimits, setOverrideLimits] = useState(false);

  // Start from a clean form each time the sheet opens.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setStartDate(startOfToday());
      setEndDate(null);
      setReason('');
      setError(undefined);
      setAllowance(null);
      setWaiveCharge(false);
      setOverrideLimits(false);
    }
  }

  // The plan's freeze allowance — reloaded each time the sheet opens, as every freeze uses some.
  useEffect(() => {
    if (!visible || member.isFrozen) return;
    let cancelled = false;
    loadAllowance(member.id)
      .then((a) => { if (!cancelled) setAllowance(a); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [visible, member.id, member.isFrozen, loadAllowance]);

  // The end date is the last day frozen, so 1 → 3 Oct is 3 days.
  const freezeDays =
    startDate && endDate
      ? Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1
      : null;

  const days = freezeDays ?? 0;
  const rate = allowance ? allowance.chargePerExtraDay : 0;
  const freeDays = allowance ? Math.min(days, allowance.freeDaysRemaining) : 0;
  const extraDays = rate > 0 ? days - freeDays : 0;
  const overLimits = !!allowance && days > 0 && (!allowance.canFreeze || days > allowance.remainingDays);
  const canSubmit = !overLimits || (overrideLimits && !!allowance?.canOverrideLimits);

  const handleFreeze = useCallback(async () => {
    if (!endDate) {
      setError('Select the date the freeze ends.');
      return;
    }
    if (startDate && endDate < startDate) {
      setError('The freeze can\'t end before it starts.');
      return;
    }
    try {
      setSubmitting(true);
      await onFreeze(member.id, {
        freezeStartDate: startDate ? toIsoDate(startDate) : undefined,
        freezeUntil: toIsoDate(endDate),
        reason: reason.trim() || undefined,
        overrideLimits: overrideLimits || undefined,
        waiveCharge: waiveCharge || undefined,
      });
      onClose();
    } catch {
      // The API client already surfaced the server's message as a toast.
    } finally {
      setSubmitting(false);
    }
  }, [startDate, endDate, reason, overrideLimits, waiveCharge, member.id, onFreeze, onClose]);

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
              minimumDate={startDate ?? startOfToday()}
              error={error}
              required
            />

            {allowance ? (
              <Typography variant="bodySmall" color="textSecondary">
                {allowance.remainingDays} of {allowance.maxDays} freeze days left
                {allowance.maxOccurrences != null ? ` · ${allowance.remainingOccurrences ?? 0} of ${allowance.maxOccurrences} freezes left` : ''}
                {' · '}{allowance.freeDaysRemaining} free
              </Typography>
            ) : null}

            {freezeDays !== null && freezeDays > 0 ? (
              <View style={[styles.summary, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
                <Feather name="clock" size={16} color={theme.textSecondary} />
                <Typography variant="bodySmall" style={styles.summaryText}>
                  {freezeDays} day{freezeDays === 1 ? '' : 's'} — expiry is extended by the days frozen once it ends
                </Typography>
              </View>
            ) : null}

            {extraDays > 0 ? (
              <View style={[styles.notice, { borderColor: theme.border }]}>
                <Typography variant="bodySmall" style={waiveCharge ? styles.waived : undefined}>
                  {freeDays} free + {extraDays} extra day{extraDays === 1 ? '' : 's'} × <CurrencyValue amount={rate} /> ={' '}
                  <CurrencyValue amount={extraDays * rate} />
                </Typography>
                <Typography variant="bodySmall" color="textSecondary">
                  {waiveCharge
                    ? 'Charge waived.'
                    : 'Added to their balance when the freeze ends, for the days actually frozen.'}
                </Typography>
                <View style={styles.toggleRow}>
                  <Typography variant="bodySmall" style={styles.toggleLabel}>Waive the extra-day charge</Typography>
                  <Switch value={waiveCharge} onValueChange={setWaiveCharge} />
                </View>
              </View>
            ) : null}

            {overLimits && allowance ? (
              <View style={[styles.notice, styles.limitNotice]}>
                <Typography variant="bodySmall" style={styles.limitText}>
                  {allowance.canFreeze
                    ? `Only ${allowance.remainingDays} freeze day${allowance.remainingDays === 1 ? '' : 's'} left on this plan — this freeze is ${days} days.`
                    : allowance.unavailableMessage}
                </Typography>
                {allowance.canOverrideLimits ? (
                  <View style={styles.toggleRow}>
                    <Typography variant="bodySmall" style={styles.toggleLabel}>Override the plan&apos;s limits (manager)</Typography>
                    <Switch value={overrideLimits} onValueChange={setOverrideLimits} />
                  </View>
                ) : (
                  <Typography variant="bodySmall" style={styles.limitText}>
                    Only a manager can freeze past the plan&apos;s limits.
                  </Typography>
                )}
              </View>
            ) : null}

            {allowance ? (
              <Typography variant="bodySmall" color="textSecondary">
                {allowance.autoUnfreeze
                  ? 'This plan unfreezes automatically the day after the end date.'
                  : "This plan doesn't unfreeze automatically — unfreeze the membership when the member is back."}
              </Typography>
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
              disabled={!canSubmit}
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
  notice: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  limitNotice: {
    backgroundColor: '#FFFBEB',
    borderColor: BrandColors.trainerAmber,
  },
  limitText: {
    color: '#92400E',
  },
  waived: {
    textDecorationLine: 'line-through',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  toggleLabel: {
    flex: 1,
    fontWeight: '600',
  },
});
