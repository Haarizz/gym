import React, { useEffect, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  AlertCircle,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Dumbbell,
  Loader2,
  Play,
  RefreshCcw,
  ShoppingCart,
  Snowflake,
  UserPlus,
  Receipt as ReceiptIcon,
} from "lucide-react";
import { useCurrency } from "../../utils/currency";
import { membersService } from "../../utils/supabase/members-service";
import type {
  SubscriptionAddon,
  SubscriptionPeriod,
  SubscriptionTimeline as TimelineData,
} from "../../utils/supabase/members-service";
import s from "./SubscriptionTimeline.module.css";

type Tone = "teal" | "blue" | "green" | "red" | "violet" | "amber" | "gray";

interface PeriodEvent {
  day: string;
  /** Orders events on the same day: joined, bought, started, frozen, unfrozen, add-on, ended. */
  rank: number;
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  lines: React.ReactNode[];
}

// Dates come back as "yyyy-MM-dd" (calendar days) or a local ISO date-time.
function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isNaN(d.getTime()) ? null : d;
}

function fmt(value?: string | null): string {
  const d = toDate(value);
  return d ? format(d, "dd MMM yyyy") : "—";
}

function dayOf(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

const STATUS_TONE: Record<string, Tone> = {
  Active: "green",
  Frozen: "blue",
  Expired: "red",
  Completed: "gray",
  Upcoming: "violet",
  "Pending approval": "amber",
};

function kindLabel(kind: string): string {
  if (kind === "New") return "New membership";
  if (kind === "Upgrade") return "Upgrade";
  if (kind === "Downgrade") return "Downgrade";
  return "Renewal";
}

function Fact({ label, value, tone }: { label: string; value: React.ReactNode; tone?: Tone }) {
  return (
    <div className={s.fact} data-tone={tone}>
      <span className={s.factLabel}>{label}</span>
      <span className={s.factValue}>{value}</span>
    </div>
  );
}

interface SubscriptionTimelineProps {
  memberId: string | number;
  /** Changes whenever the member is reloaded (freeze, unfreeze, renewal), so the timeline refetches. */
  refreshKey?: unknown;
}

export function SubscriptionTimeline({ memberId, refreshKey }: SubscriptionTimelineProps) {
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    membersService.getSubscriptionTimeline(memberId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load subscription timeline"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memberId, refreshKey]);

  if (loading && !data) {
    return <div className={s.state}><Loader2 className={s.spin} /> Loading subscription history…</div>;
  }
  if (error) {
    return <div className={s.state} data-tone="red"><AlertCircle /> {error}</div>;
  }
  if (!data || data.periods.length === 0) {
    return <div className={s.state}><CalendarClock /> No membership has been purchased yet.</div>;
  }

  const money = (v?: number | null) => (v == null ? "—" : formatCurrency(Number(v)));
  const { summary, periods, addons, pt_sessions } = data;
  const today = new Date();

  const buildEvents = (p: SubscriptionPeriod, i: number): PeriodEvent[] => {
    const events: PeriodEvent[] = [];
    const next = periods[i + 1];

    if (i === 0 && summary.join_date) {
      events.push({
        day: summary.join_date, rank: 0, tone: "teal", icon: <UserPlus />, title: "Joined",
        lines: summary.family_head_name ? [`Family member of ${summary.family_head_name}`] : [],
      });
    }

    if (p.purchased_at || p.invoice_no) {
      const title = p.kind === "New" ? "Membership purchased"
        : p.kind === "Upgrade" ? "Membership renewed — upgraded"
        : p.kind === "Downgrade" ? "Membership renewed — downgraded"
        : "Membership renewed";
      const paid = p.paid_amount != null && p.amount != null && Number(p.paid_amount) < Number(p.amount)
        ? ` · ${money(p.paid_amount)} paid` : "";
      events.push({
        day: dayOf(p.purchased_at) || dayOf(p.start_date), rank: 1, tone: "violet",
        icon: i === 0 ? <ReceiptIcon /> : <RefreshCcw />, title,
        lines: [
          <><b>{p.invoice_no || "No invoice no."}</b> · {p.plan_name || "—"}</>,
          `${money(p.amount)}${paid}${p.payment_status ? ` · ${p.payment_status}` : ""}${p.payment_method ? ` · ${p.payment_method}` : ""}`,
          ...(p.discount_amount && Number(p.discount_amount) > 0
            ? [`Discount ${money(p.discount_amount)}${p.discount_label ? ` (${p.discount_label})` : ""}`] : []),
          ...(p.billed_to ? [`Billed to family head ${p.billed_to}`] : []),
          ...(p.processed_by ? [`By ${p.processed_by}`] : []),
          ...(p.status === "Pending approval" ? ["Waiting for payment approval"] : []),
        ],
      });
    }

    if (p.start_date) {
      const started = (toDate(p.start_date) ?? today) <= today;
      events.push({
        day: p.start_date, rank: 2, tone: "green", icon: <Play />,
        title: started ? "Membership started" : "Membership starts",
        lines: [`Valid ${fmt(p.start_date)} → ${fmt(p.original_end_date ?? p.end_date)}`
          + (p.duration_days != null ? ` (${p.duration_days} days)` : "")],
      });
    }

    p.freezes.forEach((f) => {
      const by = f.source === "MOBILE" ? "Member app" : f.recorded_by || null;
      const charge = f.charge_waived ? "Freeze charge waived"
        : f.charge_amount && Number(f.charge_amount) > 0
          ? `Charged ${f.charged_days} day(s): ${money(f.charge_amount)}${f.charge_invoice_no ? ` (${f.charge_invoice_no})` : ""}`
          : null;
      const free = f.free_days > 0 ? `${f.free_days} free day(s)` : null;
      const planned = f.planned_end_date
        ? `${fmt(f.start_date)} → ${fmt(f.planned_end_date)} planned (${f.requested_days} days)`
        : `From ${fmt(f.start_date)} · no end date set`;

      if (f.status === "Completed") {
        events.push({
          day: f.start_date || "", rank: 3, tone: "blue", icon: <Snowflake />, title: "Membership frozen",
          lines: [
            planned,
            ...(f.reason ? [`Reason: ${f.reason}`] : []),
            ...(by ? [`By ${by}`] : []),
          ],
        });
        const back = f.unfrozen_on
          || (f.ended_on ? format(addDays(toDate(f.ended_on)!, 1), "yyyy-MM-dd") : f.start_date || "");
        events.push({
          day: back, rank: 4, tone: "teal", icon: <Play />, title: "Membership unfrozen",
          lines: [
            `Frozen ${f.days} day(s): ${fmt(f.start_date)} – ${fmt(f.ended_on)}`,
            ...(f.expiry_before && f.expiry_after
              ? [<>Expiry moved <s>{fmt(f.expiry_before)}</s> → <b>{fmt(f.expiry_after)}</b> (+{f.days} days)</>] : []),
            ...([free, charge].filter(Boolean) as string[]),
          ],
        });
      } else {
        const scheduled = f.status === "Scheduled";
        events.push({
          day: f.start_date || "", rank: 3, tone: "blue", icon: <Snowflake />,
          title: scheduled ? "Freeze scheduled" : "Membership frozen — in progress",
          lines: [
            planned + (scheduled ? "" : ` · ${f.days} day(s) so far`),
            ...(f.expiry_after
              ? [<>Expiry moves {f.expiry_before ? <><s>{fmt(f.expiry_before)}</s> → </> : "to "}<b>{fmt(f.expiry_after)}</b> when unfrozen on the planned date</>]
              : []),
            ...(f.reason ? [`Reason: ${f.reason}`] : []),
            ...(by ? [`By ${by}`] : []),
            ...(free ? [free] : []),
          ],
        });
      }
    });

    // Add-ons and PT bought while this was the latest plan.
    const from = i === 0 ? "" : dayOf(p.purchased_at);
    const to = next ? dayOf(next.purchased_at) : "";
    addons
      .filter((a) => {
        const d = dayOf(a.purchase_date);
        return d && (!from || d >= from) && (!to || d < to);
      })
      .forEach((a: SubscriptionAddon) => {
        events.push({
          day: dayOf(a.purchase_date), rank: 5, tone: a.is_pt ? "amber" : "gray",
          icon: a.is_pt ? <Dumbbell /> : <ShoppingCart />,
          title: a.is_pt ? "Personal training purchased" : "Add-on purchased",
          lines: [
            <><b>{a.invoice_no || a.transaction_id || "—"}</b> · {a.name}</>,
            `${money(a.amount)}${a.status ? ` · ${a.status}` : ""}`
              + (a.start_date || a.expiry_date ? ` · valid ${fmt(a.start_date)} → ${fmt(a.expiry_date)}` : ""),
          ],
        });
      });

    const end = p.end_date;
    if (end) {
      const endDate = toDate(end)!;
      if (p.status === "Frozen") {
        events.push({
          day: p.projected_end_date || end, rank: 6, tone: "blue", icon: <CalendarClock />,
          title: "Expiry on hold while frozen",
          lines: [<>Expected expiry <b>{fmt(p.projected_end_date || end)}</b>{p.projected_end_date ? <> (was {fmt(end)})</> : null}</>],
        });
      } else if (next) {
        if (p.expired_before_renewal) {
          events.push({
            day: end, rank: 6, tone: "red", icon: <CalendarX />, title: "Membership expired",
            lines: [`Renewed ${p.gap_days} day(s) later on ${fmt(p.renewed_on)}${p.renewal_invoice_no ? ` (${p.renewal_invoice_no})` : ""}`],
          });
        } else {
          events.push({
            day: end, rank: 6, tone: "gray", icon: <CalendarCheck />,
            title: endDate > today ? "Expires — already renewed" : "Period ended — renewed",
            lines: [`Renewed early on ${fmt(p.renewed_on)}${p.renewal_invoice_no ? ` (${p.renewal_invoice_no})` : ""}; the next period starts here`],
          });
        }
      } else if (endDate <= today) {
        const ago = differenceInCalendarDays(today, endDate);
        events.push({
          day: end, rank: 6, tone: "red", icon: <CalendarX />, title: "Membership expired",
          lines: [ago === 0 ? "Expired today · not renewed yet" : `Not renewed yet · ${ago} day(s) ago`],
        });
      } else {
        const left = differenceInCalendarDays(endDate, today);
        events.push({
          day: end, rank: 6, tone: "amber", icon: <CalendarClock />, title: "Membership expires",
          lines: [`${left} day(s) left${p.frozen_days > 0 ? ` · includes ${p.frozen_days} frozen day(s)` : ""}`],
        });
      }
    }

    return events.sort((a, b) => (a.day === b.day ? a.rank - b.rank : a.day < b.day ? -1 : 1));
  };

  const ptAddons = addons.filter((a) => a.is_pt);
  const currentExpiry = summary.projected_expiry_date || summary.expiry_date;

  return (
    <div className={s.root}>
      <div className={s.summary}>
        <Fact label="Joined" value={fmt(summary.join_date)} />
        <Fact label="First start" value={fmt(summary.first_start_date)} />
        <Fact label="Current plan" value={summary.current_plan || "—"} />
        <Fact
          label={summary.projected_expiry_date ? "Expected expiry" : "Expiry"}
          value={fmt(currentExpiry)}
          tone={summary.projected_expiry_date ? "blue" : undefined}
        />
        <Fact label="Renewals" value={summary.renewal_count} />
        <Fact
          label="Days frozen"
          value={summary.freeze_count > 0 ? `${summary.total_frozen_days} (${summary.freeze_count}×)` : "0"}
        />
      </div>

      {[...periods].map((p, i) => ({ p, i })).reverse().map(({ p, i }) => (
        <article key={p.receipt_id ?? `period-${i}`} className={s.period}>
          <header className={s.periodHead}>
            <div className={s.periodTitle}>
              <span className={s.periodNo}>Period {i + 1}</span>
              <h3>{p.plan_name || "Membership"}</h3>
              <span className={s.badge} data-tone="violet">{kindLabel(p.kind)}</span>
              {p.is_pt && <span className={s.badge} data-tone="amber"><Dumbbell /> PT</span>}
            </div>
            <span className={s.status} data-tone={STATUS_TONE[p.status] ?? "gray"}>{p.status}</span>
          </header>

          <div className={s.facts}>
            <Fact label="Invoice" value={p.invoice_no || "—"} />
            <Fact label="Purchased" value={fmt(p.purchased_at)} />
            <Fact label="Start" value={fmt(p.start_date)} />
            <Fact label="Original expiry" value={fmt(p.original_end_date ?? p.end_date)} />
            <Fact label="Frozen" value={p.frozen_days > 0 ? `${p.frozen_days} day(s)` : "—"} />
            <Fact
              label={p.status === "Frozen" && p.projected_end_date ? "Expected expiry" : "Expiry"}
              value={fmt(p.status === "Frozen" && p.projected_end_date ? p.projected_end_date : p.end_date)}
              tone={p.status === "Expired" ? "red" : p.status === "Frozen" ? "blue" : undefined}
            />
            <Fact label="Amount" value={money(p.amount)} />
          </div>

          <ol className={s.events}>
            {buildEvents(p, i).map((e, k) => (
              <li key={k} className={s.event} data-tone={e.tone}>
                <span className={s.dot}>{e.icon}</span>
                <div className={s.eventBody}>
                  <div className={s.eventHead}>
                    <span className={s.eventTitle}>{e.title}</span>
                    <span className={s.eventDate}>{fmt(e.day)}</span>
                  </div>
                  {e.lines.map((line, n) => <p key={n} className={s.eventLine}>{line}</p>)}
                </div>
              </li>
            ))}
          </ol>
        </article>
      ))}

      {(ptAddons.length > 0 || pt_sessions.length > 0) && (
        <article className={s.period}>
          <header className={s.periodHead}>
            <div className={s.periodTitle}>
              <h3><Dumbbell className={s.inlineIcon} /> Personal training</h3>
            </div>
            <span className={s.status} data-tone="amber">
              {ptAddons.length} package(s) · {pt_sessions.length} session(s)
            </span>
          </header>
          {ptAddons.length > 0 && (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr><th>Package</th><th>Invoice</th><th>Purchased</th><th>Valid</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {ptAddons.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>{a.invoice_no || a.transaction_id || "—"}</td>
                      <td>{fmt(a.purchase_date)}</td>
                      <td>{fmt(a.start_date)} → {fmt(a.expiry_date)}</td>
                      <td>{money(a.amount)}</td>
                      <td>{a.status || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pt_sessions.length > 0 && (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr><th>Session date</th><th>Time</th><th>Session</th><th>Trainer</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {[...pt_sessions].reverse().map((b) => (
                    <tr key={b.id}>
                      <td>{fmt(b.date)}</td>
                      <td>{b.start_time ? b.start_time.slice(0, 5) : "—"}</td>
                      <td>{b.session_name || "—"}</td>
                      <td>{b.trainer || "—"}</td>
                      <td>{b.status || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}
    </div>
  );
}
