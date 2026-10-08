import React, { useEffect, useMemo, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { CalendarClock, ChevronRight } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { CurrencyValue } from "../../utils/currency";
import { authService } from "../../utils/supabase/auth-service";
import styles from "./DueForRenewalList.module.css";

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

// Lapsed in the last EXPIRED_WINDOW days, or lapsing in the next EXPIRING_WINDOW days
const EXPIRED_WINDOW = 90;
const EXPIRING_WINDOW = 30;
const PAGE_PREVIEW = 8;

// One row of /membership-reports/members
interface DueRow {
  memberDbId: number;
  memberId: string;
  name: string;
  phone?: string;
  plan?: string;
  expiryDate?: string;
  daysFromToday?: number | null;
  outstandingBalance?: number;
}

interface DueForRenewalListProps {
  /** Bumped after a renewal so the renewed member drops off the list */
  refreshKey?: number;
  onSelect: (memberDbId: number) => void;
}

async function fetchRows(type: "expired" | "expiring", from: Date, to: Date): Promise<DueRow[]> {
  const res = await authService.makeAuthenticatedRequest(
    `${backendBaseUrl}/membership-reports/members?type=${type}&from=${format(from, "yyyy-MM-dd")}&to=${format(to, "yyyy-MM-dd")}`,
  );
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const body = await res.json();
  return (body?.data ?? []) as DueRow[];
}

function dueLabel(days: number | null | undefined) {
  if (days === null || days === undefined) return { text: "No expiry", className: "bg-gray-100 text-gray-800" };
  if (days < 0) return { text: `Expired ${-days} day${days === -1 ? "" : "s"} ago`, className: "bg-red-100 text-red-800" };
  if (days === 0) return { text: "Expires today", className: "bg-red-100 text-red-800" };
  if (days <= 7) return { text: `Expires in ${days} day${days === 1 ? "" : "s"}`, className: "bg-orange-100 text-orange-800" };
  return { text: `Expires in ${days} days`, className: "bg-green-100 text-green-800" };
}

/**
 * Members → Renewals & Upgrades: everyone whose membership has lapsed recently or is
 * about to, longest-overdue first, so the desk can work down the list. Picking one
 * loads them into the renewal form above.
 */
export function DueForRenewalList({ refreshKey = 0, onSelect }: DueForRenewalListProps) {
  const [rows, setRows] = useState<DueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    setLoading(true);
    setError(false);
    Promise.all([
      fetchRows("expired", subDays(today, EXPIRED_WINDOW), today),
      fetchRows("expiring", today, addDays(today, EXPIRING_WINDOW)),
    ])
      .then(([expired, expiring]) => {
        if (cancelled) return;
        const byId = new Map<number, DueRow>();
        [...expired, ...expiring].forEach((r) => byId.set(r.memberDbId, r));
        setRows([...byId.values()]);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Most overdue first, then whoever expires soonest
  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.daysFromToday ?? Infinity) - (b.daysFromToday ?? Infinity)),
    [rows],
  );
  const overdue = sorted.filter((r) => (r.daysFromToday ?? 0) < 0).length;
  const visible = showAll ? sorted : sorted.slice(0, PAGE_PREVIEW);

  return (
    <Card className="border-primary/10 shadow-md">
      <CardHeader className="border-b bg-slate-50/50 py-4">
        <div className={styles.header}>
          <CalendarClock className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Due for Renewal</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {loading
                ? "Loading members…"
                : `${sorted.length} member${sorted.length === 1 ? "" : "s"} · ${overdue} expired, ${sorted.length - overdue} expiring in the next ${EXPIRING_WINDOW} days`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {error && <p className={styles.message}>Couldn't load members due for renewal.</p>}
        {!loading && !error && sorted.length === 0 && (
          <p className={styles.message}>Nobody is due — no memberships expired in the last {EXPIRED_WINDOW} days or expire in the next {EXPIRING_WINDOW}.</p>
        )}
        {visible.map((r) => {
          const due = dueLabel(r.daysFromToday);
          return (
            <button key={r.memberDbId} type="button" className={styles.row} onClick={() => onSelect(r.memberDbId)}>
              <div className={styles.who}>
                <span className={styles.name}>{r.name}</span>
                <span className={styles.meta}>
                  {r.memberId}{r.phone ? ` • ${r.phone}` : ""}
                </span>
                <span className={styles.meta}>
                  {r.plan || "No plan"}
                  {r.expiryDate ? ` • Expiry ${new Date(r.expiryDate).toLocaleDateString()}` : ""}
                </span>
              </div>
              <div className={styles.right}>
                {Number(r.outstandingBalance ?? 0) > 0 && (
                  <span className={styles.due}>
                    Due <CurrencyValue amount={Number(r.outstandingBalance)} options={{ maximumFractionDigits: 2 }} />
                  </span>
                )}
                <Badge className={due.className}>{due.text}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
        {sorted.length > PAGE_PREVIEW && (
          <div className={styles.more}>
            <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show less" : `Show all ${sorted.length}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
