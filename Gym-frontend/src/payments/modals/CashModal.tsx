import React, { useMemo, useState } from "react";
import { Banknote } from "lucide-react";
import { CurrencyValue } from "../../utils/currency";
import { PAYMENT_TYPES, PaymentLine, PaymentType, toAmount } from "../paymentModel";
import { remainingAfterAllocation, confirmActionLabel } from "../paymentFlow";
import { PaymentModalShell } from "../PaymentModalShell";

export interface CashDraft {
  paymentType: typeof PAYMENT_TYPES.CASH;
  amount: number;
}

const ACCENT = "#16A34A";
const NOTE_DENOMINATIONS = [500, 200, 100, 50, 20, 10];

export interface CashModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (draft: CashDraft) => void;
  target: number;
  editingLine?: PaymentLine | null;
  offeredTypes: PaymentType[];
  /** Show an amber "more than the amount due" warning when the cash becomes change (BG_84). */
  warnOverTender?: boolean;
}

export function CashModal({ open, onClose, onConfirm, target, editingLine, offeredTypes, warnOverTender = false }: CashModalProps) {
  const [amount, setAmount] = useState(() => String(editingLine?.amount ?? target));

  const numericAmount = toAmount(amount);
  const applied = Math.min(numericAmount, target);
  const stillRemaining = Math.max(0, target - numericAmount);
  const changeToReturn = Math.max(0, numericAmount - target);
  const remainingAfter = remainingAfterAllocation(target, numericAmount);

  const quickAmounts = useMemo(
    () => [
      { label: `Exact (${target.toFixed(2)})`, onClick: () => setAmount(String(target)) },
      ...NOTE_DENOMINATIONS.map((note) => ({ label: String(note), onClick: () => setAmount(String(note)) })),
    ],
    [target]
  );

  const confirmLabel = confirmActionLabel({
    currentType: PAYMENT_TYPES.CASH,
    remainingAfter,
    offeredTypes,
    editing: !!editingLine,
  });

  const handleConfirm = () => {
    if (numericAmount <= 0) return;
    onConfirm({ paymentType: PAYMENT_TYPES.CASH, amount: numericAmount });
  };

  return (
    <PaymentModalShell
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      icon={<Banknote size={22} />}
      title="Cash"
      subtitle={`Remaining to allocate ${target.toFixed(2)}`}
      accentColor={ACCENT}
      amountLabel="Cash Received"
      amount={amount}
      onAmountChange={setAmount}
      quickAmounts={quickAmounts}
      confirmLabel={confirmLabel}
      confirmDisabled={numericAmount <= 0}
      footer={
        <div style={{ borderTop: "1px solid light-dark(#e5e7eb, var(--border))", paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 30 }}>
            <span style={{ fontSize: 13.5, color: "light-dark(#6b7280, oklch(82% 0.023 264.4))" }}>Tendered</span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              <CurrencyValue amount={numericAmount} />
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 30 }}>
            <span style={{ fontSize: 13.5, color: "light-dark(#6b7280, oklch(82% 0.023 264.4))" }}>Applied to bill</span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              <CurrencyValue amount={applied} />
            </span>
          </div>
          {stillRemaining > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 30, color: "light-dark(#b45309, oklch(82% 0.146 49))" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>Still remaining after this</span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                <CurrencyValue amount={stillRemaining} />
              </span>
            </div>
          )}
          {changeToReturn > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 30, color: "light-dark(#15803d, oklch(82% 0.137 150.1))" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>Change to return</span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                <CurrencyValue amount={changeToReturn} />
              </span>
            </div>
          )}
          {warnOverTender && changeToReturn > 0 && (
            <div
              role="alert"
              style={{ marginTop: 8, fontSize: 13, color: "light-dark(#92400e, oklch(82% 0.125 46.2))", backgroundColor: "light-dark(#fffbeb, oklch(27% 0.039 95.3))", border: "1px solid light-dark(#fcd34d, oklch(38% 0.08 91.6))", borderRadius: 8, padding: "8px 12px" }}
            >
              <CurrencyValue amount={numericAmount} /> is more than the <CurrencyValue amount={target} /> due.
              Only <CurrencyValue amount={applied} /> is applied — return <CurrencyValue amount={changeToReturn} /> as change,
              or correct the amount.
            </div>
          )}
        </div>
      }
    />
  );
}
