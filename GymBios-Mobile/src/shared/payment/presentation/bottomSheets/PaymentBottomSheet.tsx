import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { DEFAULT_BANK_ACCOUNTS, PAYMENT_METHODS } from '../../constants';
import { calculateTotals, validateSplitPayment } from '../../domain/paymentCalculations';
import type {
  DiscountType,
  PaymentBottomSheetProps,
  PaymentMethod,
  PaymentResult,
  PaymentSplit,
  PaymentSplitRow,
  PaymentStatus,
  PaymentSummary,
} from '@/shared/payment/types';
import { DiscountSelector } from '../components/DiscountSelector';
import { PaymentMethodGrid } from '../components/PaymentMethodGrid';
import { PaymentSummaryCard } from '../components/PaymentSummaryCard';
import { BankTransferPaymentForm } from '../components/PaymentMethodForms/BankTransferPaymentForm';
import { CardPaymentForm } from '../components/PaymentMethodForms/CardPaymentForm';
import { CashPaymentForm } from '../components/PaymentMethodForms/CashPaymentForm';
import { ChequePaymentForm } from '../components/PaymentMethodForms/ChequePaymentForm';
import { CreditPaymentForm } from '../components/PaymentMethodForms/CreditPaymentForm';
import { MixedPaymentForm } from '../components/PaymentMethodForms/MixedPaymentForm';
import { OnlinePaymentForm } from '../components/PaymentMethodForms/OnlinePaymentForm';

export function PaymentBottomSheet({
  visible,
  amount,
  title,
  subtitle,
  currency = '₹',
  allowDiscount = true,
  initialDiscount = { type: 'none', value: 0 },
  onClose,
  onComplete,
}: PaymentBottomSheetProps) {
  // State
  const [discountType, setDiscountType] = useState<DiscountType>(initialDiscount.type);
  const [discountValue, setDiscountValue] = useState<number>(initialDiscount.value);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');

  // Fields for methods
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [cardType, setCardType] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<Date | null>(null);
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [onlinePaymentType, setOnlinePaymentType] = useState<string>('');
  const [providerName, setProviderName] = useState<string>('');
  const [paymentDueDate, setPaymentDueDate] = useState<Date | null>(null);

  // Credit state
  const [creditReceivedAmount, setCreditReceivedAmount] = useState<string>('');
  const [creditReceivedVia, setCreditReceivedVia] = useState<PaymentMethod | ''>('');

  // Mixed payment rows
  const [splitRows, setSplitRows] = useState<PaymentSplitRow[]>([]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset or initialize state when sheet opens or amount changes
  useEffect(() => {
    if (visible) {
      setPaidAmount(String(amount || '0'));
      setCreditReceivedAmount('');
      setCreditReceivedVia('');
      setSplitRows([
        { id: '1', method: 'cash', amount: Math.max(0, amount / 2) },
        { id: '2', method: 'card', amount: Math.max(0, amount / 2) },
      ]);
      setErrors({});
    }
  }, [visible, amount]);

  // Dynamic calculations
  const rawPaidNum =
    selectedMethod === 'credit'
      ? parseFloat(creditReceivedAmount || '0')
      : selectedMethod === 'mixed'
        ? splitRows.reduce((sum, r) => sum + (r.amount || 0), 0)
        : parseFloat(paidAmount || '0');

  const { subtotal, discountAmount, finalAmount, paidAmount: calculatedPaidAmount, remainingAmount, payBackAmount } =
    calculateTotals(amount, discountType, discountValue, rawPaidNum);

  // Form validator
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedMethod === 'card') {
      if (!cardType) newErrors.cardType = 'Please select a card type';
    } else if (selectedMethod === 'cheque') {
      if (!chequeNumber.trim()) newErrors.chequeNumber = 'Cheque number is required';
    } else if (selectedMethod === 'bank_transfer') {
      if (!reference.trim()) newErrors.reference = 'Transaction reference is required';
    } else if (selectedMethod === 'online') {
      if (!onlinePaymentType) newErrors.onlinePaymentType = 'Please select payment type';
      if (onlinePaymentType === 'Other' && !providerName.trim()) {
        newErrors.providerName = 'Provider name is required';
      }
      if (!reference.trim()) newErrors.reference = 'Transaction reference is required';
    } else if (selectedMethod === 'credit') {
      if (creditReceivedAmount && parseFloat(creditReceivedAmount) > 0) {
        if (!creditReceivedVia) newErrors.receivedVia = 'Please select payment method received via';
        if (creditReceivedVia === 'card' && !cardType) newErrors.cardType = 'Card type is required';
        if (creditReceivedVia === 'cheque' && !chequeNumber.trim()) newErrors.chequeNumber = 'Cheque number is required';
        if (creditReceivedVia === 'bank_transfer' && !reference.trim()) newErrors.reference = 'Reference is required';
        if (creditReceivedVia === 'online') {
          if (!onlinePaymentType) newErrors.onlinePaymentType = 'Payment type is required';
          if (onlinePaymentType === 'Other' && !providerName.trim()) newErrors.providerName = 'Provider name is required';
          if (!reference.trim()) newErrors.reference = 'Reference is required';
        }
      }
    } else if (selectedMethod === 'mixed') {
      const { isValid } = validateSplitPayment(splitRows, finalAmount);
      if (!isValid) {
        newErrors.rows = `Total split amount must equal final amount (${currency} ${finalAmount.toFixed(2)})`;
      }
    }

    if (remainingAmount > 0 && selectedMethod !== 'credit' && !paymentDueDate) {
      newErrors.paymentDueDate = 'Payment due date is required for partial payments';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    selectedMethod,
    cardType,
    chequeNumber,
    reference,
    onlinePaymentType,
    providerName,
    creditReceivedAmount,
    creditReceivedVia,
    splitRows,
    finalAmount,
    currency,
    remainingAmount,
    paymentDueDate,
  ]);

  // Complete Payment handler
  const handleComplete = useCallback(() => {
    if (!validateForm()) return;

    const methodMeta = PAYMENT_METHODS.find((m) => m.id === selectedMethod);
    const bankAccount = DEFAULT_BANK_ACCOUNTS.find((a) => a.id === bankAccountId);

    let paymentStatus: PaymentStatus = 'PAID';
    if (selectedMethod === 'credit' && (!creditReceivedAmount || parseFloat(creditReceivedAmount) <= 0)) {
      paymentStatus = 'PENDING';
    } else if (remainingAmount > 0) {
      paymentStatus = 'PARTIAL';
    }

    // 1. UI Summary (never sent to backend)
    const summary: PaymentSummary = {
      subtotal,
      discount: {
        type: discountType,
        value: discountValue,
        discountAmount,
      },
      finalAmount,
      paidAmount: calculatedPaidAmount,
      remainingAmount,
      payBackAmount,
      paymentDueDate: paymentDueDate ? paymentDueDate.toISOString().split('T')[0] : undefined,
    };

    // 2. Payment Breakdown array (matches backend List<PaymentSplitDTO>)
    const breakdown: PaymentSplit[] = [];

    if (selectedMethod === 'cash') {
      breakdown.push({
        method: 'Cash',
        amount: calculatedPaidAmount,
      });
    } else if (selectedMethod === 'card') {
      breakdown.push({
        method: 'Card',
        amount: calculatedPaidAmount,
        cardType: cardType || undefined,
        reference: reference.trim() || undefined,
      });
    } else if (selectedMethod === 'cheque') {
      breakdown.push({
        method: 'Cheque',
        amount: calculatedPaidAmount,
        chequeNumber: chequeNumber.trim() || undefined,
        chequeDate: chequeDate ? chequeDate.toISOString().split('T')[0] : undefined,
        bankName: bankName.trim() || undefined,
      });
    } else if (selectedMethod === 'bank_transfer') {
      breakdown.push({
        method: 'Bank Transfer',
        amount: calculatedPaidAmount,
        reference: reference.trim() || undefined,
        bankAccountCode: bankAccount?.code,
        bankAccountName: bankAccount?.name,
      });
    } else if (selectedMethod === 'online') {
      breakdown.push({
        method: 'Online Payment',
        amount: calculatedPaidAmount,
        onlinePaymentType: onlinePaymentType || undefined,
        providerName: providerName.trim() || undefined,
        reference: reference.trim() || undefined,
      });
    } else if (selectedMethod === 'credit') {
      if (creditReceivedAmount && parseFloat(creditReceivedAmount) > 0) {
        const recAmount = parseFloat(creditReceivedAmount);
        const recViaTitle =
          PAYMENT_METHODS.find((m) => m.id === creditReceivedVia)?.title ||
          creditReceivedVia ||
          'Cash';
        breakdown.push({
          method: recViaTitle,
          amount: recAmount,
          cardType: creditReceivedVia === 'card' ? cardType : undefined,
          reference:
            creditReceivedVia === 'card' ||
            creditReceivedVia === 'bank_transfer' ||
            creditReceivedVia === 'online'
              ? reference.trim() || undefined
              : undefined,
          chequeNumber:
            creditReceivedVia === 'cheque' ? chequeNumber.trim() || undefined : undefined,
          bankName: creditReceivedVia === 'cheque' ? bankName.trim() || undefined : undefined,
          bankAccountCode:
            creditReceivedVia === 'bank_transfer' ? bankAccount?.code : undefined,
          bankAccountName:
            creditReceivedVia === 'bank_transfer' ? bankAccount?.name : undefined,
          onlinePaymentType:
            creditReceivedVia === 'online' ? onlinePaymentType : undefined,
          providerName: creditReceivedVia === 'online' ? providerName.trim() || undefined : undefined,
        });
      }
    } else if (selectedMethod === 'mixed') {
      splitRows.forEach((r) => {
        const legMethodTitle =
          PAYMENT_METHODS.find((m) => m.id === r.method)?.title || r.method;
        const legBankAccount = DEFAULT_BANK_ACCOUNTS.find((a) => a.id === r.bankAccountId);
        breakdown.push({
          method: legMethodTitle,
          amount: r.amount,
          cardType: r.method === 'card' ? r.cardType : undefined,
          reference:
            r.method === 'card' || r.method === 'bank_transfer' || r.method === 'online'
              ? r.reference
              : undefined,
          chequeNumber: r.method === 'cheque' ? r.chequeNumber : undefined,
          chequeDate: r.method === 'cheque' ? r.chequeDate : undefined,
          bankName: r.method === 'cheque' ? r.bankName : undefined,
          bankAccountCode: r.method === 'bank_transfer' ? legBankAccount?.code : undefined,
          bankAccountName: r.method === 'bank_transfer' ? legBankAccount?.name : undefined,
          onlinePaymentType: r.method === 'online' ? r.onlinePaymentType : undefined,
          providerName: r.method === 'online' ? r.providerName : undefined,
        });
      });
    }

    const result: PaymentResult = {
      paymentMethodUsed: methodMeta?.title || selectedMethod,
      paymentBreakdown: breakdown,
      paymentStatus,
      outstandingBalance: remainingAmount,
      discountApplied: discountAmount,
      bankAccountCode: bankAccount?.code,
      bankAccountName: bankAccount?.name,
      summary,
    };

    onComplete(result);
  }, [
    validateForm,
    selectedMethod,
    bankAccountId,
    creditReceivedAmount,
    creditReceivedVia,
    cardType,
    reference,
    chequeNumber,
    chequeDate,
    bankName,
    onlinePaymentType,
    providerName,
    splitRows,
    remainingAmount,
    subtotal,
    discountType,
    discountValue,
    discountAmount,
    finalAmount,
    calculatedPaidAmount,
    payBackAmount,
    paymentDueDate,
    onComplete,
  ]);

  return (
    <AppBottomSheet
      visible={visible}
      title="Payment & Checkout"
      subtitle={`Processing payment for ${title}`}
      onClose={onClose}
    >
      <View style={styles.content}>
        {/* Header Summary */}
        <PaymentSummaryCard
          title={title}
          subtitle={subtitle}
          amount={amount}
          currency={currency}
        />

        {/* Optional Discount Selector */}
        {allowDiscount ? (
          <DiscountSelector
            discountType={discountType}
            discountValue={discountValue}
            currency={currency}
            onChange={(type, val) => {
              setDiscountType(type);
              setDiscountValue(val);
            }}
          />
        ) : null}

        {/* Payment Method Selection Grid */}
        <PaymentMethodGrid
          selectedMethod={selectedMethod}
          onSelectMethod={(m) => {
            setSelectedMethod(m);
            setErrors({});
          }}
        />

        {/* Dynamic Payment Form */}
        {selectedMethod === 'cash' ? (
          <CashPaymentForm
            finalAmount={finalAmount}
            paidAmount={paidAmount}
            paymentDueDate={paymentDueDate}
            currency={currency}
            errors={errors}
            onPaidAmountChange={setPaidAmount}
            onDueDateChange={setPaymentDueDate}
          />
        ) : null}

        {selectedMethod === 'card' ? (
          <CardPaymentForm
            finalAmount={finalAmount}
            paidAmount={paidAmount}
            cardType={cardType}
            reference={reference}
            paymentDueDate={paymentDueDate}
            currency={currency}
            errors={errors}
            onPaidAmountChange={setPaidAmount}
            onCardTypeChange={setCardType}
            onReferenceChange={setReference}
            onDueDateChange={setPaymentDueDate}
          />
        ) : null}

        {selectedMethod === 'credit' ? (
          <CreditPaymentForm
            finalAmount={finalAmount}
            receivedAmount={creditReceivedAmount}
            receivedVia={creditReceivedVia}
            cardType={cardType}
            reference={reference}
            chequeNumber={chequeNumber}
            bankName={bankName}
            bankAccountId={bankAccountId}
            onlinePaymentType={onlinePaymentType}
            providerName={providerName}
            paymentDueDate={paymentDueDate}
            currency={currency}
            errors={errors}
            onReceivedAmountChange={setCreditReceivedAmount}
            onReceivedViaChange={setCreditReceivedVia}
            onCardTypeChange={setCardType}
            onReferenceChange={setReference}
            onChequeNumberChange={setChequeNumber}
            onBankNameChange={setBankName}
            onBankAccountIdChange={setBankAccountId}
            onOnlinePaymentTypeChange={setOnlinePaymentType}
            onProviderNameChange={setProviderName}
            onDueDateChange={setPaymentDueDate}
          />
        ) : null}

        {selectedMethod === 'cheque' ? (
          <ChequePaymentForm
            finalAmount={finalAmount}
            paidAmount={paidAmount}
            chequeNumber={chequeNumber}
            bankName={bankName}
            chequeDate={chequeDate}
            paymentDueDate={paymentDueDate}
            currency={currency}
            errors={errors}
            onPaidAmountChange={setPaidAmount}
            onChequeNumberChange={setChequeNumber}
            onBankNameChange={setBankName}
            onChequeDateChange={setChequeDate}
            onDueDateChange={setPaymentDueDate}
          />
        ) : null}

        {selectedMethod === 'bank_transfer' ? (
          <BankTransferPaymentForm
            finalAmount={finalAmount}
            paidAmount={paidAmount}
            reference={reference}
            bankAccountId={bankAccountId}
            paymentDueDate={paymentDueDate}
            currency={currency}
            errors={errors}
            onPaidAmountChange={setPaidAmount}
            onReferenceChange={setReference}
            onBankAccountIdChange={setBankAccountId}
            onDueDateChange={setPaymentDueDate}
          />
        ) : null}

        {selectedMethod === 'online' ? (
          <OnlinePaymentForm
            finalAmount={finalAmount}
            paidAmount={paidAmount}
            onlinePaymentType={onlinePaymentType}
            providerName={providerName}
            reference={reference}
            paymentDueDate={paymentDueDate}
            currency={currency}
            errors={errors}
            onPaidAmountChange={setPaidAmount}
            onOnlinePaymentTypeChange={setOnlinePaymentType}
            onProviderNameChange={setProviderName}
            onReferenceChange={setReference}
            onDueDateChange={setPaymentDueDate}
          />
        ) : null}

        {selectedMethod === 'mixed' ? (
          <MixedPaymentForm
            finalAmount={finalAmount}
            rows={splitRows}
            currency={currency}
            errors={errors}
            onRowsChange={setSplitRows}
          />
        ) : null}

        {/* Action Button */}
        <Button
          label={`Complete Payment (${currency} ${finalAmount.toFixed(2)})`}
          onPress={handleComplete}
          size="lg"
          style={styles.actionButton}
        />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  actionButton: {
    marginTop: Spacing.two,
  },
});
