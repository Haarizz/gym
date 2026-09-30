import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { CurrencyValue } from '../../utils/currency';
import type { AccountHead } from '../../utils/supabase/account-heads-service';
import { salesInvoiceService, type SalesInvoice, type SalesInvoicePayment } from '../../utils/supabase/sales-invoice-service';
import { usePaymentManager } from '../../payments/usePaymentManager';
import { PaymentAllocationPanel } from '../../payments/PaymentAllocationPanel';
import { PAYMENT_TYPES } from '../../payments/paymentModel';
import { buildPaymentPayload } from '../../payments/paymentPayload';
import { toLegacyPayment } from '../../payments/legacyPaymentBridge';
import styles from '../purchase/PurchaseInvoice.module.css';
import { cx } from '../purchase/purchaseUi';
import { todayIso } from '../purchase/purchaseInvoiceUtils';
import { balanceOf } from './salesInvoiceUtils';

const fmt2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

/** confirm: post a draft, taking what the customer pays now. payment: a later payment on a confirmed invoice. */
export type SettleRequest = { inv: SalesInvoice; mode: 'confirm' | 'payment' };

/**
 * Confirm-and-settle / receive-payment window for a Sales Invoice. Used by the Sales
 * Invoice screen and by Billing › Member Due. Walk-in sales must be paid in full on
 * confirm; for members anything not received now (or put on Credit) stays on account.
 */
export function SalesInvoiceSettleDialog({ request, bankAccounts, stockCheckEnabled, onClose, onDone }: {
  request: SettleRequest | null;
  bankAccounts: AccountHead[];
  stockCheckEnabled?: boolean | null;
  /** Closed without posting anything. */
  onClose: () => void;
  /** Posted — `res` is the updated invoice. */
  onDone: (res: SalesInvoice, mode: SettleRequest['mode']) => void;
}) {
  const inv = request?.inv;
  const mode = request?.mode;
  const due = inv ? (mode === 'confirm' ? inv.totalAmount : balanceOf(inv)) : 0;
  const walkInConfirm = mode === 'confirm' && inv?.customerType === 'WALK_IN';
  const isMember = inv?.customerType === 'MEMBER';

  const [payNowInput, setPayNowInput] = useState('');
  const [payDate, setPayDate] = useState(todayIso());
  const [payNotes, setPayNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const payNow = walkInConfirm ? due : Math.min(due, Math.max(0, Math.round((Number(payNowInput) || 0) * 100) / 100));
  const paymentManager = usePaymentManager({ invoiceTotal: payNow });
  // A Credit line is money not received now — it stays on the member's account.
  const creditAllocated = paymentManager.totalByType(PAYMENT_TYPES.CREDIT);
  const receivedNow = Math.max(0, Math.round((payNow - creditAllocated) * 100) / 100);
  const leftOnAccount = Math.max(0, Math.round((due - receivedNow) * 100) / 100);

  // Fresh form each time the window opens for an invoice.
  useEffect(() => {
    if (!request) return;
    paymentManager.clearLines();
    setPayNotes('');
    setPayDate(todayIso());
    setPayNowInput((request.mode === 'confirm' ? request.inv.totalAmount : balanceOf(request.inv)).toFixed(2));
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  /** withPayment = false → confirm on account (members only), nothing received now. */
  const run = async (withPayment: boolean) => {
    if (!inv || !mode) return;
    let payment: SalesInvoicePayment | undefined;
    if (withPayment && receivedNow > 0) {
      if (!paymentManager.settleable) { toast.error('Allocate the amount received across the payment methods'); return; }
      if (payDate > todayIso()) { toast.error('Payment date cannot be in the future'); return; }
      const payload = buildPaymentPayload(paymentManager.paymentLines, payNow);
      const legacy = toLegacyPayment(paymentManager.paymentLines.filter(l => l.paymentType !== PAYMENT_TYPES.CREDIT));
      payment = {
        amount: payload.paidAmount,
        paymentMethod: legacy.paymentMethod,
        paymentBreakdown: legacy.paymentBreakdown,
        paymentDate: payDate,
        notes: payNotes || undefined,
      };
    } else if (withPayment && mode === 'payment') {
      toast.error('Enter the amount received — or close this and leave it on account');
      return;
    }
    if (walkInConfirm && (payment?.amount ?? 0) < inv.totalAmount - 0.005) {
      toast.error('Walk-in sales must be paid in full — allocate the whole amount (or pick a member to sell on account)');
      return;
    }

    setSaving(true);
    try {
      const res = mode === 'confirm'
        ? await salesInvoiceService.confirmInvoice(inv.id, payment)
        : await salesInvoiceService.recordPayment(inv.id, payment!);
      const left = balanceOf(res);
      toast.success(mode === 'confirm'
        ? `${res.invoiceNumber} confirmed${res.stockDeducted ? ' — stock issued' : ''}${left > 0 ? ` · ${left.toFixed(2)} on account` : ' · paid in full'}`
        : left > 0 ? `Received ${payment!.amount.toFixed(2)} on ${res.invoiceNumber} — ${left.toFixed(2)} still due` : `${res.invoiceNumber} paid in full`);
      paymentManager.clearLines();
      onDone(res, mode);
    } catch (err: any) {
      toast.error(err.message || (mode === 'confirm' ? 'Failed to confirm invoice' : 'Failed to record payment'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!request} onOpenChange={open => { if (!open && !saving) { paymentManager.clearLines(); onClose(); } }}>
      <DialogContent
        style={{
          display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden',
          width: '100%', maxWidth: 'min(30rem, calc(100% - 2rem))', maxHeight: 'calc(100dvh / 0.9 - 2rem)',
        }}
      >
        <DialogHeader style={{ flexShrink: 0, padding: '20px 48px 12px 20px', textAlign: 'left' }}>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'confirm' ? <><CheckCircle2 className="h-5 w-5" /> Confirm &amp; Settle</> : <><Wallet className="h-5 w-5" /> Receive Payment — Sales Invoice</>}
          </DialogTitle>
          <DialogDescription>
            {inv && <>{inv.invoiceNumber} · {inv.customerName} — {mode === 'confirm' ? 'total' : 'balance'} <CurrencyValue amount={due} options={fmt2} /></>}
          </DialogDescription>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '4px 20px 16px' }}>
          {mode === 'confirm' && (
            <div className={cx(styles.notice, styles.noticeInfo)}>
              <span>
                Confirming locks the invoice, {stockCheckEnabled === false ? 'posts the sale (Stock Check is off, so stock is not changed)' : 'takes the items out of each line’s warehouse'} and posts the receivable.
                {walkInConfirm ? ' Walk-in sales are collected in full now.' : ' Anything not received now stays on the member’s account.'}
              </span>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div>
              <Label htmlFor="si-pay-now">Receiving now</Label>
              <Input id="si-pay-now" type="number" min={0} max={due} step="0.01" disabled={walkInConfirm}
                value={walkInConfirm ? due.toFixed(2) : payNowInput}
                onChange={e => { setPayNowInput(e.target.value); paymentManager.clearLines(); }} />
            </div>
            <div>
              <Label htmlFor="si-pay-date">Payment date</Label>
              <Input id="si-pay-date" type="date" max={todayIso()} value={payDate} onChange={e => setPayDate(e.target.value)} />
            </div>
          </div>
          {!walkInConfirm && (
            <div className={cx(styles.notice, leftOnAccount > 0 ? styles.noticeWarn : styles.noticeInfo)} style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span>Due <strong><CurrencyValue amount={due} options={fmt2} /></strong></span>
              <span>{leftOnAccount > 0 ? <>On account <strong><CurrencyValue amount={leftOnAccount} options={fmt2} /></strong></> : <>Settles the invoice in full</>}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <Button type="button" variant="outline" size="sm" onClick={() => { setPayNowInput(due.toFixed(2)); paymentManager.clearLines(); }}>Full</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setPayNowInput((Math.round(due * 50) / 100).toFixed(2)); paymentManager.clearLines(); }}>Half</Button>
              </span>
            </div>
          )}
          {payNow > 0 && inv && (
            <PaymentAllocationPanel
              manager={paymentManager}
              invoiceTotal={payNow}
              bankAccounts={bankAccounts}
              offeredTypes={isMember
                ? [PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT]
                : [PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE]}
              creditParty={isMember ? {
                code: String(inv.memberId ?? ''),
                name: inv.customerName,
                roleLabel: 'Member',
                accountLabel: 'Accounts Receivable',
              } : undefined}
            />
          )}
          <div>
            <Label>Notes</Label>
            <Textarea placeholder="Payment reference or notes..." rows={2} value={payNotes} onChange={e => setPayNotes(e.target.value)} />
          </div>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, padding: '12px 20px 16px', borderTop: '1px solid var(--border)' }}>
          <Button variant="outline" disabled={saving} onClick={() => { paymentManager.clearLines(); onClose(); }}>{mode === 'confirm' ? 'Not yet' : 'Cancel'}</Button>
          {mode === 'confirm' && isMember && (
            <Button variant="secondary" disabled={saving} onClick={() => run(false)}>Confirm on Account</Button>
          )}
          <Button disabled={saving || (payNow > 0 && !paymentManager.settleable) || (mode === 'payment' && payNow <= 0)} onClick={() => run(true)}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
            {mode === 'confirm' ? (receivedNow > 0 ? 'Confirm & Receive' : 'Confirm') : leftOnAccount > 0 ? 'Receive Part Payment' : 'Receive Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
