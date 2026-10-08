import React from "react";
import { AlertTriangle, CalendarClock, Clock } from "lucide-react";
import { Button } from "../../components/ui/button";
import { usePos } from "../PosContext";
import { fmtDate, fmtTime } from "../pricing";
import type { DayStatus } from "../types";
import s from "../pos.module.css";

/** One-line business-day state for the terminal top bar (BillBull's BusinessDayStatusChip). */
export function dayChip(ds: DayStatus | null, stale: boolean, staleDate: string | null): { text: string; tone: "ok" | "warn" | "bad" } {
  if (stale) return { text: `Business day ${fmtDate(staleDate)} still open — close it`, tone: "bad" };
  if (!ds) return { text: "Business day open", tone: "ok" };
  switch (ds.phase) {
    case "CLOSED":
      return { text: `Business day closed${ds.closesAt ? ` at ${fmtTime(ds.closesAt)}` : ""}`, tone: "bad" };
    case "EXTENSION":
      return { text: `Extension · trading until ${fmtTime(ds.closesAt)}`, tone: "warn" };
    case "ACTIVE":
      return { text: `Business day open · ends ${fmtTime(ds.scheduledEnd)}`, tone: "ok" };
    default:
      return { text: `Business day open · ${fmtDate(ds.tradingDate)}`, tone: "ok" };
  }
}

/**
 * Dashboard banner (BillBull's BusinessDayStatusBanner): the window phase, sessions left open
 * on a day that has ended, and a Day Close that is still outstanding.
 */
export function BusinessDayBanner() {
  const { dayStatus: ds, showXReport, showZReport, go } = usePos();
  if (!ds) return null;
  const pendingOld = ds.pendingDayCloseDate && ds.pendingDayCloseDate !== ds.tradingDate;
  const items: React.ReactNode[] = [];

  if (ds.phase === "CLOSED") {
    items.push(
      <div key="closed" className={`${s.callout} ${s.calloutBad}`}>
        <CalendarClock size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <div className={s.strong}>Business day {fmtDate(ds.tradingDate)} closed{ds.closesAt ? ` at ${fmtTime(ds.closesAt)}` : ""}</div>
          <div className={s.small}>
            No new sessions or sales until {fmtTime(ds.nextStart)}. Close the open sessions and run the Day Close — reports stay available.
          </div>
        </div>
        {!ds.dayClosed && <Button size="sm" variant="outline" onClick={() => go("z-report")}>Z-Report / Day close</Button>}
      </div>,
    );
  } else if (ds.phase === "EXTENSION") {
    items.push(
      <div key="ext" className={`${s.callout} ${s.calloutWarn}`}>
        <Clock size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <div className={s.strong}>Scheduled end {fmtTime(ds.scheduledEnd)} has passed</div>
          <div className={s.small}>Trading continues on {fmtDate(ds.tradingDate)} until {fmtTime(ds.closesAt)} — then new sales stop. Start closing tills now.</div>
        </div>
      </div>,
    );
  }

  if (ds.sessionsRequiringClosure.length > 0) {
    items.push(
      <div key="sessions" className={`${s.callout} ${s.calloutWarn}`}>
        <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <div className={s.strong}>{ds.sessionsRequiringClosure.length} session{ds.sessionsRequiringClosure.length === 1 ? "" : "s"} must be closed</div>
          <div className={s.small} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {ds.sessionsRequiringClosure.map((x) => (
              <button key={x.id} type="button" className={s.chip} style={{ cursor: "pointer", border: 0 }} onClick={() => showXReport(x.id)}>
                {x.sessionNumber} · {x.staffName || x.openedBy} · {fmtDate(x.businessDate)}{x.status === "SUSPENDED" ? " · suspended" : ""}
              </button>
            ))}
          </div>
        </div>
      </div>,
    );
  }

  if (pendingOld || (ds.pendingDayCloseDate && ds.phase === "CLOSED" && !ds.dayClosed && ds.sessionsRequiringClosure.length === 0)) {
    items.push(
      <div key="pending" className={`${s.callout} ${s.calloutWarn}`}>
        <CalendarClock size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <div className={s.strong}>Day Close pending for {fmtDate(ds.pendingDayCloseDate)}</div>
          <div className={s.small}>Run the Z-Report and close that business day so its figures are frozen.</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => showZReport(ds.pendingDayCloseDate)}>Open Z-Report</Button>
      </div>,
    );
  }

  return items.length ? <div className={s.stack} style={{ gap: 10 }}>{items}</div> : null;
}
