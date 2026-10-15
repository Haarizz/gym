import React from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../ui/utils";

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

const TONES: Record<StatTone, {
  iconBg: string;
  iconColor: string;
  valueColor: string;
  ring: string;
}> = {
  primary: {
    iconBg: "bg-gradient-light",
    iconColor: "text-primary",
    valueColor: "text-primary",
    ring: "#2B7A78",
  },
  green: {
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    valueColor: "text-green-600",
    ring: "#16a34a",
  },
  blue: {
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    valueColor: "text-blue-600",
    ring: "#2563eb",
  },
  red: {
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    valueColor: "text-red-600",
    ring: "#dc2626",
  },
  cyan: {
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    valueColor: "text-cyan-600",
    ring: "#0891b2",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    valueColor: "text-amber-600",
    ring: "#d97706",
  },
  purple: {
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    valueColor: "text-purple-600",
    ring: "#9333ea",
  },
};

/**
 * The KPI row above the Members tabs, matching the standard Stat Card design
 * used across GymBios (Attendance, Staff & Trainers, Dashboard, etc.).
 */
export function MemberStatCards({ cards, activeKey, onSelect }: MemberStatCardsProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
      // More than 5 cards (e.g. All Members with Suspended/Pending Approval)
      // would wrap a lone card or two onto a second row; let them share the row.
      style={cards.length > 5 ? { gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" } : undefined}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const active = activeKey === card.key;
        const tone = TONES[card.tone] || TONES.primary;

        return (
          <Card
            key={card.key}
            role="button"
            tabIndex={0}
            className={cn(
              "border-primary/10 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-left",
              active && "ring-2"
            )}
            style={{
              boxShadow: active ? `0 0 0 2px ${tone.ring}, 0 4px 6px -1px rgb(0 0 0 / 0.1)` : undefined,
            }}
            onClick={() => onSelect(card.key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(card.key);
              }
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">{card.label}</CardTitle>
              <div className={cn(tone.iconBg, "p-2 rounded-lg")}>
                <Icon className={cn("h-4 w-4", tone.iconColor)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", tone.valueColor)}>
                {card.value ?? "…"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** A "Showing: X · Clear" line for lists filtered by a stat card. */
export function StatFilterNotice({ label, onClear }: { label: string; onClear?: () => void }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-primary/10 text-xs font-medium text-primary">
      <span>Showing: <strong>{label}</strong></span>
      {onClear && (
        <button
          type="button"
          className="underline font-semibold hover:opacity-80 cursor-pointer ml-auto bg-transparent border-0"
          onClick={onClear}
        >
          Clear filter
        </button>
      )}
    </div>
  );
}
