import React, { useMemo, useState } from "react";
import {
  ArrowDownUp, Building2, Columns3, Copy, Edit, Eye, Footprints, GripVertical, History, Home, Info, Key, LayoutList,
  List, Megaphone, Rows3, Snowflake, User, UserCheck, Users,
} from "lucide-react";
import type { Plan } from "../../utils/supabase/plans-service";
import { Switch } from "../ui/switch";
import s from "./PlanKanban.module.css";

export type PlanViewMode = "list" | "kanban";

/** Kanban / List switch for the Plan Overview header. */
export function PlanViewToggle({ value, onChange }: { value: PlanViewMode; onChange: (v: PlanViewMode) => void }) {
  return (
    <div className={s.toggle} role="group" aria-label="Plan view">
      <button type="button" className={s.toggleBtn} data-active={value === "kanban"} aria-pressed={value === "kanban"} onClick={() => onChange("kanban")}>
        <Columns3 /> Kanban
      </button>
      <button type="button" className={s.toggleBtn} data-active={value === "list"} aria-pressed={value === "list"} onClick={() => onChange("list")}>
        <List /> List
      </button>
    </div>
  );
}

type Section = "description" | "streams" | "facilities" | "marketing";
type SortKey = "default" | "name" | "price-asc" | "price-desc" | "members";
type Density = "compact" | "detailed";
export type PlanMemberCounts = Record<string, { active: number; total: number }>;

interface PlanKanbanProps {
  plans: Plan[];
  money: (amount: number) => string;
  streamNames: (ids: number[]) => string[];
  facilityNames: (ids: string[]) => string[];
  promotionNames: (ids: number[]) => string[];
  effectivePrice: (plan: Plan) => { originalPrice: number; effectivePrice: number; discountAmount: number; offerLabel: string };
  onView: (plan: Plan) => void;
  onEdit: (plan: Plan) => void;
  onDuplicate: (plan: Plan) => void;
  /** Move a plan to Active / Inactive (drag between columns, or the card's switch). */
  onSetStatus: (plan: Plan, status: "Active" | "Inactive") => Promise<void> | void;
  /** Plan ids being saved right now. */
  savingIds?: Set<number>;
  /** Members per plan name (lower case); null while unknown. */
  memberCounts?: PlanMemberCounts | null;
}

const COLUMNS: ("Active" | "Inactive")[] = ["Active", "Inactive"];
const isActive = (p: Plan) => (p.status ?? "").toLowerCase() === "active";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Default order" },
  { value: "name", label: "Name (A–Z)" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "members", label: "Most members" },
];

const readPref = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try { const v = localStorage.getItem(key) as T | null; return v && allowed.includes(v) ? v : fallback; } catch { return fallback; }
};
const writePref = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* private mode */ } };

const UNITS: Record<string, string> = {
  day: "day", days: "day", daily: "day", week: "week", weeks: "week", weekly: "week", month: "month", months: "month",
  monthly: "month", year: "year", years: "year", yearly: "year", annual: "year", annually: "year", session: "session", sessions: "session",
};

/** "35 days", "1 month", "10 sessions" — falls back to the plan's own duration text. */
export function planDurationLabel(plan: Plan): string {
  const n = Number(plan.durationValue);
  const unit = UNITS[(plan.durationType ?? "").trim().toLowerCase()];
  if (unit && Number.isFinite(n) && n > 0) return `${n} ${unit}${n === 1 ? "" : "s"}`;
  return plan.duration || [plan.durationValue, plan.durationType].filter(Boolean).join(" ") || "—";
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  individual: <User />, couple: <Users />, family: <Home />, corporate: <Building2 />, "walk-in": <Footprints />,
};

const membersOf = (plan: Plan, counts?: PlanMemberCounts | null) =>
  counts ? counts[(plan.name ?? "").trim().toLowerCase()] ?? { active: 0, total: 0 } : null;

/**
 * Plans as a board, one column per status. Dragging a card to the other column (or its
 * switch) changes the plan's status; the card opens the same View / Edit / Duplicate as the list.
 */
export function PlanKanban(props: PlanKanbanProps) {
  const { plans, onSetStatus, memberCounts, effectivePrice } = props;
  const [dragged, setDragged] = useState<Plan | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [sort, setSortState] = useState<SortKey>(() => readPref("gb.plans.kanbanSort", SORTS.map(o => o.value), "default"));
  const [density, setDensityState] = useState<Density>(() => readPref("gb.plans.kanbanDensity", ["compact", "detailed"] as const, "compact"));
  const setSort = (v: SortKey) => { setSortState(v); writePref("gb.plans.kanbanSort", v); };
  const setDensity = (v: Density) => { setDensityState(v); writePref("gb.plans.kanbanDensity", v); };

  const sorted = useMemo(() => {
    const list = [...plans];
    const price = (p: Plan) => effectivePrice(p).effectivePrice;
    const members = (p: Plan) => membersOf(p, memberCounts)?.active ?? 0;
    if (sort === "name") list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { numeric: true }));
    else if (sort === "price-asc") list.sort((a, b) => price(a) - price(b));
    else if (sort === "price-desc") list.sort((a, b) => price(b) - price(a));
    else if (sort === "members") list.sort((a, b) => members(b) - members(a));
    return list;
  }, [plans, sort, memberCounts, effectivePrice]);

  return (
    <div className={s.wrap}>
      <div className={s.toolbar}>
        <label className={s.sort}>
          <ArrowDownUp aria-hidden="true" />
          <span className={s.srOnly}>Sort plans</span>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)}>
            {SORTS.map(o => <option key={o.value} value={o.value} disabled={o.value === "members" && !memberCounts}>{o.label}</option>)}
          </select>
        </label>
        <div className={s.density} role="group" aria-label="Card detail">
          <button type="button" data-active={density === "compact"} aria-pressed={density === "compact"} onClick={() => setDensity("compact")} title="Compact cards">
            <Rows3 /> <span className={s.densityLabel}>Compact</span>
          </button>
          <button type="button" data-active={density === "detailed"} aria-pressed={density === "detailed"} onClick={() => setDensity("detailed")} title="Detailed cards">
            <LayoutList /> <span className={s.densityLabel}>Detailed</span>
          </button>
        </div>
      </div>

      <div className={s.board}>
        {COLUMNS.map(status => {
          const items = sorted.filter(p => (status === "Active") === isActive(p));
          const canDrop = dragged != null && (status === "Active") !== isActive(dragged);
          const activeMembers = memberCounts ? items.reduce((sum, p) => sum + (membersOf(p, memberCounts)?.active ?? 0), 0) : null;
          return (
            <section
              key={status}
              className={s.column}
              data-status={status}
              data-target={canDrop}
              data-over={over === status && canDrop}
              onDragOver={e => { if (canDrop) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(status); } }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
              onDrop={e => {
                e.preventDefault();
                const plan = dragged;
                setDragged(null);
                setOver(null);
                if (plan && (status === "Active") !== isActive(plan)) onSetStatus(plan, status);
              }}
              aria-label={`${status} plans`}
            >
              <header className={s.columnHead}>
                <div className={s.columnTitle}>
                  <span className={s.dot} data-status={status} />
                  {status}
                  <span className={s.columnCount}>{items.length}</span>
                </div>
                <div className={s.columnSub}>
                  {activeMembers != null
                    ? <><Users aria-hidden="true" /> {activeMembers.toLocaleString()} active member{activeMembers === 1 ? "" : "s"}</>
                    : status === "Active" ? "Available to sell" : "Hidden from new sales"}
                </div>
              </header>

              {canDrop && (
                <div className={s.dropZone} aria-hidden="true">
                  Drop to {status === "Active" ? "activate" : "deactivate"}
                </div>
              )}

              {items.length === 0
                ? (
                  <div className={s.empty}>
                    <Columns3 aria-hidden="true" />
                    <span>No {status.toLowerCase()} plans</span>
                    <small>Drag a plan here, or use its switch, to {status === "Active" ? "activate" : "deactivate"} it.</small>
                  </div>
                )
                : (
                  // Each column scrolls on its own, like any board, so a long list doesn't stretch the page.
                  <div className={s.cards} data-density={density}>
                    {items.map(plan => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        {...props}
                        density={density}
                        dragging={dragged?.id === plan.id}
                        onDragStart={() => setDragged(plan)}
                        onDragEnd={() => { setDragged(null); setOver(null); }}
                      />
                    ))}
                  </div>
                )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PlanCard({
  plan, money, streamNames, facilityNames, promotionNames, effectivePrice, onView, onEdit, onDuplicate, onSetStatus,
  savingIds, memberCounts, density, dragging, onDragStart, onDragEnd,
}: PlanKanbanProps & { plan: Plan; density: Density; dragging: boolean; onDragStart: () => void; onDragEnd: () => void }) {
  const [open, setOpen] = useState<Set<Section>>(new Set());
  const toggle = (sec: Section) => setOpen(prev => {
    const next = new Set(prev);
    next.has(sec) ? next.delete(sec) : next.add(sec);
    return next;
  });
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  const price = effectivePrice(plan);
  const streams = streamNames(plan.trainingStreams ?? []);
  const facilities = facilityNames(plan.selectedFacilities ?? []);
  const promotions = promotionNames(plan.selectedPromotions ?? []);
  const active = isActive(plan);
  const saving = savingIds?.has(plan.id) ?? false;
  const members = membersOf(plan, memberCounts);
  const duration = planDurationLabel(plan);
  const typeKey = (plan.planType ?? "").trim().toLowerCase();
  const freezeKnown = plan.maxFreezeDays != null || plan.maxFreezeOccurrences != null || plan.freeDaysAllowed != null;
  const freezeLabel = !freezeKnown ? "Not set" : plan.maxFreezeDays === 0 ? "Not allowed"
    : plan.maxFreezeDays != null ? `${plan.maxFreezeDays} days` : "Allowed";
  const familySize = typeKey === "family" && plan.maxFamilyMembers ? `Up to ${plan.maxFamilyMembers} members` : null;

  const chipList = (names: string[], sec: Section, limit: number, empty: string) => names.length === 0
    ? <p className={s.none}>{empty}</p>
    : (
      <div className={s.chips}>
        {(open.has(sec) ? names : names.slice(0, limit)).map((n, i) => <span key={`${n}-${i}`} className={s.chip}>{n}</span>)}
        {!open.has(sec) && names.length > limit && (
          <button type="button" className={s.chipMore} onClick={stop(() => toggle(sec))}>+{names.length - limit} more</button>
        )}
      </div>
    );

  return (
    <article
      className={s.card}
      draggable={!saving}
      data-active={active}
      data-dragging={dragging}
      data-saving={saving}
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(plan.id)); onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={() => onView(plan)}
    >
      <div className={s.cardTop}>
        <GripVertical className={s.grip} aria-hidden="true" />
        <div className={s.titleBlock}>
          <div className={s.name} title={plan.name}>{plan.name}</div>
          <div className={s.meta}>
            {plan.planType && <span className={s.typePill} data-type={typeKey}>{TYPE_ICON[typeKey] ?? <User />}{plan.planType}</span>}
            {plan.type && plan.type.toLowerCase() !== "membership" && <span className={s.metaText}>{plan.type}</span>}
            {familySize && <span className={s.metaText}>{familySize}</span>}
          </div>
        </div>
        {/* The switch is the click/keyboard way to do what dragging does. */}
        <div className={s.switch} onClick={e => e.stopPropagation()} title={active ? "Active — switch off to stop selling it" : "Inactive — switch on to sell it"}>
          <Switch checked={active} disabled={saving} onCheckedChange={v => onSetStatus(plan, v ? "Active" : "Inactive")}
            aria-label={`${plan.name}: ${active ? "active" : "inactive"}`} />
        </div>
      </div>

      <div className={s.priceRow}>
        <span className={s.price}>{money(price.effectivePrice)}</span>
        <span className={s.per}>/ {duration}</span>
        {price.discountAmount > 0 && (
          <>
            <span className={s.was}>{money(price.originalPrice)}</span>
            <span className={s.offer}>{price.offerLabel}</span>
          </>
        )}
      </div>

      <div className={s.stats}>
        <div className={s.stat} title="Members on this plan whose membership is running today">
          <UserCheck aria-hidden="true" />
          <div><b>{members ? members.active.toLocaleString() : "—"}</b><span>Active members</span></div>
        </div>
        <div className={s.stat} title="Everyone who has been on this plan, including expired memberships">
          <History aria-hidden="true" />
          <div><b>{members ? members.total.toLocaleString() : "—"}</b><span>All-time</span></div>
        </div>
        <div className={s.stat} data-tone={plan.maxFreezeDays === 0 ? "off" : undefined}>
          <Snowflake aria-hidden="true" />
          <div><b>{freezeLabel}</b><span>Freeze</span></div>
        </div>
      </div>

      {density === "compact" ? (
        <>
          {plan.description && <p className={`${s.text} ${s.clamp1}`}>{plan.description}</p>}
          <div className={s.features}>
            <span className={s.feature} data-empty={streams.length === 0} title={streams.join(", ") || "No training streams"}>
              <Key aria-hidden="true" /> {streams.length} stream{streams.length === 1 ? "" : "s"}
            </span>
            <span className={s.feature} data-empty={facilities.length === 0} title={facilities.join(", ") || "No facilities"}>
              <Building2 aria-hidden="true" /> {facilities.length} facilit{facilities.length === 1 ? "y" : "ies"}
            </span>
            <span className={s.feature} data-empty={promotions.length === 0} title={promotions.join(", ") || "No promotions"}>
              <Megaphone aria-hidden="true" /> {promotions.length} promo{promotions.length === 1 ? "" : "s"}
            </span>
          </div>
        </>
      ) : (
        <div className={s.details}>
          <div className={s.section}>
            <div className={s.sectionHead}>
              <span className={s.sectionTitle}><Info /> Description</span>
              {(plan.description ?? "").length > 90 && (
                <button type="button" className={s.more} onClick={stop(() => toggle("description"))}>
                  {open.has("description") ? "Show less" : "View more"}
                </button>
              )}
            </div>
            <p className={`${s.text} ${open.has("description") ? "" : s.clamp}`}>{plan.description || "No description added"}</p>
          </div>

          <div className={s.section}>
            <div className={s.sectionHead}><span className={s.sectionTitle}><Key /> Training streams <span className={s.sectionCount}>{streams.length}</span></span></div>
            {chipList(streams, "streams", 4, "No training streams")}
          </div>

          <div className={s.section}>
            <div className={s.sectionHead}><span className={s.sectionTitle}><Building2 /> Facility access <span className={s.sectionCount}>{facilities.length}</span></span></div>
            {chipList(facilities, "facilities", 4, "No facilities")}
          </div>

          <div className={s.section}>
            <div className={s.sectionHead}><span className={s.sectionTitle}><Megaphone /> Promotions <span className={s.sectionCount}>{promotions.length}</span></span></div>
            {chipList(promotions, "marketing", 3, "No promotions attached")}
          </div>

          <div className={s.section}>
            <div className={s.sectionHead}><span className={s.sectionTitle}><Snowflake /> Freezing policy</span></div>
            {!freezeKnown ? (
              <p className={s.none}>No freezing policy set</p>
            ) : plan.maxFreezeDays === 0 ? (
              <span className={s.noFreeze}>Freezing not allowed</span>
            ) : (
              <div className={s.freeze}>
                {plan.maxFreezeDays != null && <div><div className={s.k}>Maximum days</div><div className={s.v}>{plan.maxFreezeDays}</div></div>}
                {plan.maxFreezeOccurrences != null && <div><div className={s.k}>Max freezes</div><div className={s.v}>{plan.maxFreezeOccurrences}</div></div>}
                {plan.freeDaysAllowed != null && <div><div className={s.k}>Free days</div><div className={s.v}>{plan.freeDaysAllowed}</div></div>}
                {plan.chargePerExtraDay != null && <div><div className={s.k}>Extra day</div><div className={s.v}>{money(plan.chargePerExtraDay)}</div></div>}
                <div><div className={s.k}>Auto unfreeze</div><div className={s.v}>{plan.autoUnfreeze ? "On" : "Off"}</div></div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={s.footer}>
        <button type="button" className={s.editBtn} onClick={stop(() => onEdit(plan))}><Edit /> Edit plan</button>
        <div className={s.iconBtns}>
          <button type="button" className={s.iconBtn} onClick={stop(() => onView(plan))} title="View details" aria-label={`View ${plan.name}`}><Eye /></button>
          <button type="button" className={s.iconBtn} onClick={stop(() => onDuplicate(plan))} title="Duplicate" aria-label={`Duplicate ${plan.name}`}><Copy /></button>
        </div>
      </div>
    </article>
  );
}
