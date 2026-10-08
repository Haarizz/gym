import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, Cpu, Layers, Plus, Printer, RotateCw, ScanLine } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { posApi } from "../api";
import { usePos } from "../PosContext";
import { Pill } from "./Shared";
import { fmtDateTime } from "../pricing";
import type { DeviceDashboard, DeviceEvent, DeviceHealth, DeviceType, HardwareProfile, HardwareRole, PosDevice, PosPrinter, PosTerminal, PrintJob } from "../types";
import s from "../pos.module.css";

const primaryBtn = "bg-[#2B7A78] hover:bg-[#236862] text-white";

export const TYPE_LABEL: Record<DeviceType, string> = {
  PRINTER: "Printer", SCANNER: "Scanner", CASH_DRAWER: "Cash drawer", CARD_TERMINAL: "Card terminal",
  CUSTOMER_DISPLAY: "Customer display", SCALE: "Scale", GENERIC: "Other",
};
const ROLE_LABEL: Record<HardwareRole, string> = {
  RECEIPT_PRINTER: "Receipt printer", REPORT_PRINTER: "Report printer", CASH_DRAWER: "Cash drawer", SCANNER: "Scanner",
  CARD_TERMINAL: "Card terminal", CUSTOMER_DISPLAY: "Customer display", SCALE: "Scale",
};
const ROLE_TYPE: Record<HardwareRole, DeviceType> = {
  RECEIPT_PRINTER: "PRINTER", REPORT_PRINTER: "PRINTER", CASH_DRAWER: "CASH_DRAWER", SCANNER: "SCANNER",
  CARD_TERMINAL: "CARD_TERMINAL", CUSTOMER_DISPLAY: "CUSTOMER_DISPLAY", SCALE: "SCALE",
};
const CONNECTIONS = ["USB", "NETWORK", "BLUETOOTH", "SERIAL", "KEYBOARD_WEDGE", "PRINTER_PORT", "OTHER"];

export function healthPill(h: DeviceHealth | null | undefined) {
  if (h === "HEALTHY") return <Pill tone="green" dot>Healthy</Pill>;
  if (h === "DEGRADED") return <Pill tone="amber" dot>Degraded</Pill>;
  if (h === "OFFLINE") return <Pill tone="red" dot>Offline</Pill>;
  return <Pill tone="gray" dot>Unknown</Pill>;
}

function jobPill(j: PrintJob) {
  const tone = j.status === "SUCCEEDED" ? "green" : j.status === "FAILED" ? "red" : j.status === "CANCELLED" ? "gray" : "amber";
  return <Pill tone={tone}>{j.status.toLowerCase()}</Pill>;
}

type DeviceDraft = Partial<PosDevice>;

export function DevicesTab({ canEdit }: { canEdit: boolean }) {
  const { terminalName } = usePos();
  const [dash, setDash] = useState<DeviceDashboard | null>(null);
  const [devices, setDevices] = useState<PosDevice[]>([]);
  const [profiles, setProfiles] = useState<HardwareProfile[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [jobStatus, setJobStatus] = useState("ALL");
  const [printers, setPrinters] = useState<PosPrinter[]>([]);
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [showRetired, setShowRetired] = useState(false);
  const [draft, setDraft] = useState<DeviceDraft | null>(null);
  const [events, setEvents] = useState<{ device: PosDevice; rows: DeviceEvent[] } | null>(null);
  const [scanFor, setScanFor] = useState<PosDevice | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [profileDraft, setProfileDraft] = useState<{ id?: number; name: string; description: string; roles: Partial<Record<HardwareRole, number>> } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, list, p, j] = await Promise.all([
        posApi.deviceDashboard(), posApi.devices(undefined, showRetired), posApi.hardwareProfiles(),
        posApi.printJobs({ status: jobStatus === "ALL" ? undefined : jobStatus, size: 25 }),
      ]);
      setDash(d);
      setDevices(list);
      setProfiles(p);
      setJobs(j.jobs);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [showRetired, jobStatus]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    posApi.printers().then(setPrinters).catch(() => setPrinters([]));
    posApi.terminals().then(setTerminals).catch(() => setTerminals([]));
  }, []);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      await load();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      await load();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openEvents = async (d: PosDevice) => {
    try {
      setEvents({ device: d, rows: await posApi.deviceEvents(d.id) });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const saveDevice = async () => {
    if (!draft) return;
    const body: Partial<PosDevice> = {
      name: draft.name?.trim(), deviceType: draft.deviceType, connectionType: draft.connectionType ?? "",
      address: draft.address ?? "", notes: draft.notes ?? "", deviceCode: draft.deviceCode?.trim() || undefined,
      terminalId: draft.terminalId ?? 0, printerId: draft.printerId ?? 0,
    };
    const ok = await run(() => draft.id ? posApi.updateDevice(draft.id, body) : posApi.createDevice(body), "Device saved");
    if (ok) setDraft(null);
  };

  const saveProfile = async () => {
    if (!profileDraft) return;
    const devicesList = (Object.entries(profileDraft.roles) as [HardwareRole, number | undefined][])
      .filter(([, id]) => id != null).map(([role, deviceId]) => ({ role, deviceId: deviceId as number }));
    const ok = await run(() => profileDraft.id
      ? posApi.updateHardwareProfile(profileDraft.id, { name: profileDraft.name.trim(), description: profileDraft.description, devices: devicesList })
      : posApi.createHardwareProfile({ name: profileDraft.name.trim(), description: profileDraft.description, devices: devicesList }), "Hardware profile saved");
    if (ok) setProfileDraft(null);
  };

  const usable = useMemo(() => devices.filter((d) => d.status !== "DECOMMISSIONED"), [devices]);
  const tiles: [string, React.ReactNode, string?][] = dash ? [
    ["Devices", dash.devices],
    ["Need attention", dash.attention, dash.attention > 0 ? "#B91C1C" : undefined],
    ["Terminals online", `${dash.terminalsOnline} / ${dash.terminalsOnline + dash.terminalsOffline}`],
    ["Awaiting approval", dash.terminalsPending, dash.terminalsPending > 0 ? "#B45309" : undefined],
    ["Prints (24h)", dash.jobsSucceeded24h],
    ["Failed prints (24h)", dash.jobsFailed24h, dash.jobsFailed24h > 0 ? "#B91C1C" : undefined],
  ] : [];

  return (
    <div className={s.stack}>
      {dash && (
        <div className={s.grid2} style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 }}>
          {tiles.map(([label, value, color]) => (
            <div key={label} className={s.panel}>
              <div className={s.panelBody} style={{ padding: 12 }}>
                <div className={`${s.small} ${s.muted}`}>{label}</div>
                <div className={s.strong} style={{ fontSize: 22, color }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={s.panel}>
        <div className={s.panelHead}>
          <div className={s.panelTitle}><Cpu size={16} />Devices</div>
          <div className={s.rowWrap}>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} /> Show decommissioned
            </label>
            {canEdit && <Button size="sm" className={primaryBtn} onClick={() => setDraft({ deviceType: "SCANNER", connectionType: "KEYBOARD_WEDGE" })}><Plus className="h-4 w-4 mr-1" />Add device</Button>}
          </div>
        </div>
        <div className={`${s.small} ${s.muted}`} style={{ padding: "8px 16px 0" }}>
          Printers are added under Printers and show up here automatically; their health follows every print.
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Device</th><th>Type</th><th>Connection</th><th>Where</th><th>Status</th><th>Health</th><th>Last used</th><th /></tr></thead>
            <tbody>
              {devices.length === 0 && <tr><td colSpan={8} className={s.muted}>No devices yet.</td></tr>}
              {devices.map((d) => (
                <tr key={d.id} style={{ opacity: d.status === "DECOMMISSIONED" ? 0.55 : 1 }}>
                  <td><span className={s.strong}>{d.name}</span><div className={`${s.small} ${s.muted}`}>{d.deviceCode}{d.profiles.length > 0 && ` · ${d.profiles.join(", ")}`}</div></td>
                  <td>{TYPE_LABEL[d.deviceType]}</td>
                  <td className={s.small}>{d.connectionType ? d.connectionType.replace(/_/g, " ").toLowerCase() : "—"}{d.address && <div className={s.muted}>{d.address}</div>}</td>
                  <td className={s.small}>{d.terminalName || (d.deviceType === "PRINTER" ? "All terminals" : "—")}{d.printerName && d.deviceType !== "PRINTER" && <div className={s.muted}>via {d.printerName}</div>}</td>
                  <td>{d.status === "ACTIVE" ? <Pill tone="green">Active</Pill> : <Pill tone={d.status === "MAINTENANCE" ? "amber" : "gray"}>{d.status.toLowerCase()}</Pill>}</td>
                  <td>{healthPill(d.health)}{d.healthMessage && <div className={`${s.small} ${s.muted}`} style={{ maxWidth: 220 }}>{d.healthMessage}</div>}</td>
                  <td className={s.small} style={{ whiteSpace: "nowrap" }}>{d.lastUsedAt ? fmtDateTime(d.lastUsedAt) : "—"}</td>
                  <td className={s.num} style={{ whiteSpace: "nowrap" }}>
                    <Button size="sm" variant="outline" onClick={() => openEvents(d)}><Activity className="h-3.5 w-3.5 mr-1" />Events</Button>{" "}
                    {d.deviceType === "SCANNER" && d.status === "ACTIVE" && <><Button size="sm" variant="outline" onClick={() => { setScanValue(""); setScanFor(d); }}><ScanLine className="h-3.5 w-3.5 mr-1" />Test</Button>{" "}</>}
                    {canEdit && d.deviceType === "CASH_DRAWER" && d.status === "ACTIVE" && <><Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => posApi.kickDrawerDevice(d.id, terminalName || null), `${d.name} opened`)}>Open</Button>{" "}</>}
                    {canEdit && !d.managedByPrinter && d.status !== "DECOMMISSIONED" && <>
                      <Button size="sm" variant="outline" onClick={() => setDraft(d)}>Edit</Button>{" "}
                      <Select value="" onValueChange={(v) => {
                        if (["ACTIVE", "INACTIVE", "MAINTENANCE", "DECOMMISSIONED"].includes(v)) run(() => posApi.setDeviceStatus(d.id, v), `${d.name}: ${v.toLowerCase()}`);
                        if (v === "HEALTHY" || v === "OFFLINE" || v === "DEGRADED") run(() => posApi.reportDeviceHealth(d.id, v, "Set from POS Console", terminalName || null), `${d.name} marked ${v.toLowerCase()}`);
                      }}>
                        <SelectTrigger style={{ width: 100, display: "inline-flex", height: 32 }}><SelectValue placeholder="More" /></SelectTrigger>
                        <SelectContent>
                          {d.status !== "ACTIVE" && <SelectItem value="ACTIVE">Set active</SelectItem>}
                          {d.status !== "MAINTENANCE" && <SelectItem value="MAINTENANCE">Maintenance</SelectItem>}
                          {d.status !== "INACTIVE" && <SelectItem value="INACTIVE">Deactivate</SelectItem>}
                          <SelectItem value="HEALTHY">Mark healthy</SelectItem>
                          <SelectItem value="DEGRADED">Mark degraded</SelectItem>
                          <SelectItem value="OFFLINE">Mark offline</SelectItem>
                          <SelectItem value="DECOMMISSIONED">Decommission</SelectItem>
                        </SelectContent>
                      </Select>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={s.grid2}>
        <div className={s.panel}>
          <div className={s.panelHead}>
            <div className={s.panelTitle}><Layers size={16} />Hardware profiles</div>
            {canEdit && <Button size="sm" className={primaryBtn} onClick={() => setProfileDraft({ name: "", description: "", roles: {} })}><Plus className="h-4 w-4 mr-1" />New profile</Button>}
          </div>
          <div className={`${s.small} ${s.muted}`} style={{ padding: "8px 16px 0" }}>A kit of devices assigned to terminals (Terminals › Edit). A terminal prints to its profile's receipt printer.</div>
          <div className={s.panelBody}>
            {profiles.length === 0 && <div className={s.muted}>No profiles yet.</div>}
            <div className={s.stack}>
              {profiles.map((p) => (
                <div key={p.id} style={{ border: "1px solid #EEF2F6", borderRadius: 8, padding: 10, opacity: p.status === "ACTIVE" ? 1 : 0.55 }}>
                  <div className={s.rowBetween}>
                    <span><span className={s.strong}>{p.name}</span> <span className={`${s.small} ${s.muted}`}>v{p.version}</span></span>
                    {canEdit && <span className={s.rowWrap}>
                      <Button size="sm" variant="outline" onClick={() => setProfileDraft({ id: p.id, name: p.name, description: p.description ?? "", roles: Object.fromEntries(p.devices.map((x) => [x.role, x.deviceId])) })}>Edit</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => posApi.updateHardwareProfile(p.id, { status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }), "Profile updated")}>{p.status === "ACTIVE" ? "Deactivate" : "Activate"}</Button>
                    </span>}
                  </div>
                  {p.description && <div className={`${s.small} ${s.muted}`}>{p.description}</div>}
                  <div className={s.small} style={{ marginTop: 6 }}>
                    {p.devices.length === 0 ? <span className={s.muted}>No devices</span> : p.devices.map((x) => (
                      <div key={x.role} className={s.rowBetween}><span className={s.muted}>{ROLE_LABEL[x.role]}</span><span>{x.deviceName} {healthPill(x.health)}</span></div>
                    ))}
                  </div>
                  <div className={`${s.small} ${s.muted}`} style={{ marginTop: 6 }}>Terminals: {p.terminals.length ? p.terminals.join(", ") : "none"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={s.panel}>
          <div className={s.panelHead}><div className={s.panelTitle}><Activity size={16} />Recent device events</div></div>
          <div className={s.tableWrap} style={{ maxHeight: 360, overflowY: "auto" }}>
            <table className={s.table}>
              <tbody>
                {(dash?.recentEvents ?? []).length === 0 && <tr><td className={s.muted}>Nothing yet.</td></tr>}
                {(dash?.recentEvents ?? []).map((e) => (
                  <tr key={e.id}>
                    <td className={s.small} style={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.createdAt)}</td>
                    <td className={s.small}><span className={s.strong}>{e.deviceName ?? "—"}</span><div className={s.muted}>{e.message}</div></td>
                    <td><Pill tone={e.result === "SUCCESS" ? "green" : e.result === "FAILURE" ? "red" : "gray"}>{e.eventType.replace(/_/g, " ").toLowerCase()}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={s.panel}>
        <div className={s.panelHead}>
          <div className={s.panelTitle}><Printer size={16} />Print jobs</div>
          <Select value={jobStatus} onValueChange={setJobStatus}>
            <SelectTrigger style={{ width: 150 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All jobs</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
              <SelectItem value="QUEUED">Queued</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>When</th><th>Job</th><th>Printer</th><th>Terminal</th><th>Status</th><th>Attempts</th><th /></tr></thead>
            <tbody>
              {jobs.length === 0 && <tr><td colSpan={7} className={s.muted}>No print jobs.</td></tr>}
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className={s.small} style={{ whiteSpace: "nowrap" }}>{fmtDateTime(j.createdAt)}</td>
                  <td className={s.small}><span className={s.strong}>#{j.id} {j.title || j.jobType.toLowerCase()}</span><div className={s.muted}>{j.jobType.replace("_", " ").toLowerCase()}{j.payloadBytes ? ` · ${j.payloadBytes} bytes` : ""}</div></td>
                  <td className={s.small}>{j.printerName || "—"}<div className={s.muted}>{j.connectionType?.toLowerCase()}</div></td>
                  <td className={s.small}>{j.terminalName || "—"}<div className={s.muted}>{j.requestedBy}</div></td>
                  <td>{jobPill(j)}{j.lastError && <div className={`${s.small} ${s.danger}`} style={{ maxWidth: 280 }}>{j.lastError}</div>}</td>
                  <td>{j.attemptCount}</td>
                  <td className={s.num} style={{ whiteSpace: "nowrap" }}>
                    {j.retryable && <><Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => posApi.retryPrintJob(j.id).then((r) => { if (r.status !== "SUCCEEDED") throw new Error(r.lastError || "Still failing"); }), `Job #${j.id} printed`)}><RotateCw className="h-3.5 w-3.5 mr-1" />Retry</Button>{" "}</>}
                    {canEdit && (j.status === "FAILED" || j.status === "QUEUED") && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => posApi.cancelPrintJob(j.id), `Job #${j.id} cancelled`)}>Cancel</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={Boolean(draft)} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent style={{ maxWidth: 520 }}>
          <DialogHeader><DialogTitle>{draft?.id ? `Edit ${draft.name}` : "Add device"}</DialogTitle><DialogDescription>Recorded in the device register and the POS audit trail.</DialogDescription></DialogHeader>
          {draft && (
            <div className={s.stack}>
              <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={s.field}><Label>Name *</Label><Input autoFocus value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Front desk scanner" /></div>
                <div className={s.field}>
                  <Label>Type</Label>
                  <Select value={draft.deviceType ?? "SCANNER"} onValueChange={(v) => setDraft({ ...draft, deviceType: v as DeviceType })} disabled={Boolean(draft.id)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(TYPE_LABEL) as DeviceType[]).filter((t) => t !== "PRINTER").map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className={s.field}>
                  <Label>Connection</Label>
                  <Select value={draft.connectionType || "NONE"} onValueChange={(v) => setDraft({ ...draft, connectionType: v === "NONE" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="NONE">Not set</SelectItem>{CONNECTIONS.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").toLowerCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className={s.field}><Label>Address / port</Label><Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="IP, COM port, MAC…" /></div>
                <div className={s.field}>
                  <Label>Terminal</Label>
                  <Select value={draft.terminalId ? String(draft.terminalId) : "NONE"} onValueChange={(v) => setDraft({ ...draft, terminalId: v === "NONE" ? null : Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="NONE">Any / not fixed</SelectItem>{terminals.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {draft.deviceType === "CASH_DRAWER" && (
                  <div className={s.field}>
                    <Label>Wired to printer</Label>
                    <Select value={draft.printerId ? String(draft.printerId) : "NONE"} onValueChange={(v) => setDraft({ ...draft, printerId: v === "NONE" ? null : Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="NONE">Not wired</SelectItem>{printers.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.connectionType.toLowerCase()})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className={s.field}><Label>Code</Label><Input value={draft.deviceCode ?? ""} onChange={(e) => setDraft({ ...draft, deviceCode: e.target.value })} placeholder="Auto (e.g. SCN-001)" /></div>
              <div className={s.field}><Label>Notes</Label><Input value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Model, serial number, supplier…" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button className={primaryBtn} disabled={busy || !draft?.name?.trim()} onClick={saveDevice}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(profileDraft)} onOpenChange={(o) => !o && setProfileDraft(null)}>
        <DialogContent style={{ maxWidth: 560 }}>
          <DialogHeader><DialogTitle>{profileDraft?.id ? "Edit hardware profile" : "New hardware profile"}</DialogTitle><DialogDescription>One device per role. Changing the devices bumps the profile version.</DialogDescription></DialogHeader>
          {profileDraft && (
            <div className={s.stack}>
              <div className={s.field}><Label>Name *</Label><Input autoFocus value={profileDraft.name} onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })} placeholder="e.g. Front desk kit" /></div>
              <div className={s.field}><Label>Description</Label><Input value={profileDraft.description} onChange={(e) => setProfileDraft({ ...profileDraft, description: e.target.value })} /></div>
              <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {(Object.keys(ROLE_LABEL) as HardwareRole[]).map((role) => {
                  const options = usable.filter((d) => d.deviceType === ROLE_TYPE[role]);
                  return (
                    <div key={role} className={s.field}>
                      <Label>{ROLE_LABEL[role]}</Label>
                      <Select value={profileDraft.roles[role] ? String(profileDraft.roles[role]) : "NONE"} disabled={options.length === 0}
                        onValueChange={(v) => setProfileDraft({ ...profileDraft, roles: { ...profileDraft.roles, [role]: v === "NONE" ? undefined : Number(v) } })}>
                        <SelectTrigger><SelectValue placeholder={options.length ? "None" : "No devices"} /></SelectTrigger>
                        <SelectContent><SelectItem value="NONE">None</SelectItem>{options.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDraft(null)}>Cancel</Button>
            <Button className={primaryBtn} disabled={busy || !profileDraft?.name.trim()} onClick={saveProfile}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(events)} onOpenChange={(o) => !o && setEvents(null)}>
        <DialogContent style={{ maxWidth: 760 }}>
          <DialogHeader><DialogTitle>{events?.device.name} — events</DialogTitle><DialogDescription>{events?.device.deviceCode} · last 100</DialogDescription></DialogHeader>
          <div className={s.tableWrap} style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <table className={s.table}>
              <thead><tr><th>When</th><th>Event</th><th>Details</th><th>By</th></tr></thead>
              <tbody>
                {events?.rows.length === 0 && <tr><td colSpan={4} className={s.muted}>No events.</td></tr>}
                {events?.rows.map((e) => (
                  <tr key={e.id}>
                    <td className={s.small} style={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.createdAt)}</td>
                    <td><Pill tone={e.result === "SUCCESS" ? "green" : e.result === "FAILURE" ? "red" : "gray"}>{e.eventType.replace(/_/g, " ").toLowerCase()}</Pill></td>
                    <td className={s.small}>{e.message || "—"}</td>
                    <td className={s.small}>{e.performedBy}{e.terminalName && <div className={s.muted}>{e.terminalName}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEvents(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(scanFor)} onOpenChange={(o) => !o && setScanFor(null)}>
        <DialogContent style={{ maxWidth: 440 }}>
          <DialogHeader><DialogTitle>Test {scanFor?.name}</DialogTitle><DialogDescription>Scan any barcode. A keyboard-wedge scanner types it here and presses Enter.</DialogDescription></DialogHeader>
          <Input autoFocus value={scanValue} onChange={(e) => setScanValue(e.target.value)} placeholder="Waiting for a scan…"
            onKeyDown={async (e) => {
              if (e.key !== "Enter" || !scanFor || !scanValue.trim()) return;
              e.preventDefault();
              const ok = await run(() => posApi.scanTest(scanFor.id, scanValue.trim(), terminalName || null), `Read "${scanValue.trim()}" — scanner OK`);
              if (ok) setScanFor(null);
            }} />
          <DialogFooter><Button variant="outline" onClick={() => setScanFor(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
