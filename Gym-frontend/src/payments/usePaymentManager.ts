import { useCallback, useMemo, useState } from "react";
import { CreatePaymentLineInput, PaymentLine, createPaymentLine, toAmount } from "./paymentModel";
import {
  allocationTarget,
  canSettle,
  changeAmount,
  duplicateCardReferences,
  isFullyAllocated,
  isOverAllocated,
  lineErrors,
  paymentMethodsUsed,
  paymentSummary,
  remainingBalance,
  totalAllocated,
  totalNonCash,
  totalOfType,
} from "./paymentSelectors";

export interface UsePaymentManagerArgs {
  /** The amount due, net of any deposit already collected. */
  invoiceTotal: number;
}

export function usePaymentManager({ invoiceTotal }: UsePaymentManagerArgs) {
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);

  const addLine = useCallback((input: CreatePaymentLineInput) => {
    const line = createPaymentLine(input);
    setPaymentLines((prev) => [...prev, line]);
    return line;
  }, []);

  const updateLine = useCallback((id: string, patch: Partial<Omit<CreatePaymentLineInput, "paymentType">> & { paymentType?: PaymentLine["paymentType"] }) => {
    setPaymentLines((prev) =>
      prev.map((line) =>
        line.id === id
          ? {
              ...line,
              ...patch,
              amount: patch.amount !== undefined ? toAmount(patch.amount) : line.amount,
              paymentSubtype: patch.paymentSubtype !== undefined ? patch.paymentSubtype ?? null : line.paymentSubtype,
              reference: patch.reference !== undefined ? patch.reference ?? null : line.reference,
              bankAccountId: patch.bankAccountId !== undefined ? patch.bankAccountId ?? null : line.bankAccountId,
              bankAccountName: patch.bankAccountName !== undefined ? patch.bankAccountName ?? null : line.bankAccountName,
              customerCode: patch.customerCode !== undefined ? patch.customerCode ?? null : line.customerCode,
              customerName: patch.customerName !== undefined ? patch.customerName ?? null : line.customerName,
            }
          : line
      )
    );
  }, []);

  const removeLine = useCallback((id: string) => {
    setPaymentLines((prev) => prev.filter((line) => line.id !== id));
  }, []);

  const clearLines = useCallback(() => {
    setPaymentLines([]);
  }, []);

  const remaining = useMemo(() => remainingBalance(paymentLines, invoiceTotal), [paymentLines, invoiceTotal]);
  const allocated = useMemo(() => totalAllocated(paymentLines), [paymentLines]);
  const change = useMemo(() => changeAmount(paymentLines, invoiceTotal), [paymentLines, invoiceTotal]);
  const nonCashTotal = useMemo(() => totalNonCash(paymentLines), [paymentLines]);
  const methodsUsed = useMemo(() => paymentMethodsUsed(paymentLines), [paymentLines]);
  const summary = useMemo(() => paymentSummary(paymentLines), [paymentLines]);
  const fullyAllocated = useMemo(() => isFullyAllocated(paymentLines, invoiceTotal), [paymentLines, invoiceTotal]);
  const overAllocated = useMemo(() => isOverAllocated(paymentLines, invoiceTotal), [paymentLines, invoiceTotal]);
  const errors = useMemo(() => lineErrors(paymentLines), [paymentLines]);
  const duplicateCardRefs = useMemo(() => duplicateCardReferences(paymentLines), [paymentLines]);
  const settleable = useMemo(() => canSettle(paymentLines, invoiceTotal), [paymentLines, invoiceTotal]);

  const totalByType = useCallback((type: Parameters<typeof totalOfType>[1]) => totalOfType(paymentLines, type), [paymentLines]);

  const targetFor = useCallback(
    (editingLine?: Pick<PaymentLine, "amount"> | null) => allocationTarget(remaining, editingLine),
    [remaining]
  );

  return {
    paymentLines,
    addLine,
    updateLine,
    removeLine,
    clearLines,
    remaining,
    allocated,
    change,
    nonCashTotal,
    methodsUsed,
    summary,
    fullyAllocated,
    overAllocated,
    errors,
    duplicateCardRefs,
    settleable,
    totalByType,
    targetFor,
  };
}

export type PaymentManager = ReturnType<typeof usePaymentManager>;
