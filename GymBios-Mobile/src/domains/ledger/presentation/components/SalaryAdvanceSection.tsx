import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Text } from '@/shared/components/AppText';
import { AppBottomSheet, Input } from '@/shared/components';
import { ConfirmationModal } from '@/shared/components/ConfirmationModal';
import { toast } from '@/shared/components/Toasts/toastStore';
import { CurrencyValue, useCurrency } from '@/core/providers';
import { formatDate } from '@/core/i18n';
import { Radius, Spacing } from '@/core/theme';
import {
  SALARY_ADVANCE_PENDING,
  SALARY_ADVANCE_REASON_MAX,
  type LedgerRole,
  type SalaryAdvance,
  type SalaryAdvanceLimits,
} from '../../domain/SalaryAdvance';
import { useSalaryAdvanceMutations, useSalaryAdvances } from '../../hooks/useSalaryAdvances';

interface SalaryAdvanceSectionProps {
  role: LedgerRole;
  /** Teal for staff, trainerAmber for trainers. */
  accentColor: string;
}

type StatusKey = 'pending' | 'active' | 'repaid' | 'rejected' | 'cancelled';

const STATUS_STYLES: Record<StatusKey, { bg: string; border: string; text: string }> = {
  pending: { bg: '#FEF9C3', border: '#FEF08A', text: '#A16207' },
  active: { bg: '#DBEAFE', border: '#BFDBFE', text: '#1D4ED8' },
  repaid: { bg: '#DCFCE7', border: '#BBF7D0', text: '#15803D' },
  rejected: { bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C' },
  cancelled: { bg: '#F1F5F9', border: '#E2E8F0', text: '#475569' },
};

function statusKey(status: string): StatusKey {
  switch (status) {
    case SALARY_ADVANCE_PENDING:
      return 'pending';
    case 'Fully Repaid':
      return 'repaid';
    case 'Rejected':
      return 'rejected';
    case 'Cancelled':
      return 'cancelled';
    default:
      return 'active';
  }
}

function apiErrorMessage(err: unknown): string | null {
  const e = err as { response?: { data?: { message?: string } } } | null;
  const message = e?.response?.data?.message;
  return typeof message === 'string' && message.trim() ? message : null;
}

const fmt = (value: string | null, pattern: string) => {
  if (!value) return null;
  try {
    return formatDate(value, pattern);
  } catch {
    return value;
  }
};

/** The Advances tab of the staff and trainer ledgers: request a salary advance and track requests. */
export function SalaryAdvanceSection({ role, accentColor }: SalaryAdvanceSectionProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useSalaryAdvances(role);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<SalaryAdvance | null>(null);
  const { cancel } = useSalaryAdvanceMutations(role);
  const { formatCurrency } = useCurrency();

  if (isLoading && !data) {
    return (
      <View style={[styles.card, styles.centered]}>
        <ActivityIndicator color={accentColor} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.card, styles.centered]}>
        <Text style={styles.mutedText}>{isError ? t('ledger.advances.loadFailed') : t('ledger.errorEmpty')}</Text>
        <Pressable onPress={() => refetch()} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.linkText, { color: accentColor }]}>{t('ledger.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const { limits, advances } = data;
  const nextDeduction = advances
    .filter((a) => statusKey(a.status) === 'active' && a.nextDeductionDate)
    .map((a) => a.nextDeductionDate as string)
    .sort()[0] ?? null;

  const confirmWithdraw = () => {
    if (!withdrawTarget) return;
    cancel.mutate(withdrawTarget.id, {
      onSuccess: () => toast.success(t('ledger.advances.withdrawSuccess')),
      onError: (err) => toast.error(apiErrorMessage(err) ?? t('ledger.advances.withdrawFailed')),
      onSettled: () => setWithdrawTarget(null),
    });
  };

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('ledger.advances.summaryTitle')}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('ledger.advances.available')}</Text>
            <CurrencyValue amount={limits.available} style={[styles.summaryValue, { color: accentColor }]} />
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('ledger.advances.outstanding')}</Text>
            <CurrencyValue amount={limits.outstanding} style={styles.summaryValue} />
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('ledger.advances.nextDeduction')}</Text>
            <Text style={styles.summaryValue}>{fmt(nextDeduction, 'PP') ?? '—'}</Text>
          </View>
        </View>

        <Pressable
          style={[styles.requestButton, { backgroundColor: accentColor }, !limits.canRequest && styles.disabled]}
          disabled={!limits.canRequest}
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityState={{ disabled: !limits.canRequest }}
        >
          <Feather name="plus-circle" size={18} color="#FFFFFF" />
          <Text style={styles.requestButtonText}>{t('ledger.advances.requestButton')}</Text>
        </Pressable>
        {!limits.canRequest && (
          <View style={styles.blockedRow}>
            <Feather name="info" size={14} color="#64748B" />
            <Text style={styles.blockedText}>{blockedReason(limits, t)}</Text>
          </View>
        )}
      </View>

      {/* My requests */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('ledger.advances.myRequestsTitle')}</Text>
        {advances.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="inbox" size={28} color="#94A3B8" />
            <Text style={styles.emptyTitle}>{t('ledger.advances.emptyTitle')}</Text>
            <Text style={styles.mutedText}>{t('ledger.advances.emptyDesc')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {advances.map((a) => (
              <AdvanceRow
                key={a.id}
                advance={a}
                accentColor={accentColor}
                onWithdraw={() => setWithdrawTarget(a)}
              />
            ))}
          </View>
        )}
      </View>

      <RequestSheet
        visible={sheetOpen}
        role={role}
        limits={limits}
        accentColor={accentColor}
        onClose={() => setSheetOpen(false)}
      />

      <ConfirmationModal
        visible={!!withdrawTarget}
        variant="warning"
        icon="x-circle"
        title={t('ledger.advances.withdrawTitle')}
        message={t('ledger.advances.withdrawMessage', {
          amount: formatCurrency(withdrawTarget?.requestedAmount ?? 0),
        })}
        confirmText={t('ledger.advances.withdrawConfirm')}
        loading={cancel.isPending}
        onConfirm={confirmWithdraw}
        onClose={() => !cancel.isPending && setWithdrawTarget(null)}
      />
    </View>
  );
}

/** Localised version of the server's reason_blocked (the server text is the fallback). */
function blockedReason(limits: SalaryAdvanceLimits, t: TFunction): string {
  if (limits.baseSalary <= 0) return t('ledger.advances.blockedNoSalary');
  if (limits.hasPending) return t('ledger.advances.blockedPending');
  if (limits.available <= 0) return t('ledger.advances.blockedCap');
  return limits.reasonBlocked ?? t('ledger.advances.blockedOther');
}

function AdvanceRow({
  advance,
  accentColor,
  onWithdraw,
}: {
  advance: SalaryAdvance;
  accentColor: string;
  onWithdraw: () => void;
}) {
  const { t } = useTranslation();
  const key = statusKey(advance.status);
  const colors = STATUS_STYLES[key];
  const decidedApproved = key === 'active' || key === 'repaid';
  const reason = advance.remarks?.split('\nApproval Note:')[0]?.trim();

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.rowAmounts}>
          <Text style={styles.rowLabel}>{t('ledger.advances.requested')}</Text>
          <CurrencyValue amount={advance.requestedAmount} style={styles.rowAmount} />
        </View>
        <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{t(`ledger.advances.status.${key}`)}</Text>
        </View>
      </View>

      {!!reason && <Text style={styles.reasonText} numberOfLines={3}>{reason}</Text>}

      {decidedApproved && (
        <View style={styles.planBox}>
          <View style={styles.planLine}>
            <Text style={styles.planLabel}>{t('ledger.advances.approved')}</Text>
            <CurrencyValue amount={advance.approvedAmount} style={styles.planValue} />
          </View>
          {advance.installmentCount > 0 && (
            <View style={styles.planLine}>
              <Text style={styles.planLabel}>{t('ledger.advances.plan')}</Text>
              <Text style={styles.planValue}>
                {advance.installmentCount} × <CurrencyValue amount={advance.installmentAmount} />
                {advance.startMonth ? ` · ${fmt(advance.startMonth, 'MMM yyyy')}` : ''}
              </Text>
            </View>
          )}
          <View style={styles.planLine}>
            <Text style={styles.planLabel}>{t('ledger.advances.repaid')}</Text>
            <CurrencyValue amount={advance.totalDeducted} style={styles.planValue} />
          </View>
          <View style={styles.planLine}>
            <Text style={styles.planLabel}>{t('ledger.advances.balance')}</Text>
            <CurrencyValue amount={advance.balance} style={styles.planValue} />
          </View>
        </View>
      )}

      {key === 'rejected' && !!advance.rejectionNote && (
        <Text style={styles.rejectionText}>
          {t('ledger.advances.rejectionNote', { note: advance.rejectionNote })}
        </Text>
      )}

      <View style={styles.rowBottom}>
        <Text style={styles.dateText}>{fmt(advance.requestDate, 'PP') ?? ''}</Text>
        {key === 'pending' && (
          <Pressable onPress={onWithdraw} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.linkText, { color: accentColor }]}>{t('ledger.advances.withdraw')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function RequestSheet({
  visible,
  role,
  limits,
  accentColor,
  onClose,
}: {
  visible: boolean;
  role: LedgerRole;
  limits: SalaryAdvanceLimits;
  accentColor: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const { create } = useSalaryAdvanceMutations(role);
  const [amountText, setAmountText] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});

  const close = () => {
    if (create.isPending) return;
    setAmountText('');
    setReason('');
    setErrors({});
    onClose();
  };

  const submit = () => {
    const amount = Number(amountText.replace(',', '.'));
    const trimmed = reason.trim();
    const next: typeof errors = {};
    if (!amountText.trim() || !Number.isFinite(amount) || amount <= 0) {
      next.amount = t('ledger.advances.errorAmountRequired');
    } else if (!/^\d+([.,]\d{1,2})?$/.test(amountText.trim())) {
      next.amount = t('ledger.advances.errorAmountDecimals');
    } else if (amount > limits.available) {
      next.amount = t('ledger.advances.errorAmountMax', { amount: formatCurrency(limits.available) });
    }
    if (!trimmed) {
      next.reason = t('ledger.advances.errorReasonRequired');
    } else if (trimmed.length > SALARY_ADVANCE_REASON_MAX) {
      next.reason = t('ledger.advances.errorReasonLength', { max: SALARY_ADVANCE_REASON_MAX });
    }
    setErrors(next);
    if (next.amount || next.reason) return;

    create.mutate(
      { amount, reason: trimmed },
      {
        onSuccess: () => {
          toast.success(t('ledger.advances.submitSuccessDesc'), { title: t('ledger.advances.submitSuccessTitle') });
          setAmountText('');
          setReason('');
          setErrors({});
          onClose();
        },
        onError: (err) => toast.error(apiErrorMessage(err) ?? t('ledger.advances.submitFailed')),
      },
    );
  };

  return (
    <AppBottomSheet
      visible={visible}
      title={t('ledger.advances.sheetTitle')}
      subtitle={t('ledger.advances.sheetSubtitle')}
      onClose={close}
      footer={
        <Pressable
          style={[styles.requestButton, { backgroundColor: accentColor }, create.isPending && styles.disabled]}
          disabled={create.isPending}
          onPress={submit}
          accessibilityRole="button"
        >
          {create.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.requestButtonText}>{t('ledger.advances.submit')}</Text>
          )}
        </Pressable>
      }
    >
      <View style={styles.form}>
        <View>
          <Input
            label={t('ledger.advances.amountLabel')}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="0.00"
            error={errors.amount}
          />
          <Text style={styles.hintText}>
            {t('ledger.advances.amountMax', { amount: formatCurrency(limits.available) })}
          </Text>
        </View>
        <View>
          <Input
            label={t('ledger.advances.reasonLabel')}
            value={reason}
            onChangeText={setReason}
            placeholder={t('ledger.advances.reasonPlaceholder')}
            multiline
            maxLength={SALARY_ADVANCE_REASON_MAX}
            style={styles.reasonInput}
            error={errors.reason}
          />
          <Text style={styles.hintText}>
            {reason.length}/{SALARY_ADVANCE_REASON_MAX}
          </Text>
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  summaryItem: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
    paddingVertical: 14,
    minHeight: 48,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  blockedText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
  },
  empty: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.four,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  mutedText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 8,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rowAmounts: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reasonText: {
    fontSize: 12,
    color: '#334155',
  },
  planBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.sm,
    padding: Spacing.two,
    gap: 4,
  },
  planLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  planValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  rejectionText: {
    fontSize: 12,
    color: '#B91C1C',
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  form: {
    gap: Spacing.three,
  },
  hintText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  reasonInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
