import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { CurrencyValue } from "../../utils/currency";
import { bookingService, type DeskBookingPaymentFields, type DeskQuote } from "../../utils/supabase/booking-service";
import { accountHeadsService, type AccountHead } from "../../utils/supabase/account-heads-service";
import { usePaymentManager } from "../../payments/usePaymentManager";
import { PaymentAllocationPanel } from "../../payments/PaymentAllocationPanel";
import { PAYMENT_TYPES, type PaymentLine } from "../../payments/paymentModel";
import { changeAmount } from "../../payments/paymentSelectors";

const LEG_METHOD: Record<string, string> = {
  [PAYMENT_TYPES.CASH]: "Cash",
  [PAYMENT_TYPES.CARD]: "Card",
  [PAYMENT_TYPES.ONLINE]: "Online Payment",
  [PAYMENT_TYPES.CREDIT]: "Credit",
};

/** Payment lines → the booking request's payment fields. Cash change is taken off the cash leg. */
function toFields(lines: PaymentLine[], total: number): DeskBookingPaymentFields {
  let change = changeAmount(lines, total);
  const legs = lines.map((line) => {
    let amount = line.amount;
    if (line.paymentType === PAYMENT_TYPES.CASH && change > 0) {
      const off = Math.min(change, amount);
      amount -= off;
      change -= off;
    }
    return {
      method: LEG_METHOD[line.paymentType] ?? line.paymentType,
      amount: Math.round(amount * 100) / 100,
      ...(line.paymentType === PAYMENT_TYPES.CARD && line.paymentSubtype ? { card_type: line.paymentSubtype } : {}),
      ...(line.reference ? { reference: line.reference } : {}),
      ...(line.paymentType === PAYMENT_TYPES.ONLINE && line.bankAccountName ? { bank_account_name: line.bankAccountName } : {}),
    };
  }).filter((leg) => leg.amount > 0);
  const methods = new Set(legs.map((l) => l.method));
  return {
    payment_method_used: methods.size === 1 ? legs[0].method : "Mixed",
    payment_breakdown: legs,
    expected_amount: total,
  };
}

/**
 * Staff booking a member into a session: asks the server whether one of the member's PT
 * packages covers it (only a package with the session's own trainer does). If not and the
 * session is priced, the desk takes payment — Cash, Card, Online, or Credit for the rest.
 * Pass null ids (guest, waitlist, Reward Pass) to skip payment.
 */
export function useDeskBookingPayment(sessionId: number | null, memberId: number | null) {
  const [quote, setQuote] = useState<DeskQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuote(null);
    setError(null);
    if (!sessionId || !memberId) return;
    let live = true;
    setLoading(true);
    bookingService.deskQuote(sessionId, memberId)
      .then((q) => { if (live) setQuote(q); })
      .catch((e) => { if (live) setError(e?.message || "Couldn't price this booking"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [sessionId, memberId]);

  const toPay = quote && !quote.enrolmentId ? quote.price : 0;
  const manager = usePaymentManager({ invoiceTotal: toPay });
  const { clearLines } = manager;
  useEffect(() => { clearLines(); }, [sessionId, memberId, clearLines]);

  const active = !!sessionId && !!memberId;
  const ready = !active || (!loading && !error && quote !== null && (toPay <= 0 || manager.settleable));

  return {
    active,
    quote,
    loading,
    error,
    toPay,
    manager,
    ready,
    /** The request's payment fields, or undefined when nothing is to be paid. */
    fields: (): DeskBookingPaymentFields | undefined =>
      active && toPay > 0 ? toFields(manager.paymentLines, toPay) : undefined,
  };
}

export type DeskBookingPayment = ReturnType<typeof useDeskBookingPayment>;

export function DeskBookingPaymentPanel({ pay, member }: {
  pay: DeskBookingPayment;
  member: { code: string; name: string };
}) {
  const [bankAccounts, setBankAccounts] = useState<AccountHead[]>([]);
  useEffect(() => {
    if (pay.toPay <= 0) return;
    accountHeadsService.getBankAccounts().then(setBankAccounts).catch(() => setBankAccounts([]));
  }, [pay.toPay > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pay.active) return null;
  if (pay.loading) return <p className="text-xs text-muted-foreground">Checking packages and price…</p>;
  if (pay.error) return <p className="text-xs text-red-600">{pay.error}</p>;
  if (!pay.quote) return null;

  if (pay.quote.enrolmentId) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
        <Package className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Covered by <strong>{pay.quote.packageName}</strong> — uses one of its sessions, nothing to pay.</span>
      </div>
    );
  }
  if (pay.toPay <= 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Take payment for this session: <strong className="text-foreground"><CurrencyValue amount={pay.toPay} /></strong>.
        A PT package covers only sessions with the package's own trainer. Use Credit to leave the amount on the member's account.
      </p>
      <PaymentAllocationPanel
        manager={pay.manager}
        invoiceTotal={pay.toPay}
        bankAccounts={bankAccounts}
        offeredTypes={[PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT]}
        creditParty={{ code: member.code, name: member.name, roleLabel: "Member", accountLabel: "Accounts Receivable" }}
      />
    </div>
  );
}
