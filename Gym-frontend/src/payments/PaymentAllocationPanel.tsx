import React, { useCallback, useEffect, useState } from "react";
import { Banknote, CreditCard, Landmark, Users, Pencil, Wallet, X as XIcon } from "lucide-react";
import { CurrencyValue } from "../utils/currency";
import { Progress } from "../components/ui/progress";
import type { AccountHead } from "../utils/supabase/account-heads-service";
import { PAYMENT_TYPES, PaymentLine, PaymentType, lineLabel } from "./paymentModel";
import type { PaymentManager } from "./usePaymentManager";
import { CashModal, CashDraft } from "./modals/CashModal";
import { CardModal, CardDraft } from "./modals/CardModal";
import { OnlineModal, OnlineDraft } from "./modals/OnlineModal";
import { CreditModal, CreditDraft, CreditCustomer, CreditParty } from "./modals/CreditModal";
import { WalletModal, WalletDraft } from "./modals/WalletModal";
import { resolveConfirm } from "./resolveConfirm";

type Draft = CashDraft | CardDraft | OnlineDraft | CreditDraft | WalletDraft;
type ConfirmPayload = Draft | Draft[];

const METHOD_TILES: { type: PaymentType; label: string; hotkey: string; icon: React.ReactNode; accent: string }[] = [
  { type: PAYMENT_TYPES.CASH, label: "Cash", hotkey: "c", icon: <Banknote size={19} />, accent: "#16A34A" },
  { type: PAYMENT_TYPES.CARD, label: "Card", hotkey: "d", icon: <CreditCard size={19} />, accent: "#2563EB" },
  { type: PAYMENT_TYPES.ONLINE, label: "Online", hotkey: "o", icon: <Landmark size={19} />, accent: "#0D9488" },
  { type: PAYMENT_TYPES.CREDIT, label: "Credit", hotkey: "r", icon: <Users size={19} />, accent: "#7C3AED" },
  { type: PAYMENT_TYPES.WALLET, label: "Wallet", hotkey: "w", icon: <Wallet size={19} />, accent: "#CA8A04" },
];

const ACCENT_BY_TYPE: Record<PaymentType, string> = {
  [PAYMENT_TYPES.CASH]: "#16A34A",
  [PAYMENT_TYPES.CARD]: "#2563EB",
  [PAYMENT_TYPES.ONLINE]: "#0D9488",
  [PAYMENT_TYPES.CREDIT]: "#7C3AED",
  [PAYMENT_TYPES.WALLET]: "#CA8A04",
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

interface PaymentEntryRowProps {
  line: PaymentLine;
  error?: string;
  creditLabel: string;
  onEdit: (line: PaymentLine) => void;
  onRemove: (id: string) => void;
}

const PaymentEntryRow = React.memo(
  function PaymentEntryRow({ line, error, creditLabel, onEdit, onRemove }: PaymentEntryRowProps) {
    const tile = METHOD_TILES.find((t) => t.type === line.paymentType)!;
    const detailParts = [line.paymentType === PAYMENT_TYPES.CARD ? line.paymentSubtype : null, line.customerName, line.reference ? `Ref ${line.reference}` : null].filter(
      Boolean
    );

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onEdit(line)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEdit(line);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderRadius: 10,
          border: error ? "1px solid light-dark(#fca5a5, oklch(38% 0.08 19.6))" : "1px solid light-dark(#e5e7eb, var(--border))",
          backgroundColor: error ? "light-dark(#fef2f2, var(--muted-bg))" : "light-dark(#fff, var(--card))",
          padding: 12,
          cursor: "pointer",
          transition: "background-color 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!error) e.currentTarget.style.backgroundColor = "#f9fafb";
        }}
        onMouseLeave={(e) => {
          if (!error) e.currentTarget.style.backgroundColor = "#fff";
        }}
      >
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            color: "#fff",
            backgroundColor: tile.accent,
          }}
        >
          {tile.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>
            {line.paymentType === PAYMENT_TYPES.CREDIT ? creditLabel : lineLabel(line)}
          </div>
          {detailParts.length > 0 && (
            <div style={{ fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {detailParts.join(" · ")}
            </div>
          )}
          {error && <div style={{ fontSize: 12, color: "light-dark(#dc2626, oklch(82% 0.15 27.3))", marginTop: 2 }}>{error}</div>}
        </div>
        <div style={{ fontWeight: 700 }}>
          <CurrencyValue amount={line.amount} />
        </div>
        <Pencil size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
        <button
          type="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(line.id);
          }}
          style={{
            flexShrink: 0,
            borderRadius: 6,
            padding: 4,
            color: "#9ca3af",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#fee2e2";
            e.currentTarget.style.color = "#dc2626";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#9ca3af";
          }}
        >
          <XIcon size={16} />
        </button>
      </div>
    );
  },
  (prev, next) => prev.line === next.line && prev.error === next.error && prev.creditLabel === next.creditLabel && prev.onEdit === next.onEdit && prev.onRemove === next.onRemove
);

export interface PaymentAllocationPanelProps {
  manager: PaymentManager;
  invoiceTotal: number;
  bankAccounts?: AccountHead[];
  bankAccountsLoading?: boolean;
  customers?: CreditCustomer[];
  onSearchCustomers?: (query: string) => void;
  offeredTypes?: PaymentType[];
  /** Fixed owner of any Credit line (e.g. the bill's supplier) — see CreditParty. */
  creditParty?: CreditParty;
  /** Spendable wallet balance when WALLET is offered (null = no member / unknown). */
  walletBalance?: number | null;
  /**
   * Flag cash tendered above the amount due (it becomes change) with an amber
   * warning, so a mistyped amount stands out. Off by default — the POS and other
   * screens keep their behaviour. Membership renewals turn it on (BG_84).
   */
  warnCashOverTender?: boolean;
}

export function PaymentAllocationPanel({
  manager,
  invoiceTotal,
  bankAccounts = [],
  bankAccountsLoading = false,
  customers = [],
  onSearchCustomers,
  offeredTypes = [PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT],
  creditParty,
  walletBalance = null,
  warnCashOverTender = false,
}: PaymentAllocationPanelProps) {
  const creditLabel = creditParty ? `Left on credit (${creditParty.accountLabel})` : "Transferred to Accounts Receivable";
  const [openModal, setOpenModal] = useState<PaymentType | null>(null);
  const [editingLine, setEditingLine] = useState<PaymentLine | null>(null);

  const { paymentLines, remaining, allocated, change, methodsUsed, summary, fullyAllocated, overAllocated, errors, addLine, updateLine, removeLine, targetFor } =
    manager;

  const walletUsed = manager.totalByType(PAYMENT_TYPES.WALLET);
  // Wallet needs a member with a balance; it never appears unless the page offers it.
  const availableTiles = METHOD_TILES.filter((t) => offeredTypes.includes(t.type)
    && (t.type !== PAYMENT_TYPES.WALLET || (walletBalance ?? 0) > 0));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (openModal) return;
      if (isTypingTarget(e.target)) return;
      const tile = availableTiles.find((t) => t.hotkey === e.key.toLowerCase());
      if (tile) {
        e.preventDefault();
        setEditingLine(null);
        setOpenModal(tile.type);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openModal, offeredTypes.join(",")]);

  const closeModal = () => {
    setOpenModal(null);
    setEditingLine(null);
  };

  const openTileModal = (type: PaymentType) => {
    setEditingLine(null);
    setOpenModal(type);
  };

  const openEditModal = useCallback((line: PaymentLine) => {
    setEditingLine(line);
    setOpenModal(line.paymentType);
  }, []);

  /**
   * Accepts one draft or several (a Credit dialog may split money received
   * now from the balance put on account). Editing replaces the line in
   * place (or removes it if no draft of that type comes back); adding
   * appends and, if a balance remains, opens the next suggested tender
   * immediately instead of returning to the panel.
   */
  const handleConfirm = (drafts: ConfirmPayload) => {
    const result = resolveConfirm({
      drafts,
      editingLine,
      invoiceTotal,
      allocatedBeforeConfirm: allocated,
      offeredTypes,
    });

    result.updates.forEach(({ id, patch }) => updateLine(id, patch));
    result.removals.forEach((id) => removeLine(id));
    result.appends.forEach((input) => addLine(input));

    closeModal();

    if (result.nextMethod) {
      setEditingLine(null);
      setOpenModal(result.nextMethod);
    }
  };

  const summaryLabel = summary ?? "—";
  const progressPct = invoiceTotal > 0 ? Math.min(100, (allocated / invoiceTotal) * 100) : 100;
  const creditTotal = manager.totalByType(PAYMENT_TYPES.CREDIT);

  const statusColor = overAllocated ? "#dc2626" : fullyAllocated ? "#15803d" : "#b45309";
  const statusBg = overAllocated ? "#fef2f2" : fullyAllocated ? "#f0fdf4" : "#fffbeb";
  const statusBorder = overAllocated ? "#fecaca" : fullyAllocated ? "#bbf7d0" : "#fde68a";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "light-dark(#6b7280, oklch(82% 0.023 264.4))", marginBottom: 10 }}>Add Payment</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(4, availableTiles.length)}, 1fr)`, gap: 10 }}>
          {availableTiles.map((tile) => (
            <button
              key={tile.type}
              type="button"
              onClick={() => openTileModal(tile.type)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                borderRadius: 10,
                border: "2px solid light-dark(#e5e7eb, var(--border))",
                backgroundColor: "light-dark(#fff, var(--card))",
                padding: 14,
                cursor: "pointer",
                transition: "box-shadow 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tile.accent;
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  color: "#fff",
                  backgroundColor: tile.accent,
                }}
              >
                {tile.icon}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{tile.label}</span>
              {tile.type === PAYMENT_TYPES.WALLET && walletBalance != null && (
                <span style={{ fontSize: 11, color: "light-dark(#92400e, oklch(82% 0.125 46.2))" }}>Balance <CurrencyValue amount={walletBalance} /></span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          borderRadius: 12,
          border: `2px solid ${statusBorder}`,
          backgroundColor: statusBg,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: statusColor }}>
              {overAllocated ? "OVER-ALLOCATED" : fullyAllocated ? "FULLY ALLOCATED" : "REMAINING TO ALLOCATE"}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: statusColor, marginTop: 2 }}>
              <CurrencyValue amount={overAllocated ? allocated - invoiceTotal : remaining} />
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13.5, color: "light-dark(#6b7280, oklch(82% 0.023 264.4))" }}>
            <CurrencyValue amount={allocated} /> / <CurrencyValue amount={invoiceTotal} />
          </div>
        </div>

        <Progress
          value={progressPct}
          style={{ height: 8 }}
          className={overAllocated ? "[&>div]:bg-red-600" : fullyAllocated ? "[&>div]:bg-green-600" : undefined}
        />

        <div style={{ borderTop: "1px solid light-dark(rgba(0,0,0,0.08), var(--border))", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
            <span style={{ color: "light-dark(#6b7280, oklch(82% 0.023 264.4))" }}>Amount Due</span>
            <span>
              <CurrencyValue amount={invoiceTotal} />
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
            <span style={{ color: "light-dark(#6b7280, oklch(82% 0.023 264.4))" }}>Allocated</span>
            <span>
              <CurrencyValue amount={allocated} />
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
            <span style={{ color: "light-dark(#6b7280, oklch(82% 0.023 264.4))" }}>Remaining</span>
            <span>
              <CurrencyValue amount={remaining} />
            </span>
          </div>
          {creditTotal > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "light-dark(#7c3aed, oklch(82% 0.15 293))" }}>
              <span>Transferred to Accounts Receivable</span>
              <span>
                <CurrencyValue amount={creditTotal} />
              </span>
            </div>
          )}
          {change > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, color: "light-dark(#15803d, oklch(82% 0.137 150.1))" }}>
              <span>Change to Return</span>
              <span>
                <CurrencyValue amount={change} />
              </span>
            </div>
          )}
          {warnCashOverTender && change > 0 && (
            <div
              role="alert"
              style={{ fontSize: 13, color: "light-dark(#92400e, oklch(82% 0.125 46.2))", backgroundColor: "light-dark(#fffbeb, oklch(27% 0.039 95.3))", border: "1px solid light-dark(#fcd34d, oklch(38% 0.08 91.6))", borderRadius: 8, padding: "8px 12px" }}
            >
              Cash received is more than the <CurrencyValue amount={invoiceTotal} /> due — check the amount. You'll be asked
              to confirm the <CurrencyValue amount={change} /> change before the payment is saved.
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid light-dark(rgba(0,0,0,0.08), var(--border))",
            paddingTop: 12,
            fontSize: 13.5,
          }}
        >
          <span style={{ fontWeight: 700, letterSpacing: 0.4, fontSize: 11.5, color: "light-dark(#6b7280, oklch(82% 0.023 264.4))" }}>PAYMENT SUMMARY</span>
          <span style={{ fontWeight: 600 }}>{summaryLabel}</span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "light-dark(#6b7280, oklch(82% 0.023 264.4))", marginBottom: 10 }}>Payment Entries</div>
        {paymentLines.length === 0 ? (
          <div
            style={{
              fontSize: 13.5,
              color: "#9ca3af",
              textAlign: "center",
              padding: "24px 0",
              border: "1px dashed light-dark(#e5e7eb, var(--border))",
              borderRadius: 10,
            }}
          >
            No payment entries yet — add one above.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {paymentLines.map((line) => (
              <PaymentEntryRow key={line.id} line={line} error={errors[line.id]} creditLabel={creditLabel} onEdit={openEditModal} onRemove={removeLine} />
            ))}
          </div>
        )}
      </div>

      {openModal === PAYMENT_TYPES.CASH && (
        <CashModal
          open
          onClose={closeModal}
          onConfirm={handleConfirm}
          target={targetFor(editingLine)}
          editingLine={editingLine?.paymentType === PAYMENT_TYPES.CASH ? editingLine : null}
          offeredTypes={offeredTypes}
          warnOverTender={warnCashOverTender}
        />
      )}
      {openModal === PAYMENT_TYPES.CARD && (
        <CardModal
          open
          onClose={closeModal}
          onConfirm={handleConfirm}
          target={targetFor(editingLine)}
          editingLine={editingLine?.paymentType === PAYMENT_TYPES.CARD ? editingLine : null}
          offeredTypes={offeredTypes}
        />
      )}
      {openModal === PAYMENT_TYPES.ONLINE && (
        <OnlineModal
          open
          onClose={closeModal}
          onConfirm={handleConfirm}
          target={targetFor(editingLine)}
          editingLine={editingLine?.paymentType === PAYMENT_TYPES.ONLINE ? editingLine : null}
          bankAccounts={bankAccounts}
          bankAccountsLoading={bankAccountsLoading}
          offeredTypes={offeredTypes}
        />
      )}
      {openModal === PAYMENT_TYPES.WALLET && (
        <WalletModal
          open
          onClose={closeModal}
          onConfirm={handleConfirm}
          target={targetFor(editingLine)}
          editingLine={editingLine?.paymentType === PAYMENT_TYPES.WALLET ? editingLine : null}
          balance={Math.max(0, (walletBalance ?? 0) - walletUsed + (editingLine?.paymentType === PAYMENT_TYPES.WALLET ? editingLine.amount : 0))}
          offeredTypes={offeredTypes}
        />
      )}
      {openModal === PAYMENT_TYPES.CREDIT && (
        <CreditModal
          open
          onClose={closeModal}
          onConfirm={handleConfirm}
          target={targetFor(editingLine)}
          editingLine={editingLine?.paymentType === PAYMENT_TYPES.CREDIT ? editingLine : null}
          customers={customers}
          onSearchCustomers={onSearchCustomers}
          offeredTypes={offeredTypes}
          fixedParty={creditParty}
        />
      )}
    </div>
  );
}

export { ACCENT_BY_TYPE };
