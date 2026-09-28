import React, { useState } from "react";
import { Users, Search } from "lucide-react";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { PAYMENT_TYPES, PaymentLine, PaymentType, toAmount } from "../paymentModel";
import { remainingAfterAllocation, confirmActionLabel } from "../paymentFlow";
import { PaymentModalShell } from "../PaymentModalShell";
import type { CashDraft } from "./CashModal";

export interface CreditCustomer {
  code: string;
  name: string;
}

export interface CreditDraft {
  paymentType: typeof PAYMENT_TYPES.CREDIT;
  amount: number;
  customerCode: string;
  customerName: string;
}

const ACCENT = "#7C3AED";

export interface CreditModalProps {
  open: boolean;
  onClose: () => void;
  /** May return a single Credit draft, or [Credit draft, Cash draft] when part is received now. */
  onConfirm: (draft: CreditDraft | (CreditDraft | CashDraft)[]) => void;
  target: number;
  editingLine?: PaymentLine | null;
  customers: CreditCustomer[];
  onSearchCustomers?: (query: string) => void;
  offeredTypes: PaymentType[];
}

export function CreditModal({
  open,
  onClose,
  onConfirm,
  target,
  editingLine,
  customers,
  onSearchCustomers,
  offeredTypes,
}: CreditModalProps) {
  const [amount, setAmount] = useState(() => String(editingLine?.amount ?? target));
  const [receivedNow, setReceivedNow] = useState("0");
  const [customerQuery, setCustomerQuery] = useState(editingLine?.customerName ?? "");
  const [selectedCustomer, setSelectedCustomer] = useState<CreditCustomer | null>(
    editingLine ? { code: editingLine.customerCode ?? "", name: editingLine.customerName ?? "" } : null
  );

  const numericAmount = toAmount(amount);
  const numericReceivedNow = Math.min(toAmount(receivedNow), numericAmount);
  const creditPortion = numericAmount - numericReceivedNow;
  const exceedsTarget = numericAmount > target + 0.005;
  const remainingAfter = remainingAfterAllocation(target, numericAmount);
  const valid = numericAmount > 0 && !exceedsTarget && !!selectedCustomer;

  const confirmLabel = confirmActionLabel({
    currentType: PAYMENT_TYPES.CREDIT,
    remainingAfter,
    offeredTypes,
    editing: !!editingLine,
  });

  const handleConfirm = () => {
    if (!valid || !selectedCustomer) return;
    const creditDraft: CreditDraft = {
      paymentType: PAYMENT_TYPES.CREDIT,
      amount: creditPortion,
      customerCode: selectedCustomer.code,
      customerName: selectedCustomer.name,
    };
    if (numericReceivedNow > 0) {
      onConfirm([creditDraft, { paymentType: PAYMENT_TYPES.CASH, amount: numericReceivedNow }]);
    } else {
      onConfirm(creditDraft);
    }
  };

  return (
    <PaymentModalShell
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      icon={<Users size={22} />}
      title="Credit / On Account"
      subtitle={`Remaining to allocate ${target.toFixed(2)}`}
      accentColor={ACCENT}
      amountLabel="Amount to Leave on Account"
      amount={amount}
      onAmountChange={setAmount}
      confirmLabel={confirmLabel}
      confirmDisabled={!valid}
      error={exceedsTarget ? `Credit cannot exceed the remaining ${target.toFixed(2)}.` : null}
      fields={
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Label style={{ fontSize: 12 }}>Customer</Label>
            <div style={{ position: "relative", marginTop: 6 }}>
              <Search
                size={16}
                style={{ position: "absolute", left: 10, top: 10, color: "#9ca3af" }}
              />
              <Input
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setSelectedCustomer(null);
                  onSearchCustomers?.(e.target.value);
                }}
                placeholder="Search customer / member"
                style={{ paddingLeft: 32 }}
              />
            </div>
            {!selectedCustomer && customerQuery && customers.length > 0 && (
              <div style={{ marginTop: 6, border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: 144, overflowY: "auto" }}>
                {customers.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCustomerQuery(c.name);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: 13.5,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {c.name} <span style={{ fontSize: 12, color: "#9ca3af" }}>({c.code})</span>
                  </button>
                ))}
              </div>
            )}
            {selectedCustomer && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#6d28d9", fontWeight: 600 }}>
                Selected: {selectedCustomer.name} ({selectedCustomer.code})
              </div>
            )}
          </div>

          <div>
            <Label style={{ fontSize: 12 }}>Received Now (optional)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={receivedNow}
              onChange={(e) => setReceivedNow(e.target.value)}
              placeholder="0"
              style={{ marginTop: 6 }}
            />
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
              Any amount received now is recorded as a separate Cash line; the rest goes on the customer's account.
            </p>
          </div>

          {numericReceivedNow > 0 && (
            <div
              style={{
                fontSize: 13.5,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                padding: 14,
                backgroundColor: "#f9fafb",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "#6b7280" }}>On account</span>
              <span style={{ fontWeight: 600 }}>{creditPortion.toFixed(2)}</span>
            </div>
          )}
        </div>
      }
    />
  );
}
