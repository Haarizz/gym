import React from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./MemberStatCards.module.css";

export type StatTone = "primary" | "green" | "blue" | "red" | "cyan" | "amber" | "purple";

export interface StatCardDef {
  /** Filter key the card applies when clicked. */
  key: string;
  label: string;
  /** null while the card's data is still loading. */
  value: React.ReactNode | null;
  sub: React.ReactNode;
  icon: LucideIcon;
  tone: StatTone;
}

interface MemberStatCardsProps {
  cards: StatCardDef[];
  activeKey?: string | null;
  onSelect: (key: string) => void;
}

/**
 * The KPI row above the Members tabs. Each tab passes its own cards; clicking
 * one filters that tab's list, and the selected card is outlined.
 */
export function MemberStatCards({ cards, activeKey, onSelect }: MemberStatCardsProps) {
  return (
    <div className={styles.grid}>
      {cards.map((card) => {
        const Icon = card.icon;
        const active = activeKey === card.key;
        return (
          <button
            key={card.key}
            type="button"
            className={`${styles.card} ${styles[card.tone]} ${active ? styles.active : ""}`}
            aria-pressed={active}
            onClick={() => onSelect(card.key)}
          >
            <div className={styles.head}>
              <span className={styles.label}>{card.label}</span>
              <span className={styles.chip}><Icon size={16} /></span>
            </div>
            <div className={styles.value}>{card.value ?? <span className={styles.loading}>…</span>}</div>
            <div className={styles.sub}>{card.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

/** A "Showing: X · Clear" line for lists filtered by a stat card. */
export function StatFilterNotice({ label, onClear }: { label: string; onClear?: () => void }) {
  return (
    <div className={styles.notice}>
      <span>Showing: <strong>{label}</strong></span>
      {onClear && (
        <button type="button" className={styles.clear} onClick={onClear}>Clear filter</button>
      )}
    </div>
  );
}
