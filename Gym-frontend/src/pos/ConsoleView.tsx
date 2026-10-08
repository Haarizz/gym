import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Banknote, CheckCircle2, ClipboardList, Cpu, FilePen, History, Monitor, Pencil, Plus, Printer, Receipt, Save,
  Settings as SettingsIcon, ShieldCheck, Trash2, Wifi, X, XCircle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { posApi } from "./api";
import { usePos } from "./PosContext";
import { Empty, Money, Pill, ReceiptPreview } from "./components/Shared";
import { fmtDate, fmtDateTime, num, todayIso } from "./pricing";
import { DEFAULT_RECEIPT_TEMPLATE, parseReceiptTemplate, serializeReceiptTemplate, type ReceiptTemplate } from "./print/receiptTemplate";
import { saleReceipt } from "./print/receiptModel";
import { receiptHtmlBody, thermalDocument } from "./print/thermalHtml";
import { agentHealth, listAgentPrinters, type AgentPrinter } from "./print/printAgent";
import { testPrinter } from "./print/printService";
import type { AuditLog, PaperSize, PosPrinter, PosSession, PosSettings, Sale, SettingsUpdate } from "./types";
import { TerminalsTab } from "./components/Terminals";
import { DevicesTab } from "./components/Devices";
import { CorrectionRequestDialog, CorrectionsTab, SessionMovementsDialog, type CorrectionTargetRef } from "./components/Corrections";
import s from "./pos.module.css";

type Tab = "general" | "security" | "cash" | "receipt" | "terminals" | "devices" | "printers" | "sessions" | "corrections" | "audit";
const primaryBtn = "bg-[#2B7A78] hover:bg-[#236862] text-white";

function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={s.toggleRow}>
      <div><div className={s.strong} style={{ fontSize: 14 }}>{label}</div>{hint && <div className={s.fieldHint}>{hint}</div>}</div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export function ConsoleView() {
  const { settings, setSettings, go, terminalName, setTerminalName, showXReport, setupError, retrySetup, terminal } = usePos();
  const [tab, setTab] = useState<Tab>("general");
  const [draft, setDraft] = useState<PosSettings>(settings);
  const [saving, setSaving] = useState(false);
  const canEdit = settings.currentUserIsSupervisor;

  // A save from elsewhere (e.g. denominations, saved on the spot) refreshes `settings`: take the new
  // values but keep any field the user is still editing here.
  const lastSettings = useRef(settings);
  useEffect(() => {
    const old = lastSettings.current;
    lastSettings.current = settings;
    setDraft((d) => {
      const next = { ...settings };
      (Object.keys(d) as (keyof PosSettings)[]).forEach((k) => {
        if (JSON.stringify(d[k]) !== JSON.stringify(old[k])) (next as Record<string, unknown>)[k] = d[k];
      });
      return next;
    });
  }, [settings]);
  /** Saves one change immediately (no "Save settings" needed). */
  const saveNow = useCallback(async (patch: SettingsUpdate, done: string) => {
    try {
      const saved = await posApi.updateSettings(patch);
      setSettings(saved);
      toast.success(done);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  }, [setSettings]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);
  const set = <K extends keyof PosSettings>(k: K, v: PosSettings[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const patch: SettingsUpdate = { ...draft };
      ["id", "branchId", "hasSupervisorPin", "currentUserIsSupervisor", "currentUsername", "currentUserDisplayName",
        // Cash categories are managed in their own panel; re-sending the cached labels would re-activate removed ones.
        "cashInCategories", "cashOutCategories"].forEach((k) => delete (patch as Record<string, unknown>)[k]);
      const saved = await posApi.updateSettings(patch);
      setSettings(saved);
      toast.success("POS settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <SettingsIcon size={15} /> },
    { id: "security", label: "Security & approvals", icon: <ShieldCheck size={15} /> },
    { id: "cash", label: "Cash handling", icon: <Banknote size={15} /> },
    { id: "receipt", label: "Receipt designer", icon: <Receipt size={15} /> },
    { id: "terminals", label: "Terminals", icon: <Monitor size={15} /> },
    { id: "devices", label: "Devices", icon: <Cpu size={15} /> },
    { id: "printers", label: "Printers", icon: <Printer size={15} /> },
    { id: "sessions", label: "Session history", icon: <History size={15} /> },
    { id: "corrections", label: "Corrections", icon: <FilePen size={15} /> },
    { id: "audit", label: "Audit log", icon: <ClipboardList size={15} /> },
  ];
  const settingsTab = ["general", "security", "cash", "receipt", "terminals"].includes(tab);

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <div>
          <button type="button" className={s.backLink} onClick={() => go("dashboard")}><ArrowLeft size={14} />POS dashboard</button>
          <div className={s.heroTitle}>POS console</div>
          <div className={s.heroSub}>Branch-wide Point of Sale configuration, printers and audit trail.</div>
        </div>
        <div className={s.rowWrap}>
          {setupError
            ? <Button variant="outline" onClick={retrySetup}>Retry loading</Button>
            : !canEdit && <Pill tone="amber">View only — needs POS edit permission</Pill>}
          {settingsTab && canEdit && (
            <>
              {dirty && <Button variant="outline" onClick={() => setDraft(settings)}>Discard</Button>}
              <Button className={primaryBtn} disabled={!dirty || saving} onClick={save}><Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save settings"}</Button>
            </>
          )}
        </div>
      </div>

      {setupError && (
        <div className={`${s.callout} ${s.calloutBad}`} role="alert">
          <XCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><div className={s.strong}>POS settings could not be loaded</div><div className={s.small}>{setupError}</div></div>
        </div>
      )}

      <div className={s.tabBar}>
        {tabs.map((t) => (
          <button key={t.id} type="button" className={`${s.tab} ${tab === t.id ? s.tabActive : ""}`} onClick={() => setTab(t.id)}>{t.icon}{t.label}</button>
        ))}
      </div>

      {tab === "general" && (
        <div className={s.grid2}>
          <div className={s.panel}>
            <div className={s.panelHead}><div className={s.panelTitle}>Selling</div></div>
            <div className={s.panelBody}>
              <Toggle label="Prices include VAT" hint="Product prices are VAT-inclusive; VAT is extracted instead of added." checked={draft.taxInclusive} onChange={(v) => set("taxInclusive", v)} disabled={!canEdit} />
              <Toggle label="Require a member on every sale" hint="Blocks walk-in sales." checked={draft.requireCustomer} onChange={(v) => set("requireCustomer", v)} disabled={!canEdit} />
              <Toggle label="Allow credit (on-account) sales" hint="Members can pay later; balances show under Customers & credit." checked={draft.allowCreditSales} onChange={(v) => set("allowCreditSales", v)} disabled={!canEdit} />
              <Toggle label="Allow price overrides" checked={draft.allowPriceOverride} onChange={(v) => set("allowPriceOverride", v)} disabled={!canEdit} />
            </div>
          </div>
          <div className={s.panel}>
            <div className={s.panelHead}><div className={s.panelTitle}>Printing</div></div>
            <div className={s.panelBody}>
              <Toggle label="Print the receipt automatically" checked={draft.autoPrintReceipt} onChange={(v) => set("autoPrintReceipt", v)} disabled={!canEdit} />
              <Toggle label="Open the cash drawer on cash payments" hint="Needs a receipt printer with a drawer attached (Printers tab)." checked={draft.openDrawerOnCash} onChange={(v) => set("openDrawerOnCash", v)} disabled={!canEdit} />
              <Toggle label="Allow sharing receipts (WhatsApp / email)" checked={draft.receiptShareEnabled} onChange={(v) => set("receiptShareEnabled", v)} disabled={!canEdit} />
              <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div className={s.field}>
                  <Label>Default receipt format</Label>
                  <Select value={draft.defaultPrintFormat} onValueChange={(v) => set("defaultPrintFormat", v as PaperSize)} disabled={!canEdit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="80mm">80 mm thermal</SelectItem><SelectItem value="58mm">58 mm thermal</SelectItem><SelectItem value="A4">A4 tax invoice</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className={s.field}>
                  <Label>Receipt copies</Label>
                  <Input type="number" min={1} max={5} value={draft.receiptCopies} disabled={!canEdit} onChange={(e) => set("receiptCopies", Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1)))} />
                </div>
              </div>
            </div>
          </div>
          <div className={s.panel}>
            <div className={s.panelHead}><div className={s.panelTitle}>Terminal layout</div></div>
            <div className={s.panelBody}>
              <div className={s.field} style={{ marginBottom: 12 }}>
                <Label>Layout</Label>
                <div className={s.segmented}>
                  <button type="button" disabled={!canEdit} className={draft.layout === "classic" ? s.segOn : ""} onClick={() => set("layout", "classic")}>Classic</button>
                  <button type="button" disabled={!canEdit} className={draft.layout === "compact" ? s.segOn : ""} onClick={() => set("layout", "compact")}>Compact</button>
                  <button type="button" disabled={!canEdit} className={draft.layout === "focus" ? s.segOn : ""} onClick={() => set("layout", "focus")}>Cart Focus</button>
                </div>
                <span className={s.fieldHint}>
                  {draft.layout === "classic" ? "Categories + products + cart." : draft.layout === "compact" ? "Trade POS: big search bar, customer + quick-pick list, invoice and a Functions panel." : "Cart + keypad + functions, no product grid."}
                  {" "}Branch default — each terminal can override it from Configure on the selling screen.
                </span>
              </div>
              <Toggle label="Hide the category panel" checked={draft.hideCategoryPanel} onChange={(v) => set("hideCategoryPanel", v)} disabled={!canEdit} />
              <Toggle label="Show product images" checked={draft.showProductImages} onChange={(v) => set("showProductImages", v)} disabled={!canEdit} />
              <Toggle label="Show stock on product cards" checked={draft.showStockOnCards} onChange={(v) => set("showStockOnCards", v)} disabled={!canEdit} />
              <div className={s.field} style={{ marginTop: 12 }}>
                <Label>Auto-lock after inactivity (minutes, 0 = never)</Label>
                <Input type="number" min={0} max={240} value={draft.idleLockMinutes} disabled={!canEdit} onChange={(e) => set("idleLockMinutes", Math.max(0, parseInt(e.target.value, 10) || 0))} />
              </div>
            </div>
          </div>
          <div className={s.panel}>
            <div className={s.panelHead}><div className={s.panelTitle}>Business day</div>{draft.businessDayEnabled ? <Pill tone="green">Window on</Pill> : <Pill tone="gray">24 hours</Pill>}</div>
            <div className={s.panelBody}>
              <div className={s.field} style={{ marginBottom: 12 }}>
                <Label>Time zone</Label>
                <Input list="pos-time-zones" value={draft.timeZone ?? ""} disabled={!canEdit} placeholder={browserZone}
                  onChange={(e) => set("timeZone", e.target.value || null)} />
                <datalist id="pos-time-zones">{timeZones.map((z) => <option key={z} value={z} />)}</datalist>
                <span className={s.fieldHint}>Business dates, receipts and the window below follow this zone{!draft.timeZone ? ` (empty = each till's own zone; this computer is ${browserZone})` : ""}.</span>
              </div>
              <Toggle label="Limit trading to business hours" hint="Outside the window no sessions can be opened and nothing can be sold; closing, Day Close and reports stay available."
                checked={draft.businessDayEnabled} onChange={(v) => { set("businessDayEnabled", v); if (v && !draft.timeZone) set("timeZone", browserZone); }} disabled={!canEdit} />
              <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                <div className={s.field}><Label>Opens</Label><Input type="time" value={draft.businessDayStart ?? ""} disabled={!canEdit || !draft.businessDayEnabled} onChange={(e) => set("businessDayStart", e.target.value || null)} /></div>
                <div className={s.field}><Label>Scheduled end</Label><Input type="time" value={draft.businessDayEnd ?? ""} disabled={!canEdit || !draft.businessDayEnabled} onChange={(e) => set("businessDayEnd", e.target.value || null)} /></div>
                <div className={s.field}><Label>Grace (minutes)</Label><Input type="number" min={0} max={720} value={draft.businessDayExtensionMinutes} disabled={!canEdit || !draft.businessDayEnabled} onChange={(e) => set("businessDayExtensionMinutes", Math.max(0, Math.min(720, parseInt(e.target.value, 10) || 0)))} /></div>
              </div>
              <span className={s.fieldHint}>An end time earlier than the start runs past midnight (e.g. 06:00 → 01:00). During the grace period trading continues and tills are warned.</span>
            </div>
          </div>
          <div className={s.panel}>
            <div className={s.panelHead}><div className={s.panelTitle}><Monitor size={16} />This computer</div></div>
            <div className={s.panelBody}>
              {terminal ? (
                <div className={s.stack} style={{ gap: 6 }}>
                  <div className={s.rowBetween}><span className={s.muted}>Terminal</span><span className={s.strong}>{terminal.name}</span></div>
                  <div className={s.rowBetween}><span className={s.muted}>Code</span><span className={s.mono}>{terminal.terminalCode}</span></div>
                  <div className={s.rowBetween}><span className={s.muted}>Counter</span><span>{terminal.counterName || "—"}</span></div>
                  <div className={s.rowBetween}><span className={s.muted}>Status</span><span>{terminal.status === "ACTIVE" ? "Active" : terminal.status.toLowerCase()}{terminal.isMain ? " · main" : ""}</span></div>
                  <span className={s.fieldHint}>Rename it or assign a counter under Terminals. Printers assigned to this terminal's name are used here.</span>
                </div>
              ) : (
                <div className={s.field}>
                  <Label>Terminal / counter name</Label>
                  <Input value={terminalName} onChange={(e) => setTerminalName(e.target.value)} placeholder="e.g. Front Desk 1" />
                  <span className={s.fieldHint}>Saved in this browser only (this computer isn't registered as a terminal). Printers assigned to this terminal name are used here.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "security" && <SecurityTab draft={draft} set={set} canEdit={canEdit} />}
      {tab === "cash" && <CashTab draft={draft} set={set} canEdit={canEdit} saveNow={saveNow} />}
      {tab === "receipt" && <ReceiptTab draft={draft} set={set} canEdit={canEdit} />}
      {tab === "terminals" && <TerminalsTab draft={draft} set={set} canEdit={canEdit} />}
      {tab === "devices" && <DevicesTab canEdit={canEdit} />}
      {tab === "printers" && <PrintersTab canEdit={canEdit} />}
      {tab === "sessions" && <SessionsTab onOpen={(sess) => showXReport(sess.id)} />}
      {tab === "corrections" && <CorrectionsTab />}
      {tab === "audit" && <AuditTab canView={canEdit} />}
    </div>
  );
}

const browserZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } })();
const timeZones: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [browserZone];
  } catch {
    return [browserZone];
  }
})();

type TabProps = { draft: PosSettings; set: <K extends keyof PosSettings>(k: K, v: PosSettings[K]) => void; canEdit: boolean };

function SecurityTab({ draft, set, canEdit }: TabProps) {
  const { settings, setSettings } = usePos();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const savePin = async () => {
    if (!/^\d{4,8}$/.test(pin)) { toast.error("The PIN must be 4 to 8 digits."); return; }
    if (pin !== confirm) { toast.error("The PINs don't match."); return; }
    setBusy(true);
    try {
      setSettings(await posApi.setSupervisorPin(pin));
      setPin("");
      setConfirm("");
      toast.success("Supervisor PIN saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={s.grid2}>
      <div className={s.panel}>
        <div className={s.panelHead}><div className={s.panelTitle}><ShieldCheck size={16} />Supervisor PIN</div>{settings.hasSupervisorPin ? <Pill tone="green">Set</Pill> : <Pill tone="amber">Not set</Pill>}</div>
        <div className={s.panelBody}>
          <p className={`${s.small} ${s.muted}`} style={{ marginBottom: 12 }}>Cashiers enter this PIN to approve gated actions. Users with POS edit permission (managers) approve without it.</p>
          <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className={s.field}><Label>New PIN</Label><Input type="password" inputMode="numeric" maxLength={8} value={pin} disabled={!canEdit} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} /></div>
            <div className={s.field}><Label>Confirm PIN</Label><Input type="password" inputMode="numeric" maxLength={8} value={confirm} disabled={!canEdit} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} /></div>
          </div>
          <Button className={`${primaryBtn} mt-3`} disabled={!canEdit || busy || !pin} onClick={savePin}>{settings.hasSupervisorPin ? "Change PIN" : "Set PIN"}</Button>
        </div>
      </div>
      <div className={s.panel}>
        <div className={s.panelHead}><div className={s.panelTitle}>Require supervisor approval for</div></div>
        <div className={s.panelBody}>
          <Toggle label="Removing lines / clearing a sale" checked={draft.requireSupervisorForVoid} onChange={(v) => set("requireSupervisorForVoid", v)} disabled={!canEdit} />
          <Toggle label="Sales returns & refunds" checked={draft.requireSupervisorForReturn} onChange={(v) => set("requireSupervisorForReturn", v)} disabled={!canEdit} />
          <Toggle label="Price overrides" checked={draft.requireSupervisorForPriceOverride} onChange={(v) => set("requireSupervisorForPriceOverride", v)} disabled={!canEdit} />
          <Toggle label="Cash outs" checked={draft.requireSupervisorForCashOut} onChange={(v) => set("requireSupervisorForCashOut", v)} disabled={!canEdit} />
          <Toggle label="Reprinting receipts" checked={draft.requireSupervisorForReprint} onChange={(v) => set("requireSupervisorForReprint", v)} disabled={!canEdit} />
          <Toggle label="Force-closing a session" checked={draft.requireSupervisorForForceClose} onChange={(v) => set("requireSupervisorForForceClose", v)} disabled={!canEdit} />
          <Toggle label="Cash variances above the tolerance" hint="Closing a session that is short or over by more than the tolerance (Cash handling)." checked={draft.requireSupervisorForVariance} onChange={(v) => set("requireSupervisorForVariance", v)} disabled={!canEdit} />
          <Toggle label="Closing the business day (Z-report)" checked={draft.zReportAccess === "SUPERVISOR"} onChange={(v) => set("zReportAccess", v ? "SUPERVISOR" : "ANY")} disabled={!canEdit} />
          <div className={s.field} style={{ marginTop: 12 }}>
            <Label>Maximum cashier discount (%)</Label>
            <Input type="number" min={0} max={100} step="0.5" value={draft.maxCashierDiscountPercent} disabled={!canEdit} onChange={(e) => set("maxCashierDiscountPercent", Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} />
            <span className={s.fieldHint}>Line or bill discounts above this need a supervisor.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CashTab({ draft, set, canEdit, saveNow }: TabProps & { saveNow: (patch: SettingsUpdate, done: string) => Promise<boolean> }) {
  const { currencyCode, settings } = usePos();
  const [d, setD] = useState("");
  const [busy, setBusy] = useState(false);
  // Denominations save as soon as they change — the counting screens use them straight away.
  const saveDenominations = async (next: number[], done: string) => {
    if (next.length === 0) { toast.error("Keep at least one denomination."); return; }
    setBusy(true);
    if (await saveNow({ denominations: next }, done)) setD("");
    setBusy(false);
  };
  const addDenomination = () => {
    const v = Math.round(parseFloat(d) * 100) / 100;
    if (!(v > 0)) return;
    if (settings.denominations.includes(v)) { toast.info(`${v} is already in the list.`); setD(""); return; }
    saveDenominations([...settings.denominations, v].sort((a, b) => b - a), `Denomination ${v} added`);
  };
  return (
    <div className={s.grid2}>
      <div className={s.panel}>
        <div className={s.panelHead}><div className={s.panelTitle}>Cash denominations ({currencyCode})</div></div>
        <div className={s.panelBody}>
          <p className={`${s.small} ${s.muted}`} style={{ marginBottom: 10 }}>Notes and coins shown when counting the float and the closing cash. Changes are saved straight away.</p>
          <div className={s.chipList} style={{ marginBottom: 10 }}>
            {settings.denominations.map((x) => (
              <span key={x} className={s.chip}>{x >= 1 ? x : x.toFixed(2)}{canEdit && <button type="button" disabled={busy} aria-label={`Remove ${x}`}
                onClick={() => saveDenominations(settings.denominations.filter((y) => y !== x), `Denomination ${x} removed`)}><X size={12} /></button>}</span>
            ))}
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Input type="number" step="0.01" min="0" value={d} onChange={(e) => setD(e.target.value)} placeholder="Add denomination, e.g. 2000"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDenomination(); } }} />
              <Button variant="outline" disabled={busy || !(parseFloat(d) > 0)} onClick={addDenomination}><Plus className="h-4 w-4" /></Button>
            </div>
          )}
          <div className={s.field} style={{ marginTop: 16 }}>
            <Label>Variance tolerance ({currencyCode})</Label>
            <Input type="number" step="0.01" min="0" value={draft.cashVarianceThreshold} disabled={!canEdit} onChange={(e) => set("cashVarianceThreshold", Math.max(0, parseFloat(e.target.value) || 0))} />
            <span className={s.fieldHint}>Closing differences larger than this need written remarks{draft.requireSupervisorForVariance ? " and a supervisor's approval" : ""} (0 = any difference).</span>
          </div>
        </div>
      </div>
      <div className={s.panel} style={{ alignSelf: "start" }}>
        <div className={s.panelHead}><div className={s.panelTitle}>Cash in / cash out</div></div>
        <div className={s.panelBody}>
          <Toggle label="Category is mandatory" hint="Every cash in / cash out at the till needs a category." checked={draft.requireCashMovementCategory} onChange={(v) => set("requireCashMovementCategory", v)} disabled={!canEdit} />
        </div>
      </div>
    </div>
  );
}

function sampleSale(taxInclusive: boolean): Sale {
  const items = [
    { name: "Whey Protein Isolate 2kg", sku: "WHEY-2KG", qty: 1, price: 120, disc: 12 },
    { name: "Shaker Bottle", sku: "SHK-600", qty: 2, price: 25, disc: 0 },
    { name: "Protein Energy Bar", sku: "BAR-01", qty: 3, price: 12, disc: 0 },
  ];
  let taxable = 0, tax = 0, sub = 0, disc = 0;
  const lines = items.map((i, idx) => {
    const gross = i.price * i.qty;
    const net = gross - i.disc;
    const t = taxInclusive ? Math.round((net - net / 1.05) * 100) / 100 : Math.round(net * 5) / 100;
    const tb = taxInclusive ? net - t : net;
    taxable += tb; tax += t; sub += gross; disc += i.disc;
    return { id: idx + 1, transactionId: 1, productId: idx + 1, productName: i.name, productSku: i.sku, barcode: null, categoryName: "Supplements", warehouseId: null,
      quantity: i.qty, returnedQuantity: 0, listPrice: i.price, unitPrice: i.price, priceOverridden: false, discountPercent: i.disc ? (i.disc * 100) / gross : 0,
      discountAmount: i.disc, billDiscountShare: 0, taxRate: 5, taxableAmount: tb, taxAmount: t, totalAmount: tb, lineTotal: tb + t };
  });
  const total = Math.round((taxable + tax) * 100) / 100;
  return {
    id: 1, transactionNumber: "TXN-0000001024", posSessionId: 1, memberId: 7, memberName: "Aisha Khan", memberCode: "GYM-0007", memberPhone: "+971 50 123 4567",
    paymentMethod: "MIXED", paymentSummary: "Card + Cash", paymentBreakdown: [{ method: "Card", amount: 100, cardType: "Visa" }, { method: "Cash", amount: Math.round((total - 100) * 100) / 100 }],
    paymentAllocations: null, subtotal: sub, lineDiscountAmount: disc, billDiscountType: null, billDiscountValue: null, billDiscountAmount: 0, discountCode: null, codeDiscountAmount: 0, promotionId: null, promotionName: null, discountAmount: disc,
    taxableAmount: taxable, taxAmount: tax, taxInclusive, totalAmount: total, receivedAmount: 200, changeAmount: Math.round((200 - total) * 100) / 100,
    creditAmount: 0, creditSettledAmount: 0, creditOutstanding: 0, refundedAmount: 0, returnStatus: "NONE", status: "COMPLETED", notes: null,
    cashierName: "Front Desk", terminalName: "Counter 1", businessDate: todayIso(), reprintCount: 0, approvedBy: null, branchId: 1,
    createdAt: new Date().toISOString(), updatedAt: null, items: lines, returns: [],
  };
}

function ReceiptTab({ draft, set, canEdit }: TabProps) {
  const { company, currencyCode } = usePos();
  const tpl = useMemo(() => parseReceiptTemplate(draft.receiptTemplate), [draft.receiptTemplate]);
  const [width, setWidth] = useState<58 | 80>(80);
  const upd = (patch: Partial<ReceiptTemplate>) => set("receiptTemplate", serializeReceiptTemplate({ ...tpl, ...patch }));
  const html = useMemo(() => company
    ? thermalDocument(receiptHtmlBody(saleReceipt(sampleSale(draft.taxInclusive), company, tpl, currencyCode), width), width, "Preview", tpl.fontScale)
    : "", [company, tpl, currencyCode, width, draft.taxInclusive]);
  const toggles: [keyof ReceiptTemplate, string][] = [
    ["showLogo", "Company logo"], ["showCompanyDetails", "Address & phone"], ["showTrn", "TRN"], ["showCashier", "Cashier"], ["showTerminal", "Terminal"],
    ["showCustomer", "Customer block"], ["showItemSku", "Item SKU"], ["showItemVat", "VAT % per item"], ["showVatSummary", "VAT summary"],
    ["showPaymentDetails", "Payment details & change"], ["showSavings", "“You saved” line"], ["showCreditBalance", "Credit account block"],
    ["showQrCode", "Verification QR code"], ["showBarcode", "Receipt barcode (for returns)"], ["showReturnPolicy", "Return policy"],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(340px, 440px)", gap: 20 }}>
      <div className={s.stack}>
        <div className={s.panel}>
          <div className={s.panelHead}><div className={s.panelTitle}>Content</div>{canEdit && <Button size="sm" variant="outline" onClick={() => set("receiptTemplate", serializeReceiptTemplate(DEFAULT_RECEIPT_TEMPLATE))}>Reset to default</Button>}</div>
          <div className={s.panelBody}>
            <div className={s.stack}>
              <div className={s.field}>
                <Label>Title</Label>
                <Select value={tpl.title} onValueChange={(v) => upd({ title: v as ReceiptTemplate["title"] })} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatic (Tax Invoice when VAT applies)</SelectItem>
                    <SelectItem value="TAX INVOICE">TAX INVOICE</SelectItem>
                    <SelectItem value="SIMPLIFIED TAX INVOICE">SIMPLIFIED TAX INVOICE</SelectItem>
                    <SelectItem value="SALES RECEIPT">SALES RECEIPT</SelectItem>
                    <SelectItem value="RECEIPT">RECEIPT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={s.field}><Label>Header text (under company name — Arabic supported)</Label><Textarea rows={2} value={tpl.headerText} disabled={!canEdit} onChange={(e) => upd({ headerText: e.target.value })} /></div>
              <div className={s.field}><Label>Footer text</Label><Textarea rows={3} value={tpl.footerText} disabled={!canEdit} onChange={(e) => upd({ footerText: e.target.value })} /></div>
              {tpl.showReturnPolicy && <div className={s.field}><Label>Return policy</Label><Textarea rows={2} value={tpl.returnPolicyText} disabled={!canEdit} onChange={(e) => upd({ returnPolicyText: e.target.value })} /></div>}
              <div className={s.field}>
                <Label>Text size</Label>
                <div className={s.segmented}>
                  {[0.9, 1, 1.1, 1.2].map((f) => <button key={f} type="button" disabled={!canEdit} className={tpl.fontScale === f ? s.segOn : ""} onClick={() => upd({ fontScale: f })}>{Math.round(f * 100)}%</button>)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={s.panel}>
          <div className={s.panelHead}><div className={s.panelTitle}>Show on receipt</div><div className={s.panelSub}>Company name, logo and TRN come from Settings › Company details.</div></div>
          <div className={s.panelBody} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 24 }}>
            {toggles.map(([k, label]) => <Toggle key={k} label={label} checked={Boolean(tpl[k])} onChange={(v) => upd({ [k]: v } as Partial<ReceiptTemplate>)} disabled={!canEdit} />)}
          </div>
        </div>
      </div>
      <div className={s.panel} style={{ alignSelf: "start", position: "sticky", top: 16 }}>
        <div className={s.panelHead}>
          <div className={s.panelTitle}>Live preview</div>
          <div className={s.segmented}><button type="button" className={width === 80 ? s.segOn : ""} onClick={() => setWidth(80)}>80 mm</button><button type="button" className={width === 58 ? s.segOn : ""} onClick={() => setWidth(58)}>58 mm</button></div>
        </div>
        <div className={s.panelBody}>{html ? <ReceiptPreview html={html} widthMm={width} /> : <div className={s.muted}>Loading company details…</div>}</div>
      </div>
    </div>
  );
}

const EMPTY_PRINTER: Partial<PosPrinter> = { name: "", connectionType: "BROWSER", paperSize: "80mm", isDefault: false, openDrawer: false, autoCut: true, enabled: true, portNumber: 9100 };

function PrintersTab({ canEdit }: { canEdit: boolean }) {
  const { printers, refreshPrinters, terminalName } = usePos();
  const [terminalNames, setTerminalNames] = useState<string[]>([]);
  useEffect(() => { posApi.terminals().then((t) => setTerminalNames(t.map((x) => x.name))).catch(() => setTerminalNames([])); }, []);
  const [agent, setAgent] = useState<{ ok: boolean; version?: string } | null | "checking">("checking");
  const [agentPrinters, setAgentPrinters] = useState<AgentPrinter[]>([]);
  const [editing, setEditing] = useState<Partial<PosPrinter> | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);

  const probe = useCallback(async () => {
    setAgent("checking");
    const h = await agentHealth();
    setAgent(h);
    if (h) listAgentPrinters().then(setAgentPrinters).catch(() => setAgentPrinters([]));
  }, []);
  useEffect(() => { probe(); }, [probe]);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      if (editing.id) await posApi.updatePrinter(editing.id, editing);
      else await posApi.createPrinter(editing);
      toast.success("Printer saved");
      setEditing(null);
      refreshPrinters();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: PosPrinter) => {
    try {
      await posApi.deletePrinter(p.id);
      toast.success(`${p.name} removed`);
      refreshPrinters();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const test = async (p: PosPrinter) => {
    setTesting(p.id);
    try {
      const o = await testPrinter(p);
      toast.success(`Test page sent (${o.mode})${o.warning ? ` — ${o.warning}` : ""}`);
      await posApi.recordPrinterTest(p.id, true, o.warning || `Printed via ${o.mode}`).catch(() => undefined);
    } catch (e) {
      toast.error(`Test failed: ${(e as Error).message}`);
      await posApi.recordPrinterTest(p.id, false, (e as Error).message).catch(() => undefined);
    } finally {
      setTesting(null);
      refreshPrinters();
    }
  };

  return (
    <div className={s.stack}>
      <div className={s.grid2}>
        <div className={s.panel}>
          <div className={s.panelHead}><div className={s.panelTitle}><Cpu size={16} />Local print agent</div>
            {agent === "checking" ? <Pill tone="gray">Checking…</Pill> : agent ? <Pill tone="green" dot>Running {agent.version ? `v${agent.version}` : ""}</Pill> : <Pill tone="amber" dot>Not detected</Pill>}
          </div>
          <div className={s.panelBody}>
            <p className={`${s.small} ${s.muted}`}>USB, Bluetooth and Windows-queue thermal printers are driven through the POS print agent running on this computer (port 19777). It sends raw ESC/POS so the receipt is dark and crisp, the paper is cut and the cash drawer opens. Network (LAN) printers need no agent.</p>
            {agent && agentPrinters.length > 0 && <div className={`${s.small}`} style={{ marginTop: 8 }}>Printers on this computer: {agentPrinters.map((p) => `${p.name}${p.isDefault ? " ★" : ""}`).join(", ")}</div>}
            <Button size="sm" variant="outline" className="mt-3" onClick={probe}>Check again</Button>
          </div>
        </div>
        <div className={s.panel}>
          <div className={s.panelHead}><div className={s.panelTitle}><Monitor size={16} />How printers are chosen</div></div>
          <div className={s.panelBody}>
            <p className={`${s.small} ${s.muted}`}>A terminal uses the default enabled printer assigned to its terminal name (this computer: <b>{terminalName || "not named"}</b>), otherwise the branch-wide default. With no printer configured, receipts print through the browser's print dialog.</p>
          </div>
        </div>
      </div>
      <div className={s.panel}>
        <div className={s.panelHead}>
          <div className={s.panelTitle}><Printer size={16} />Receipt printers</div>
          {canEdit && <Button className={primaryBtn} onClick={() => setEditing({ ...EMPTY_PRINTER, terminalName: terminalName || null })}><Plus className="h-4 w-4 mr-2" />Add printer</Button>}
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Name</th><th>Connection</th><th>Paper</th><th>Terminal</th><th>Drawer</th><th>Last test</th><th /></tr></thead>
            <tbody>
              {printers.length === 0 && <tr><td colSpan={7}><Empty icon={<Printer size={28} />} title="No printers configured" hint="Receipts will use the browser print dialog until you add one." /></td></tr>}
              {printers.map((p) => (
                <tr key={p.id}>
                  <td><span className={s.strong}>{p.name}</span> {p.isDefault && <Pill tone="green">Default</Pill>} {!p.enabled && <Pill tone="gray">Disabled</Pill>}</td>
                  <td>{p.connectionType === "NETWORK" ? <span className="flex items-center gap-1"><Wifi size={13} />{p.ipAddress}:{p.portNumber}</span> : p.connectionType === "AGENT" ? `Agent · ${p.systemPrinterName}` : "Browser dialog"}</td>
                  <td>{p.paperSize}</td>
                  <td>{p.terminalName || <span className={s.muted}>All terminals</span>}</td>
                  <td>{p.openDrawer ? <CheckCircle2 size={16} className="text-[#2B7A78]" /> : <span className={s.muted}>—</span>}</td>
                  <td className={s.small}>{p.lastTestResult ? <span className={p.lastTestResult.startsWith("OK") ? s.success : s.danger}>{p.lastTestResult.startsWith("OK") ? <CheckCircle2 size={13} style={{ display: "inline" }} /> : <XCircle size={13} style={{ display: "inline" }} />} {fmtDateTime(p.lastTestAt)}</span> : <span className={s.muted}>Never</span>}</td>
                  <td className={s.num} style={{ whiteSpace: "nowrap" }}>
                    <Button size="sm" variant="outline" disabled={testing === p.id} onClick={() => test(p)}>{testing === p.id ? "Testing…" : "Test"}</Button>{" "}
                    {canEdit && <><Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" className="text-[#E63946]" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button></>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent style={{ maxWidth: 560 }}>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit printer" : "Add printer"}</DialogTitle>
            <DialogDescription>Receipt printers for the POS terminal.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className={s.stack}>
              <div className={s.field}><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Front desk Epson TM-T82" /></div>
              <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={s.field}>
                  <Label>Connection</Label>
                  <Select value={editing.connectionType} onValueChange={(v) => setEditing({ ...editing, connectionType: v as PosPrinter["connectionType"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BROWSER">Browser print dialog</SelectItem>
                      <SelectItem value="AGENT">USB / Windows printer (print agent)</SelectItem>
                      <SelectItem value="NETWORK">Network printer (LAN IP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={s.field}>
                  <Label>Paper</Label>
                  <Select value={editing.paperSize} onValueChange={(v) => setEditing({ ...editing, paperSize: v as PaperSize })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="80mm">80 mm</SelectItem><SelectItem value="58mm">58 mm</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              {editing.connectionType === "AGENT" && (
                <div className={s.field}>
                  <Label>Windows printer</Label>
                  {agentPrinters.length > 0 ? (
                    <Select value={editing.systemPrinterName ?? ""} onValueChange={(v) => setEditing({ ...editing, systemPrinterName: v })}>
                      <SelectTrigger><SelectValue placeholder="Select a printer on this computer" /></SelectTrigger>
                      <SelectContent>{agentPrinters.map((p) => <SelectItem key={p.name} value={p.name}>{p.name}{p.isDefault ? " (default)" : ""}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input value={editing.systemPrinterName ?? ""} onChange={(e) => setEditing({ ...editing, systemPrinterName: e.target.value })} placeholder="Exact Windows printer name" />
                  )}
                  {!agent && <span className={`${s.fieldHint} ${s.warnText}`}>The print agent isn't running on this computer, so its printers can't be listed.</span>}
                </div>
              )}
              {editing.connectionType === "NETWORK" && (
                <div className={s.grid2} style={{ gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                  <div className={s.field}><Label>IP address</Label><Input value={editing.ipAddress ?? ""} onChange={(e) => setEditing({ ...editing, ipAddress: e.target.value })} placeholder="192.168.1.50" /></div>
                  <div className={s.field}><Label>Port</Label><Input type="number" value={editing.portNumber ?? 9100} onChange={(e) => setEditing({ ...editing, portNumber: parseInt(e.target.value, 10) || 9100 })} /></div>
                </div>
              )}
              <div className={s.field}>
                <Label>Terminal name (leave empty for every terminal)</Label>
                <Input list="pos-terminal-names" value={editing.terminalName ?? ""} onChange={(e) => setEditing({ ...editing, terminalName: e.target.value || null })} placeholder="e.g. Front Desk 1" />
                <datalist id="pos-terminal-names">{terminalNames.map((n) => <option key={n} value={n} />)}</datalist>
              </div>
              <Toggle label="Default printer" checked={Boolean(editing.isDefault)} onChange={(v) => setEditing({ ...editing, isDefault: v })} />
              {editing.connectionType !== "BROWSER" && <Toggle label="Cash drawer connected" hint="Kicks the drawer on cash sales and from “Open drawer”." checked={Boolean(editing.openDrawer)} onChange={(v) => setEditing({ ...editing, openDrawer: v })} />}
              {editing.connectionType !== "BROWSER" && <Toggle label="Auto-cut paper" checked={editing.autoCut !== false} onChange={(v) => setEditing({ ...editing, autoCut: v })} />}
              <Toggle label="Enabled" checked={editing.enabled !== false} onChange={(v) => setEditing({ ...editing, enabled: v })} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className={primaryBtn} disabled={busy || !editing?.name?.trim()} onClick={save}>{busy ? "Saving…" : "Save printer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionsTab({ onOpen }: { onOpen: (s: PosSession) => void }) {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(todayIso());
  const [status, setStatus] = useState("ALL");
  const [cashier, setCashier] = useState("");
  const [rows, setRows] = useState<PosSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [movementsOf, setMovementsOf] = useState<PosSession | null>(null);
  const [correct, setCorrect] = useState<CorrectionTargetRef | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await posApi.sessionHistory({ from, to, status: status === "ALL" ? undefined : status, cashier: cashier.trim() || undefined, size: 100 });
      setRows(page.sessions);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [from, to, status, cashier]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <div className={s.panelTitle}><History size={16} />Sessions</div>
        <div className={s.rowWrap}>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger style={{ width: 120 }}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All</SelectItem><SelectItem value="OPEN">Open</SelectItem><SelectItem value="CLOSED">Closed</SelectItem></SelectContent>
          </Select>
          <Input value={cashier} onChange={(e) => setCashier(e.target.value)} placeholder="Cashier" style={{ width: 160 }} />
        </div>
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>Session</th><th>Business date</th><th>Cashier</th><th>Terminal</th><th>Opened</th><th>Closed</th><th className={s.num}>Sales</th><th className={s.num}>Net</th><th className={s.num}>Variance</th><th /></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={10} className={s.muted}>Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={10} className={s.muted}>No sessions in this range.</td></tr>}
            {rows.map((x) => (
              <tr key={x.id}>
                <td><span className={s.strong}>{x.sessionNumber}</span> {x.status === "OPEN" ? <Pill tone={x.stale ? "red" : "green"}>Open</Pill> : x.forceClosed ? <Pill tone="amber">Forced</Pill> : null}</td>
                <td>{fmtDate(x.businessDate)}</td>
                <td>{x.staffName || x.openedBy}</td>
                <td>{x.terminalName || "—"}</td>
                <td>{fmtDateTime(x.openedAt)}</td>
                <td>{x.closedAt ? fmtDateTime(x.closedAt) : "—"}</td>
                <td className={s.num}>{x.transactionCount}</td>
                <td className={s.num}><Money value={x.totalSales} /></td>
                <td className={`${s.num} ${(x.cashVariance ?? 0) < 0 ? s.danger : ""}`}>{x.cashVariance != null ? num(x.cashVariance) : "—"}</td>
                <td className={s.num} style={{ whiteSpace: "nowrap" }}>
                  <Button size="sm" variant="outline" onClick={() => setMovementsOf(x)}>Cash in/out</Button>{" "}
                  {x.status === "CLOSED" && <><Button size="sm" variant="outline" onClick={() => setCorrect({ kind: "SESSION", session: x })}>Correct count</Button>{" "}</>}
                  <Button size="sm" variant="outline" onClick={() => onOpen(x)}>{x.status === "CLOSED" ? "X-Report" : "X / Close"}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SessionMovementsDialog session={movementsOf} onOpenChange={(o) => !o && setMovementsOf(null)} />
      <CorrectionRequestDialog target={correct} open={Boolean(correct)} onOpenChange={(o) => !o && setCorrect(null)} onDone={() => load()} />
    </div>
  );
}

const ACTIONS = ["SALE", "RETURN", "PRICE_OVERRIDE", "DISCOUNT_OVERRIDE", "SESSION_OPEN", "SESSION_CLOSE", "SESSION_FORCE_CLOSE", "CASH_IN", "CASH_OUT",
  "DRAWER_OPEN", "REPRINT", "RECEIPT_PRINT", "RECEIPT_SHARE", "SALE_HOLD", "SALE_RECALL", "SALE_HOLD_DISCARD", "LINE_VOID", "CART_CLEAR", "CREDIT_PAYMENT",
  "DAY_CLOSE", "X_REPORT_PRINT", "REPORT_PRINT", "TERMINAL_LOCK", "TERMINAL_UNLOCK", "SETTINGS_UPDATE", "SUPERVISOR_PIN_CHANGE", "PRINTER_ADD", "PRINTER_UPDATE", "PRINTER_DELETE",
  "CORRECTION_REQUEST", "CORRECTION_SUBMIT", "CORRECTION_APPROVE", "CORRECTION_APPLY", "CORRECTION_REJECT", "CORRECTION_CANCEL", "CORRECTION_FAILED",
  "CASH_CATEGORY_CREATE", "CASH_CATEGORY_UPDATE", "CASH_CATEGORY_ACTIVATE", "CASH_CATEGORY_DEACTIVATE"];

function AuditTab({ canView }: { canView: boolean }) {
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [action, setAction] = useState("ALL");
  const [user, setUser] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const r = await posApi.auditLogs({ from, to, action: action === "ALL" ? undefined : action, user: user.trim() || undefined, page, size: 50 });
      setRows(r.logs);
      setPages(Math.max(1, r.pagination.totalPages));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [canView, from, to, action, user, page]);
  useEffect(() => { load(); }, [load]);
  if (!canView) return <div className={s.panel}><Empty icon={<ClipboardList size={30} />} title="The POS audit log is visible to supervisors only" /></div>;
  const tone = (a: string): "green" | "amber" | "red" | "gray" | "blue" | "purple" =>
    a.includes("OVERRIDE") || a === "RETURN" || a === "LINE_VOID" || a === "CART_CLEAR" || a.includes("FORCE") ? "amber"
      : a === "CORRECTION_REJECT" || a === "CORRECTION_FAILED" ? "red"
      : a.startsWith("CORRECTION") ? "amber"
      : a.startsWith("SESSION") || a === "DAY_CLOSE" ? "blue" : a === "SALE" || a === "CREDIT_PAYMENT" ? "green"
      : a.includes("SETTINGS") || a.includes("PIN") || a.includes("PRINTER") ? "purple" : "gray";
  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <div className={s.panelTitle}><ClipboardList size={16} />POS audit trail</div>
        <div className={s.rowWrap}>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} style={{ width: 150 }} />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} style={{ width: 150 }} />
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger style={{ width: 200 }}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All actions</SelectItem>{ACTIONS.map((a) => <SelectItem key={a} value={a}>{a.replace(/_/g, " ").toLowerCase()}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={user} onChange={(e) => { setUser(e.target.value); setPage(1); }} placeholder="User" style={{ width: 140 }} />
        </div>
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>When</th><th>Action</th><th>Reference</th><th>Details</th><th className={s.num}>Amount</th><th>By</th><th>Approved by</th><th>Terminal</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className={s.muted}>Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={8} className={s.muted}>No POS activity for these filters.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.createdAt)}</td>
                <td><Pill tone={tone(r.action)}>{r.action.replace(/_/g, " ").toLowerCase()}</Pill></td>
                <td className={s.strong}>{r.referenceNumber || "—"}</td>
                <td className={s.small} style={{ maxWidth: 360 }}>{r.details || "—"}</td>
                <td className={s.num}>{r.amount != null ? <Money value={r.amount} /> : "—"}</td>
                <td>{r.performedBy}</td>
                <td>{r.approvedBy || "—"}</td>
                <td>{r.terminalName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={s.panelHead} style={{ borderTop: "1px solid #EEF2F6", borderBottom: 0 }}>
        <span className={s.muted}>Page {page} of {pages}</span>
        <div className={s.rowWrap}>
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
