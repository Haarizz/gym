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
}

export function CashModal({ open, onClose, onConfirm, target, editingLine, offeredTypes }: CashModalProps) {
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
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 30 }}>
            <span style={{ fontSize: 13.5, color: "#6b7280" }}>Tendered</span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              <CurrencyValue amount={numericAmount} />
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 30 }}>
            <span style={{ fontSize: 13.5, color: "#6b7280" }}>Applied to bill</span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              <CurrencyValue amount={applied} />
            </span>
          </div>
          {stillRemaining > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 30, color: "#b45309" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>Still remaining after this</span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                <CurrencyValue amount={stillRemaining} />
              </span>
            </div>
          )}
          {changeToReturn > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 30, color: "#15803d" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>Change to return</span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                <CurrencyValue amount={changeToReturn} />
              </span>
            </div>
          )}
        </div>
      }
    />
  );
}
