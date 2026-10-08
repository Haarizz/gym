import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRightCircle, Banknote, CheckCircle2, CreditCard, Landmark, Mail, MessageCircle, Printer, RotateCcw, ShoppingCart, User, X } from "lucide-react";
import type { AccountHead } from "../../utils/supabase/account-heads-service";
import { PaymentAllocationPanel } from "../../payments/PaymentAllocationPanel";
import type { usePaymentManager } from "../../payments/usePaymentManager";
import { PAYMENT_TYPES, type PaymentType } from "../../payments/paymentModel";
import type { CreditCustomer } from "../../payments/modals/CreditModal";
import { posApi } from "../api";
import { usePos } from "../PosContext";
import { Money, ReceiptPreview, type PickedMember } from "./Shared";
import { fmtDateTime, money, r2, type CartTotals, type PromoRule } from "../pricing";
import { legLabel, saleReceipt } from "../print/receiptModel";
import { receiptHtmlBody, thermalDocument } from "../print/thermalHtml";
import type { PaymentLeg, Sale } from "../types";
import s from "../pos.module.css";

type PaymentManager = ReturnType<typeof usePaymentManager>;
type CreditParty = React.ComponentProps<typeof PaymentAllocationPanel>["creditParty"];

const LEG_METHOD: Record<string, string> = {
  [PAYMENT_TYPES.CASH]: "Cash",
  [PAYMENT_TYPES.CARD]: "Card",
  [PAYMENT_TYPES.ONLINE]: "Online",
  [PAYMENT_TYPES.CREDIT]: "Credit",
  [PAYMENT_TYPES.WALLET]: "Wallet",
};

/** Unsaved sale shaped like the server's, so the live preview uses the exact receipt layout that prints. */
function draftSale(totals: CartTotals, member: PickedMember | null, manager: PaymentManager, note: string,
                   meta: { cashier: string; terminal: string | null; taxInclusive: boolean; bill: { type: string; value: number } | null;
                           promo: PromoRule | null }): Sale {
  const legs: PaymentLeg[] = manager.paymentLines.map((p) => ({
    method: LEG_METHOD[p.paymentType] ?? p.paymentType,
    amount: r2(p.amount),
    reference: p.reference,
    cardType: p.paymentType === PAYMENT_TYPES.CARD ? p.paymentSubtype : null,
    bankAccountName: p.bankAccountName,
  }));
  const cash = manager.totalByType(PAYMENT_TYPES.CASH as PaymentType);
  const credit = manager.totalByType(PAYMENT_TYPES.CREDIT as PaymentType);
  const now = new Date().toISOString();
  return {
    id: 0,
    transactionNumber: "PREVIEW",
    posSessionId: null,
    memberId: member?.id ?? null,
    memberName: member?.name ?? "Walk-in Customer",
    memberCode: member?.memberCode ?? null,
    memberPhone: member?.phone ?? null,
    paymentMethod: legs[0]?.method ?? "",
    paymentSummary: legs.length ? legs.map(legLabel).join(" + ") : "Awaiting payment",
    paymentBreakdown: legs.length ? legs : [],
    paymentAllocations: null,
    subtotal: totals.subtotal,
    lineDiscountAmount: totals.lineDiscount,
    billDiscountType: meta.bill?.type ?? null,
    billDiscountValue: meta.bill?.value ?? null,
    billDiscountAmount: totals.billDiscount,
    discountCode: meta.promo?.code ?? null,
    codeDiscountAmount: totals.promoDiscount,
    promotionId: meta.promo?.promotionId ?? null,
    promotionName: meta.promo?.name ?? null,
    discountAmount: totals.totalDiscount,
    taxableAmount: r2(totals.lines.reduce((a, l) => a + l.taxable, 0)),
    taxAmount: totals.tax,
    taxInclusive: meta.taxInclusive,
    totalAmount: totals.total,
    receivedAmount: cash > 0 ? r2(cash) : null,
    changeAmount: manager.change > 0 ? manager.change : null,
    creditAmount: credit,
    creditSettledAmount: 0,
    creditOutstanding: credit,
    refundedAmount: 0,
    returnStatus: "NONE",
    status: "COMPLETED",
    notes: note || null,
    cashierName: meta.cashier,
    terminalName: meta.terminal,
    businessDate: null,
    reprintCount: 0,
    approvedBy: null,
    branchId: null,
    createdAt: now,
    updatedAt: null,
    returns: [],
    items: totals.lines.map((l, i) => ({
      id: i,
      transactionId: 0,
      productId: l.productId,
      productName: l.name,
      productSku: l.sku,
      barcode: l.barcode,
      categoryName: l.categoryName,
      warehouseId: null,
      quantity: l.quantity,
      returnedQuantity: 0,
      listPrice: l.listPrice,
      unitPrice: l.unitPrice,
      priceOverridden: l.priceOverridden,
      discountPercent: l.discountPercent,
      discountAmount: l.discountAmount,
      billDiscountShare: l.billShare,
      taxRate: l.taxRate,
      taxableAmount: l.taxable,
      taxAmount: l.tax,
      totalAmount: l.total,
      lineTotal: l.total,
    })),
  };
}

const legIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("card")) return <CreditCard size={15} />;
  if (l.includes("online")) return <Landmark size={15} />;
  if (l.includes("credit") || l.includes("account")) return <User size={15} />;
  return <Banknote size={15} />;
};

export function CheckoutScreen({
  open, totals, member, bill, promo = null, note, onNoteChange, manager, bankAccounts, customers, onSearchCustomers, offeredTypes, creditParty,
  walletBalance = null, approvalNotice, paying, onCancel, onSettle, completedSale, onNewSale, onReprint,
}: {
  open: boolean;
  totals: CartTotals;
  member: PickedMember | null;
  bill: { type: string; value: number } | null;
  promo?: PromoRule | null;
  note: string;
  onNoteChange: (v: string) => void;
  manager: PaymentManager;
  bankAccounts: AccountHead[];
  customers: CreditCustomer[];
  onSearchCustomers: (q: string) => void;
  offeredTypes: PaymentType[];
  creditParty: CreditParty;
  walletBalance?: number | null;
  approvalNotice: string | null;
  paying: boolean;
  onCancel: () => void;
  onSettle: () => void;
  completedSale: Sale | null;
  onNewSale: () => void;
  onReprint: () => void;
}) {
  const { company, template, currencyCode, settings, terminalName, printSale } = usePos();
  const [printing, setPrinting] = useState(false);

  const previewHtml = useMemo(() => {
    if (!open || completedSale || !company || totals.lines.length === 0) return "";
    const sale = draftSale(totals, member, manager, note, {
      cashier: settings.currentUserDisplayName || settings.currentUsername, terminal: terminalName || null, taxInclusive: settings.taxInclusive, bill, promo,
    });
    return thermalDocument(receiptHtmlBody(saleReceipt(sale, company, template, currencyCode), 80), 80, "Preview", template.fontScale);
  }, [open, completedSale, company, totals, member, manager, note, settings, terminalName, bill, promo, template, currencyCode]);

  const canSettle = !paying && totals.lines.length > 0 && (totals.total <= 0 || manager.settleable);

  // Esc cancels the payment step; Enter starts the next sale once paid.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
      if (completedSale) {
        if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); onNewSale(); }
      } else if (e.key === "Escape" && !paying && !typing && !document.querySelector("[role=dialog]")) {
        e.preventDefault(); onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, completedSale, paying, onCancel, onNewSale]);

  if (!open) return null;

  // ── Payment complete ────────────────────────────────────────────────────
  if (completedSale) {
    const sale = completedSale;
    const legs = sale.paymentBreakdown?.length ? sale.paymentBreakdown : [{ method: sale.paymentSummary || sale.paymentMethod, amount: sale.totalAmount }];
    const print = async (format: "80mm" | "58mm" | "A4") => {
      setPrinting(true);
      try { await printSale(sale, { format }); } finally { setPrinting(false); }
    };
    const shareText = [
      `${company?.name ?? "GymBios"} — ${sale.taxAmount > 0 ? "Tax Invoice" : "Receipt"} ${sale.transactionNumber}`,
      `Date: ${fmtDateTime(sale.createdAt)}`,
      ...sale.items.map((i) => `${i.quantity} x ${i.productName} — ${money(sale.taxInclusive ? i.lineTotal : i.taxableAmount, currencyCode)}`),
      `Total: ${money(sale.totalAmount, currencyCode)}`,
      `Paid by: ${sale.paymentSummary}`,
      "Thank you!",
    ].join("\n");
    const share = (channel: "whatsapp" | "email") => {
      const phone = (sale.memberPhone || "").replace(/[^\d]/g, "");
      window.open(channel === "whatsapp"
        ? `https://wa.me/${phone}?text=${encodeURIComponent(shareText)}`
        : `mailto:?subject=${encodeURIComponent(`Receipt ${sale.transactionNumber}`)}&body=${encodeURIComponent(shareText)}`, "_blank", "noopener");
      posApi.logEvent("RECEIPT_SHARE", `${sale.transactionNumber} via ${channel}`, { referenceType: "SaleTransaction", referenceId: sale.id, referenceNumber: sale.transactionNumber });
    };

    return (
      <div className={s.coDoneOverlay}>
        <div className={s.coDone} role="dialog" aria-label="Payment complete">
          <div className={s.coDoneHead}>
            <div className={s.coDoneIcon}><CheckCircle2 size={24} /></div>
            <div className={s.coDoneKicker}>Payment Complete</div>
            <div className={s.coDoneNo}>{sale.transactionNumber}</div>
          </div>
          <div className={s.coDonePaid}>
            <div className={s.coLabel}>Amount Paid</div>
            <div className={s.coDoneAmount}><Money value={sale.totalAmount} /></div>
          </div>
          <div className={s.coDoneBody}>
            {(sale.changeAmount ?? 0) > 0 && (
              <div className={s.coDoneChange}><span>Change Due</span><b><Money value={sale.changeAmount} /></b></div>
            )}
            {sale.creditOutstanding > 0 && (
              <div className={s.coDoneSection}>
                <div className={s.coLabel}>Accounts Receivable</div>
                <div className={s.coRow}><span>This invoice</span><b><Money value={sale.creditOutstanding} /></b></div>
              </div>
            )}
            <div className={s.coDoneSection}>
              <div className={s.coLabel}>Payment Summary</div>
              {legs.map((l, i) => (
                <div key={i} className={s.coRow}><span className={s.coLeg}>{legIcon(legLabel(l))}{legLabel(l)}</span><b><Money value={Number(l.amount) || 0} /></b></div>
              ))}
            </div>
            <details className={s.coDetails}>
              <summary>View financial details</summary>
              <div className={s.coDetailsBody}>
                <div className={s.coRow}><span>Subtotal</span><b><Money value={sale.subtotal} /></b></div>
                {sale.discountAmount > 0 && <div className={s.coRow}><span>Discount</span><b>−<Money value={sale.discountAmount} /></b></div>}
                <div className={s.coRow}><span>{sale.taxInclusive ? "VAT (included)" : "VAT"}</span><b><Money value={sale.taxAmount} /></b></div>
                <div className={s.coRow}><span>Sale amount</span><b><Money value={sale.totalAmount} /></b></div>
                {sale.receivedAmount != null && <div className={s.coRow}><span>Cash received</span><b><Money value={sale.receivedAmount} /></b></div>}
                <div className={s.coRow}><span>Payment mode</span><b>{sale.paymentSummary}</b></div>
                <div className={s.coRow}><span>Customer</span><b>{sale.memberName}</b></div>
              </div>
            </details>
          </div>
          <div className={s.coDoneFoot}>
            <button type="button" className={s.coNewSale} onClick={onNewSale} autoFocus><ArrowRightCircle size={19} />New Sale <kbd>Enter</kbd></button>
            <div className={s.coGrid2}>
              <button type="button" className={s.coGhost} disabled={printing} onClick={() => print(settings.defaultPrintFormat === "58mm" ? "58mm" : "80mm")}><Printer size={15} />Print Receipt</button>
              <button type="button" className={s.coGhost} disabled={printing} onClick={() => print("A4")}><Printer size={15} />A4 Invoice</button>
            </div>
            <button type="button" className={s.coGhost} style={{ width: "100%" }} onClick={onReprint}><RotateCcw size={15} />Reprint another invoice</button>
            {settings.receiptShareEnabled && (
              <div className={s.coShare}>
                <div className={s.coLabel}>Share Receipt</div>
                <div className={s.coGrid2}>
                  <button type="button" className={`${s.coGhost} ${s.coShareWa}`} onClick={() => share("whatsapp")}><MessageCircle size={15} />WhatsApp</button>
                  <button type="button" className={`${s.coGhost} ${s.coShareMail}`} onClick={() => share("email")}><Mail size={15} />Email</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Payment ─────────────────────────────────────────────────────────────
  return (
    <div className={s.coScreen}>
      <div className={s.coPreviewCol}>
        {previewHtml
          ? <div className={s.coPreview}><ReceiptPreview html={previewHtml} widthMm={80} /></div>
          : <div className={s.coPreviewEmpty}><ShoppingCart size={40} /><span>Add items to preview</span></div>}
      </div>

      <div className={s.coMain}>
        <div className={s.coHead}>
          <div className={s.coHeadLeft}>
            <div className={s.coHeadIcon}><CreditCard size={19} /></div>
            <div>
              <div className={s.coHeadTitle}>Checkout</div>
              <div className={s.coHeadSub}>
                {totals.itemCount} item{totals.itemCount === 1 ? "" : "s"} · {member ? member.name : "Walk-in customer"}
              </div>
            </div>
          </div>
          <div className={s.coHeadRight}>
            <div style={{ textAlign: "right" }}>
              <div className={s.coHeadSub}>Total Amount</div>
              <div className={s.coHeadTotal}><Money value={totals.total} /></div>
            </div>
            <button type="button" className={s.coClose} disabled={paying} onClick={onCancel} aria-label="Close checkout"><X size={19} /></button>
          </div>
        </div>

        <div className={s.coBody}>
          {totals.totalDiscount > 0 && (
            <div className={s.coCard}>
              <div className={s.coLabel}>Settlement Summary</div>
              <div className={s.coRow}><span>Items total</span><b><Money value={totals.subtotal} /></b></div>
              {totals.lineDiscount + totals.billDiscount > 0 && <div className={`${s.coRow} ${s.coGreen}`}><span>Discount</span><b>−<Money value={r2(totals.lineDiscount + totals.billDiscount)} /></b></div>}
              {totals.promoDiscount > 0 && promo && <div className={`${s.coRow} ${s.coGreen}`}><span>{promo.name}{promo.code ? ` (${promo.code})` : ""}</span><b>−<Money value={totals.promoDiscount} /></b></div>}
              <div className={`${s.coRow} ${s.coRowTotal}`}><span>Total payable</span><b><Money value={totals.total} /></b></div>
            </div>
          )}
          {totals.total > 0 ? (
            <div className={s.coCard}>
              <PaymentAllocationPanel
                manager={manager}
                invoiceTotal={totals.total}
                bankAccounts={bankAccounts}
                customers={customers}
                onSearchCustomers={onSearchCustomers}
                offeredTypes={offeredTypes}
                walletBalance={walletBalance}
                creditParty={creditParty}
              />
            </div>
          ) : (
            <div className={`${s.callout} ${s.calloutOk}`}>This sale totals zero — nothing to collect.</div>
          )}
          <div className={s.coCard}>
            <label className={s.coLabel} htmlFor="co-remarks">Remarks / Reference</label>
            <input id="co-remarks" className={s.coInput} value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="Tap to enter note…" />
          </div>
        </div>

        <div className={s.coFoot}>
          {manager.change > 0 && (
            <div className={s.coChange}><span>Change Due</span><b><Money value={manager.change} /></b></div>
          )}
          {approvalNotice && <div className={s.coNotice}><AlertTriangle size={15} />{approvalNotice}</div>}
          <div className={s.coActions}>
            <button type="button" className={s.coCancel} disabled={paying} onClick={onCancel}>Cancel</button>
            <button type="button" className={s.coSettle} disabled={!canSettle} onClick={onSettle}>
              {paying
                ? <><span className={s.coSpinner} />Processing…</>
                : <><CheckCircle2 size={22} /><span>Settle Payment</span><span className={s.coSettleAmt}><Money value={totals.total} /></span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
