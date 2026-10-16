import React from "react";
import { ChevronRight, Inbox, Info, AlertTriangle, CheckCircle2, type LucideIcon } from "lucide-react";
import { useCurrency, CurrencyValue } from "../../utils/currency";
import s from "./workforce.module.css";

/** Shared building blocks for the workforce pages (see workforce.module.css). */

export type Tone = "teal" | "green" | "amber" | "red" | "blue" | "violet" | "orange" | "rose" | "gray";

export const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

export function PageHeader({ crumbs, icon: Icon, title, subtitle, actions, onCrumb }: {
  crumbs: Array<{ label: string; to?: string }>;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onCrumb?: (to: string) => void;
}) {
  return (
    <div className={s.stack} style={{ gap: "0.5rem" }}>
      <nav className={s.crumbs} aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={c.label}>
            {i > 0 && <ChevronRight size={12} />}
            {i === crumbs.length - 1 ? (
              <span className={s.crumbCurrent}>{c.label}</span>
            ) : c.to && onCrumb ? (
              <button type="button" onClick={() => onCrumb(c.to!)}>{c.label}</button>
            ) : (
              <span>{c.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
      <div className={s.header}>
        <div className={s.titleWrap}>
          <div className={s.titleIcon}><Icon size={22} /></div>
          <div style={{ minWidth: 0 }}>
            <h1 className={s.title}>{title}</h1>
            {subtitle && <p className={s.subtitle}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className={s.actions}>{actions}</div>}
      </div>
    </div>
  );
}

export function Kpi({ icon: Icon, label, value, sub, tone = "teal", active, onClick }: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  active?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className={s.kpiIcon}><Icon size={18} /></div>
      <div className={s.kpiText}>
        <div className={cx(s.kpiValue, s.num)}>{value}</div>
        <div className={s.kpiLabel}>{label}</div>
        {sub && <div className={s.kpiSub}>{sub}</div>}
      </div>
    </>
  );
  return onClick ? (
    <button type="button" data-tone={tone} className={cx(s.kpi, active && s.kpiActive)} onClick={onClick} aria-pressed={active}>
      {body}
    </button>
  ) : (
    <div data-tone={tone} className={s.kpi}>{body}</div>
  );
}

export function Badge({ tone = "gray", children, plain, title }: { tone?: Tone; children: React.ReactNode; plain?: boolean; title?: string }) {
  return <span data-tone={tone} className={cx(s.badge, plain && s.badgePlain)} title={title}>{children}</span>;
}

export function Note({ tone = "blue", children, icon }: { tone?: Tone; children: React.ReactNode; icon?: LucideIcon }) {
  const Icon = icon ?? (tone === "amber" || tone === "red" || tone === "orange" ? AlertTriangle : tone === "green" ? CheckCircle2 : Info);
  return (
    <div data-tone={tone} className={s.note}>
      <Icon size={14} />
      <div className={s.noteBody}>{children}</div>
    </div>
  );
}

export function Panel({ title, description, actions, children, flush, className }: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={cx(s.panel, className)}>
      {(title || actions) && (
        <div className={s.panelHeader}>
          <div>
            {title && <h2 className={s.panelTitle}>{title}</h2>}
            {description && <p className={s.panelDesc}>{description}</p>}
          </div>
          {actions && <div className={s.actions}>{actions}</div>}
        </div>
      )}
      <div className={flush ? s.panelFlush : s.panelBody}>{children}</div>
    </section>
  );
}

export interface TabDef<T extends string> { id: T; label: string; icon?: LucideIcon; count?: number; countTone?: Tone }

export function TabBar<T extends string>({ tabs, value, onChange }: { tabs: TabDef<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className={s.tabs} role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          className={cx(s.tab, value === t.id && s.tabActive)}
          onClick={() => onChange(t.id)}
        >
          {t.icon && <t.icon size={15} />}
          {t.label}
          {!!t.count && <span data-tone={t.countTone ?? "teal"} className={s.tabCount}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const initialsOf = (name?: string | null) =>
  (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join("") || "?";

export function Avatar({ name, photo, size }: { name?: string | null; photo?: string | null; size?: "sm" | "lg" }) {
  return (
    <span className={cx(s.avatar, size === "sm" && s.avatarSm, size === "lg" && s.avatarLg)}>
      {photo ? <img src={photo} alt="" /> : initialsOf(name)}
    </span>
  );
}

export function Person({ name, sub, photo, size }: { name: string; sub?: React.ReactNode; photo?: string | null; size?: "sm" | "lg" }) {
  return (
    <div className={s.person}>
      <Avatar name={name} photo={photo} size={size} />
      <div className={s.cellStack} style={{ minWidth: 0 }}>
        <span className={s.personName}>{name}</span>
        {sub && <span className={s.cellSub}>{sub}</span>}
      </div>
    </div>
  );
}

export function Empty({ icon: Icon = Inbox, title, children }: { icon?: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className={s.empty}>
      <div className={s.emptyIcon}><Icon size={20} /></div>
      <div className={s.emptyTitle}>{title}</div>
      {children && <div>{children}</div>}
    </div>
  );
}

export function ProgressBar({ value, tone }: { value: number; tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={s.bar} data-tone={tone}>
      <div className={s.barFill} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Field({ label, required, hint, error, children, span2 }: {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div className={cx(s.field, span2 && s.span2)}>
      <span className={cx(s.fieldLabel, required && s.required)}>{label}</span>
      {children}
      {error ? <span className={s.fieldError}>{error}</span> : hint ? <span className={s.fieldHint}>{hint}</span> : null}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={s.stat}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}>{value}</div>
    </div>
  );
}

export function Line({ label, value, total, tone }: { label: React.ReactNode; value: React.ReactNode; total?: boolean; tone?: Tone }) {
  return (
    <div className={cx(s.line, total && s.lineTotal)}>
      <span>{label}</span>
      <span data-tone={tone} className={cx(s.num, tone && s.toneText)}>{value}</span>
    </div>
  );
}

/** Money with the app's currency mark; `signed` adds +/− for earnings/deductions. */
export function Money({ value, signed, dash }: { value: number | null | undefined; signed?: "+" | "-"; dash?: boolean }) {
  const n = Number(value ?? 0);
  if (dash && !n) return <span className={s.muted}>—</span>;
  return (
    <span className={s.num} style={{ whiteSpace: "nowrap" }}>
      {signed === "-" && n ? "− " : signed === "+" && n ? "+ " : ""}
      <CurrencyValue amount={Math.abs(n)} options={{ maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 }} />
    </span>
  );
}

/** Plain-text money for places that can't hold the AED glyph (select items, titles). */
export function useMoneyText() {
  const { formatCurrency } = useCurrency();
  return (n: number | null | undefined) => formatCurrency(Number(n ?? 0), { maximumFractionDigits: 2 });
}

export const hoursLabel = (h: number | null | undefined) => {
  const v = Number(h ?? 0);
  return `${Number.isInteger(v) ? v : v.toFixed(1)}h`;
};

export const minutesLabel = (m: number | null | undefined) => {
  const v = Number(m ?? 0);
  if (!v) return "—";
  const h = Math.floor(v / 60);
  const mm = v % 60;
  return h ? `${h}h${mm ? ` ${mm}m` : ""}` : `${mm}m`;
};

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const periodLabel = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1].slice(0, 3)} ${y}`;
};

export const formatDate = (iso?: string | null, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) => {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, opts);
};

export const errorMessage = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

export { s as wf };
