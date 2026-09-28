import React, { useState } from "react";
import { Landmark } from "lucide-react";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import type { AccountHead } from "../../utils/supabase/account-heads-service";
import { PAYMENT_TYPES, PaymentLine, PaymentType, toAmount } from "../paymentModel";
import { remainingAfterAllocation, confirmActionLabel } from "../paymentFlow";
import { PaymentModalShell } from "../PaymentModalShell";

export interface OnlineDraft {
  paymentType: typeof PAYMENT_TYPES.ONLINE;
  amount: number;
  reference: string | null;
  bankAccountId: string;
  /** "{code} - {name}", resolvable by the server to the exact Chart-of-Accounts row. */
  bankAccountName: string;
}

const ACCENT = "#0D9488";

export interface OnlineModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (draft: OnlineDraft) => void;
  target: number;
  editingLine?: PaymentLine | null;
  bankAccounts: AccountHead[];
  bankAccountsLoading?: boolean;
  offeredTypes: PaymentType[];
}

export function OnlineModal({
  open,
  onClose,
  onConfirm,
  target,
  editingLine,
  bankAccounts,
  bankAccountsLoading,
  offeredTypes,
}: OnlineModalProps) {
  const [amount, setAmount] = useState(() => String(editingLine?.amount ?? target));
  const [accountId, setAccountId] = useState(editingLine?.bankAccountId ?? "");
  const [reference, setReference] = useState(editingLine?.reference ?? "");

  const numericAmount = toAmount(amount);
  const exceedsTarget = numericAmount > target + 0.005;
  const remainingAfter = remainingAfterAllocation(target, numericAmount);
  const account = bankAccounts.find((a) => String(a.id) === accountId);
  const valid = numericAmount > 0 && !exceedsTarget && !!account;

  const confirmLabel = confirmActionLabel({
    currentType: PAYMENT_TYPES.ONLINE,
    remainingAfter,
    offeredTypes,
    editing: !!editingLine,
  });

  const handleConfirm = () => {
    if (!valid || !account) return;
    onConfirm({
      paymentType: PAYMENT_TYPES.ONLINE,
      amount: numericAmount,
      reference: reference || null,
      bankAccountId: accountId,
      bankAccountName: `${account.code} - ${account.name}`,
    });
  };

  return (
    <PaymentModalShell
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      icon={<Landmark size={22} />}
      title="Online / Bank Transfer"
      subtitle={`Remaining to allocate ${target.toFixed(2)}`}
      accentColor={ACCENT}
      amountLabel="Transfer Amount"
      amount={amount}
      onAmountChange={setAmount}
      confirmLabel={confirmLabel}
      confirmDisabled={!valid}
      error={exceedsTarget ? `Online cannot exceed the remaining ${target.toFixed(2)}.` : null}
      fields={
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Label style={{ fontSize: 12 }}>Receiving Bank Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger style={{ marginTop: 6, width: "100%" }}>
                <SelectValue
                  placeholder={
                    bankAccountsLoading ? "Loading accounts…" : bankAccounts.length ? "Select bank account" : "No bank accounts configured"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label style={{ fontSize: 12 }}>Transfer Reference</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional"
              style={{ marginTop: 6 }}
            />
          </div>
        </div>
      }
    />
  );
}
