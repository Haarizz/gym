import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown, ChevronRight, ChevronUp, ClipboardList, Eye, FilePlus2, FileText, History, Loader2, Plus, Save, ShieldCheck, Trash2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { CurrencyValue } from "../../utils/currency";
import {
  PAYMENT_TERMS_KINDS, apiErrorMessage, paymentTermsKindLabel, paymentTermsService,
  type PaymentTerms, type PaymentTermsAcceptance, type PaymentTermsKind,
} from "../../utils/supabase/payment-terms-service";
import { invalidatePaymentTermsCache } from "./PaymentTermsDialog";
import { TermsText } from "./TermsText";
import s from "./payment-terms.module.css";

type Draft = { id: number | null; title: string; content: string; applies_to: PaymentTermsKind[]; enabled: boolean };

const EMPTY: Draft = { id: null, title: "", content: "", applies_to: [], enabled: true };

/** Starting points for a gym that has nothing yet — edited before saving. */
const TEMPLATES: { title: string; applies_to: PaymentTermsKind[]; content: string }[] = [
  {
    title: "Membership Agreement",
    applies_to: ["registration", "renewal", "upgrade", "downgrade"],
    content: "MEMBERSHIP\n\n1. The membership is personal and cannot be transferred to another person.\n2. The membership starts on the date shown on the receipt and ends on the expiry date. Unused days are not carried over.\n3. Members must show their membership card / app or be recognised at the entrance on every visit.\n\nCONDUCT\n\n4. Members follow the gym rules and staff instructions, wear proper sports clothing and wipe down equipment after use.\n5. The gym may suspend a membership for unsafe or abusive behaviour.\n\nHEALTH\n\n6. Members confirm they are fit to exercise and will tell staff about any medical condition. The gym is not liable for injury caused by ignoring instructions.",
  },
  {
    title: "Refund & Cancellation Policy",
    applies_to: ["registration", "renewal", "upgrade", "downgrade", "addon", "personal_training"],
    content: "1. Fees are non-refundable once the membership or package has started.\n2. A cancellation before the start date is refunded less an administration fee.\n3. Approved refunds are paid back by the original payment method.",
  },
  {
    title: "Freeze Policy",
    applies_to: ["freeze"],
    content: "1. A membership can be frozen as allowed by the plan. Extra frozen days may be charged.\n2. The end date moves by the number of frozen days.\n3. The member cannot use the gym while the membership is frozen.",
  },
  {
    title: "Personal Training Terms",
    applies_to: ["personal_training"],
    content: "1. Sessions must be used before the package expiry date; unused sessions lapse.\n2. Cancel at least 12 hours before a session, otherwise the session is counted as used.\n3. The trainer may be changed by the gym when needed.",
  },
];

const sameKinds = (a: PaymentTermsKind[], b: PaymentTermsKind[]) =>
  a.length === b.length && a.every((k) => b.includes(k));

const toDraft = (t: PaymentTerms): Draft => ({
  id: t.id, title: t.title, content: t.content, applies_to: [...t.applies_to], enabled: t.enabled,
});

const fmtWhen = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—"
    : d.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export function PaymentTermsSettings({ branchId, readOnly = false }: { branchId: number; readOnly?: boolean }) {
  const [terms, setTerms] = useState<PaymentTerms[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [log, setLog] = useState<{ total: number; rows: PaymentTermsAcceptance[] } | null>(null);
  const [viewing, setViewing] = useState<{ row: PaymentTermsAcceptance; content: string | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await paymentTermsService.list(branchId);
      setTerms(list);
      return list;
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to load payment terms"));
      return [];
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  const loadLog = useCallback(async () => {
    try { setLog(await paymentTermsService.log(branchId, 50)); } catch { setLog({ total: 0, rows: [] }); }
  }, [branchId]);

  useEffect(() => {
    setLoading(true);
    setSelectedId(null);
    setDraft(EMPTY);
    load().then((list) => {
      if (list.length > 0) { setSelectedId(list[0].id); setDraft(toDraft(list[0])); }
    });
    loadLog();
  }, [load, loadLog]);

  const saved = typeof selectedId === "number" ? terms.find((t) => t.id === selectedId) ?? null : null;
  const dirty = selectedId === "new"
    ? draft.title.trim() !== "" || draft.content.trim() !== "" || draft.applies_to.length > 0
    : saved != null && (draft.title !== saved.title || draft.content !== saved.content
        || draft.enabled !== saved.enabled || !sameKinds(draft.applies_to, saved.applies_to));

  const confirmDiscard = () => !dirty || window.confirm("Discard the unsaved changes to these terms?");

  const select = (t: PaymentTerms) => {
    if (t.id === selectedId || !confirmDiscard()) return;
    setSelectedId(t.id);
    setDraft(toDraft(t));
    setPreview(false);
  };

  const startNew = (template?: (typeof TEMPLATES)[number]) => {
    if (!confirmDiscard()) return;
    setSelectedId("new");
    setDraft(template
      ? { id: null, title: template.title, content: template.content, applies_to: [...template.applies_to], enabled: true }
      : { ...EMPTY });
    setPreview(false);
  };

  const toggleKind = (k: PaymentTermsKind, on: boolean) =>
    setDraft((d) => ({
      ...d,
      applies_to: on ? PAYMENT_TERMS_KINDS.map((x) => x.kind).filter((x) => x === k || d.applies_to.includes(x))
        : d.applies_to.filter((x) => x !== k),
    }));

  const save = async () => {
    if (readOnly) return;
    if (!draft.title.trim()) { toast.error("Give the terms a title"); return; }
    if (!draft.content.trim()) { toast.error("Write the terms the member has to accept"); return; }
    if (draft.enabled && draft.applies_to.length === 0) {
      toast.error("Choose at least one payment these terms appear before");
      return;
    }
    setSaving(true);
    try {
      const body = { title: draft.title.trim(), content: draft.content, applies_to: draft.applies_to, enabled: draft.enabled };
      const result = draft.id == null
        ? await paymentTermsService.create(branchId, body)
        : await paymentTermsService.update(draft.id, body);
      invalidatePaymentTermsCache();
      const list = await load();
      const fresh = list.find((t) => t.id === result.id) ?? result;
      setSelectedId(fresh.id);
      setDraft(toDraft(fresh));
      toast.success(draft.id == null ? "Terms added" : "Terms saved");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to save the terms"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (readOnly) return;
    if (draft.id == null) { setSelectedId(null); setDraft(EMPTY); return; }
    if (!window.confirm(`Delete "${saved?.title ?? draft.title}"? Past acceptances keep their own copy of the wording.`)) return;
    setSaving(true);
    try {
      await paymentTermsService.remove(draft.id);
      invalidatePaymentTermsCache();
      const list = await load();
      if (list.length > 0) { setSelectedId(list[0].id); setDraft(toDraft(list[0])); }
      else { setSelectedId(null); setDraft(EMPTY); }
      toast.success("Terms deleted");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to delete the terms"));
    } finally {
      setSaving(false);
    }
  };

  /** The switch on a list row: saves straight away. */
  const quickToggle = async (t: PaymentTerms, on: boolean) => {
    if (readOnly) return;
    if (on && t.applies_to.length === 0) {
      toast.error(`Choose which payments "${t.title}" appears before, then switch it on.`);
      return;
    }
    try {
      const updated = await paymentTermsService.update(t.id, { enabled: on });
      invalidatePaymentTermsCache();
      setTerms((list) => list.map((x) => (x.id === t.id ? updated : x)));
      if (selectedId === t.id) setDraft((d) => ({ ...d, enabled: updated.enabled }));
      toast.success(`${t.title} ${on ? "switched on" : "switched off"}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to update the terms"));
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (readOnly) return;
    const next = [...terms];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setTerms(next);
    try {
      setTerms(await paymentTermsService.reorder(branchId, next.map((t) => t.id)));
      invalidatePaymentTermsCache();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to change the order"));
      load();
    }
  };

  const openAcceptance = async (row: PaymentTermsAcceptance) => {
    setViewing({ row, content: null });
    try {
      const d = await paymentTermsService.acceptance(row.id);
      setViewing({ row, content: d.terms_content });
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to load the accepted wording"));
      setViewing(null);
    }
  };

  // Which switched-on terms each payment shows (the saved state, not the draft).
  const coverage = useMemo(() => PAYMENT_TERMS_KINDS.map((k) => ({
    ...k,
    terms: terms.filter((t) => t.enabled && t.applies_to.includes(k.kind)),
  })), [terms]);
  const enabledCount = terms.filter((t) => t.enabled).length;

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const editing = selectedId != null;

  return (
    <div className="sp-panel">
      <div className={s.stack}>
        <div className={s.layout}>
          {/* Terms sets */}
          <div className={s.panel}>
            <div className={s.panelHead}>
              <div>
                <div className={s.panelTitle}><ClipboardList /> Terms sets</div>
                <div className={s.panelSub}>{terms.length === 0 ? "None yet" : `${enabledCount} of ${terms.length} switched on`}</div>
              </div>
              {!readOnly && (
                <Button size="sm" onClick={() => startNew()}>
                  <Plus className="h-4 w-4 mr-1" /> New
                </Button>
              )}
            </div>
            {terms.length === 0 && selectedId !== "new" ? (
              <div className={s.startBox}>
                <div className={s.startEmpty}>
                  <span className={s.startEmptyIcon}><FileText /></span>
                  <div>
                    <div className={s.startEmptyTitle}>No terms yet</div>
                    <div className={s.startEmptySub}>Payments go through without asking the member to accept anything.</div>
                  </div>
                </div>
                {!readOnly && (
                  <>
                    <div className={s.startLabel}>Start from a template</div>
                    <div className={s.templateList}>
                      {TEMPLATES.map((t) => (
                        <button key={t.title} type="button" className={s.templateCard} onClick={() => startNew(t)}>
                          <span className={s.templateIcon}><FilePlus2 /></span>
                          <span className={s.templateText}>
                            <span className={s.templateTitle}>{t.title}</span>
                            <span className={s.templateMeta} title={t.applies_to.map(paymentTermsKindLabel).join(", ")}>
                              {t.applies_to.length > 3
                                ? `${t.applies_to.slice(0, 2).map(paymentTermsKindLabel).join(" · ")} · +${t.applies_to.length - 2} more`
                                : t.applies_to.map(paymentTermsKindLabel).join(" · ")}
                            </span>
                          </span>
                          <ChevronRight className={s.templateArrow} />
                        </button>
                      ))}
                    </div>
                    <button type="button" className={s.blankCard} onClick={() => startNew()}>
                      <Plus /> Write your own from scratch
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className={s.termsList}>
                {terms.map((t, i) => (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    className={s.termRow}
                    data-selected={selectedId === t.id}
                    data-enabled={t.enabled}
                    onClick={() => select(t)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(t); } }}
                  >
                    {!readOnly && terms.length > 1 && (
                      <span className={s.order} onClick={(e) => e.stopPropagation()}>
                        <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp /></button>
                        <button type="button" aria-label="Move down" disabled={i === terms.length - 1} onClick={() => move(i, 1)}><ChevronDown /></button>
                      </span>
                    )}
                    <span className={s.termRowMain}>
                      <span className={s.termRowTitle}>{t.title}</span>
                      <span className={s.termRowMeta}>
                        {t.applies_to.length === 0 ? "No payments chosen"
                          : t.applies_to.length === PAYMENT_TERMS_KINDS.length ? "All payments"
                          : t.applies_to.map(paymentTermsKindLabel).join(", ")}
                      </span>
                    </span>
                    <span onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={t.enabled}
                        disabled={readOnly}
                        onCheckedChange={(v) => quickToggle(t, v)}
                        aria-label={`${t.enabled ? "Switch off" : "Switch on"} ${t.title}`}
                      />
                    </span>
                  </div>
                ))}
                {selectedId === "new" && (
                  <div className={s.termRow} data-selected="true">
                    <span className={s.termRowMain}>
                      <span className={s.termRowTitle}>{draft.title.trim() || "New terms"}</span>
                      <span className={s.termRowMeta}>Not saved yet</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Editor */}
          <div className={s.panel}>
            <div className={s.panelHead}>
              <div>
                <div className={s.panelTitle}><ShieldCheck /> {selectedId === "new" ? "New terms" : saved ? "Edit terms" : "Terms"}</div>
                <div className={s.panelSub}>
                  {saved ? `Version ${saved.version}${saved.updated_at ? ` · saved ${fmtWhen(saved.updated_at)}` : ""}${saved.updated_by ? ` by ${saved.updated_by}` : ""}`
                    : "Shown in a dialog the member accepts before the payment is taken"}
                </div>
              </div>
              {editing && (
                <Button variant="ghost" size="sm" onClick={() => setPreview((p) => !p)}>
                  <Eye className="h-4 w-4 mr-1" /> {preview ? "Edit" : "Preview"}
                </Button>
              )}
            </div>
            <div className={s.panelBody}>
              {!editing && terms.length === 0 ? (
                <div className={s.howTo}>
                  <div className={s.howToTitle}>How payment terms work</div>
                  <ol className={s.steps}>
                    <li>
                      <span className={s.stepNo}>1</span>
                      <span><strong>Write the terms</strong> — start from a template or from scratch. Add as many sets as the gym needs (membership, refunds, freeze, PT…).</span>
                    </li>
                    <li>
                      <span className={s.stepNo}>2</span>
                      <span><strong>Tick the payments</strong> each set appears before — new memberships, renewals, upgrades, freezes, add-ons, dues and more.</span>
                    </li>
                    <li>
                      <span className={s.stepNo}>3</span>
                      <span><strong>Switch it on.</strong> Before the payment is taken, the member reads and accepts the terms in a pop-up. Every acceptance is logged with the exact wording.</span>
                    </li>
                  </ol>
                  <div className={s.hint}>Point of Sale payments never ask for terms. Switch any set off to stop showing it — it's kept for later.</div>
                </div>
              ) : !editing ? (
                <div className={s.empty}>
                  <ShieldCheck />
                  <span>Pick a terms set on the left, or add a new one.</span>
                </div>
              ) : (
                <div className={s.editor}>
                  <div className={s.switchRow} data-on={draft.enabled}>
                    <div>
                      <div className={s.switchLabel}>{draft.enabled ? "Switched on" : "Switched off"}</div>
                      <div className={s.hint}>
                        {draft.enabled ? "Members are asked to accept these before the payments ticked below."
                          : "Kept here but never shown. Switch on to start asking."}
                      </div>
                    </div>
                    <Switch checked={draft.enabled} disabled={readOnly} onCheckedChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} />
                  </div>

                  <div className={s.field}>
                    <Label htmlFor="pt-title">Title</Label>
                    <Input
                      id="pt-title"
                      maxLength={150}
                      disabled={readOnly}
                      placeholder="e.g. Membership Agreement"
                      value={draft.title}
                      onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    />
                  </div>

                  <div className={s.field}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <Label>Show before these payments</Label>
                      {!readOnly && (
                        <span className={s.kindTools}>
                          <button type="button" className={s.linkBtn}
                            onClick={() => setDraft((d) => ({ ...d, applies_to: PAYMENT_TERMS_KINDS.map((k) => k.kind) }))}>All</button>
                          <button type="button" className={s.linkBtn}
                            onClick={() => setDraft((d) => ({ ...d, applies_to: [] }))}>None</button>
                        </span>
                      )}
                    </div>
                    <div className={s.kindGrid}>
                      {PAYMENT_TERMS_KINDS.map((k) => {
                        const on = draft.applies_to.includes(k.kind);
                        return (
                          <label key={k.kind} className={s.kindOpt} data-on={on}>
                            <Checkbox checked={on} disabled={readOnly} onCheckedChange={(v) => toggleKind(k.kind, !!v)} />
                            <span className={s.kindText}>
                              <span className={s.kindLabel}>{k.label}</span>
                              <span className={s.kindHint}>{k.hint}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <span className={s.hint}>Point of Sale payments never ask for terms.</span>
                  </div>

                  <div className={s.field}>
                    <Label htmlFor="pt-content">Terms &amp; conditions</Label>
                    {preview ? (
                      <div className={s.preview}>
                        {draft.content.trim() ? <TermsText text={draft.content} /> : <span className={s.hint}>Nothing written yet.</span>}
                      </div>
                    ) : (
                      <Textarea
                        id="pt-content"
                        rows={14}
                        disabled={readOnly}
                        placeholder={"e.g.\nREFUNDS\n\n1. Fees are non-refundable once the membership has started.\n2. ..."}
                        value={draft.content}
                        onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                      />
                    )}
                    <span className={s.hint}>
                      Leave a blank line between paragraphs. A short line in CAPITALS becomes a heading. Changing the wording starts a new version; earlier acceptances keep the wording they agreed to.
                    </span>
                  </div>

                  {!readOnly && (
                    <div className={s.editorActions}>
                      <span className={s.dirtyNote} data-dirty={dirty}>
                        {dirty ? "Unsaved changes" : selectedId === "new" ? "Not saved yet" : "All changes saved"}
                      </span>
                      <div className={s.editorActionsRight}>
                        <Button variant="outline" onClick={remove} disabled={saving}>
                          <Trash2 className="h-4 w-4 mr-2" /> {draft.id == null ? "Discard" : "Delete"}
                        </Button>
                        <Button onClick={save} disabled={saving || (!dirty && draft.id != null)}>
                          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          {draft.id == null ? "Add terms" : "Save terms"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coverage */}
        <div className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <div className={s.panelTitle}><ShieldCheck /> Before each payment</div>
              <div className={s.panelSub}>What the member is asked to accept, per payment type (switched-on terms only)</div>
            </div>
          </div>
          <div className={`${s.panelBody} ${s.matrixWrap}`}>
            <table className={s.matrix}>
              <thead><tr><th>Payment</th><th>Terms shown</th><th>Dialog</th></tr></thead>
              <tbody>
                {coverage.map((row) => (
                  <tr key={row.kind}>
                    <td>{row.label}</td>
                    <td>
                      {row.terms.length === 0 ? <span className={s.none}>—</span> : (
                        <span className={s.chips}>{row.terms.map((t) => <span key={t.id} className={s.chip}>{t.title}</span>)}</span>
                      )}
                    </td>
                    <td>{row.terms.length > 0 ? <span className={s.onTag}>Shown</span> : <span className={s.offTag}>Off</span>}</td>
                  </tr>
                ))}
                <tr>
                  <td>Point of Sale</td>
                  <td><span className={s.none}>Never asks for terms</span></td>
                  <td><span className={s.offTag}>Off</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Acceptance log */}
        <div className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <div className={s.panelTitle}><History /> Acceptance log</div>
              <div className={s.panelSub}>
                {log == null ? "Loading…" : log.total === 0 ? "No acceptances yet"
                  : `Latest ${Math.min(log.rows.length, log.total)} of ${log.total} — open a row to see the exact wording that was accepted`}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={loadLog}>Refresh</Button>
          </div>
          <div className={`${s.panelBody} ${s.matrixWrap}`}>
            {log && log.rows.length > 0 ? (
              <table className={s.logTable}>
                <thead><tr><th>When</th><th>Member</th><th>Payment</th><th>Terms</th><th>Amount</th><th>Taken by</th></tr></thead>
                <tbody>
                  {log.rows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtWhen(r.accepted_at)}</td>
                      <td>{r.member_name || <span className={s.logMuted}>—</span>}</td>
                      <td>{paymentTermsKindLabel(r.payment_kind)}</td>
                      <td>
                        <button type="button" className={s.logLink} onClick={() => openAcceptance(r)}>{r.terms_title}</button>
                        <span className={s.logMuted}> · v{r.terms_version}</span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {r.amount != null && r.amount > 0 ? <CurrencyValue amount={r.amount} options={{ maximumFractionDigits: 2 }} /> : <span className={s.logMuted}>—</span>}
                      </td>
                      <td>{r.accepted_by || <span className={s.logMuted}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={s.empty} style={{ padding: "1rem" }}>
                <span>Each time a member accepts terms before a payment it's recorded here, with a copy of the wording.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={viewing != null} onOpenChange={(o) => { if (!o) setViewing(null); }}>
        <DialogContent className={s.viewDialog}>
          <DialogHeader>
            <DialogTitle>{viewing?.row.terms_title} <span className={s.logMuted}>v{viewing?.row.terms_version}</span></DialogTitle>
            <DialogDescription>
              Accepted {fmtWhen(viewing?.row.accepted_at)}{viewing?.row.member_name ? ` by ${viewing.row.member_name}` : ""}
              {viewing ? ` · ${paymentTermsKindLabel(viewing.row.payment_kind)}` : ""}
              {viewing?.row.accepted_by ? ` · taken by ${viewing.row.accepted_by}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className={s.preview} style={{ maxHeight: "60vh" }}>
            {viewing?.content == null ? <Loader2 className="h-5 w-5 animate-spin" /> : <TermsText text={viewing.content} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
