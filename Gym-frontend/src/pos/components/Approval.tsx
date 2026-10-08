import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ShieldCheck, Delete } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { isApprovalRequired } from "../api";
import s from "../pos.module.css";

/**
 * Supervisor approval (BillBull's SupervisorPin flow). An action is attempted as-is;
 * if the server answers SUPERVISOR_APPROVAL_REQUIRED, the cashier is asked for the
 * branch supervisor PIN and the same action is retried with it. Supervisors
 * (POINT_OF_SALE_EDIT) are never prompted because the server approves them directly.
 */
type Runner = <T>(action: (pin: string | null) => Promise<T>) => Promise<T | null>;

const ApprovalContext = createContext<{ withApproval: Runner; askPin: (reason: string) => Promise<string | null> } | null>(null);

export function useApproval() {
  const ctx = useContext(ApprovalContext);
  if (!ctx) throw new Error("useApproval must be used inside <ApprovalProvider>");
  return ctx;
}

export function ApprovalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const resolver = useRef<((pin: string | null) => void) | null>(null);

  const askPin = useCallback((why: string) => new Promise<string | null>((resolve) => {
    resolver.current = resolve;
    setReason(why);
    setPin("");
    setOpen(true);
  }), []);

  const finish = (value: string | null) => {
    setOpen(false);
    const r = resolver.current;
    resolver.current = null;
    r?.(value);
  };

  const withApproval: Runner = useCallback(async (action) => {
    let pinToUse: string | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await action(pinToUse);
      } catch (e) {
        if (!isApprovalRequired(e)) throw e;
        pinToUse = await askPin((e as Error).message);
        if (pinToUse === null) return null; // cancelled
      }
    }
    return null;
  }, [askPin]);

  const press = (k: string) => setPin((p) => (k === "back" ? p.slice(0, -1) : p.length < 8 ? p + k : p));

  // Typed PIN entry. Captured at window level so it works wherever focus sits in the dialog,
  // and stopped there so the terminal's barcode-wedge listener never sees the digits.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Enter") { if (pin.length >= 4) finish(pin); }
      else if (e.key === "Escape") finish(null);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, pin]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ApprovalContext.Provider value={{ withApproval, askPin }}>
      {children}
      <Dialog open={open} onOpenChange={(o) => { if (!o) finish(null); }}>
        <DialogContent style={{ maxWidth: 380 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#2B7A78]" /> Supervisor approval</DialogTitle>
            <DialogDescription>{reason || "Enter the supervisor PIN to continue."}</DialogDescription>
          </DialogHeader>
          <div className={s.pinDots} style={{ margin: "6px 0" }}>
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <span key={i} className={s.pinDot} style={{ borderColor: "#2B7A78", background: i < pin.length ? "#2B7A78" : "transparent" }} />
            ))}
          </div>
          <div className={s.keypadLight}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
              <button key={k} type="button" className={s.keyLight} onClick={() => press(k)}>{k}</button>
            ))}
            <button type="button" className={s.keyLight} onClick={() => setPin("")}>C</button>
            <button type="button" className={s.keyLight} onClick={() => press("0")}>0</button>
            <button type="button" className={s.keyLight} onClick={() => press("back")} aria-label="Delete"><Delete className="h-5 w-5" style={{ margin: "0 auto" }} /></button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => finish(null)}>Cancel</Button>
            <Button className="bg-[#2B7A78] hover:bg-[#236862] text-white" disabled={pin.length < 4} onClick={() => finish(pin)}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ApprovalContext.Provider>
  );
}
