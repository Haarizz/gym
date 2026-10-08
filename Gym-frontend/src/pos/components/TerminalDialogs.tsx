import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CreditCard, LayoutGrid, Monitor, Search, ShoppingCart, Ticket, User, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { membersService } from "../../utils/supabase/members-service";
import { posApi } from "../api";
import { usePos } from "../PosContext";
import { Money, withPosCredit, type PickedMember } from "./Shared";
import { fmtDate, promoDiscountOf, type PromoRule } from "../pricing";
import type { CustomerCredit, DiscountRule, PosSettings } from "../types";
import s from "../pos.module.css";

const primaryBtn = "bg-[#2B7A78] hover:bg-[#236862] text-white";

const toPicked = (m: { id: string | number; name: string; member_id?: string | null; phone?: string | null; outstanding_balance?: number | string | null }): PickedMember => ({
  id: Number(m.id),
  name: m.name,
  memberCode: m.member_id ?? null,
  phone: m.phone ?? null,
  outstandingBalance: Number(m.outstanding_balance) || 0,
});

/** Members matching a term; the first page of members when the term is empty (BillBull lists customers on open). */
export async function searchMembers(term: string, limit = 20): Promise<PickedMember[]> {
  const res = await membersService.getMembers(term.trim() ? { search: term.trim() } : {}, { limit });
  return withPosCredit((res.members || []).map(toPicked));
}

/** Exact member match for a scanned/typed code: member ID or phone number. */
export async function findMemberByCode(code: string): Promise<PickedMember | null> {
  const value = code.trim();
  if (value.length < 3) return null;
  const digits = value.replace(/\D/g, "");
  const found = await searchMembers(value, 10).catch(() => []);
  return found.find((m) =>
    (m.memberCode && m.memberCode.toLowerCase() === value.toLowerCase())
    || (digits.length >= 6 && m.phone && m.phone.replace(/\D/g, "").endsWith(digits)),
  ) ?? null;
}

// ── Customer dropdown (under the customer bar) ─────────────────────────────

export function CustomerDropdown({ selectedId, onPick, onClose }: {
  selectedId: number | null;
  onPick: (m: PickedMember | null) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PickedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    const t = setTimeout(() => {
      searchMembers(q)
        .then((r) => { if (live) { setRows(r); setError(null); } })
        .catch((e) => { if (live) { setRows([]); setError((e as Error).message); } })
        .finally(() => { if (live) setLoading(false); });
    }, q ? 250 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  // Click outside closes, like BillBull's dropdown.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const bar = boxRef.current?.parentElement;
      if (bar && !bar.contains(e.target as Node)) onClose();
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [onClose]);

  return (
    <div className={s.bbCustDrop} ref={boxRef}>
      <div className={s.bbCustSearch}>
        <Search size={13} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Name, Member ID, Mobile…"
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && rows[0]) onPick(rows[0]);
          }} />
      </div>
      <div className={s.bbCustList}>
        <button type="button" className={`${s.bbCustRow} ${selectedId === null ? s.bbCustRowOn : ""}`} onClick={() => onPick(null)}>
          <span className={s.bbCustDot}><User size={12} /></span>
          <span style={{ minWidth: 0 }}><span className={s.bbCustRowName}>Walk-in Customer</span><span className={s.bbCustRowSub}>No member</span></span>
        </button>
        {loading && <div className={s.bbCustHint}>Loading customers…</div>}
        {!loading && rows.map((m) => (
          <button key={m.id} type="button" className={`${s.bbCustRow} ${selectedId === m.id ? s.bbCustRowOn : ""}`} onClick={() => onPick(m)}>
            <span className={s.bbCustDot}>{m.name.charAt(0).toUpperCase()}</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className={s.bbCustRowName}>{m.name}</span>
              <span className={s.bbCustRowSub}>{[m.memberCode, m.phone].filter(Boolean).join(" · ") || "Member"}</span>
            </span>
            {m.outstandingBalance > 0 && (
              <span className={s.bbCustDue} title={m.posCredit ? `POS credit ${m.posCredit.toFixed(2)}${m.outstandingBalance > m.posCredit ? ` + membership dues ${(m.outstandingBalance - m.posCredit).toFixed(2)}` : ""}` : "Membership dues"}>
                Due <Money value={m.outstandingBalance} />
              </span>
            )}
          </button>
        ))}
        {!loading && rows.length === 0 && <div className={s.bbCustHint}>{error || "No customers found"}</div>}
      </div>
    </div>
  );
}

// ── Credit balance lookup ──────────────────────────────────────────────────

export function CreditBalanceDialog({ open, onOpenChange, initialMember, onUseMember, onOpenCustomers }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialMember: PickedMember | null;
  onUseMember: (m: PickedMember) => void;
  onOpenCustomers: () => void;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PickedMember[]>([]);
  const [picked, setPicked] = useState<PickedMember | null>(null);
  const [credit, setCredit] = useState<CustomerCredit | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setRows([]);
    setCredit(null);
    setPicked(initialMember);
  }, [open, initialMember]);

  useEffect(() => {
    if (!open || !q.trim()) { setRows([]); return; }
    const t = setTimeout(() => searchMembers(q, 10).then(setRows).catch(() => setRows([])), 250);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    if (!picked) { setCredit(null); return; }
    setLoading(true);
    posApi.memberCredit(picked.id).then(setCredit).catch((e) => { toast.error((e as Error).message); setCredit(null); }).finally(() => setLoading(false));
  }, [picked]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 520 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-[#2B7A78]" />Credit Balance</DialogTitle>
          <DialogDescription>Look up a member's outstanding on-account balance.</DialogDescription>
        </DialogHeader>
        <div className={s.bbSearch} style={{ height: 40 }}>
          <Search size={14} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Member name, ID or mobile…" />
        </div>
        {rows.length > 0 && (
          <div className={s.bbCustList} style={{ border: "1px solid #E2E8F0", borderRadius: 10, maxHeight: 180 }}>
            {rows.map((m) => (
              <button key={m.id} type="button" className={s.bbCustRow} onClick={() => { setPicked(m); setRows([]); setQ(""); }}>
                <span className={s.bbCustDot}>{m.name.charAt(0).toUpperCase()}</span>
                <span style={{ minWidth: 0, flex: 1 }}><span className={s.bbCustRowName}>{m.name}</span><span className={s.bbCustRowSub}>{[m.memberCode, m.phone].filter(Boolean).join(" · ")}</span></span>
              </button>
            ))}
          </div>
        )}
        {picked && (
          <div className={s.stack} style={{ gap: 10 }}>
            <div className={s.bbCreditHead}>
              <span className={s.bbCustDot} style={{ width: 34, height: 34 }}>{picked.name.charAt(0).toUpperCase()}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className={s.strong}>{picked.name}</div>
                <div className={`${s.small} ${s.muted}`}>{[picked.memberCode, picked.phone].filter(Boolean).join(" · ") || "Member"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className={`${s.small} ${s.muted}`}>Outstanding</div>
                <div className={s.bbCreditAmt}>{loading ? "…" : <Money value={credit?.outstanding ?? 0} />}</div>
              </div>
            </div>
            {credit && credit.membershipOutstanding > 0 && (
              <div className={`${s.callout} ${s.calloutWarn}`}>Membership fees outstanding: <b style={{ marginLeft: 4 }}><Money value={credit.membershipOutstanding} /></b></div>
            )}
            {credit && credit.openSales.length > 0 && (
              <div className={s.bbCustList} style={{ border: "1px solid #E2E8F0", borderRadius: 10, maxHeight: 200 }}>
                {credit.openSales.map((o) => (
                  <div key={o.transactionId} className={s.bbCustRow} style={{ cursor: "default" }}>
                    <span style={{ minWidth: 0, flex: 1 }}><span className={s.bbCustRowName}>{o.transactionNumber}</span><span className={s.bbCustRowSub}>{fmtDate(o.createdAt)} · sale <Money value={o.totalAmount} /></span></span>
                    <b style={{ color: "#B45309" }}><Money value={o.outstanding} /></b>
                  </div>
                ))}
              </div>
            )}
            {credit && credit.openSales.length === 0 && !loading && <div className={`${s.callout} ${s.calloutOk}`}>No open POS credit for this member.</div>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {picked && <Button variant="outline" onClick={() => { onOpenChange(false); onOpenCustomers(); }}>Receive payment</Button>}
          {picked && <Button className={primaryBtn} onClick={() => { onUseMember(picked); onOpenChange(false); }}>Use for this sale</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Terminal display configuration (BillBull "Configure") ──────────────────

export type TerminalTemplate = "classic" | "compact" | "focus";
export interface TerminalDisplay {
  template: TerminalTemplate;
  hideCategories: boolean;
  hideItems: boolean;
  hiddenButtons: string[];
}

const DISPLAY_KEY = "gymbios.pos.display";

export function branchDisplay(settings: PosSettings): TerminalDisplay {
  return { template: settings.layout, hideCategories: settings.hideCategoryPanel, hideItems: false, hiddenButtons: [] };
}

/** This terminal's display override (browser-local), or null to follow the branch default. */
export function loadDisplay(): TerminalDisplay | null {
  try {
    const raw = localStorage.getItem(DISPLAY_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<TerminalDisplay>;
    if (d.template !== "classic" && d.template !== "compact" && d.template !== "focus") return null;
    return { template: d.template, hideCategories: Boolean(d.hideCategories), hideItems: Boolean(d.hideItems), hiddenButtons: Array.isArray(d.hiddenButtons) ? d.hiddenButtons : [] };
  } catch {
    return null;
  }
}

function saveDisplay(d: TerminalDisplay | null) {
  try {
    if (d) localStorage.setItem(DISPLAY_KEY, JSON.stringify(d));
    else localStorage.removeItem(DISPLAY_KEY);
  } catch { /* storage blocked — the change still applies for this visit */ }
}

const TEMPLATES: { id: TerminalTemplate; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "classic", label: "Classic", desc: "Categories + Products + Cart", icon: <LayoutGrid size={18} /> },
  { id: "compact", label: "Compact", desc: "Trade POS: search, quick pick list + invoice", icon: <Monitor size={18} /> },
  { id: "focus", label: "Cart Focus", desc: "Cart + Keypad + Functions", icon: <ShoppingCart size={18} /> },
];

export function TerminalConfigDialog({ open, onOpenChange, value, buttons, onApply }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: TerminalDisplay;
  buttons: { id: string; label: string }[];
  onApply: (d: TerminalDisplay) => void;
}) {
  const { settings, setSettings, go } = usePos();
  const [draft, setDraft] = useState<TerminalDisplay>(value);
  const [asDefault, setAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setDraft(value); setAsDefault(false); } }, [open, value]);

  const pickTemplate = (t: TerminalTemplate) => setDraft((d) => ({
    ...d,
    template: t,
    hideCategories: t === "compact" ? true : t === "classic" ? false : d.hideCategories,
    hideItems: t === "focus" ? false : d.hideItems,
  }));
  const toggleButton = (id: string) => setDraft((d) => ({
    ...d,
    hiddenButtons: d.hiddenButtons.includes(id) ? d.hiddenButtons.filter((x) => x !== id) : [...d.hiddenButtons, id],
  }));

  const apply = async () => {
    setSaving(true);
    try {
      if (asDefault) {
        const updated = await posApi.updateSettings({ layout: draft.template, hideCategoryPanel: draft.hideCategories });
        setSettings(updated);
        toast.success("Saved as this branch's default layout");
      }
      saveDisplay(draft);
      onApply(draft);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    saveDisplay(null);
    onApply(branchDisplay(settings));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 620, maxHeight: "92vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle>POS Configuration</DialogTitle>
          <DialogDescription>Customize your POS layout &amp; appearance on this terminal.</DialogDescription>
        </DialogHeader>

        <div className={s.stack}>
          <div>
            <div className={s.cfgTitle}>Screen Template</div>
            <div className={s.cfgTemplates}>
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" className={`${s.cfgTemplate} ${draft.template === t.id ? s.cfgTemplateOn : ""}`} onClick={() => pickTemplate(t.id)}>
                  <span className={s.cfgTemplateIcon}>{t.icon}</span>
                  <span className={s.strong}>{t.label}</span>
                  <span className={`${s.small} ${s.muted}`}>{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {draft.template !== "focus" && (
            <div>
              <div className={s.cfgTitle}>Panel Visibility</div>
              <label className={s.cfgToggle}>
                <span><span className={s.strong}>Categories Bar</span><span className={`${s.small} ${s.muted}`} style={{ display: "block" }}>Left category navigation</span></span>
                <input type="checkbox" checked={!draft.hideCategories} onChange={(e) => setDraft((d) => ({ ...d, hideCategories: !e.target.checked }))} />
              </label>
              <label className={s.cfgToggle}>
                <span><span className={s.strong}>Items Panel</span><span className={`${s.small} ${s.muted}`} style={{ display: "block" }}>Product grid with search</span></span>
                <input type="checkbox" checked={!draft.hideItems} onChange={(e) => setDraft((d) => ({ ...d, hideItems: !e.target.checked }))} />
              </label>
            </div>
          )}

          <div>
            <div className={s.cfgTitle}>Right Panel Buttons</div>
            <div className={s.cfgButtons}>
              {buttons.map((b) => (
                <label key={b.id} className={`${s.cfgButton} ${draft.hiddenButtons.includes(b.id) ? "" : s.cfgButtonOn}`}>
                  <input type="checkbox" checked={!draft.hiddenButtons.includes(b.id)} onChange={() => toggleButton(b.id)} />
                  {b.label}
                </label>
              ))}
            </div>
          </div>

          {settings.currentUserIsSupervisor && (
            <label className={s.cfgToggle} style={{ borderBottom: 0 }}>
              <span><span className={s.strong}>Also save as the branch default</span><span className={`${s.small} ${s.muted}`} style={{ display: "block" }}>Template and categories bar for every terminal without its own setting.</span></span>
              <input type="checkbox" checked={asDefault} onChange={(e) => setAsDefault(e.target.checked)} />
            </label>
          )}
        </div>

        <DialogFooter>
          {settings.currentUserIsSupervisor && <Button variant="outline" style={{ marginRight: "auto" }} onClick={() => { onOpenChange(false); go("console"); }}>POS Console</Button>}
          <Button variant="outline" onClick={reset}>Use branch default</Button>
          <Button className={primaryBtn} disabled={saving} onClick={apply}>{saving ? "Saving…" : "Apply"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Coupons & promotions (Gymbios promotion engine at the till) ────────────

/** The rule the till prices with, from what the server returned. */
export function toPromoRule(r: DiscountRule): PromoRule {
  return {
    source: r.source,
    code: r.code,
    promotionId: r.promotionId,
    name: r.name,
    discountType: r.discountType,
    discountValue: Number(r.discountValue) || 0,
    maximumDiscount: r.maximumDiscount != null ? Number(r.maximumDiscount) : null,
    minimumPurchase: r.minimumPurchase != null ? Number(r.minimumPurchase) : null,
  };
}

const ruleSummary = (r: { discountType: string; discountValue: number | null; maximumDiscount: number | null; minimumPurchase: number | null }) => {
  const type = (r.discountType || "percentage").toLowerCase();
  const v = Number(r.discountValue) || 0;
  const main = type === "percentage" ? `${v}% off` : type === "free" ? "Free" : `${v.toFixed(2)} off`;
  const extras = [
    r.maximumDiscount ? `max ${Number(r.maximumDiscount).toFixed(2)}` : null,
    r.minimumPurchase ? `min spend ${Number(r.minimumPurchase).toFixed(2)}` : null,
  ].filter(Boolean);
  return extras.length ? `${main} · ${extras.join(" · ")}` : main;
};

/** Enter a promotion or referral-coupon code; validated against the current basket before it is applied. */
export function CouponDialog({ open, onOpenChange, base, current, onApply, onRemove }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Basket after the cashier's bill discount — what the code applies to. */
  base: number;
  current: PromoRule | null;
  onApply: (rule: PromoRule) => void;
  onRemove: () => void;
}) {
  const [code, setCode] = useState("");
  const [found, setFound] = useState<DiscountRule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setCode(""); setFound(null); setError(null); } }, [open]);

  const check = async () => {
    const c = code.trim();
    if (!c) return;
    setBusy(true);
    setError(null);
    setFound(null);
    try {
      setFound(await posApi.lookupCode(c, base));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const preview = found ? promoDiscountOf(toPromoRule(found), base) : null;
  const canApply = !!found && !!preview && !preview.error && preview.amount > 0;
  const apply = () => { if (found && canApply) { onApply(toPromoRule(found)); onOpenChange(false); } };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 460 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Ticket className="h-5 w-5 text-[#2B7A78]" />Coupons</DialogTitle>
          <DialogDescription>Enter a promotion code or a member referral coupon.</DialogDescription>
        </DialogHeader>
        {current && (
          <div className={`${s.callout} ${s.calloutOk}`} style={{ alignItems: "center" }}>
            <div style={{ flex: 1 }}><b>{current.name}</b>{current.code ? ` · ${current.code}` : ""} is applied to this sale.</div>
            <Button size="sm" variant="outline" onClick={() => { onRemove(); onOpenChange(false); }}>Remove</Button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <div className={s.bbSearch} style={{ height: 40, flex: 1 }}>
            <Ticket size={14} />
            <input autoFocus value={code} placeholder="e.g. SUMMER10" onChange={(e) => { setCode(e.target.value.toUpperCase()); setFound(null); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (canApply) apply(); else check(); } }} />
          </div>
          <Button variant="outline" disabled={busy || !code.trim()} onClick={check}>{busy ? "Checking…" : "Check"}</Button>
        </div>
        {error && <div className={`${s.callout} ${s.calloutBad}`}>{error}</div>}
        {found && preview && (
          <div className={s.bbCreditHead} style={{ alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={s.strong}>{found.name}</div>
              <div className={`${s.small} ${s.muted}`}>{found.source === "COUPON" ? "Referral coupon" : "Promotion"} · {ruleSummary(found)}</div>
              {preview.error && <div className={s.small} style={{ color: "#B45309", marginTop: 4 }}>{preview.error}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={`${s.small} ${s.muted}`}>Saves</div>
              <div className={s.bbCreditAmt} style={{ color: "#047857" }}><Money value={preview.amount} /></div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button className={primaryBtn} disabled={!canApply} onClick={apply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Active promotions the cashier can apply to the sale (Gymbios promotions with a price discount). */
export function PromotionsDialog({ open, onOpenChange, base, current, onApply, onRemove }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  base: number;
  current: PromoRule | null;
  onApply: (rule: PromoRule) => void;
  onRemove: () => void;
}) {
  const [rows, setRows] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    posApi.promotions().then(setRows).catch((e) => { toast.error((e as Error).message); setRows([]); }).finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 560, maxHeight: "88vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-[#2B7A78]" />Promotions</DialogTitle>
          <DialogDescription>Active promotions that give money off. One promotion or coupon per sale.</DialogDescription>
        </DialogHeader>
        {loading && <div className={`${s.small} ${s.muted}`}>Loading promotions…</div>}
        {!loading && rows.length === 0 && (
          <div className={s.bbEmpty} style={{ minHeight: 120 }}><Zap size={26} /><small>No active promotions. Create one under Marketing › Promotions.</small></div>
        )}
        <div className={s.stack} style={{ gap: 8 }}>
          {rows.map((r) => {
            const rule = toPromoRule(r);
            const p = promoDiscountOf(rule, base);
            const applied = current?.promotionId != null && current.promotionId === r.promotionId;
            return (
              <div key={r.promotionId ?? r.code ?? r.name} className={s.bbHistRow} style={{ cursor: "default", background: applied ? "rgba(43,122,120,0.08)" : undefined }}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className={s.bbRowName}>{r.name}{r.code ? <span className={s.bbRowCode} style={{ display: "inline", marginLeft: 6 }}>{r.code}</span> : null}</span>
                  <span className={s.bbRowCode}>{ruleSummary(r)}</span>
                  {p.error && <span className={s.small} style={{ color: "#B45309", display: "block" }}>{p.error}</span>}
                </span>
                <span className={s.bbHistRight}>
                  <span className={s.bbHistAmt}>−<Money value={p.amount} /></span>
                  {applied
                    ? <Button size="sm" variant="outline" onClick={() => { onRemove(); onOpenChange(false); }}>Remove</Button>
                    : <Button size="sm" className={primaryBtn} disabled={!!p.error || p.amount <= 0} onClick={() => { onApply(rule); onOpenChange(false); }}>Apply</Button>}
                </span>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
