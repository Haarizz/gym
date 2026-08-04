import { useCallback, useState } from 'react';

import { PaymentMethod } from '../../domain/Receipt';

export interface BillPaymentEntry {
  receiptId: number;
  payAmount: string; // string so TextInput stays controlled
}

export interface UsePaymentFormReturn {
  paymentMethod: PaymentMethod;
  paymentDate: string;
  transactionRef: string;
  remarks: string;
  billAmounts: BillPaymentEntry[];
  isReviewVisible: boolean;
  setPaymentMethod: (method: PaymentMethod) => void;
  setPaymentDate: (date: string) => void;
  setTransactionRef: (ref: string) => void;
  setRemarks: (remarks: string) => void;
  setBillAmount: (receiptId: number, amount: string) => void;
  initBillAmounts: (entries: BillPaymentEntry[]) => void;
  showReview: () => void;
  hideReview: () => void;
  totalAmount: number;
  isValid: boolean;
  reset: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Presentation-only hook for the Payment Settlement form.
 * Manages method, date, amounts, review modal visibility.
 * Never communicates with the backend.
 */
export function usePaymentForm(): UsePaymentFormReturn {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
  const [paymentDate, setPaymentDate] = useState(today());
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [billAmounts, setBillAmounts] = useState<BillPaymentEntry[]>([]);
  const [isReviewVisible, setIsReviewVisible] = useState(false);

  const setBillAmount = useCallback((receiptId: number, amount: string) => {
    setBillAmounts((prev) =>
      prev.map((e) =>
        e.receiptId === receiptId ? { ...e, payAmount: amount } : e,
      ),
    );
  }, []);

  const initBillAmounts = useCallback((entries: BillPaymentEntry[]) => {
    setBillAmounts(entries);
  }, []);

  const showReview = useCallback(() => setIsReviewVisible(true), []);
  const hideReview = useCallback(() => setIsReviewVisible(false), []);

  const totalAmount = billAmounts.reduce(
    (sum, e) => sum + (parseFloat(e.payAmount) || 0),
    0,
  );

  const isValid =
    billAmounts.length > 0 &&
    billAmounts.every((e) => parseFloat(e.payAmount) > 0) &&
    paymentDate.length > 0;

  const reset = useCallback(() => {
    setPaymentMethod(PaymentMethod.Cash);
    setPaymentDate(today());
    setTransactionRef('');
    setRemarks('');
    setBillAmounts([]);
    setIsReviewVisible(false);
  }, []);

  return {
    paymentMethod,
    paymentDate,
    transactionRef,
    remarks,
    billAmounts,
    isReviewVisible,
    setPaymentMethod,
    setPaymentDate,
    setTransactionRef,
    setRemarks,
    setBillAmount,
    initBillAmounts,
    showReview,
    hideReview,
    totalAmount,
    isValid,
    reset,
  };
}
