import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ExternalLink, RefreshCw, Search, UserPlus } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ListPagination } from "../list-pagination";
import { useCurrency } from "../../utils/currency";
import { useBranch } from "../../utils/branch-context";
import { useDebouncedValue } from "../../utils/use-debounced-value";
import { resolveBackendImageUrl } from "../../utils/resolve-image-url";
import { membersService, type Member, type MemberFilters } from "../../utils/supabase/members-service";
import s from "./NewMembersTab.module.css";

const PAGE_SIZE = 20;

type Preset =
  | "today" | "yesterday" | "this-week" | "last-week" | "this-month" | "last-month"
  | "this-quarter" | "last-quarter" | "this-year" | "last-year" | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this-week", label: "This Week" },
  { value: "last-week", label: "Last Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-quarter", label: "This Quarter" },
  { value: "last-quarter", label: "Last Quarter" },
  { value: "this-year", label: "This Year" },
  { value: "last-year", label: "Last Year" },
  { value: "custom", label: "Custom" },
];

/** The preset's join-date window in local time: from inclusive, to exclusive. Weeks start on Monday. */
function presetRange(preset: Preset, customFrom: string, customTo: string): { from?: Date; to?: Date } {
  const now = new Date();
  const day = (y: number, m: number, d: number) => new Date(y, m, d);
  const today = day(now.getFullYear(), now.getMonth(), now.getDate());
  const addDays = (d: Date, n: number) => day(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const weekStart = addDays(today, -((today.getDay() + 6) % 7));
  const q = Math.floor(now.getMonth() / 3) * 3;
  switch (preset) {
    case "today": return { from: today, to: addDays(today, 1) };
    case "yesterday": return { from: addDays(today, -1), to: today };
    case "this-week": return { from: weekStart, to: addDays(today, 1) };
    case "last-week": return { from: addDays(weekStart, -7), to: weekStart };
    case "this-month": return { from: day(now.getFullYear(), now.getMonth(), 1), to: addDays(today, 1) };
    case "last-month": return { from: day(now.getFullYear(), now.getMonth() - 1, 1), to: day(now.getFullYear(), now.getMonth(), 1) };
    case "this-quarter": return { from: day(now.getFullYear(), q, 1), to: addDays(today, 1) };
    case "last-quarter": return { from: day(now.getFullYear(), q - 3, 1), to: day(now.getFullYear(), q, 1) };
    case "this-year": return { from: day(now.getFullYear(), 0, 1), to: addDays(today, 1) };
    case "last-year": return { from: day(now.getFullYear() - 1, 0, 1), to: day(now.getFullYear(), 0, 1) };
    case "custom": {
      const parse = (v: string) => { const [y, m, d] = v.split("-").map(Number); return day(y, m - 1, d); };
      return {
        from: customFrom ? parse(customFrom) : undefined,
        to: customTo ? addDays(parse(customTo), 1) : undefined,
      };
    }
  }
}

const fmtDay = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map(p => p[0]).join("").toUpperCase() : "?";
}

/** Same rule as the directory: active and not past the end date, otherwise the stored status. */
function statusOf(m: Member): { label: string; tone: string } {
  const raw = (m.membership_status ?? "").toLowerCase();
  const end = (m as any).membership_end_date || (m as any).expiry_date;
  if (raw === "active" && end && new Date(end) < new Date(new Date().toDateString())) return { label: "Expired", tone: "red" };
  if (raw === "active") return { label: "Active", tone: "green" };
  if (raw === "pending_approval") return { label: "Pending approval", tone: "amber" };
  if (raw === "frozen") return { label: "Frozen", tone: "teal" };
  return { label: raw ? raw.replace(/_/g, " ") : "—", tone: "amber" };
}

/**
 * Members › New Members: who joined in a period (Today by default), with counts, a plan
 * filter and search. Paged by the server like the directory.
 */
export function NewMembersTab({ planNames, onOpenMember, initialPreset }: {
  planNames: string[];
  onOpenMember: (member: Member) => void;
  /** Date preset to open on (e.g. from the dashboard's Subscriptions (New) card). */
  initialPreset?: string;
}) {
  const { formatCurrency } = useCurrency();
  const { activeBranchId } = useBranch();
  const startPreset = (PRESETS.some(p => p.value === initialPreset) ? initialPreset : "today") as Preset;
  const [preset, setPreset] = useState<Preset>(startPreset);
  // Opened again from the dashboard with another period while already on this tab.
  useEffect(() => { setPreset(startPreset); }, [startPreset]);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [plan, setPlan] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<{ active: number; pending: number; dues: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => presetRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const filters = useMemo<MemberFilters>(() => ({
    joined_from: range.from,
    joined_to: range.to,
    plan: plan !== "all" ? plan : undefined,
    search: debouncedSearch || undefined,
  }), [range, plan, debouncedSearch]);

  useEffect(() => { setPage(1); }, [filters, activeBranchId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    membersService.getMembers(filters, { page, limit: PAGE_SIZE })
      .then(r => { if (!cancelled) { setRows(r.members); setTotal(Number(r.pagination?.total ?? r.members.length)); } })
      .catch(e => { if (!cancelled) setError(e?.message || "Could not load new members"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters, page, activeBranchId]);

  // Tile counts: one count query each (limit 1 — only the total is read).
  useEffect(() => {
    let cancelled = false;
    const count = (extra: MemberFilters) => membersService.getMembers({ ...filters, ...extra }, { page: 1, limit: 1 })
      .then(r => Number(r.pagination?.total ?? 0)).catch(() => 0);
    Promise.all([count({ status: "active" }), count({ status: "pending_approval" }), count({ dues: "due" })])
      .then(([active, pending, dues]) => { if (!cancelled) setCounts({ active, pending, dues }); });
    return () => { cancelled = true; };
  }, [filters, activeBranchId]);

  const reset = () => { setPreset("today"); setCustomFrom(""); setCustomTo(""); setPlan("all"); setSearch(""); };
  const rangeLabel = range.from && range.to
    ? (range.to.getTime() - range.from.getTime() <= 86400000 ? fmtDay(range.from) : `${fmtDay(range.from)} – ${fmtDay(new Date(range.to.getTime() - 1))}`)
    : range.from ? `From ${fmtDay(range.from)}` : range.to ? `Until ${fmtDay(new Date(range.to.getTime() - 1))}` : "All time";

  return (
    <div className={s.panel}>
      <div className={s.head}>
        <div>
          <h3 className={s.title}><UserPlus /> New Members</h3>
          <p className={s.subtitle}>Members who joined in the selected period · {rangeLabel}</p>
        </div>
        <span className={s.badge}>{total.toLocaleString()} new {total === 1 ? "member" : "members"}</span>
      </div>

      <div className={s.body}>
        <div className={s.presets} role="group" aria-label="Join date">
          {PRESETS.map(p => (
            <button key={p.value} type="button" className={s.preset} data-active={preset === p.value} aria-pressed={preset === p.value} onClick={() => setPreset(p.value)}>
              {p.value === "custom" && <CalendarDays className="h-3 w-3 inline mr-1 -mt-0.5" />}{p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className={s.custom}>
            <div className={s.customField}>
              <Label htmlFor="nm-from">From date</Label>
              <Input id="nm-from" type="date" value={customFrom} max={customTo || undefined} onChange={e => setCustomFrom(e.target.value)} />
            </div>
            <div className={s.customField}>
              <Label htmlFor="nm-to">To date</Label>
              <Input id="nm-to" type="date" value={customTo} min={customFrom || undefined} onChange={e => setCustomTo(e.target.value)} />
            </div>
            <span className={s.customHint}>Both dates are included.</span>
          </div>
        )}

        <div className={s.filters}>
          <div className={s.search}>
            <Search />
            <Input placeholder="Search name, member ID or phone…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger><SelectValue placeholder="All plans" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {planNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className={s.range}>{rangeLabel}</span>
          <Button variant="outline" onClick={reset}><RefreshCw className="h-4 w-4 mr-2" />Reset</Button>
        </div>

        <div className={s.tiles}>
          <div className={s.tile} data-lead="true" data-tone="teal">
            <div className={s.tileLabel}>New registrations</div>
            <div className={s.tileValue}>{total.toLocaleString()}</div>
          </div>
          <div className={s.tile} data-tone="green">
            <div className={s.tileLabel}>Active now</div>
            <div className={s.tileValue}>{counts ? counts.active.toLocaleString() : "—"}</div>
          </div>
          <div className={s.tile} data-tone="amber">
            <div className={s.tileLabel}>Awaiting approval</div>
            <div className={s.tileValue}>{counts ? counts.pending.toLocaleString() : "—"}</div>
          </div>
          <div className={s.tile} data-tone="red">
            <div className={s.tileLabel}>With an amount due</div>
            <div className={s.tileValue}>{counts ? counts.dues.toLocaleString() : "—"}</div>
          </div>
        </div>

        <div className={s.tableWrap}>
          {error ? (
            <div className={s.empty}>{error}</div>
          ) : !loading && rows.length === 0 ? (
            <div className={s.empty}>
              <UserPlus />
              <div className={s.emptyTitle}>No new members in this period</div>
              <div>Pick another period or clear the plan and search filters.</div>
            </div>
          ) : (
            <table className={s.table} style={{ opacity: loading ? 0.55 : 1 }}>
              <thead>
                <tr>
                  <th>Member</th><th>Joined</th><th>Plan</th><th>Type</th><th>Status</th><th>Contact</th><th>Expiry</th><th />
                </tr>
              </thead>
              <tbody>
                {rows.map(m => {
                  const joined = m.join_date ? new Date(m.join_date) : null;
                  const hasTime = joined && (joined.getHours() !== 0 || joined.getMinutes() !== 0);
                  const end = (m as any).membership_end_date || (m as any).expiry_date;
                  const st = statusOf(m);
                  const photo = (m as any).photo_url ? resolveBackendImageUrl((m as any).photo_url) : null;
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className={s.who}>
                          <span className={s.avatar}>
                            {initials(m.name)}
                            {photo && <img src={photo} alt="" onError={e => { e.currentTarget.style.display = "none"; }} />}
                          </span>
                          <div>
                            <div className={s.name}>{m.name}</div>
                            <div className={`${s.sub} ${s.mono}`}>{m.member_id || m.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className={s.nowrap}>
                        <div>{joined ? fmtDay(joined) : "—"}</div>
                        {hasTime && <div className={s.sub}>{joined!.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>}
                      </td>
                      <td>
                        <div className={s.name}>{m.membership_plan || "—"}</div>
                        {m.membership_fee != null && <div className={s.sub}>{formatCurrency(Number(m.membership_fee) || 0)}</div>}
                      </td>
                      <td>{m.membership_type || "—"}</td>
                      <td><span className={s.status} data-tone={st.tone}>{st.label}</span></td>
                      <td>
                        <div className={s.nowrap}>{m.phone || "—"}</div>
                        {m.email && <div className={s.sub}>{m.email}</div>}
                      </td>
                      <td className={s.nowrap}>{end ? fmtDay(new Date(end)) : "—"}</td>
                      <td>
                        <button type="button" className={s.open} onClick={() => onOpenMember(m)} title="Open the member profile">
                          <ExternalLink /> Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun="members" disabled={loading} />
      </div>
    </div>
  );
}
