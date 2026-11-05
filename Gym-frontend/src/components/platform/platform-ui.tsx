/**
 * Shared building blocks for the super admin (platform) pages, on the same look as the module
 * overview pages (overview-kit: Kpi, Panel). Everything is drawn from the theme tokens, so the
 * super admin's default Graphite theme — or any theme they pick — applies throughout.
 */
import React from "react";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { styles as a, Kpi, Panel, type IconT } from "../overview/overview-kit";
import p from "./platform.module.css";

export { Kpi, Panel, p };

/** Page frame: padding, spacing and background of the overview pages. */
export function PlatformPage({ children, maxWidth }: { children: React.ReactNode; maxWidth?: number }) {
  return <div className={a.root} style={maxWidth ? { maxWidth } : undefined}>{children}</div>;
}

export function PageHead({ icon: Icon, title, subtitle, actions, onBack }: {
  icon?: IconT; title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; onBack?: () => void;
}) {
  return (
    <header className={p.head}>
      <div className={p.headMain}>
        {onBack && (
          <button type="button" className={p.back} onClick={onBack} aria-label="Back"><ArrowLeft /></button>
        )}
        {Icon && <span className={p.headIcon} aria-hidden><Icon /></span>}
        <div style={{ minWidth: 0 }}>
          <h1 className={p.title}>{title}</h1>
          {subtitle && <p className={p.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className={p.actions}>{actions}</div>}
    </header>
  );
}

/** A row of KPI tiles; `cols` = how many sit side by side on a wide screen. */
export function KpiRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return <div className={p.kpis} style={{ ["--cols" as any]: cols }}>{children}</div>;
}

export function SearchField({ value, onChange, placeholder, label }: {
  value: string; onChange: (v: string) => void; placeholder: string; label?: string;
}) {
  return (
    <label className={p.search}>
      <Search aria-hidden />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label ?? placeholder} />
    </label>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className={p.toolbar}>{children}</div>;
}

export function Count({ n }: { n: number }) {
  return <span className={p.count}>{n.toLocaleString()}</span>;
}

/** Table inside a Panel: full-bleed to the panel edges. */
export function DataTable({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={p.tableWrap}>
      <table className={p.table}>
        <thead><tr>{head}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function StateRow({ cols, loading, children }: { cols: number; loading?: boolean; children?: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className={p.stateCell}>
        {loading ? <Loader2 className={p.spin} style={{ margin: "0 auto" }} aria-label="Loading" /> : children}
      </td>
    </tr>
  );
}

// Fixed, theme-independent avatar tones so neighbouring rows are easy to tell apart.
const AVATAR_TONES = ["#2563eb", "#0f766e", "#7c3aed", "#c2410c", "#0e7490", "#be185d", "#4d7c0f", "#b45309"];
export function initialsOf(name?: string | null): string {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function toneOf(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function Entity({ name, sub, badge, seed }: {
  name: string; sub?: React.ReactNode; badge?: React.ReactNode; seed?: string;
}) {
  return (
    <div className={p.entity}>
      <span className={p.avatar} style={{ ["--tone" as any]: toneOf(seed ?? name) }} aria-hidden>{initialsOf(name)}</span>
      <div className={p.entityText}>
        <span className={p.entityName}>{name}{badge}</span>
        {sub && <span className={p.entitySub}>{sub}</span>}
      </div>
    </div>
  );
}

export type PillKind = "good" | "warn" | "bad" | "info" | "neutral" | "brand";
export function Pill({ kind, children, title }: { kind: PillKind; children: React.ReactNode; title?: string }) {
  return <span className={p.pill} data-kind={kind} title={title}>{children}</span>;
}

export function Chip({ children, icon: Icon }: { children: React.ReactNode; icon?: IconT }) {
  return <span className={p.chip}>{Icon && <Icon size={12} />}{children}</span>;
}

export function IconAction({ icon: Icon, label, onClick, disabled, danger }: {
  icon: IconT; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button type="button" className={p.iconBtn} data-tone={danger ? "danger" : undefined}
      onClick={(e) => { e.stopPropagation(); onClick(); }} disabled={disabled} title={label} aria-label={label}>
      <Icon size={16} />
    </button>
  );
}

export function Section({ icon: Icon, title, children }: { icon?: IconT; title: string; children: React.ReactNode }) {
  return (
    <section className={p.section}>
      <h4 className={p.sectionTitle}>{Icon && <Icon size={16} />}{title}</h4>
      {children}
    </section>
  );
}

/** Label/value list; rows whose value is empty show "—". */
export function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className={p.dl}>
      {rows.map(([k, v]) => (
        <React.Fragment key={k}>
          <dt>{k}</dt>
          <dd>{v === null || v === undefined || v === "" ? "—" : v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
