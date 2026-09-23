import React, { useState } from "react";
import { CreditCard } from "lucide-react";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { PAYMENT_TYPES, PaymentLine, PaymentType, toAmount } from "../paymentModel";
import { remainingAfterAllocation, confirmActionLabel } from "../paymentFlow";
import { PaymentModalShell } from "../PaymentModalShell";

export interface CardDraft {
  paymentType: typeof PAYMENT_TYPES.CARD;
  paymentSubtype: string;
  amount: number;
  reference: string | null;
}

const ACCENT = "#2563EB";
const CARD_NETWORKS = ["Visa", "Mastercard", "JCB", "Amex", "Apple Pay", "Google Pay", "Samsung Pay", "Other"];

export interface CardModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (draft: CardDraft) => void;
  target: number;
  editingLine?: PaymentLine | null;
  offeredTypes: PaymentType[];
}

export function CardModal({ open, onClose, onConfirm, target, editingLine, offeredTypes }: CardModalProps) {
  const [amount, setAmount] = useState(() => String(editingLine?.amount ?? target));
  const [network, setNetwork] = useState(editingLine?.paymentSubtype ?? "");
  const [approvalCode, setApprovalCode] = useState("");
  const [reference, setReference] = useState(editingLine?.reference ?? "");

  const numericAmount = toAmount(amount);
  const exceedsTarget = numericAmount > target + 0.005;
  const remainingAfter = remainingAfterAllocation(target, numericAmount);
  const valid = numericAmount > 0 && !exceedsTarget && !!network;

  const confirmLabel = confirmActionLabel({
    currentType: PAYMENT_TYPES.CARD,
    remainingAfter,
    offeredTypes,
    editing: !!editingLine,
  });

  const handleConfirm = () => {
    if (!valid) return;
    onConfirm({
      paymentType: PAYMENT_TYPES.CARD,
      paymentSubtype: network,
      amount: numericAmount,
      reference: (approvalCode || reference) ? [approvalCode, reference].filter(Boolean).join(" / ") : null,
    });
  };

  return (
    <PaymentModalShell
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      icon={<CreditCard size={22} />}
      title="Card"
      subtitle={`Remaining to allocate ${target.toFixed(2)}`}
      accentColor={ACCENT}
      amountLabel="Card Amount"
      amount={amount}
      onAmountChange={setAmount}
      confirmLabel={confirmLabel}
      confirmDisabled={!valid}
      error={exceedsTarget ? `Card cannot exceed the remaining ${target.toFixed(2)}.` : null}
      fields={
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Label style={{ fontSize: 12, display: "block", marginBottom: 8 }}>Network</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {CARD_NETWORKS.map((n) => {
                const selected = network === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNetwork(n)}
                    style={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: selected ? "1px solid #2563eb" : "1px solid #e5e7eb",
                      padding: "8px 8px",
                      fontWeight: 500,
                      backgroundColor: selected ? "#eff6ff" : "#fff",
                      color: selected ? "#1d4ed8" : "#111827",
                      cursor: "pointer",
                      transition: "background-color 0.15s",
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label style={{ fontSize: 12 }}>Approval Code</Label>
              <Input
                value={approvalCode}
                onChange={(e) => setApprovalCode(e.target.value)}
                placeholder="Optional"
                style={{ marginTop: 6 }}
              />
            </div>
            <div>
              <Label style={{ fontSize: 12 }}>Reference</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional"
                style={{ marginTop: 6 }}
              />
            </div>
          </div>
        </div>
      }
    />
  );
}
