import React, { useEffect, useRef } from "react";
import { CurrencyValue } from "../utils/currency";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { DeleteIcon } from "lucide-react";

const KEYPAD_ROWS: string[][] = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  [".", "0", "⌫"],
];

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export interface PaymentModalShellProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentColor: string;
  amountLabel: string;
  amount: string;
  onAmountChange: (amount: string) => void;
  quickAmounts?: { label: string; onClick: () => void }[];
  fields?: React.ReactNode;
  footer?: React.ReactNode;
  error?: string | null;
  confirmLabel: string;
  confirmDisabled?: boolean;
}

/**
 * Shared chrome for every tender modal: coloured header, amount readout, a
 * 3x4 numeric keypad, optional quick-amount chips, a slot for tender-specific
 * fields, a footer slot, an error strip, and Cancel / primary-confirm
 * buttons. Keyboard-first: focus on open, digits/. typed anywhere outside a
 * text field go straight to the amount, Backspace deletes, c clears, Enter
 * confirms (except inside a <select>), Esc cancels.
 *
 * NOTE: this project's index.css is a frozen, pre-generated Tailwind v4
 * snapshot with no live build step, so any Tailwind class not already
 * compiled into that file (most arbitrary values, .5-step spacing, opacity
 * modifiers, space-y-*) silently does nothing. Layout/spacing/sizing here is
 * therefore done with inline styles rather than Tailwind utilities, which is
 * the only reliable way to guarantee it actually renders.
 */
export function PaymentModalShell({
  open,
  onClose,
  onConfirm,
  icon,
  title,
  subtitle,
  accentColor,
  amountLabel,
  amount,
  onAmountChange,
  quickAmounts,
  fields,
  footer,
  error,
  confirmLabel,
  confirmDisabled,
}: PaymentModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  const appendDigit = (digit: string) => {
    if (digit === ".") {
      if (amount.includes(".")) return;
      onAmountChange(amount === "" ? "0." : `${amount}.`);
      return;
    }
    if (amount === "0") {
      onAmountChange(digit);
      return;
    }
    onAmountChange(`${amount}${digit}`);
  };

  const backspace = () => onAmountChange(amount.slice(0, -1));
  const clearAmount = () => onAmountChange("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isTypingTarget(e.target) && (e.target as HTMLElement).tagName === "SELECT") {
      return;
    }
    if (isTypingTarget(e.target)) return;

    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!confirmDisabled) onConfirm();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      backspace();
      return;
    }
    if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      clearAmount();
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      appendDigit(e.key);
      return;
    }
    if (e.key === ".") {
      e.preventDefault();
      appendDigit(".");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="p-0 gap-0 overflow-hidden [&>button]:hidden"
        style={{
          width: "calc(100% - 2rem)",
          maxWidth: 440,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: accentColor,
            color: "#fff",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.2)",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{subtitle}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: "22px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Cash received / amount section */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: `2px solid ${accentColor}55`,
                borderRadius: 12,
                padding: "0 18px",
                height: 62,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: "#6b7280", textTransform: "uppercase" }}>
                {amountLabel}
              </span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: accentColor,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  lineHeight: 1,
                }}
              >
                <CurrencyValue amount={parseFloat(amount) || 0} />
              </span>
            </div>
          </div>

          {/* Quick amount chips */}
          {quickAmounts && quickAmounts.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {quickAmounts.map((chip, i) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={chip.onClick}
                  style={{
                    height: 39,
                    flexShrink: 0,
                    borderRadius: 8,
                    border: `2px solid ${accentColor}55`,
                    padding: i === 0 ? "0 16px" : "0 13px",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: accentColor,
                    background: "#fff",
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Numeric keypad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {KEYPAD_ROWS.flat().map((key) => {
              const isBackspace = key === "⌫";
              return (
                <button
                  key={key}
                  type="button"
                  tabIndex={-1}
                  onClick={() => (isBackspace ? backspace() : appendDigit(key))}
                  style={{
                    height: 46,
                    minHeight: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: isBackspace ? "#fef2f2" : "#f3f4f6",
                    fontSize: 19,
                    fontWeight: 600,
                    color: isBackspace ? "#dc2626" : "#111827",
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isBackspace ? "#fee2e2" : "#e5e7eb")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isBackspace ? "#fef2f2" : "#f3f4f6")}
                >
                  {isBackspace ? <DeleteIcon size={19} /> : key}
                </button>
              );
            })}
          </div>

          {fields}

          {/* Summary */}
          {footer}

          {error && (
            <div
              style={{
                fontSize: 13.5,
                color: "#dc2626",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              {error}
            </div>
          )}

          {/* Keyboard hint */}
          <p style={{ fontSize: 11.5, color: "#9ca3af", textAlign: "center", margin: "4px 0 0" }}>
            Type to enter the amount · Enter to confirm · Esc to cancel
          </p>
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "14px 24px",
            borderTop: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          <Button type="button" variant="outline" style={{ flex: 1, height: 44 }} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            style={{ flex: 1, height: 44, color: "#fff", backgroundColor: accentColor }}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
