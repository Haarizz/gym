import React, { useEffect, useMemo, useState } from "react";
import { Ban, CalendarRange, CheckCircle2, Dumbbell, Edit3, Package, Plus, Power, Search, Trash2, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { MemberStatCards } from "../members/MemberStatCards";
import { MemberAvatar } from "../members/MemberAvatar";
import { useCurrency } from "../../utils/currency";
import { staffService, type Staff } from "../../utils/supabase/staff-service";
import {
  COMMISSION_TIMING_LABEL, ENROLMENT_STATUS_LABEL, enrolmentProgress, packageService, packageSummary,
  type CommissionTiming, type EnrolmentStatus, type NoShowPolicy, type PackageEnrolment, type PackagePlanType,
  type TrainingPackage, type TrainingPackageRequest, type UnusedAtExpiry,
} from "../../utils/supabase/package-service";
import s from "./trainings.module.css";

const STATUS_TONE: Record<EnrolmentStatus, string> = {
  active: "green", upcoming: "blue", completed: "teal", expired: "gray", cancelled: "red",
};

interface FormState {
  name: string;
  description: string;
  plan_type: PackagePlanType;
  session_count: string;
  session_cap: string;
  validity_days: string;
  price: string;
  default_trainer_id: string;
  commission_timing: CommissionTiming;
  unused_at_expiry: UnusedAtExpiry;
  no_show_policy: NoShowPolicy;
}

const EMPTY_FORM: FormState = {
  name: "", description: "", plan_type: "sessions", session_count: "15", session_cap: "", validity_days: "60", price: "",
  default_trainer_id: "none", commission_timing: "enrolment", unused_at_expiry: "forfeit", no_show_policy: "counts",
};

const toForm = (p: TrainingPackage): FormState => ({
  name: p.name,
  description: p.description ?? "",
  plan_type: p.plan_type,
  session_count: p.session_count != null ? String(p.session_count) : "",
  session_cap: p.session_cap != null ? String(p.session_cap) : "",
  validity_days: String(p.validity_days),
  price: String(p.price),
  default_trainer_id: p.default_trainer_id != null ? String(p.default_trainer_id) : "none",
  commission_timing: p.commission_timing,
  unused_at_expiry: p.unused_at_expiry,
  no_show_policy: p.no_show_policy,
});

const formatDay = (iso?: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** A radio-style choice card used for the package rules. */
function Choice({ selected, title, sub, onClick }: { selected: boolean; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={`text-left rounded-lg border p-3 transition-colors ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:bg-muted/40"}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </button>
  );
}

export function TrainingPackagesTab() {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<TrainingPackage[]>([]);
  const [enrolments, setEnrolments] = useState<PackageEnrolment[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainers, setTrainers] = useState<Staff[]>([]);
  const [view, setView] = useState<"catalogue" | "sold">("catalogue");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [editing, setEditing] = useState<TrainingPackage | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [changing, setChanging] = useState<PackageEnrolment | null>(null);
  const [newTrainer, setNewTrainer] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayIso());
  const [cancelling, setCancelling] = useState<PackageEnrolment | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([packageService.list(), packageService.enrolments()])
      .then(([p, e]) => { setPackages(p); setEnrolments(e); })
      .catch((err) => toast.error(err?.message || "Failed to load packages"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    staffService.getStaff({}, 1, 200).then((r) => setTrainers(r.items.filter((x) => x.status !== "inactive"))).catch(() => {});
  }, []);

  const counts = useMemo(() => ({
    packages: packages.filter((p) => p.is_active).length,
    active: enrolments.filter((e) => e.status === "active" || e.status === "upcoming").length,
    completed: enrolments.filter((e) => e.status === "completed").length,
    expired: enrolments.filter((e) => e.status === "expired").length,
  }), [packages, enrolments]);

  const q = search.trim().toLowerCase();
  const packageRows = packages.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.default_trainer_name ?? "").toLowerCase().includes(q));
  const enrolmentRows = enrolments.filter((e) =>
    (statusFilter === "all" || (statusFilter === "active" ? e.status === "active" || e.status === "upcoming" : e.status === statusFilter))
    && (!q || [e.package_name, e.member_name, e.member_code, e.trainer_name].some((v) => (v ?? "").toLowerCase().includes(q))));

  // ── Package form ─────────────────────────────────────────────────────────

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (p: TrainingPackage) => { setEditing(p); setForm(toForm(p)); setFormOpen(true); };
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const body: TrainingPackageRequest = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      plan_type: form.plan_type,
      session_count: form.plan_type === "sessions" ? Number(form.session_count) || null : null,
      session_cap: form.plan_type === "days" && form.session_cap ? Number(form.session_cap) : null,
      validity_days: Number(form.validity_days),
      price: Number(form.price),
      default_trainer_id: form.default_trainer_id !== "none" ? Number(form.default_trainer_id) : null,
      commission_timing: form.commission_timing,
      unused_at_expiry: form.unused_at_expiry,
      no_show_policy: form.no_show_policy,
    };
    if (!body.name) return toast.error("Enter a package name");
    if (form.price === "" || Number.isNaN(body.price)) return toast.error("Enter a price");
    setSaving(true);
    try {
      if (editing) await packageService.update(editing.id, body);
      else await packageService.create(body);
      toast.success(editing ? "Package updated" : "Package created");
      setFormOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p: TrainingPackage) => {
    try {
      await packageService.toggleActive(p.id);
      toast.success(p.is_active ? `${p.name} is no longer on sale` : `${p.name} is on sale again`);
      load();
    } catch (err: any) { toast.error(err?.message || "Failed to update package"); }
  };

  const remove = async (p: TrainingPackage) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    try {
      await packageService.remove(p.id);
      toast.success("Package deleted");
      load();
    } catch (err: any) { toast.error(err?.message || "Failed to delete package"); }
  };

  // ── Sold packages ────────────────────────────────────────────────────────

  const confirmTrainerChange = async () => {
    if (!changing || !newTrainer) return;
    setBusy(true);
    try {
      await packageService.changeTrainer(changing.id, Number(newTrainer), effectiveDate);
      toast.success("Trainer changed");
      setChanging(null);
      load();
    } catch (err: any) { toast.error(err?.message || "Failed to change trainer"); } finally { setBusy(false); }
  };

  const confirmCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      await packageService.cancel(cancelling.id);
      toast.success("Package cancelled — what was paid went back to the member's wallet");
      setCancelling(null);
      load();
    } catch (err: any) { toast.error(err?.message || "Failed to cancel package"); } finally { setBusy(false); }
  };

  const perSession = form.plan_type === "sessions" && Number(form.session_count) > 0 && Number(form.price) > 0
    ? formatCurrency(Number(form.price) / Number(form.session_count)) : null;

  return (
    <>
      <MemberStatCards
        cards={[
          { key: "catalogue", label: "Packages on Sale", value: loading ? null : counts.packages, sub: "In the catalogue", icon: Package, tone: "primary" },
          { key: "active", label: "Active", value: loading ? null : counts.active, sub: "Members training now", icon: Users, tone: "blue" },
          { key: "completed", label: "Completed", value: loading ? null : counts.completed, sub: "All sessions used", icon: CheckCircle2, tone: "green" },
          { key: "expired", label: "Expired", value: loading ? null : counts.expired, sub: "Ran out of time", icon: CalendarRange, tone: "amber" },
        ]}
        activeKey={view === "catalogue" ? "catalogue" : statusFilter === "all" ? null : statusFilter}
        onSelect={(key) => {
          if (key === "catalogue") { setView("catalogue"); return; }
          setView("sold");
          setStatusFilter(statusFilter === key ? "all" : key);
        }}
      />

      <div className={s.panel}>
        <div className={s.panelTop}>
          <div className={s.panelHead}>
            <div>
              <p className={s.panelTitle}>PT Packages</p>
              <p className={s.panelSub}>
                Session-based or day-based personal training, and when the trainer's commission counts.
                Sell a package from Members → Add-ons.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => navigate("/member-addons")}><Dumbbell className="h-4 w-4" /> Sell a Package</Button>
              <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> New Package</Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className={s.pageTabs} role="tablist" aria-label="Package views">
              <button type="button" role="tab" className={s.pageTab} data-active={view === "catalogue"} aria-selected={view === "catalogue"} onClick={() => setView("catalogue")}>
                <Package /> Catalogue
              </button>
              <button type="button" role="tab" className={s.pageTab} data-active={view === "sold"} aria-selected={view === "sold"} onClick={() => setView("sold")}>
                <Users /> Sold Packages
              </button>
            </div>
            <div className={`${s.search} flex-1 min-w-[14rem]`}>
              <Search />
              <Input placeholder={view === "catalogue" ? "Search packages or trainers…" : "Search member, package or trainer…"}
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {view === "sold" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={`${s.filterSelect} w-44`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active & Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className={s.tableWrap}>
          {view === "catalogue" ? (
            <table className={s.table}>
              <thead>
                <tr><th>Package</th><th>Type</th><th>Price</th><th>Default Trainer</th><th>Commission</th><th>Status</th><th className={s.right}>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className={s.tableMessage}>Loading packages…</td></tr>
                ) : packageRows.length === 0 ? (
                  <tr><td colSpan={7} className={s.tableMessage}>{packages.length === 0 ? "No packages yet. Create a PT package to start selling it." : "No packages match this search."}</td></tr>
                ) : packageRows.map((p) => (
                  <tr key={p.id} data-cancelled={!p.is_active}>
                    <td>
                      <div className={s.sessionCell}>
                        <span className={s.typeIcon} data-tone="red"><Dumbbell /></span>
                        <div>
                          <button type="button" className={s.sessionName} onClick={() => openEdit(p)}>{p.name}</button>
                          <p className={s.sub}>{packageSummary(p)}</p>
                        </div>
                      </div>
                    </td>
                    <td>{p.plan_type === "sessions" ? "Session-based" : "Day-based"}</td>
                    <td className={s.when}>{formatCurrency(p.price)}</td>
                    <td>{p.default_trainer_name ? <div className={s.person}><MemberAvatar name={p.default_trainer_name} photo={null} size={28} />{p.default_trainer_name}</div> : <span className={s.sub}>Chosen at sale</span>}</td>
                    <td>
                      <p>{COMMISSION_TIMING_LABEL[p.commission_timing]}</p>
                      {p.commission_timing === "completion" && p.plan_type === "sessions" && (
                        <p className={s.sub}>Unused sessions: {p.unused_at_expiry === "forfeit" ? "forfeited" : "paid at expiry"}</p>
                      )}
                    </td>
                    <td><span className={s.pill} data-tone={p.is_active ? "green" : "gray"}>{p.is_active ? "On sale" : "Inactive"}</span></td>
                    <td>
                      <div className={s.actions}>
                        <button type="button" className={s.iconBtn} data-tone="gray" title="Edit package" onClick={() => openEdit(p)}><Edit3 /></button>
                        <button type="button" className={s.iconBtn} data-tone={p.is_active ? "amber" : "green"} title={p.is_active ? "Stop selling" : "Put on sale"} onClick={() => toggle(p)}><Power /></button>
                        <button type="button" className={s.iconBtn} data-tone="red" title={p.sold ? "Sold packages can't be deleted — deactivate instead" : "Delete package"} disabled={p.sold} onClick={() => remove(p)}><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className={s.table}>
              <thead>
                <tr><th>Member</th><th>Package</th><th>Trainer</th><th>Progress</th><th>Dates</th><th>Commission</th><th>Status</th><th className={s.right}>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className={s.tableMessage}>Loading packages…</td></tr>
                ) : enrolmentRows.length === 0 ? (
                  <tr><td colSpan={8} className={s.tableMessage}>{enrolments.length === 0 ? "No packages sold yet." : "No packages match these filters."}</td></tr>
                ) : enrolmentRows.map((e) => {
                  const closed = e.status === "cancelled" || e.status === "expired" || e.status === "completed";
                  const pct = e.sessions_total ? Math.min(100, Math.round((e.sessions_used / e.sessions_total) * 100))
                    : e.day_number ? Math.min(100, Math.round((e.day_number / e.validity_days) * 100)) : 0;
                  return (
                    <tr key={e.id} data-cancelled={e.status === "cancelled"}>
                      <td>
                        <div className={s.person}>
                          <MemberAvatar name={e.member_name ?? "?"} photo={null} size={30} />
                          <div>
                            <p className="font-medium">{e.member_name ?? "—"}</p>
                            <p className={s.sub}>{e.member_code ?? ""}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="font-medium">{e.package_name}</p>
                        <p className={s.sub}>{e.transaction_id ?? ""}{e.payment_status === "Pending Approval" ? " · payment pending" : ""}</p>
                      </td>
                      <td>
                        {e.trainer_name ?? <span className={s.sub}>—</span>}
                        {e.trainer_changes.length > 0 && <p className={s.sub}>Changed {formatDay(e.trainer_changes[e.trainer_changes.length - 1].effective_date)}</p>}
                      </td>
                      <td>
                        <p className="text-sm">{enrolmentProgress(e)}</p>
                        <div className="mt-1.5 h-1.5 w-36 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                        {e.sessions_booked > 0 && <p className={s.sub}>{e.sessions_booked} upcoming booked</p>}
                      </td>
                      <td className={s.when}>
                        <p>{formatDay(e.start_date)}</p>
                        <p className={s.sub}>to {formatDay(e.end_date)}</p>
                      </td>
                      <td>{COMMISSION_TIMING_LABEL[e.commission_timing]}</td>
                      <td><span className={s.pill} data-tone={STATUS_TONE[e.status]}>{ENROLMENT_STATUS_LABEL[e.status]}</span></td>
                      <td>
                        <div className={s.actions}>
                          <button type="button" className={s.iconBtn} data-tone="blue" title="Change trainer" disabled={closed}
                            onClick={() => { setChanging(e); setNewTrainer(""); setEffectiveDate(todayIso()); }}><UserCog /></button>
                          <button type="button" className={s.iconBtn} data-tone="red" title="Cancel package" disabled={e.status === "cancelled"}
                            onClick={() => setCancelling(e)}><Ban /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create / edit package */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Package" : "New PT Package"}</DialogTitle>
            <DialogDescription>
              {editing?.sold ? "Packages already sold keep the rules they were sold with — changes apply to new sales only." : "Members buy this from the Add-ons screen; PT bookings then use it up."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Package name</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. PT 15 Sessions" />
              </div>
              <div className="sm:col-span-2">
                <Label>Description (optional)</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={500} />
              </div>
            </div>

            <div>
              <Label>Package type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                <Choice selected={form.plan_type === "sessions"} title="Session-based" sub="A number of sessions to use within a time limit, e.g. 15 sessions in 2 months"
                  onClick={() => setForm((f) => ({ ...f, plan_type: "sessions", session_count: f.session_count || "15", validity_days: f.validity_days || "60" }))} />
                <Choice selected={form.plan_type === "days"} title="Day-based" sub="A number of days, e.g. a 30-day plan — unlimited sessions or a cap"
                  onClick={() => setForm((f) => ({ ...f, plan_type: "days", validity_days: f.plan_type === "days" ? f.validity_days : "30" }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {form.plan_type === "sessions" ? (
                <div>
                  <Label>Sessions included</Label>
                  <Input type="number" min={1} value={form.session_count} onChange={(e) => set("session_count", e.target.value)} />
                </div>
              ) : (
                <div>
                  <Label>Session cap (optional)</Label>
                  <Input type="number" min={1} value={form.session_cap} onChange={(e) => set("session_cap", e.target.value)} placeholder="Unlimited" />
                </div>
              )}
              <div>
                <Label>{form.plan_type === "sessions" ? "Use within (days)" : "Length (days)"}</Label>
                <Input type="number" min={1} max={3650} value={form.validity_days} onChange={(e) => set("validity_days", e.target.value)} />
              </div>
              <div>
                <Label>Price</Label>
                <Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} />
                {perSession && <p className="text-xs text-muted-foreground mt-1">{perSession} per session</p>}
              </div>
            </div>

            <div>
              <Label>Default trainer</Label>
              <Select value={form.default_trainer_id} onValueChange={(v) => set("default_trainer_id", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose at sale</SelectItem>
                  {trainers.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}{t.role ? ` · ${t.role}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>When does the trainer's commission count?</Label>
              <p className="text-xs text-muted-foreground mt-0.5">The member's payment counts toward the trainer's target in full either way. The commission % is set per role in Targets & Commission.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                <Choice selected={form.commission_timing === "enrolment"} title="On booking" sub="Full commission in the month the member pays"
                  onClick={() => set("commission_timing", "enrolment")} />
                <Choice selected={form.commission_timing === "completion"} title="On completion"
                  sub={form.plan_type === "sessions" ? "Commission spread over the months it takes — a share for each session used" : "Commission spread over the months — a share for each day the plan covers"}
                  onClick={() => set("commission_timing", "completion")} />
              </div>
            </div>

            {form.commission_timing === "completion" && form.plan_type === "sessions" && (
              <div>
                <Label>Sessions still unused when the package expires</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                  <Choice selected={form.unused_at_expiry === "forfeit"} title="Forfeit" sub="The trainer earns nothing for them"
                    onClick={() => set("unused_at_expiry", "forfeit")} />
                  <Choice selected={form.unused_at_expiry === "pay_at_expiry"} title="Pay at expiry" sub="The trainer gets their share on the last day"
                    onClick={() => set("unused_at_expiry", "pay_at_expiry")} />
                </div>
              </div>
            )}

            <div>
              <Label>When a member doesn't show up for a booked session</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                <Choice selected={form.no_show_policy === "counts"} title="Counts as used" sub="The member loses the session; the trainer is paid for it"
                  onClick={() => set("no_show_policy", "counts")} />
                <Choice selected={form.no_show_policy === "not_counted"} title="Doesn't count" sub="The member keeps the session; the trainer isn't paid for it"
                  onClick={() => set("no_show_policy", "not_counted")} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Save Changes" : "Create Package"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change trainer */}
      <Dialog open={!!changing} onOpenChange={(o) => !o && setChanging(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Trainer</DialogTitle>
            <DialogDescription>
              {changing?.member_name}'s {changing?.package_name}. What was earned before the change stays with {changing?.trainer_name ?? "the current trainer"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New trainer</Label>
              <Select value={newTrainer} onValueChange={setNewTrainer}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose a trainer" /></SelectTrigger>
                <SelectContent>
                  {trainers.filter((t) => String(t.id) !== String(changing?.trainer_id)).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From</Label>
              <Input type="date" value={effectiveDate} min={changing?.start_date} max={changing?.end_date} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChanging(null)}>Back</Button>
            <Button onClick={confirmTrainerChange} disabled={busy || !newTrainer}>{busy ? "Saving…" : "Change Trainer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel package */}
      <Dialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel {cancelling?.package_name}?</DialogTitle>
            <DialogDescription>
              What {cancelling?.member_name} paid goes back to their wallet, and their upcoming bookings on this package are cancelled.
              {cancelling?.commission_timing === "completion" ? " Commission the trainer already earned for sessions or days used stays theirs." : " The trainer's commission for this sale is taken back."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>Keep Package</Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={busy}>{busy ? "Cancelling…" : "Cancel Package"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
