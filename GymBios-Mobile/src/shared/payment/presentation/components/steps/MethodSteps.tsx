import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { CurrencyValue } from '@/core/providers';
import { Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Typography } from '@/shared/components/Typography';
import type { OnlineMethodType, PayerMode } from '../../../types';
import { ChoiceChips } from './ChoiceChips';
import { SplitAmountPicker } from './SplitAmountPicker';
import { StepHero } from './StepHero';
import { SummaryRows } from './SummaryRows';

const ONLINE_ICONS: Record<OnlineMethodType, string> = {
  card: 'credit-card',
  upi: 'smartphone',
  netbanking: 'globe',
};

/** Card / UPI / Net banking: nothing to fill in — Stripe's own sheet does the rest. */
export function OnlineStep({ methodType, amount }: { methodType: OnlineMethodType; amount: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <StepHero
        iconName={ONLINE_ICONS[methodType]}
        title={t(`paymentSheet.online.title.${methodType}`)}
        note={
          <Trans
            i18nKey={`paymentSheet.online.note.${methodType}`}
            components={{ amount: <CurrencyValue amount={amount} decimals={2} /> }}
          />
        }
      />
      <SecureNote />
    </View>
  );
}

/**
 * Local backend simulation, shown instead of Stripe's sheet: approve or decline a test
 * payment. Everything after it (verification, refunds, approvals) runs for real.
 */
export function SimulatedStep({ methodType, amount }: { methodType: OnlineMethodType; amount: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: theme.trainer + '22', borderColor: theme.trainer }]}>
        <Typography variant="caption" style={[styles.badgeText, { color: theme.text }]}>
          {t('paymentSheet.simulated.badge')}
        </Typography>
      </View>
      <StepHero
        iconName={ONLINE_ICONS[methodType]}
        title={t('paymentSheet.simulated.title')}
        note={
          <Trans
            i18nKey="paymentSheet.simulated.note"
            values={{ method: t(`paymentSheet.methods.${methodType}.title`) }}
            components={{ amount: <CurrencyValue amount={amount} decimals={2} /> }}
          />
        }
      />
    </View>
  );
}

/** Members send a pay-at-reception request; staff confirm the cash is in hand. */
export function CashStep({ payer, amount }: { payer: PayerMode; amount: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <StepHero
        iconName={payer === 'staff' ? 'dollar-sign' : 'map-pin'}
        title={t(payer === 'staff' ? 'paymentSheet.cash.staffTitle' : 'paymentSheet.cash.memberTitle')}
        note={
          <Trans
            i18nKey={payer === 'staff' ? 'paymentSheet.cash.staffNote' : 'paymentSheet.cash.memberNote'}
            components={{ amount: <CurrencyValue amount={amount} decimals={2} /> }}
          />
        }
      />
    </View>
  );
}

interface OnlineViaPickerProps {
  value: OnlineMethodType;
  available: OnlineMethodType[];
  onChange: (value: OnlineMethodType) => void;
  label: string;
}

function OnlineViaPicker({ value, available, onChange, label }: OnlineViaPickerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (available.length <= 1) return null;
  return (
    <View style={styles.section}>
      <Typography variant="bodySmallBold" style={{ color: theme.textSecondary }}>
        {label}
      </Typography>
      <ChoiceChips
        options={available.map((type) => ({ value: type, label: t(`paymentSheet.methods.${type}.title`) }))}
        value={value}
        onChange={onChange}
      />
    </View>
  );
}

interface CreditStepProps {
  payer: PayerMode;
  total: number;
  payNow: number;
  onPayNowChange: (amount: number) => void;
  via: OnlineMethodType;
  availableOnline: OnlineMethodType[];
  onViaChange: (via: OnlineMethodType) => void;
  dueDate: Date | null;
  onDueDateChange: (date: Date | null) => void;
}

/** Pay later: optionally part now (through Stripe), the rest on the member's account. */
export function CreditStep({
  payer,
  total,
  payNow,
  onPayNowChange,
  via,
  availableOnline,
  onViaChange,
  dueDate,
  onDueDateChange,
}: CreditStepProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const canPayPart = availableOnline.length > 0 && total > 0;

  return (
    <View style={styles.container}>
      <Typography variant="bodySmall" style={{ color: theme.textSecondary }}>
        {t(payer === 'staff' ? 'paymentSheet.credit.staffNote' : 'paymentSheet.credit.memberNote')}
      </Typography>

      {canPayPart ? (
        <SplitAmountPicker
          label={t('paymentSheet.credit.payNow')}
          total={total}
          value={payNow}
          onChange={onPayNowChange}
          presets={[0, 0.25, 0.5, 0.75]}
          zeroLabel={t('paymentSheet.credit.nothingNow')}
        />
      ) : null}

      {payNow > 0 ? (
        <OnlineViaPicker
          label={t('paymentSheet.credit.payNowWith')}
          value={via}
          available={availableOnline}
          onChange={onViaChange}
        />
      ) : null}

      <SummaryRows
        rows={[
          { label: t('paymentSheet.credit.payNow'), amount: payNow, emphasis: payNow > 0 },
          { label: t('paymentSheet.credit.onAccount'), amount: Math.max(0, total - payNow) },
        ]}
      />

      {payer === 'staff' ? (
        <DatePicker
          label={t('paymentSheet.credit.dueDate')}
          placeholder={t('paymentSheet.credit.selectDueDate')}
          value={dueDate}
          onChange={onDueDateChange}
          minimumDate={new Date()}
        />
      ) : null}
    </View>
  );
}

interface MixedStepProps {
  payer: PayerMode;
  total: number;
  cashPart: number;
  onCashPartChange: (amount: number) => void;
  via: OnlineMethodType;
  availableOnline: OnlineMethodType[];
  onViaChange: (via: OnlineMethodType) => void;
}

/** Cash + online: the cash part is collected at the desk, the rest charged through Stripe. */
export function MixedStep({ payer, total, cashPart, onCashPartChange, via, availableOnline, onViaChange }: MixedStepProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Typography variant="bodySmall" style={{ color: theme.textSecondary }}>
        {t(payer === 'staff' ? 'paymentSheet.mixed.staffNote' : 'paymentSheet.mixed.memberNote')}
      </Typography>

      <SplitAmountPicker
        label={t('paymentSheet.mixed.cashPart')}
        total={total}
        value={cashPart}
        onChange={onCashPartChange}
        presets={[0.25, 0.5, 0.75]}
      />

      <OnlineViaPicker
        label={t('paymentSheet.mixed.payOnlineWith')}
        value={via}
        available={availableOnline}
        onChange={onViaChange}
      />

      <SummaryRows
        rows={[
          { label: t('paymentSheet.mixed.cash'), amount: cashPart },
          { label: t(`paymentSheet.methods.${via}.title`), amount: Math.max(0, total - cashPart), emphasis: true },
        ]}
      />
    </View>
  );
}

function SecureNote() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Typography variant="caption" style={[styles.secure, { color: theme.textSecondary }]}>
      {t('paymentSheet.online.secure')}
    </Typography>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  secure: {
    textAlign: 'center',
  },
  badge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.one,
  },
  badgeText: {
    fontWeight: '800',
    letterSpacing: 1,
  },
});
