import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, Archive, BarChart3, RefreshCw, Clock, FileBarChart, Lock, Pause, Play, Settings, ShoppingCart, TrendingUp, Unlock, Users, Wallet, Activity,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { posApi } from "./api";
import { usePos } from "./PosContext";
import { Money, Pill } from "./components/Shared";
import { CashMovementDialog, LiveSessionsDialog, OpenSessionDialog } from "./components/SessionDialogs";
import { BusinessDayBanner } from "./components/BusinessDay";
import { TerminalBanner } from "./components/Terminals";
import { fmtDate, fmtTime } from "./pricing";
import type { XReport } from "./types";
import s from "./pos.module.css";

function duration(fromIso: string, now: number) {
  const mins = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

export function Dashboard() {
  const { session, setSession, settings, go, showXReport, loading, setupError, retrySetup, company, dayStatus, refreshDayStatus } = usePos();
  const [busy, setBusy] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [x, setX] = useState<XReport | null>(null);
  const [heldCount, setHeldCount] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!session) { setX(null); return; }
    posApi.xReport(session.id).then(setX).catch(() => setX(null));
  }, [session]);

  useEffect(() => {
    posApi.heldSales().then((h) => setHeldCount(h.length)).catch(() => undefined);
    posApi.liveSessions().then((l) => setLiveCount(l.length)).catch(() => undefined);
  }, [session]);

  const open = session?.status === "OPEN";
  const suspended = session?.status === "SUSPENDED";
  const current = open || suspended;
  const closingStarted = Boolean(session?.closingStartedAt);
  const dayClosed = dayStatus?.phase === "CLOSED";

  const resume = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const s2 = await posApi.resumeSession(session.id);
      setSession(s2);
      toast.success(`Session ${s2.sessionNumber} resumed`);
      go("terminal");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const suspend = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const s2 = await posApi.suspendSession(session.id);
      setSession(s2);
      refreshDayStatus();
      toast.success(`Session ${s2.sessionNumber} suspended — resume it when you are back`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startOrContinue = () => {
    if (loading || busy) return;
    if (current && session?.stale) {
      toast.error(`Session ${session.sessionNumber} is from ${fmtDate(session.businessDate)}. Close it before selling today.`);
      showXReport();
      return;
    }
    if (current && closingStarted) { showXReport(); return; }
    if (suspended) { resume(); return; }
    if (open) { go("terminal"); return; }
    if (dayClosed) { toast.error("The business day is closed — new sessions open when trading resumes."); return; }
    setShowOpen(true);
  };

  const sessionTitle = loading ? "Loading…"
    : current && session?.stale ? "Close previous day's session"
    : current && closingStarted ? "Continue closing"
    : suspended ? "Resume session"
    : open ? "Continue session"
    : "Start session";

  const sum = x?.summary;
  const tiles: { key: string; title: string; desc: string; foot: React.ReactNode; icon: React.ReactNode; tone?: string; onClick: () => void; disabled?: boolean; badge?: React.ReactNode }[] = [
    {
      key: "session",
      title: sessionTitle,
      desc: current && closingStarted ? "Selling has stopped — count the drawer and close"
        : suspended ? "Your session is on hold — pick up where you left off"
        : open ? "Resume selling on this terminal"
        : dayClosed ? "Business day closed — opens again when trading resumes"
        : "Count the float and open your till",
      foot: current && session ? <>Opened {fmtTime(session.openedAt)} with <Money value={session.openingCash} /></> : "Each cashier runs their own session",
      icon: current ? <Play size={28} /> : <Unlock size={28} />,
      tone: current && (session?.stale || closingStarted) ? s.tileIconAmber : suspended ? s.tileIconSlate : "",
      onClick: startOrContinue,
      disabled: loading || busy || Boolean(setupError) || (!current && dayClosed),
      badge: current ? (session?.stale ? <Pill tone="amber" dot>Previous day</Pill>
        : closingStarted ? <Pill tone="red" dot>Closing</Pill>
        : suspended ? <Pill tone="gray" dot>Suspended</Pill>
        : <Pill tone="green" dot>Active</Pill>) : undefined,
    },
    {
      key: "x",
      title: "X-Report / Close session",
      desc: "Mid-shift report, cash count and closing",
      foot: current ? "Count the drawer, settle cards, close" : "No open session",
      icon: <Lock size={28} />,
      tone: s.tileIconRed,
      onClick: () => showXReport(),
      disabled: !current,
    },
    {
      key: "z",
      title: "Z-Report / Day close",
      desc: "Consolidated day report across all tills",
      foot: settings.zReportAccess === "SUPERVISOR" ? "Day close needs a supervisor" : "Any cashier can close the day",
      icon: <FileBarChart size={28} />,
      onClick: () => go("z-report"),
    },
    {
      key: "cust",
      title: "Customers & credit",
      desc: "Balances on account, collect payments, history",
      foot: "Statement and receipt printing",
      icon: <Users size={28} />,
      onClick: () => go("customers"),
    },
    {
      key: "cash",
      title: "Cash drop / out",
      desc: "Record cash taken in or paid out of the drawer",
      foot: open ? "Prints a signed cash slip" : "Open a session first",
      icon: <Archive size={28} />,
      onClick: () => setShowCash(true),
      disabled: !open,
    },
    {
      key: "live",
      title: "Live sessions",
      desc: "Every open till in the branch",
      foot: `${liveCount} open · ${heldCount} held sale${heldCount === 1 ? "" : "s"}`,
      icon: <Activity size={28} />,
      tone: s.tileIconSlate,
      onClick: () => setShowLive(true),
    },
    {
      key: "analytics",
      title: "Sales analytics",
      desc: "Trends, hours, products, cashiers",
      foot: "Any date range, export to Excel",
      icon: <BarChart3 size={28} />,
      onClick: () => go("analytics"),
    },
    {
      key: "console",
      title: "POS console",
      desc: "Settings, receipt designer, printers, audit",
      foot: setupError ? "Unavailable until the POS is set up" : settings.currentUserIsSupervisor ? "Configure this branch's POS" : "View only — needs POS edit permission",
      icon: <Settings size={28} />,
      tone: s.tileIconSlate,
      onClick: () => go("console"),
    },
  ];

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <div>
          <div className={s.eyebrow}>Point of Sale</div>
          <div className={s.heroTitle}>Session control center</div>
          <div className={s.heroSub}>{company?.name ? `${company.name} · ` : ""}Retail POS for supplements, merchandise and café sales</div>
        </div>
        <div className={s.heroMeta}>
          {current
            ? <Pill tone={session?.stale || closingStarted ? "amber" : suspended ? "gray" : "green"} dot>
                {session?.stale ? "Session open (previous day)" : closingStarted ? "Closing" : suspended ? "Session suspended" : "Session active"}
              </Pill>
            : <Pill tone="gray" dot>No open session</Pill>}
          {open && !closingStarted && !session?.stale && (
            <Button size="sm" variant="outline" disabled={busy} onClick={suspend} title="Step away without closing — nothing can be sold until you resume">
              <Pause className="h-4 w-4 mr-1" />Suspend
            </Button>
          )}
          <div className={s.metaItem}><div className={s.metaLabel}>Session</div><div className={s.metaValue}>{session?.sessionNumber ?? "—"}</div></div>
          <div className={s.metaItem}><div className={s.metaLabel}>Cashier</div><div className={s.metaValue}>{settings.currentUserDisplayName || settings.currentUsername || "—"}</div></div>
          {session?.terminalName && <div className={s.metaItem}><div className={s.metaLabel}>Terminal</div><div className={s.metaValue}>{session.terminalName}</div></div>}
        </div>
      </div>

      <BusinessDayBanner />
      <TerminalBanner />

      {setupError && (
        <div className={`${s.callout} ${s.calloutBad}`} role="alert">
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div className={s.strong}>The Point of Sale isn't available yet</div>
            <div className={s.small}>{setupError}</div>
          </div>
          <Button size="sm" variant="outline" onClick={retrySetup}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button>
        </div>
      )}

      <div className={s.tiles}>
        {tiles.map((t) => (
          <button key={t.key} type="button" className={s.tile} onClick={t.onClick} disabled={t.disabled || Boolean(setupError)}>
            {t.badge && <span className={s.tileBadge}>{t.badge}</span>}
            <span className={`${s.tileIcon} ${t.tone ?? ""}`}>{t.icon}</span>
            <span className={s.tileTitle}>{t.title}</span>
            <span className={s.tileDesc}>{t.desc}</span>
            <span className={s.tileFoot}>{t.foot}</span>
          </button>
        ))}
      </div>

      {current && session && (
        <div className={s.stats}>
          {[
            { label: "Session sales", value: sum ? <Money value={sum.totalSales} /> : null, foot: sum ? `${sum.invoiceCount} sale${sum.invoiceCount === 1 ? "" : "s"} · net ${sum.netSales.toFixed(2)}` : "Loading…", icon: <TrendingUp size={18} /> },
            { label: "Transactions", value: sum ? String(sum.invoiceCount) : null, foot: sum ? `${sum.returnCount} return(s) · avg ${sum.averageBasket.toFixed(2)}` : "Loading…", icon: <ShoppingCart size={18} /> },
            { label: "Cash in drawer", value: sum ? <Money value={sum.cash.expectedCash} /> : null, foot: `Float ${session.openingCash.toFixed(2)}`, icon: <Wallet size={18} /> },
            { label: "Session duration", value: duration(session.openedAt, now), foot: `Started ${fmtTime(session.openedAt)}`, icon: <Clock size={18} /> },
            { label: "Held sales", value: String(heldCount), foot: "Recall from the terminal (F7)", icon: <Pause size={18} /> },
          ].map((c) => (
            <div key={c.label} className={s.stat}>
              <div className={s.statBody}>
                <div className={s.statHead}><span className={s.statLabel}>{c.label}</span><span className={s.statIcon}>{c.icon}</span></div>
                <div className={s.statValue}>{c.value ?? <span style={{ display: "inline-block", width: 90, height: 22, borderRadius: 6, background: "#E2E8F0" }} />}</div>
              </div>
              <div className={s.statFoot}>{c.foot}</div>
            </div>
          ))}
        </div>
      )}

      <OpenSessionDialog open={showOpen} onOpenChange={setShowOpen} onOpened={(sess) => { setSession(sess); go("terminal"); }} />
      <CashMovementDialog open={showCash} onOpenChange={setShowCash} onDone={() => session && posApi.xReport(session.id).then(setX).catch(() => undefined)} />
      <LiveSessionsDialog open={showLive} onOpenChange={setShowLive} onForceClose={(sess) => { setShowLive(false); showXReport(sess.id); }}
        onTakenOver={(sess) => { setShowLive(false); setSession(sess); refreshDayStatus(); toast.success(`You now own ${sess.sessionNumber}`); go("terminal"); }} />
    </div>
  );
}
