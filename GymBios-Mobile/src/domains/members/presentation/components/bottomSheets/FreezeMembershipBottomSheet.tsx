import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { useCurrency } from '@/core/providers';
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
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
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
      setError(t('members.freezeSheet.endDateRequired'));
      return;
    }
    if (startDate && endDate < startDate) {
      setError(t('members.freezeSheet.endDateBeforeStart'));
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
  }, [startDate, endDate, reason, overrideLimits, waiveCharge, member.id, onFreeze, onClose, t]);

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

  const occurrencesStr = allowance && allowance.maxOccurrences != null
    ? t('members.freezeSheet.freezesLeft', { count: allowance.remainingOccurrences ?? 0, max: allowance.maxOccurrences })
    : '';

  return (
    <AppBottomSheet
      visible={visible}
      title={member.isFrozen ? t('members.freezeSheet.unfreezeTitle') : t('members.freezeSheet.freezeTitle')}
      subtitle={member.name}
      onClose={onClose}
    >
      <View style={styles.container}>
        {member.isFrozen ? (
          <>
            <View style={[styles.summary, { backgroundColor: `${FROZEN_COLOR}14`, borderColor: `${FROZEN_COLOR}40` }]}>
              <Feather name="pause-circle" size={16} color={FROZEN_COLOR} />
              <Typography variant="bodySmall" style={[styles.summaryText, { color: FROZEN_COLOR }]}>
                {t('members.freezeSheet.frozenPeriod', {
                  start: formatMemberDate(member.freezeStartDate),
                  end: formatMemberDate(member.freezeEndDate),
                })}
              </Typography>
            </View>
            <Typography variant="bodySmall" color="textSecondary">
              {t('members.freezeSheet.unfreezeReactivates')}
            </Typography>
            <Button
              label={t('members.freezeSheet.unfreezeBtn')}
              onPress={handleUnfreeze}
              loading={submitting}
              size="lg"
            />
          </>
        ) : (
          <>
            <DatePicker
              label={t('members.freezeSheet.freezeFrom')}
              placeholder={t('members.freezeSheet.selectStartDate')}
              value={startDate}
              onChange={(d) => {
                setStartDate(d);
                setError(undefined);
              }}
              minimumDate={startOfToday()}
            />
            <DatePicker
              label={t('members.freezeSheet.freezeUntil')}
              placeholder={t('members.freezeSheet.selectEndDate')}
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
                {t('members.freezeSheet.allowanceStatus', {
                  remainingDays: allowance.remainingDays,
                  maxDays: allowance.maxDays,
                  occurrences: occurrencesStr,
                  freeDays: allowance.freeDaysRemaining,
                })}
              </Typography>
            ) : null}

            {freezeDays !== null && freezeDays > 0 ? (
              <View style={[styles.summary, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
                <Feather name="clock" size={16} color={theme.textSecondary} />
                <Typography variant="bodySmall" style={styles.summaryText}>
                  {t('members.freezeSheet.summaryText', { count: freezeDays })}
                </Typography>
              </View>
            ) : null}

            {extraDays > 0 ? (
              <View style={[styles.notice, { borderColor: theme.border }]}>
                <Typography variant="bodySmall" style={waiveCharge ? styles.waived : undefined}>
                  {t('members.freezeSheet.chargeCalculation', {
                    count: extraDays,
                    freeDays,
                    extraDays,
                    rate: formatCurrency(rate),
                    total: formatCurrency(extraDays * rate),
                  })}
                </Typography>
                <Typography variant="bodySmall" color="textSecondary">
                  {waiveCharge
                    ? t('members.freezeSheet.chargeWaivedNote')
                    : t('members.freezeSheet.chargeAddedNote')}
                </Typography>
                <View style={styles.toggleRow}>
                  <Typography variant="bodySmall" style={styles.toggleLabel}>
                    {t('members.freezeSheet.waiveChargeLabel')}
                  </Typography>
                  <Switch value={waiveCharge} onValueChange={setWaiveCharge} />
                </View>
              </View>
            ) : null}

            {overLimits && allowance ? (
              <View style={[styles.notice, styles.limitNotice]}>
                <Typography variant="bodySmall" style={styles.limitText}>
                  {allowance.canFreeze
                    ? t('members.freezeSheet.overLimitsPlanRemaining', {
                        count: allowance.remainingDays,
                        remainingDays: allowance.remainingDays,
                        days,
                      })
                    : allowance.unavailableMessage}
                </Typography>
                {allowance.canOverrideLimits ? (
                  <View style={styles.toggleRow}>
                    <Typography variant="bodySmall" style={styles.toggleLabel}>
                      {t('members.freezeSheet.overrideLimitsManager')}
                    </Typography>
                    <Switch value={overrideLimits} onValueChange={setOverrideLimits} />
                  </View>
                ) : (
                  <Typography variant="bodySmall" style={styles.limitText}>
                    {t('members.freezeSheet.onlyManagerCanOverride')}
                  </Typography>
                )}
              </View>
            ) : null}

            {allowance ? (
              <Typography variant="bodySmall" color="textSecondary">
                {allowance.autoUnfreeze
                  ? t('members.freezeSheet.autoUnfreezeNote')
                  : t('members.freezeSheet.manualUnfreezeNote')}
              </Typography>
            ) : null}

            <Input
              label={t('members.freezeSheet.reasonLabel')}
              value={reason}
              onChangeText={setReason}
              placeholder={t('members.freezeSheet.reasonPlaceholder')}
            />
            <Button
              label={t('members.freezeSheet.freezeBtn')}
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
