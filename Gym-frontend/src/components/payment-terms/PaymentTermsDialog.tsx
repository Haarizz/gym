import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, FileCheck2, Printer, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { useBranch } from "../../utils/branch-context";
import { CurrencyValue } from "../../utils/currency";
import { getCompanyDetails } from "../../utils/company-details";
import {
  paymentTermsService, paymentTermsKindLabel,
  type PaymentTerms, type PaymentTermsKind,
} from "../../utils/supabase/payment-terms-service";
import { TermsText, printTerms } from "./TermsText";
import s from "./payment-terms.module.css";

/** Who / what the payment is for — shown in the dialog and kept with the acceptance. */
export interface PaymentTermsContext {
  memberDbId?: number | string | null;
  memberName?: string | null;
  amount?: number | null;
  /** e.g. the plan name: "3 Months Gold". */
  detail?: string | null;
}

type Ask = { kind: PaymentTermsKind; ctx: PaymentTermsContext; resolve: (ok: boolean) => void };

let openDialog: ((ask: Ask) => void) | null = null;

// Active terms per branch + kind, so a payment doesn't wait on the network every time.
// Settings › Payment Terms clears it on save.
const cache = new Map<string, { at: number; terms: PaymentTerms[] }>();
const CACHE_MS = 60_000;

export function invalidatePaymentTermsCache() {
  cache.clear();
}

async function activeTerms(kind: PaymentTermsKind, branchId: number | null): Promise<PaymentTerms[]> {
  const key = `${branchId ?? "default"}:${kind}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.terms;
  const terms = await paymentTermsService.active(kind, branchId);
  cache.set(key, { at: Date.now(), terms });
  return terms;
}

/**
 * Shows the switched-on terms for this kind of payment and waits for the member to
 * accept them. Resolves true straight away when nothing is switched on (or the terms
 * can't be loaded — a settings problem never blocks the desk), false when cancelled.
 *
 *   if (!(await askPaymentTerms("renewal", { memberDbId, memberName, amount }))) return;
 *
 * The POS never calls this.
 */
export function askPaymentTerms(kind: PaymentTermsKind, ctx: PaymentTermsContext = {}): Promise<boolean> {
  if (!openDialog) return Promise.resolve(true);
  const open = openDialog;
  return new Promise<boolean>((resolve) => open({ kind, ctx, resolve }));
}

const initials = (name?: string | null) =>
  (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "M";

/** One terms set: scrollable wording (faded until read to the end) and its agree row. */
function TermCard({ index, terms, on, who, onToggle }: {
  index: number; terms: PaymentTerms; on: boolean; who: string; onToggle: (on: boolean) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(true);
  const check = () => {
    const el = bodyRef.current;
    if (el) setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 6);
  };
  useEffect(() => { check(); }, [terms.content]);

  return (
    <section className={s.termCard} data-on={on}>
      <div className={s.termHead}>
        <span className={s.termNo}>{on ? <Check /> : index + 1}</span>
        <span className={s.termTitle}>{terms.title}</span>
        <span className={s.termState} data-on={on}>{on ? "Agreed" : "To agree"}</span>
      </div>
      <div className={s.termBodyWrap} data-end={atEnd}>
        <div ref={bodyRef} className={s.termBody} tabIndex={0} onScroll={check}>
          <TermsText text={terms.content} compact />
        </div>
        {!atEnd && (
          <button
            type="button"
            className={s.moreHint}
            onClick={() => bodyRef.current?.scrollBy({ top: 160, behavior: "smooth" })}
          >
            <ChevronDown /> Scroll for more
          </button>
        )}
      </div>
      <label className={s.agree} data-on={on}>
        <Checkbox checked={on} onCheckedChange={(v) => onToggle(!!v)} />
        <span>
          <strong>{who}</strong> has read and agrees to the <strong>{terms.title}</strong>
        </span>
      </label>
    </section>
  );
}

/** Mounted once in the app shell; renders the terms dialog when a payment asks for it. */
export function PaymentTermsHost() {
  const { activeBranchId, accessibleBranches } = useBranch();
  const defaultBranchId = (accessibleBranches.find((b) => b.isDefault) ?? accessibleBranches[0])?.id ?? null;
  const branchRef = useRef<number | null>(null);
  branchRef.current = activeBranchId ?? defaultBranchId ?? null;

  const [ask, setAsk] = useState<Ask | null>(null);
  const [terms, setTerms] = useState<PaymentTerms[]>([]);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const queue = useRef<Ask[]>([]);
  const busy = useRef(false);
  const nextRef = useRef<() => void>(() => {});

  useEffect(() => {
    const next = async () => {
      if (busy.current) return;
      const item = queue.current.shift();
      if (!item) return;
      busy.current = true;
      let list: PaymentTerms[] = [];
      try {
        list = await activeTerms(item.kind, branchRef.current);
      } catch (e) {
        console.warn("Payment terms could not be loaded — continuing without them", e);
      }
      if (list.length === 0) {
        busy.current = false;
        item.resolve(true);
        void next();
        return;
      }
      setTerms(list);
      setTicked(new Set());
      setAsk(item);
    };
    openDialog = (item) => {
      queue.current.push(item);
      void next();
    };
    nextRef.current = () => { void next(); };
    return () => { openDialog = null; };
  }, []);

  const finish = (ok: boolean) => {
    const current = ask;
    setAsk(null);
    setSaving(false);
    busy.current = false;
    current?.resolve(ok);
    setTimeout(() => nextRef.current(), 0);
  };

  const accept = async () => {
    if (!ask) return;
    setSaving(true);
    const memberDbId = Number(ask.ctx.memberDbId);
    try {
      await paymentTermsService.accept({
        kind: ask.kind,
        branch_id: branchRef.current,
        member_db_id: Number.isFinite(memberDbId) && memberDbId > 0 ? memberDbId : null,
        member_name: ask.ctx.memberName ?? null,
        amount: ask.ctx.amount ?? null,
        terms_ids: terms.map((t) => t.id),
      });
    } catch (e) {
      // The member did agree — don't hold up the payment because the log couldn't be written.
      console.error("Failed to record the terms acceptance", e);
      toast.warning("Terms accepted, but the acceptance couldn't be saved to the log.");
    }
    finish(true);
  };

  const cancel = () => {
    if (saving) return;
    toast.info("Payment not taken — the terms & conditions weren't accepted.");
    finish(false);
  };

  const agreedCount = terms.filter((t) => ticked.has(t.id)).length;
  const allTicked = terms.length > 0 && agreedCount === terms.length;
  const memberName = ask?.ctx.memberName?.trim() || "";
  const who = memberName || "The member";
  const kindLabel = ask ? paymentTermsKindLabel(ask.kind) : "";

  const toggle = (id: number, on: boolean) => setTicked((prev) => {
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });

  const print = async () => {
    if (!ask) return;
    let companyName: string | undefined;
    try { companyName = (await getCompanyDetails(branchRef.current)).name || undefined; } catch { /* optional */ }
    const ok = printTerms({
      heading: "Terms & Conditions",
      sub: [kindLabel, ask.ctx.detail, ask.ctx.memberName].filter(Boolean).join(" · "),
      companyName,
      terms,
      signatureFor: ask.ctx.memberName,
    });
    if (!ok) toast.error("Allow pop-ups to print the terms.");
  };

  return (
    <Dialog open={ask != null} onOpenChange={(open) => { if (!open) cancel(); }}>
      <DialogContent className={s.dialog} onInteractOutside={(e) => e.preventDefault()}>
        <div className={s.hero}>
          <div className={s.head}>
            <span className={s.headIcon}><ShieldCheck /></span>
            <div className={s.headText}>
              <DialogTitle className={s.heroTitle}>Terms &amp; Conditions</DialogTitle>
              <DialogDescription className={s.heroSub}>
                Go through {terms.length === 1 ? "these terms" : `these ${terms.length} sets of terms`} with {memberName || "the member"} before taking the payment.
              </DialogDescription>
            </div>
          </div>

          {ask && (
            <div className={s.summary}>
              <span className={s.avatar}>{initials(memberName)}</span>
              <span className={s.summaryMain}>
                <span className={s.summaryName}>{memberName || "Member"}</span>
                <span className={s.summaryMeta}>
                  <span className={s.kindChip}>{kindLabel}</span>
                  {ask.ctx.detail && <span className={s.summaryDetail}>{ask.ctx.detail}</span>}
                </span>
              </span>
              {ask.ctx.amount != null && ask.ctx.amount > 0 && (
                <span className={s.summaryAmount}>
                  <span className={s.summaryAmountLabel}>Amount</span>
                  <span className={s.summaryAmountValue}>
                    <CurrencyValue amount={ask.ctx.amount} options={{ maximumFractionDigits: 2 }} />
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className={s.list}>
          {terms.map((t, i) => (
            <TermCard key={t.id} index={i} terms={t} on={ticked.has(t.id)} who={who} onToggle={(on) => toggle(t.id, on)} />
          ))}
        </div>

        <div className={s.footer}>
          <div className={s.footerLeft}>
            <span className={s.progress} data-done={allTicked}>
              {allTicked ? <Check /> : null}
              {agreedCount} of {terms.length} agreed
            </span>
            {terms.length > 1 && !allTicked && (
              <button type="button" className={s.linkBtn} onClick={() => setTicked(new Set(terms.map((t) => t.id)))}>
                Tick all
              </button>
            )}
          </div>
          <div className={s.footerRight}>
            <Button variant="ghost" onClick={print} disabled={saving} className={s.printBtn}>
              <Printer /> Print copy
            </Button>
            <Button variant="outline" onClick={cancel} disabled={saving}>Cancel</Button>
            <Button onClick={accept} disabled={!allTicked || saving} className={s.acceptBtn}>
              <FileCheck2 /> {saving ? "Saving…" : "Accept & continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
