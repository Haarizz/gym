import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Trans, useTranslation } from 'react-i18next';
import { useTheme } from '@/core/hooks';
import { CurrencyValue } from '@/core/providers';
import { useCurrencyStore } from '@/core/providers/currencyDefinitions';
import { getApiClientTenant } from '@/core/network/apiClient';
import { Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';
import { METHOD_API_TITLES, ONLINE_METHOD_TYPES, PAYMENT_METHODS } from '../../constants';
import { calculateTotals, onlineLeg, roundMoney } from '../../domain/paymentCalculations';
import { isOnlinePaymentAvailable, payOnline, type SimulatedDecision } from '../../gateway/stripeCheckout';
import type {
  DiscountType,
  OnlineMethodType,
  PaymentBottomSheetProps,
  PaymentMethod,
  PaymentResult,
  PaymentSplit,
  PaymentStatus,
} from '@/shared/payment/types';
import { DiscountSelector } from '../components/DiscountSelector';
import { PaymentMethodGrid } from '../components/PaymentMethodGrid';
import { PaymentSummaryCard } from '../components/PaymentSummaryCard';
import { CashStep, CreditStep, MixedStep, OnlineStep, SimulatedStep } from '../components/steps/MethodSteps';

type Step = 'methods' | 'detail' | 'working' | 'simulate';
type WorkingPhase = 'opening' | 'finishing';

const isOnline = (method: PaymentMethod): method is OnlineMethodType =>
  (ONLINE_METHOD_TYPES as string[]).includes(method);

/**
 * Mobile checkout: pick a method, confirm, done — no reference numbers or card types to
 * type. Card / UPI / Net banking open Stripe's own payment sheet and hand the backend a
 * PaymentIntent id it verifies with Stripe. Cash is a pay-at-reception request for
 * members (staff approve it, as before) or a one-tap "cash received" for staff. Credit
 * and Mixed are the only screens with an amount to choose.
 */
export function PaymentBottomSheet({
  visible,
  amount,
  title,
  subtitle,
  allowDiscount = true,
  initialDiscount = { type: 'none', value: 0 },
  isProcessing,
  payer = 'member',
  methods,
  tenantSlug,
  onClose,
  onComplete,
}: PaymentBottomSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const currencyCode = useCurrencyStore((s) => s.currencyCode);

  const [discountType, setDiscountType] = useState<DiscountType>(initialDiscount.type);
  const [discountValue, setDiscountValue] = useState<number>(initialDiscount.value);
  const [step, setStep] = useState<Step>('methods');
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [phase, setPhase] = useState<WorkingPhase>('opening');
  const [notice, setNotice] = useState<string | null>(null);
  // Local backend simulation: the test payment waiting for approve / decline.
  const [simulated, setSimulated] = useState<{ methodType: OnlineMethodType; amount: number } | null>(null);
  const decideSimulated = useRef<((decision: SimulatedDecision) => void) | null>(null);

  const [creditNow, setCreditNow] = useState(0);
  const [creditVia, setCreditVia] = useState<OnlineMethodType>('card');
  const [mixedCash, setMixedCash] = useState(0);
  const [mixedVia, setMixedVia] = useState<OnlineMethodType>('card');
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const { subtotal, discountAmount, finalAmount } = calculateTotals(amount, discountType, discountValue, 0);

  // ── What can be offered ────────────────────────────────────────────────────
  const onlineReady = isOnlinePaymentAvailable();
  const isInr = currencyCode === 'INR';

  const availableOnline = useMemo(
    () =>
      ONLINE_METHOD_TYPES.filter((type) => {
        const option = PAYMENT_METHODS.find((o) => o.id === type);
        return onlineReady && (!option?.inrOnly || isInr) && (!methods || methods.includes(type));
      }),
    [onlineReady, isInr, methods],
  );

  const options = useMemo(
    () => PAYMENT_METHODS.filter((o) => !methods || methods.includes(o.id)),
    [methods],
  );

  const unavailable = useMemo(() => {
    const reasons: Partial<Record<PaymentMethod, string>> = {};
    for (const option of options) {
      if (option.online) {
        if (!onlineReady) reasons[option.id] = t('paymentSheet.unavailable.online');
        else if (option.inrOnly && !isInr) reasons[option.id] = t('paymentSheet.unavailable.inrOnly');
        else if (finalAmount <= 0) reasons[option.id] = t('paymentSheet.unavailable.nothingToPay');
      }
    }
    // Mixed needs an online part; with nothing left to pay there's nothing to split.
    if (availableOnline.length === 0) reasons.mixed = t('paymentSheet.unavailable.online');
    else if (finalAmount <= 0) reasons.mixed = t('paymentSheet.unavailable.nothingToPay');
    return reasons;
  }, [options, onlineReady, isInr, finalAmount, availableOnline.length, t]);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  // Set once a result is handed to the caller; cleared when its request settles.
  const awaitingCaller = useRef<{ online: boolean } | null>(null);
  const prevProcessing = useRef(isProcessing);

  // Every opening starts fresh at the method grid (adjusted during render, not in an effect).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setStep('methods');
      setNotice(null);
      setDueDate(null);
    }
  }

  // A screen's request finished but the sheet is still open → it failed (on success the
  // screen closes the sheet). The backend has already refunded any Stripe charge.
  useEffect(() => {
    const was = prevProcessing.current;
    prevProcessing.current = isProcessing;
    if (!(was && !isProcessing && awaitingCaller.current)) return;
    const { online } = awaitingCaller.current;
    const timer = setTimeout(() => {
      awaitingCaller.current = null;
      setStep('detail');
      setNotice(online ? t('paymentSheet.errors.refunded') : null);
    }, 350);
    return () => clearTimeout(timer);
  }, [isProcessing, t]);

  const firstOnline = availableOnline[0] ?? 'card';

  const openMethod = useCallback(
    (next: PaymentMethod) => {
      setMethod(next);
      setNotice(null);
      setCreditNow(0);
      setCreditVia(firstOnline);
      setMixedCash(roundMoney(finalAmount / 2));
      setMixedVia(firstOnline);
      setStep('detail');
    },
    [finalAmount, firstOnline],
  );

  // ── Completing ─────────────────────────────────────────────────────────────
  const finish = useCallback(
    (legs: PaymentSplit[], paid: number, hasOnline: boolean) => {
      const remaining = roundMoney(Math.max(0, finalAmount - paid));
      const paymentStatus: PaymentStatus = remaining <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
      const result: PaymentResult = {
        paymentMethodUsed: METHOD_API_TITLES[method],
        paymentBreakdown: legs,
        paymentStatus,
        outstandingBalance: remaining,
        discountApplied: discountAmount,
        summary: {
          subtotal,
          discount: { type: discountType, value: discountValue, discountAmount },
          finalAmount,
          paidAmount: paid,
          remainingAmount: remaining,
          payBackAmount: 0,
          paymentDueDate: method === 'credit' && dueDate ? dueDate.toISOString().split('T')[0] : undefined,
        },
      };

      if (isProcessing !== undefined) {
        // The screen reports its request through isProcessing — show it here.
        awaitingCaller.current = { online: hasOnline };
        setPhase('finishing');
        setStep('working');
      } else {
        setStep('methods');
      }
      onComplete(result);
    },
    [finalAmount, method, discountAmount, subtotal, discountType, discountValue, dueDate, isProcessing, onComplete],
  );

  /** Takes {@code amountToCharge} through Stripe; resolves the intent id, or null if not paid. */
  const charge = useCallback(
    async (methodType: OnlineMethodType, amountToCharge: number): Promise<string | null> => {
      const slug = tenantSlug ?? getApiClientTenant();
      if (!slug) {
        setNotice(t('paymentSheet.errors.noGym'));
        return null;
      }
      setNotice(null);
      setPhase('opening');
      setStep('working');
      const outcome = await payOnline(
        { amount: roundMoney(amountToCharge), methodType, tenantSlug: slug, purpose: title },
        {
          onSimulated: (intent) =>
            new Promise<SimulatedDecision>((resolve) => {
              decideSimulated.current = resolve;
              setSimulated({ methodType, amount: intent.amount });
              setStep('simulate');
            }),
        },
      );
      if (outcome.status === 'succeeded') return outcome.paymentIntentId;
      setStep('detail');
      if (outcome.status === 'failed') setNotice(outcome.message || t('paymentSheet.errors.failed'));
      return null;
    },
    [tenantSlug, title, t],
  );

  const handleConfirm = useCallback(async () => {
    if (isOnline(method)) {
      const intentId = await charge(method, finalAmount);
      if (intentId) finish([onlineLeg(method, finalAmount, intentId)], finalAmount, true);
      return;
    }
    if (method === 'cash') {
      finish([{ method: 'Cash', amount: finalAmount }], finalAmount, false);
      return;
    }
    if (method === 'credit') {
      if (creditNow <= 0) {
        finish([], 0, false);
        return;
      }
      const intentId = await charge(creditVia, creditNow);
      if (intentId) finish([onlineLeg(creditVia, creditNow, intentId)], creditNow, true);
      return;
    }
    // Mixed
    const onlinePart = roundMoney(finalAmount - mixedCash);
    if (mixedCash <= 0 || onlinePart <= 0) {
      setNotice(t('paymentSheet.errors.needBoth'));
      return;
    }
    const intentId = await charge(mixedVia, onlinePart);
    if (intentId) {
      finish([{ method: 'Cash', amount: mixedCash }, onlineLeg(mixedVia, onlinePart, intentId)], finalAmount, true);
    }
  }, [method, charge, finalAmount, finish, creditNow, creditVia, mixedCash, mixedVia, t]);

  // ── Step transition ────────────────────────────────────────────────────────
  const fade = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [step, method, fade]);

  const ctaLabel = (() => {
    const amountNode = (value: number) => <CurrencyValue amount={value} decimals={2} />;
    if (isOnline(method)) {
      return <Trans i18nKey="paymentSheet.cta.pay" components={{ amount: amountNode(finalAmount) }} />;
    }
    if (method === 'cash') return t(payer === 'staff' ? 'paymentSheet.cash.received' : 'paymentSheet.cash.sendRequest');
    if (method === 'credit') {
      if (creditNow > 0) return <Trans i18nKey="paymentSheet.cta.payNow" components={{ amount: amountNode(creditNow) }} />;
      return t(payer === 'staff' ? 'paymentSheet.credit.addToAccount' : 'paymentSheet.credit.request');
    }
    return (
      <Trans
        i18nKey="paymentSheet.cta.payOnline"
        components={{ amount: amountNode(Math.max(0, finalAmount - mixedCash)) }}
      />
    );
  })();

  const decide = (decision: SimulatedDecision) => {
    const resolve = decideSimulated.current;
    decideSimulated.current = null;
    setPhase('opening');
    setStep('working');
    resolve?.(decision);
  };

  const footer =
    step === 'detail' ? (
      <Button label={ctaLabel} onPress={handleConfirm} size="lg" style={styles.cta} />
    ) : step === 'simulate' ? (
      <View style={styles.simulateActions}>
        <Button label={t('paymentSheet.simulated.approve')} onPress={() => decide('approve')} size="lg" style={styles.cta} />
        <Button
          label={t('paymentSheet.simulated.decline')}
          onPress={() => decide('decline')}
          variant="outline"
          size="lg"
          style={styles.cta}
        />
      </View>
    ) : undefined;

  const closeIfIdle = () => {
    // Closing the test screen cancels the test payment; the sheet stays for another try.
    if (step === 'simulate') {
      decide('cancel');
      return;
    }
    // Don't drop the sheet from under an open Stripe sheet or a request in flight.
    if (step !== 'working') onClose();
  };

  return (
    <AppBottomSheet
      visible={visible}
      title={t('paymentSheet.title')}
      subtitle={t('paymentSheet.processingFor', { title })}
      onClose={closeIfIdle}
      footer={footer}
    >
      <View style={styles.content}>
        <PaymentSummaryCard title={title} subtitle={subtitle} amount={finalAmount} />

        {notice ? (
          <View style={[styles.notice, { backgroundColor: theme.error + '12', borderColor: theme.error + '40' }]}>
            <Feather name="alert-circle" size={16} color={theme.error} />
            <Typography variant="bodySmall" style={[styles.noticeText, { color: theme.error }]}>
              {notice}
            </Typography>
          </View>
        ) : null}

        <Animated.View
          style={{
            opacity: fade,
            transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          {step === 'methods' ? (
            <View style={styles.stepBody}>
              {allowDiscount ? (
                <DiscountSelector
                  discountType={discountType}
                  discountValue={discountValue}
                  onChange={(type, val) => {
                    setDiscountType(type);
                    setDiscountValue(val);
                  }}
                />
              ) : null}
              <PaymentMethodGrid
                options={options}
                payer={payer}
                unavailable={unavailable}
                onSelectMethod={openMethod}
              />
            </View>
          ) : null}

          {step === 'detail' ? (
            <View style={styles.stepBody}>
              <Pressable
                onPress={() => {
                  setNotice(null);
                  setStep('methods');
                }}
                accessibilityRole="button"
                style={styles.back}
                hitSlop={8}
              >
                <Feather name="chevron-left" size={18} color={theme.primary} />
                <Typography variant="bodySmallBold" style={{ color: theme.primary }}>
                  {t('paymentSheet.allMethods')}
                </Typography>
              </Pressable>

              {isOnline(method) ? <OnlineStep methodType={method} amount={finalAmount} /> : null}
              {method === 'cash' ? <CashStep payer={payer} amount={finalAmount} /> : null}
              {method === 'credit' ? (
                <CreditStep
                  payer={payer}
                  total={finalAmount}
                  payNow={creditNow}
                  onPayNowChange={setCreditNow}
                  via={creditVia}
                  availableOnline={availableOnline}
                  onViaChange={setCreditVia}
                  dueDate={dueDate}
                  onDueDateChange={setDueDate}
                />
              ) : null}
              {method === 'mixed' ? (
                <MixedStep
                  payer={payer}
                  total={finalAmount}
                  cashPart={mixedCash}
                  onCashPartChange={setMixedCash}
                  via={mixedVia}
                  availableOnline={availableOnline}
                  onViaChange={setMixedVia}
                />
              ) : null}
            </View>
          ) : null}

          {step === 'simulate' && simulated ? (
            <SimulatedStep methodType={simulated.methodType} amount={simulated.amount} />
          ) : null}

          {step === 'working' ? (
            <View style={styles.working}>
              <View style={[styles.spinnerRing, { backgroundColor: theme.primary + '12' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
              <Typography variant="subtitle" style={[styles.workingTitle, { color: theme.text }]}>
                {t(phase === 'opening' ? 'paymentSheet.processing.opening' : 'paymentSheet.processing.finishing')}
              </Typography>
              <Typography variant="bodySmall" style={{ color: theme.textSecondary }}>
                {t('paymentSheet.processing.keepOpen')}
              </Typography>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  stepBody: {
    gap: Spacing.three,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  noticeText: {
    flex: 1,
  },
  working: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  spinnerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  workingTitle: {
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 26,
  },
  cta: {
    borderRadius: Radius.full,
  },
  simulateActions: {
    gap: Spacing.two,
  },
});
