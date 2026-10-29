import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  Plus, RefreshCw, CalendarClock, Lock, Unlock, XCircle, CheckCircle, Trash2, CalendarCheck, Loader2,
} from "lucide-react";
import { addDays, addMonths, differenceInCalendarMonths, format, isValid, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  fiscalYearService, type FiscalYear, type FiscalPeriod, type FiscalYearCreateRequest,
} from "../utils/supabase/fiscal-year-service";
import s from "./fiscal-periods.module.css";

type Status = "OPEN" | "CLOSED" | "LOCKED";

const STATUS_ICON: Record<Status, React.ComponentType> = { OPEN: CheckCircle, CLOSED: XCircle, LOCKED: Lock };

const toDate = (iso: string) => {
  const d = parseISO(iso);
  return isValid(d) ? d : null;
};
const fmt = (iso: string) => {
  const d = toDate(iso);
  return d ? format(d, "dd MMM yyyy") : "—";
};
const isoDay = (d: Date) => format(d, "yyyy-MM-dd");
const todayIso = () => isoDay(new Date());

/** FY2027 for a calendar year, FY2027-28 for a year that starts mid-year. */
const yearName = (start: Date) =>
  start.getMonth() === 0 ? `FY${start.getFullYear()}` : `FY${start.getFullYear()}-${String((start.getFullYear() + 1) % 100).padStart(2, "0")}`;

const yearFrom = (start: Date): FiscalYearCreateRequest => ({
  name: yearName(start),
  startDate: isoDay(start),
  endDate: isoDay(addDays(addMonths(start, 12), -1)),
});

/** The year right after the latest one, or the current calendar year when there are none. */
const suggestNextYear = (years: FiscalYear[]): FiscalYearCreateRequest => {
  const latest = years.reduce<FiscalYear | null>((acc, y) => (!acc || y.endDate > acc.endDate ? y : acc), null);
  const latestEnd = latest ? toDate(latest.endDate) : null;
  return yearFrom(latestEnd ? addDays(latestEnd, 1) : new Date(new Date().getFullYear(), 0, 1));
};

function StatusPill({ status }: { status: string }) {
  const Icon = STATUS_ICON[status as Status] ?? CheckCircle;
  return (
    <span className={s.pill} data-status={status}>
      <Icon />
      {status.toLowerCase()}
    </span>
  );
}

interface ConfirmState {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

export function FiscalPeriodsPage() {
  const [years, setYears] = useState<FiscalYear[]>([]);
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FiscalYearCreateRequest>(() => suggestNextYear([]));
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const loadYears = useCallback(async (selectId?: string) => {
    try {
      setLoading(true);
      const data = await fiscalYearService.getYears();
      setYears(data);
      setSelectedYearId((prev) => {
        const wanted = selectId ?? prev;
        if (wanted && data.some((y) => y.id === wanted)) return wanted;
        // Default to the year containing today, else the newest one
        const today = todayIso();
        return (data.find((y) => y.startDate <= today && y.endDate >= today) ?? data[0])?.id ?? "";
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to load fiscal years");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPeriods = useCallback(async (yearId: string) => {
    if (!yearId) { setPeriods([]); return; }
    try {
      setPeriodsLoading(true);
      setPeriods(await fiscalYearService.getPeriods(yearId));
    } catch (err: any) {
      toast.error(err.message || "Failed to load periods");
    } finally {
      setPeriodsLoading(false);
    }
  }, []);

  useEffect(() => { loadYears(); }, [loadYears]);
  useEffect(() => { loadPeriods(selectedYearId); }, [selectedYearId, loadPeriods]);

  const refreshAll = async () => {
    await loadYears();
    await loadPeriods(selectedYearId);
  };

  const selectedYear = years.find((y) => y.id === selectedYearId) ?? null;
  const today = todayIso();
  const currentPeriod = periods.find((p) => p.startDate <= today && p.endDate >= today) ?? null;
  const pastOpen = periods.filter((p) => p.status === "OPEN" && p.endDate < today);
  const counts = useMemo(() => ({
    OPEN: periods.filter((p) => p.status === "OPEN").length,
    CLOSED: periods.filter((p) => p.status === "CLOSED").length,
    LOCKED: periods.filter((p) => p.status === "LOCKED").length,
  }), [periods]);

  // Live check of the new-year form, mirroring the server's rules
  const formCheck = useMemo(() => {
    const start = toDate(form.startDate);
    const end = toDate(form.endDate);
    if (!form.name.trim()) return { error: "Give the year a name" };
    if (!start || !end) return { error: "Pick a start and end date" };
    if (end < start) return { error: "End date must be on or after the start date" };
    const months = differenceInCalendarMonths(end, start) + 1;
    if (months > 24) return { error: "A fiscal year can't be longer than 24 months" };
    if (years.some((y) => y.name.toLowerCase() === form.name.trim().toLowerCase())) {
      return { error: `${form.name.trim()} already exists` };
    }
    const overlap = years.find((y) => y.startDate <= form.endDate && y.endDate >= form.startDate);
    if (overlap) return { error: `Overlaps ${overlap.name} (${fmt(overlap.startDate)} – ${fmt(overlap.endDate)})` };
    return {
      error: null,
      summary: `${months} monthly period${months === 1 ? "" : "s"}: ${format(start, "MMM yyyy")} – ${format(end, "MMM yyyy")}, all open`,
    };
  }, [form, years]);

  const openNewYear = () => {
    setForm(suggestNextYear(years));
    setIsFormOpen(true);
  };

  const handleCreateYear = async () => {
    if (formCheck.error) { toast.error(formCheck.error); return; }
    try {
      setCreating(true);
      const created = await fiscalYearService.createYear({ ...form, name: form.name.trim() });
      toast.success(`${created.name} created with its monthly periods`);
      setIsFormOpen(false);
      await loadYears(created.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create fiscal year");
    } finally {
      setCreating(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    try {
      setConfirmBusy(true);
      await confirm.run();
      setConfirm(null);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setConfirmBusy(false);
    }
  };

  const askYearAction = (y: FiscalYear, action: "close" | "reopen" | "delete") => {
    if (action === "close") {
      setConfirm({
        title: `Close ${y.name}?`,
        description: <>Closes its <strong>{y.openPeriods} open period{y.openPeriods === 1 ? "" : "s"}</strong>, so nothing new can be posted to
          {" "}{fmt(y.startDate)} – {fmt(y.endDate)}: receipts, expenses, vouchers or reversals dated in this year will be refused.
          Locked periods stay locked. You can reopen the year later.</>,
        confirmLabel: "Close year",
        run: async () => {
          await fiscalYearService.closeYear(y.id);
          toast.success(`${y.name} closed`);
          await refreshAll();
        },
      });
    } else if (action === "reopen") {
      setConfirm({
        title: `Reopen ${y.name}?`,
        description: <>Reopens its <strong>{y.closedPeriods} closed period{y.closedPeriods === 1 ? "" : "s"}</strong> so postings are allowed again.
          {y.lockedPeriods > 0 && <> The {y.lockedPeriods} locked period{y.lockedPeriods === 1 ? "" : "s"} stay locked — reopen those one by one.</>}</>,
        confirmLabel: "Reopen year",
        run: async () => {
          await fiscalYearService.reopenYear(y.id);
          toast.success(`${y.name} reopened`);
          await refreshAll();
        },
      });
    } else {
      setConfirm({
        title: `Delete ${y.name}?`,
        description: <>Removes the year and its periods. Only possible while no journal entry is dated inside it —
          otherwise close the year instead. Postings to these dates will then be allowed by default.</>,
        confirmLabel: "Delete year",
        destructive: true,
        run: async () => {
          await fiscalYearService.deleteYear(y.id);
          toast.success(`${y.name} deleted`);
          await loadYears();
        },
      });
    }
  };

  const askPeriodAction = (p: FiscalPeriod, action: "close" | "lock" | "reopen") => {
    const entries = p.voucherCount ?? 0;
    const copy = {
      close: {
        title: `Close ${p.name}?`,
        description: <>New postings dated {fmt(p.startDate)} – {fmt(p.endDate)} will be refused until it's reopened.
          {entries > 0 && <> Its {entries} existing entr{entries === 1 ? "y stays" : "ies stay"} as they are.</>}</>,
        label: "Close period",
      },
      lock: {
        title: `Lock ${p.name}?`,
        description: <>Locking marks the month as final (e.g. after the books are reconciled). Postings are refused, and closing
          or reopening the whole year won't unlock it — only reopening this period will.</>,
        label: "Lock period",
      },
      reopen: {
        title: `Reopen ${p.name}?`,
        description: <>Postings dated {fmt(p.startDate)} – {fmt(p.endDate)} will be allowed again.</>,
        label: "Reopen period",
      },
    }[action];
    setConfirm({
      title: copy.title,
      description: copy.description,
      confirmLabel: copy.label,
      destructive: action === "lock",
      run: async () => {
        if (action === "close") await fiscalYearService.closePeriod(p.id);
        else if (action === "lock") await fiscalYearService.lockPeriod(p.id);
        else await fiscalYearService.reopenPeriod(p.id);
        toast.success(`${p.name} ${action === "close" ? "closed" : action === "lock" ? "locked" : "reopened"}`);
        await refreshAll();
      },
    });
  };

  const askClosePast = () => {
    if (pastOpen.length === 0) return;
    setConfirm({
      title: `Close ${pastOpen.length} past period${pastOpen.length === 1 ? "" : "s"}?`,
      description: <>Closes every open month that has already ended ({pastOpen.map((p) => p.name).join(", ")}).
        The current and future months stay open.</>,
      confirmLabel: "Close past periods",
      run: async () => {
        for (const p of pastOpen) await fiscalYearService.closePeriod(p.id);
        toast.success(`${pastOpen.length} period${pastOpen.length === 1 ? "" : "s"} closed`);
        await refreshAll();
      },
    });
  };

  return (
    <div className={s.root}>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Fiscal Years &amp; Periods</h1>
          <p className={s.subtitle}>
            Close or lock a month to stop new postings — receipts, expenses, vouchers and reversals — from landing in it.
            Dates outside every fiscal year are still allowed.
          </p>
        </div>
        <div className={s.actions}>
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"} />Refresh
          </Button>
          <Button size="sm" className="btn-primary" onClick={openNewYear}>
            <Plus className="h-4 w-4 mr-2" />New Fiscal Year
          </Button>
        </div>
      </div>

      <div className={`${s.card} ${s.legend}`}>
        <span className={s.legendItem} data-status="OPEN"><StatusPill status="OPEN" /><span><strong>Open</strong> — postings allowed</span></span>
        <span className={s.legendItem} data-status="CLOSED"><StatusPill status="CLOSED" /><span><strong>Closed</strong> — postings refused; reopens with its year</span></span>
        <span className={s.legendItem} data-status="LOCKED"><StatusPill status="LOCKED" /><span><strong>Locked</strong> — final; only reopening that month undoes it</span></span>
      </div>

      {!loading && years.length === 0 ? (
        <div className={`${s.card} ${s.empty}`}>
          <div className={s.emptyIcon}><CalendarClock /></div>
          <h3>No fiscal years yet</h3>
          <p>Create one to start closing months. Until then every date accepts postings.</p>
          <Button className="btn-primary mt-2" onClick={openNewYear}><Plus className="h-4 w-4 mr-2" />New Fiscal Year</Button>
        </div>
      ) : (
        <div className={s.layout}>
          <div className={`${s.card} ${s.panel}`}>
            <div className={s.panelHead}>
              <h2 className={s.panelTitle}><CalendarClock />Fiscal years</h2>
              <span className={s.panelSub}>{years.length} total</span>
            </div>
            <div className={s.yearList}>
              {years.map((y) => {
                const total = y.openPeriods + y.closedPeriods + y.lockedPeriods;
                return (
                  <button key={y.id} type="button" className={s.year} data-selected={y.id === selectedYearId} onClick={() => setSelectedYearId(y.id)}>
                    <div className={s.yearTop}>
                      <span className={s.yearName}>{y.name}</span>
                      <StatusPill status={y.status} />
                    </div>
                    <span className={s.yearDates}>{fmt(y.startDate)} – {fmt(y.endDate)}</span>
                    {total > 0 && (
                      <div className={s.segments} aria-hidden="true">
                        {Array.from({ length: y.lockedPeriods }, (_, i) => <span key={`l${i}`} className={s.segment} data-status="LOCKED" />)}
                        {Array.from({ length: y.closedPeriods }, (_, i) => <span key={`c${i}`} className={s.segment} data-status="CLOSED" />)}
                        {Array.from({ length: y.openPeriods }, (_, i) => <span key={`o${i}`} className={s.segment} data-status="OPEN" />)}
                      </div>
                    )}
                    <div className={s.yearCounts}>
                      <span data-status="OPEN" data-zero={y.openPeriods === 0}>{y.openPeriods} open</span>
                      <span data-status="CLOSED" data-zero={y.closedPeriods === 0}>{y.closedPeriods} closed</span>
                      <span data-status="LOCKED" data-zero={y.lockedPeriods === 0}>{y.lockedPeriods} locked</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedYear && (
            <div className={s.detail}>
              <div className={`${s.card} ${s.detailHead}`}>
                <div>
                  <div className={s.detailName}>
                    <h2>{selectedYear.name}</h2>
                    <StatusPill status={selectedYear.status} />
                  </div>
                  <div className={s.detailDates}>{fmt(selectedYear.startDate)} – {fmt(selectedYear.endDate)}</div>
                </div>
                <div className={s.actions}>
                  {selectedYear.status === "OPEN" && pastOpen.length > 0 && (
                    <Button variant="outline" size="sm" onClick={askClosePast}>
                      <CalendarCheck className="h-4 w-4 mr-2" />Close past months ({pastOpen.length})
                    </Button>
                  )}
                  {selectedYear.status === "OPEN" ? (
                    <Button variant="outline" size="sm" className={s.warnBtn} onClick={() => askYearAction(selectedYear, "close")}>
                      <XCircle className="h-4 w-4 mr-2" />Close year
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => askYearAction(selectedYear, "reopen")}>
                      <Unlock className="h-4 w-4 mr-2" />Reopen year
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => askYearAction(selectedYear, "delete")}>
                    <Trash2 className="h-4 w-4 mr-2" />Delete
                  </Button>
                </div>
              </div>

              <div className={s.kpis}>
                <div className={`${s.card} ${s.kpi}`} data-tone={currentPeriod ? undefined : "teal"} data-status={currentPeriod?.status}>
                  <span className={s.kpiLabel}>Current period</span>
                  <span className={s.kpiValue}>{currentPeriod ? currentPeriod.name : "—"}</span>
                  <span className={s.kpiHint}>
                    {currentPeriod
                      ? currentPeriod.status === "OPEN" ? "Accepting postings" : "Today's postings are refused"
                      : "Today isn't in this year"}
                  </span>
                </div>
                <div className={`${s.card} ${s.kpi}`} data-status="OPEN">
                  <span className={s.kpiLabel}>Open</span>
                  <span className={s.kpiValue}>{counts.OPEN}</span>
                  <span className={s.kpiHint}>postings allowed</span>
                </div>
                <div className={`${s.card} ${s.kpi}`} data-status="CLOSED">
                  <span className={s.kpiLabel}>Closed</span>
                  <span className={s.kpiValue}>{counts.CLOSED}</span>
                  <span className={s.kpiHint}>can be reopened</span>
                </div>
                <div className={`${s.card} ${s.kpi}`} data-status="LOCKED">
                  <span className={s.kpiLabel}>Locked</span>
                  <span className={s.kpiValue}>{counts.LOCKED}</span>
                  <span className={s.kpiHint}>final</span>
                </div>
              </div>

              <div className={`${s.card} ${s.panel}`}>
                <div className={s.panelHead}>
                  <h2 className={s.panelTitle}><CalendarCheck />Periods</h2>
                  {periodsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Dates</th>
                        <th>Journal entries</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((p) => {
                        const isCurrent = p.id === currentPeriod?.id;
                        return (
                          <tr key={p.id} data-current={isCurrent}>
                            <td>
                              <span className={s.periodName}>{p.name}{isCurrent && <span className={s.current}>Current</span>}</span>
                            </td>
                            <td className={s.muted}>{fmt(p.startDate)} – {fmt(p.endDate)}</td>
                            <td><span className={s.entries} data-zero={!p.voucherCount}>{p.voucherCount ?? "—"}</span></td>
                            <td><StatusPill status={p.status} /></td>
                            <td>
                              <div className={s.rowActions}>
                                {p.status === "OPEN" && (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => askPeriodAction(p, "close")}>
                                      <XCircle className="h-3.5 w-3.5 mr-1" />Close
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => askPeriodAction(p, "lock")}>
                                      <Lock className="h-3.5 w-3.5 mr-1" />Lock
                                    </Button>
                                  </>
                                )}
                                {p.status === "CLOSED" && (
                                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => askPeriodAction(p, "lock")}>
                                    <Lock className="h-3.5 w-3.5 mr-1" />Lock
                                  </Button>
                                )}
                                {(p.status === "CLOSED" || p.status === "LOCKED") && (
                                  <span title={selectedYear.status === "CLOSED" ? "Reopen the year first" : undefined}>
                                    <Button variant="outline" size="sm" disabled={selectedYear.status === "CLOSED"} onClick={() => askPeriodAction(p, "reopen")}>
                                      <Unlock className="h-3.5 w-3.5 mr-1" />Reopen
                                    </Button>
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!periodsLoading && periods.length === 0 && (
                  <p className={s.panelSub}>This year has no periods.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New fiscal year */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Fiscal Year</DialogTitle>
            <DialogDescription>Creates the year and one open period per month in a single step.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Starts from</Label>
              <div className={s.presets}>
                <button type="button" className={s.preset} onClick={() => setForm(suggestNextYear(years))}>After the latest year</button>
                <button type="button" className={s.preset} onClick={() => setForm(yearFrom(new Date(new Date().getFullYear() + (years.some((y) => y.name === `FY${new Date().getFullYear()}`) ? 1 : 0), 0, 1)))}>Calendar year (Jan–Dec)</button>
                <button type="button" className={s.preset} onClick={() => {
                  const now = new Date();
                  setForm(yearFrom(new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1)));
                }}>April–March</button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. FY2027" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className={s.preview} data-error={!!formCheck.error}>{formCheck.error ?? formCheck.summary}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateYear} className="btn-primary" disabled={!!formCheck.error || creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Fiscal Year
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm any status change / delete */}
      <Dialog open={!!confirm} onOpenChange={(open) => { if (!open && !confirmBusy) setConfirm(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground leading-relaxed">{confirm?.description}</div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={confirmBusy}>Cancel</Button>
            <Button
              onClick={runConfirm}
              disabled={confirmBusy}
              className={confirm?.destructive ? "bg-red-600 hover:bg-red-700 text-white" : "btn-primary"}
            >
              {confirmBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{confirm?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
