import React, { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Search, X, UserRound } from "lucide-react";
import { CurrencyValue } from "../../utils/currency";
import { membersService } from "../../utils/supabase/members-service";
import { posApi } from "../api";
import { denomKey, denominationTotal, type Denominations } from "../pricing";
import type { ReportSection } from "../print/receiptModel";
import s from "../pos.module.css";

export function Money({ value, className }: { value: number | null | undefined; className?: string }) {
  return <CurrencyValue amount={Number(value) || 0} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} className={className} />;
}

export function Pill({ tone, children, dot }: { tone: "green" | "amber" | "red" | "gray" | "blue" | "purple"; children: React.ReactNode; dot?: boolean }) {
  const cls = { green: s.pillGreen, amber: s.pillAmber, red: s.pillRed, gray: s.pillGray, blue: s.pillBlue, purple: s.pillPurple }[tone];
  return <span className={`${s.pill} ${cls}`}>{dot && <span className={s.pillDot} />}{children}</span>;
}

/** Note/coin counter used for opening floats and closing cash counts. */
export function DenominationCounter({ values, counts, onChange, currency }: {
  values: number[];
  counts: Denominations;
  onChange: (next: Denominations) => void;
  currency: string;
}) {
  const set = (k: string, n: number) => onChange({ ...counts, [k]: Math.max(0, Math.floor(n || 0)) });
  return (
    <div className={s.stack}>
      <div className={s.denoms}>
        {values.map((v) => {
          const k = denomKey(v);
          const c = counts[k] ?? 0;
          return (
            <div key={k} className={s.denom}>
              <div className={s.denomHead}>
                <span className={s.denomValue}>{currency} {v >= 1 ? v.toLocaleString() : v.toFixed(2)}</span>
                <span className={s.mono}>{(v * c).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className={s.denomCtrl}>
                <button type="button" className={s.stepBtn} onClick={() => set(k, c - 1)} aria-label={`Fewer ${v}`}><Minus size={14} /></button>
                <input inputMode="numeric" value={c || ""} placeholder="0" onChange={(e) => set(k, parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)} onFocus={(e) => e.target.select()} />
                <button type="button" className={s.stepBtn} onClick={() => set(k, c + 1)} aria-label={`More ${v}`}><Plus size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <div className={s.totalBar}>
        <span>Counted total</span>
        <span className={s.totalBarBig}><Money value={denominationTotal(counts)} /></span>
      </div>
    </div>
  );
}

export interface PickedMember {
  id: number;
  name: string;
  memberCode: string | null;
  phone: string | null;
  /** Total owed: membership dues plus unpaid POS credit sales. */
  outstandingBalance: number;
  /** The POS credit part of outstandingBalance. */
  posCredit?: number;
}

/**
 * Adds each member's unpaid POS credit to the dues the members API reports — that one only knows
 * membership fees, so a member who bought on account at the POS would otherwise show no due.
 */
export async function withPosCredit(members: PickedMember[]): Promise<PickedMember[]> {
  if (members.length === 0) return members;
  let credit: Record<string, number> = {};
  try {
    credit = await posApi.creditOutstanding(members.map((m) => m.id));
  } catch {
    return members;
  }
  return members.map((m) => {
    const pos = Number(credit[String(m.id)]) || 0;
    return pos > 0 ? { ...m, posCredit: pos, outstandingBalance: Math.round((m.outstandingBalance + pos) * 100) / 100 } : m;
  });
}

/** Debounced member search with keyboard navigation. */
export function MemberPicker({ value, onChange, placeholder = "Search member by name, ID or phone…", allowWalkIn = true, autoFocus }: {
  value: PickedMember | null;
  onChange: (m: PickedMember | null) => void;
  placeholder?: string;
  allowWalkIn?: boolean;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PickedMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await membersService.getMembers({ search: q.trim() }, { limit: 10 });
        setResults(await withPosCredit((res.members || []).map((m) => ({
          id: Number(m.id),
          name: m.name,
          memberCode: m.member_id ?? null,
          phone: m.phone ?? null,
          outstandingBalance: Number(m.outstanding_balance) || 0,
        }))));
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  const pick = (m: PickedMember | null) => { onChange(m); setQ(""); setOpen(false); };

  if (value) {
    return (
      <div className={s.custChip}>
        <span className={s.avatar}>{value.name.slice(0, 1).toUpperCase()}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={s.strong} style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value.name}</div>
          <div className={`${s.small} ${s.muted}`}>{[value.memberCode, value.phone].filter(Boolean).join(" · ") || "Member"}</div>
        </div>
        <button type="button" className={s.removeBtn} onClick={() => onChange(null)} aria-label="Remove customer"><X size={16} /></button>
      </div>
    );
  }

  const options: (PickedMember | null)[] = [...(allowWalkIn ? [null] : []), ...results];
  return (
    <div style={{ position: "relative" }}>
      <Search size={15} style={{ position: "absolute", left: 11, top: 12, color: "#94A3B8" }} />
      <input
        className={s.custInput}
        value={q}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { setActive((a) => Math.min(a + 1, options.length - 1)); e.preventDefault(); }
          else if (e.key === "ArrowUp") { setActive((a) => Math.max(a - 1, 0)); e.preventDefault(); }
          else if (e.key === "Enter" && open && options.length > 0) { pick(options[active] ?? null); e.preventDefault(); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (q.trim() || allowWalkIn) && (
        <div className={s.dropdown} style={{ left: 0, right: 0, top: "calc(100% + 4px)" }}>
          {options.map((m, i) => (
            <div key={m ? m.id : "walk-in"} className={`${s.dropItem} ${i === active ? s.dropItemActive : ""}`} onMouseDown={(e) => { e.preventDefault(); pick(m); }}>
              {m ? (
                <div className={s.rowBetween}>
                  <div>
                    <div className={s.strong}>{m.name}</div>
                    <div className={`${s.small} ${s.muted}`}>{[m.memberCode, m.phone].filter(Boolean).join(" · ")}</div>
                  </div>
                  {m.outstandingBalance > 0 && <Pill tone="amber">Dues <Money value={m.outstandingBalance} /></Pill>}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-600"><UserRound size={15} /> Walk-in customer</div>
              )}
            </div>
          ))}
          {q.trim() && !loading && results.length === 0 && <div className={`${s.dropItem} ${s.muted}`}>No matching members</div>}
          {loading && <div className={`${s.dropItem} ${s.muted}`}>Searching…</div>}
        </div>
      )}
    </div>
  );
}

/** Renders a thermal document inside an isolated frame — exactly what the printer receives in browser mode. */
export function ReceiptPreview({ html, widthMm = 80, height = 520 }: { html: string; widthMm?: number; height?: number }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState(height);
  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let observer: ResizeObserver | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // The frame grows to the whole receipt: no inner scrollbar to clip the bottom or eat the width.
    const fit = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      setH(Math.max(200, Math.ceil(Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight)) + 4));
    };
    const onLoad = () => {
      const doc = frame.contentDocument;
      const win = frame.contentWindow as (Window & { ResizeObserver?: typeof ResizeObserver }) | null;
      if (!doc?.body) return;
      doc.documentElement.style.overflow = "hidden";
      fit();
      // Re-fit when the logo / QR images finish loading or fonts swap in.
      doc.querySelectorAll("img").forEach((img) => { if (!img.complete) img.addEventListener("load", fit); });
      const RO = win?.ResizeObserver ?? (typeof ResizeObserver !== "undefined" ? ResizeObserver : undefined);
      if (RO) {
        observer = new RO(fit);
        observer.observe(doc.body);
      }
      timers.push(setTimeout(fit, 250), setTimeout(fit, 1000));
    };
    frame.addEventListener("load", onLoad);
    if (frame.contentDocument?.readyState === "complete") onLoad();
    return () => {
      frame.removeEventListener("load", onLoad);
      observer?.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [html]);
  const px = Math.round((widthMm / 25.4) * 96);
  return (
    <div className={s.preview}>
      <div className={s.previewPaper}>
        <iframe ref={ref} title="Receipt preview" tabIndex={-1} scrolling="no" className={s.previewFrame} srcDoc={html} style={{ width: px, height: h }} />
      </div>
    </div>
  );
}

export function ReportSections({ sections }: { sections: ReportSection[] }) {
  const visible = useMemo(() => sections.filter((x) => x.rows.length > 0), [sections]);
  return (
    <div className={s.grid2}>
      {visible.map((sec) => (
        <div key={sec.heading} className={s.panel}>
          <div className={s.panelHead}><div className={s.panelTitle}>{sec.heading}</div></div>
          <div className={s.panelBody} style={{ paddingTop: 6 }}>
            <table className={s.kv}>
              <tbody>
                {sec.rows.map((r, i) => (
                  <tr key={i} className={`${r.bold ? s.kvBold : ""} ${r.indent ? s.kvIndent : ""}`}>
                    <td>{r.label}</td>
                    <td>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className={s.empty}>
      {icon}
      <div style={{ fontWeight: 600, color: "#475569" }}>{title}</div>
      {hint && <div className={s.small}>{hint}</div>}
    </div>
  );
}
