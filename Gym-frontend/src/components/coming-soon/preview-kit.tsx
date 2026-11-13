/**
 * Shared pieces for the "coming soon" module previews (Assets, Budgeting, Recruitment).
 * These pages run on sample data only — nothing is read from or saved to the server —
 * so every action that would change something says it's coming soon instead.
 */
import React, { useCallback } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "../../utils/currency";
import s from "./preview.module.css";

export { s as ps };

/** The banner at the top of every preview page. */
export function PreviewBanner({ module, text, features }: { module: string; text?: string; features: string[] }) {
  return (
    <div className={s.banner} role="note">
      <span className={s.bannerIcon} aria-hidden><Sparkles /></span>
      <div>
        <div className={s.bannerTitle}>{module} is coming soon <span className={s.soonPill}>Preview · sample data</span></div>
        <div className={s.bannerText}>
          {text ?? "This is a preview of the module with sample figures, so you can see how it will work. Nothing here is saved, and nothing comes from your gym's data yet."}
        </div>
      </div>
      <div className={s.bannerSide}>
        {features.map(f => <span key={f} className={s.feature}><CheckCircle2 />{f}</span>)}
      </div>
    </div>
  );
}

/** For buttons that would change something: tells the user it's part of the coming module. */
export function soon(what: string) {
  toast.info(`${what} — coming soon`, { description: "This module is a preview with sample data for now." });
}

/** Progress / budget meter with an optional threshold tick and a % label. */
export function Meter({ pct, color, tick, label }: { pct: number; color: string; tick?: number; label?: React.ReactNode }) {
  return (
    <div className={s.meterCell}>
      <div className={s.bar}>
        <div className={s.barFill} style={{ width: `${Math.min(100, Math.max(0, pct))}%`, ["--fill" as any]: color }} />
        {tick != null && <div className={s.barTick} style={{ left: `${Math.min(100, tick)}%` }} />}
      </div>
      <span className={s.barPct}>{label ?? `${Math.round(pct)}%`}</span>
    </div>
  );
}

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join("") || "?";

/** Money in the gym's currency (Dirham sign etc.), whole units, plus a compact form for chart axes. */
export function useMoney() {
  const { formatCurrency } = useCurrency();
  const money = useCallback((n: number) => formatCurrency(n, { maximumFractionDigits: 0 }), [formatCurrency]);
  const compact = useCallback(
    (n: number) => formatCurrency(n, { notation: "compact", maximumFractionDigits: 1 } as Intl.NumberFormatOptions),
    [formatCurrency],
  );
  return { money, compact };
}

// Sample dates are relative to today so the previews always look current.
const DAY = 86_400_000;
export const daysFromNow = (n: number) => {
  const d = new Date(Date.now() + n * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const daysUntil = (iso: string) => {
  const t = new Date(iso + "T00:00:00").getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((t - today.getTime()) / DAY);
};
/** Labels for the last `n` months ending with the current one, e.g. ["Jun", …, "Nov"]. */
export const lastMonths = (n: number) => {
  const out: string[] = [];
  const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(m.toLocaleString(undefined, { month: "short" }));
  }
  return out;
};
