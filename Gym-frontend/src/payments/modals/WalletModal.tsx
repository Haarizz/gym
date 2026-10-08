import React, { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { CurrencyValue } from "../../utils/currency";
import { PAYMENT_TYPES, PaymentLine, PaymentType, toAmount } from "../paymentModel";
import { remainingAfterAllocation, confirmActionLabel } from "../paymentFlow";
import { PaymentModalShell } from "../PaymentModalShell";

export interface WalletDraft {
  paymentType: typeof PAYMENT_TYPES.WALLET;
  amount: number;
}

const ACCENT = "#CA8A04";

export interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (draft: WalletDraft) => void;
  target: number;
  /** What the member can still spend from their wallet on this bill. */
  balance: number;
  editingLine?: PaymentLine | null;
  offeredTypes: PaymentType[];
}

/** Member reward-wallet tender: never more than the balance or the amount still due. */
export function WalletModal({ open, onClose, onConfirm, target, balance, editingLine, offeredTypes }: WalletModalProps) {
  const max = Math.max(0, Math.min(target, balance));
  const [amount, setAmount] = useState(() => String(editingLine?.amount ?? max));

  const numericAmount = toAmount(amount);
  const tooMuch = numericAmount > max + 0.005;
  const remainingAfter = remainingAfterAllocation(target, numericAmount);

  const quickAmounts = useMemo(() => [{ label: `Use ${max.toFixed(2)}`, onClick: () => setAmount(String(max)) }], [max]);

  const confirmLabel = confirmActionLabel({
    currentType: PAYMENT_TYPES.WALLET,
    remainingAfter,
    offeredTypes,
    editing: !!editingLine,
  });

  return (
    <PaymentModalShell
      open={open}
      onClose={onClose}
      onConfirm={() => { if (numericAmount > 0 && !tooMuch) onConfirm({ paymentType: PAYMENT_TYPES.WALLET, amount: numericAmount }); }}
      icon={<Wallet size={22} />}
      title="Wallet"
      subtitle={`Remaining to allocate ${target.toFixed(2)}`}
      accentColor={ACCENT}
      amountLabel="Pay from wallet"
      amount={amount}
      onAmountChange={setAmount}
      quickAmounts={quickAmounts}
      confirmLabel={confirmLabel}
      confirmDisabled={numericAmount <= 0 || tooMuch}
      footer={
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 30 }}>
            <span style={{ fontSize: 13.5, color: "#6b7280" }}>Wallet balance available</span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}><CurrencyValue amount={balance} /></span>
          </div>
          {tooMuch && (
            <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
              The most the wallet can pay here is <CurrencyValue amount={max} />.
            </div>
          )}
        </div>
      }
    />
  );
}
