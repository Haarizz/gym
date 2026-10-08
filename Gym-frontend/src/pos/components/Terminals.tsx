import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRightLeft, Monitor, Plus, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { posApi } from "../api";
import { usePos } from "../PosContext";
import { useApproval } from "./Approval";
import { Pill } from "./Shared";
import { fmtDateTime } from "../pricing";
import type { HardwareProfile, PosCounter, PosSession, PosSettings, PosTerminal, TerminalStatus } from "../types";
import s from "../pos.module.css";

const primaryBtn = "bg-[#2B7A78] hover:bg-[#236862] text-white";

const STATUS_LABEL: Record<TerminalStatus, string> = {
  PENDING: "Awaiting approval", ACTIVE: "Active", MAINTENANCE: "Maintenance", BLOCKED: "Blocked",
  ARCHIVED: "Archived", DECOMMISSIONED: "Decommissioned",
};

export function terminalPill(t: Pick<PosTerminal, "status" | "connectivity">) {
  if (t.status === "ACTIVE") return t.connectivity === "ONLINE" ? <Pill tone="green" dot>Online</Pill> : <Pill tone="gray" dot>Offline</Pill>;
  const tone = t.status === "PENDING" || t.status === "MAINTENANCE" ? "amber" : t.status === "BLOCKED" ? "red" : "gray";
  return <Pill tone={tone}>{STATUS_LABEL[t.status]}</Pill>;
}

// ── Dashboard banner ───────────────────────────────────────────────────────

/** Why this browser can't sell (pending / blocked / …), or that the session lives on another terminal. */
export function TerminalBanner() {
  const { terminal, terminalError, session, setSession, refreshTerminal, settings } = usePos();
  const { withApproval } = useApproval();
  const [busy, setBusy] = useState(false);

  const moveHere = async () => {
    if (!session || !terminal) return;
    setBusy(true);
    try {
      const moved = await withApproval((pin) => posApi.transferSession(session.id, {
        destinationTerminalId: terminal.id, reason: `Continued on ${terminal.name}`, supervisorPin: pin,
      }));
      if (moved) {
        setSession(moved);
        refreshTerminal();
        toast.success(`${moved.sessionNumber} moved to ${terminal.name}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (terminalError) {
    return (
      <div className={`${s.callout} ${s.calloutWarn}`} role="status">
        <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <div className={s.strong}>This computer isn't registered as a terminal</div>
          <div className={s.small}>{terminalError}</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => refreshTerminal()}>Retry</Button>
      </div>
    );
  }
  if (!terminal) return null;
  if (terminal.status !== "ACTIVE") {
    const msg: Record<TerminalStatus, string> = {
      PENDING: `${terminal.name} (${terminal.terminalCode}) is waiting for a supervisor to approve it in POS Console › Terminals.`,
      MAINTENANCE: `${terminal.name} is under maintenance${terminal.statusReason ? ` — ${terminal.statusReason}` : ""}. A running session can finish; new sessions can't start here.`,
      BLOCKED: `${terminal.name} is blocked${terminal.statusReason ? ` — ${terminal.statusReason}` : ""}. Use another terminal.`,
      ARCHIVED: `${terminal.name} has been archived. A supervisor can restore it in POS Console › Terminals.`,
      DECOMMISSIONED: `${terminal.name} was retired. Reload to register this computer again.`,
      ACTIVE: "",
    };
    return (
      <div className={`${s.callout} ${terminal.status === "PENDING" || terminal.status === "MAINTENANCE" ? s.calloutWarn : s.calloutBad}`} role="status">
        <Monitor size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <div className={s.strong}>{STATUS_LABEL[terminal.status]}</div>
          <div className={s.small}>{msg[terminal.status]}</div>
        </div>
        {(terminal.status === "PENDING" || terminal.status === "DECOMMISSIONED") && <Button size="sm" variant="outline" onClick={() => refreshTerminal()}>Check again</Button>}
      </div>
    );
  }
  if (session && session.terminalId && session.terminalId !== terminal.id && (session.status === "OPEN" || session.status === "SUSPENDED")) {
    return (
      <div className={`${s.callout} ${s.calloutWarn}`} role="status">
        <ArrowRightLeft size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <div className={s.strong}>Your session {session.sessionNumber} is on {session.terminalName}</div>
          <div className={s.small}>Move it to this terminal ({terminal.name}) to keep selling here{settings.currentUserIsSupervisor ? "." : " — a supervisor has to approve the move."}</div>
        </div>
        <Button size="sm" className={primaryBtn} disabled={busy} onClick={moveHere}>Move here</Button>
      </div>
    );
  }
  return null;
}

// ── Transfer dialog (Live sessions) ────────────────────────────────────────

export function TransferSessionDialog({ session, onOpenChange, onDone }: {
  session: PosSession | null;
  onOpenChange: (o: boolean) => void;
  onDone?: (s: PosSession) => void;
}) {
  const { withApproval } = useApproval();
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [dest, setDest] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!session) return;
    setDest("");
    setReason("");
    posApi.terminals().then(setTerminals).catch((e) => toast.error((e as Error).message));
  }, [session]);
  if (!session) return null;
  const options = terminals.filter((t) => t.status === "ACTIVE" && t.id !== session.terminalId);
  const send = async () => {
    setBusy(true);
    try {
      const moved = await withApproval((pin) => posApi.transferSession(session.id, { destinationTerminalId: Number(dest), reason: reason.trim(), supervisorPin: pin }));
      if (moved) {
        toast.success(`${moved.sessionNumber} moved to ${moved.terminalName}`);
        onDone?.(moved);
        onOpenChange(false);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 520 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-[#2B7A78]" />Transfer {session.sessionNumber}</DialogTitle>
          <DialogDescription>Moves the open session — its cash, sales and float — from {session.terminalName || "its terminal"} to another terminal. Needs a supervisor.</DialogDescription>
        </DialogHeader>
        <div className={s.field}>
          <Label>Destination terminal</Label>
          <Select value={dest} onValueChange={setDest}>
            <SelectTrigger><SelectValue placeholder="Pick a terminal" /></SelectTrigger>
            <SelectContent>
              {options.map((t) => (
                <SelectItem key={t.id} value={String(t.id)} disabled={t.currentSessionId != null}>
                  {t.name}{t.counterName ? ` · ${t.counterName}` : ""}{t.currentSessionNumber ? ` (busy: ${t.currentSessionNumber})` : t.connectivity === "OFFLINE" ? " (offline)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={s.field}>
          <Label>Reason *</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Front desk PC restarting" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className={primaryBtn} disabled={busy || !dest || !reason.trim()} onClick={send}>{busy ? "Moving…" : "Transfer session"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Console tab ────────────────────────────────────────────────────────────

type Prompt = { title: string; label: string; required: boolean; run: (text: string) => Promise<unknown> };

export function TerminalsTab({ draft, set, canEdit }: {
  draft: PosSettings;
  set: <K extends keyof PosSettings>(k: K, v: PosSettings[K]) => void;
  canEdit: boolean;
}) {
  const { terminal: mine, refreshTerminal } = usePos();
  const [rows, setRows] = useState<PosTerminal[]>([]);
  const [counters, setCounters] = useState<PosCounter[]>([]);
  const [showRetired, setShowRetired] = useState(false);
  const [editing, setEditing] = useState<PosTerminal | null>(null);
  const [name, setName] = useState("");
  const [counterId, setCounterId] = useState("NONE");
  const [profileId, setProfileId] = useState("NONE");
  const [profiles, setProfiles] = useState<HardwareProfile[]>([]);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [promptText, setPromptText] = useState("");
  const [counterEdit, setCounterEdit] = useState<Partial<PosCounter> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, c, p] = await Promise.all([posApi.terminals(showRetired), posApi.counters(), posApi.hardwareProfiles().catch(() => [])]);
      setRows(t);
      setCounters(c);
      setProfiles(p);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [showRetired]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      await load();
      refreshTerminal();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const ask = (p: Prompt) => { setPromptText(""); setPrompt(p); };

  const pending = rows.filter((t) => t.status === "PENDING");
  const activeCounters = counters.filter((c) => c.status === "ACTIVE");

  return (
    <div className={s.stack}>
      <div className={s.grid2}>
        <div className={s.panel}>
          <div className={s.panelHead}><div className={s.panelTitle}><Monitor size={16} />Registration</div></div>
          <div className={s.panelBody}>
            <div className={s.toggleRow}>
              <div><div className={s.strong} style={{ fontSize: 14 }}>New devices need approval</div><div className={s.fieldHint}>A browser that opens the POS for the first time waits until a supervisor approves it.</div></div>
              <Switch checked={draft.requireTerminalApproval} onCheckedChange={(v) => set("requireTerminalApproval", v)} disabled={!canEdit} />
            </div>
            <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div className={s.field}>
                <Label>Maximum terminals</Label>
                <Input type="number" min="1" max="200" value={draft.maxTerminals} disabled={!canEdit} onChange={(e) => set("maxTerminals", Math.max(1, parseInt(e.target.value, 10) || 1))} />
              </div>
              <div className={s.field}>
                <Label>Offline after (minutes)</Label>
                <Input type="number" min="1" max="1440" value={draft.offlineThresholdMinutes} disabled={!canEdit} onChange={(e) => set("offlineThresholdMinutes", Math.max(1, parseInt(e.target.value, 10) || 1))} />
              </div>
            </div>
            <span className={s.fieldHint}>Save settings to apply. Archived and decommissioned terminals don't count towards the limit.</span>
          </div>
        </div>
        <div className={s.panel}>
          <div className={s.panelHead}>
            <div className={s.panelTitle}>Counters</div>
            {canEdit && <Button size="sm" className={primaryBtn} onClick={() => setCounterEdit({})}><Plus className="h-4 w-4 mr-1" />Add</Button>}
          </div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Counter</th><th>Terminals</th><th>Status</th><th /></tr></thead>
              <tbody>
                {counters.length === 0 && <tr><td colSpan={4} className={s.muted}>No counters yet — group terminals by checkout point (e.g. Reception, Café).</td></tr>}
                {counters.map((c) => (
                  <tr key={c.id} style={{ opacity: c.status === "ACTIVE" ? 1 : 0.55 }}>
                    <td><span className={s.strong}>{c.name}</span><div className={`${s.small} ${s.muted}`}>{c.code}{c.description ? ` · ${c.description}` : ""}</div></td>
                    <td>{c.terminalCount}</td>
                    <td>{c.status === "ACTIVE" ? <Pill tone="green">Active</Pill> : <Pill tone="gray">Inactive</Pill>}</td>
                    <td className={s.num} style={{ whiteSpace: "nowrap" }}>
                      {canEdit && <>
                        <Button size="sm" variant="outline" onClick={() => setCounterEdit(c)}>Edit</Button>{" "}
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => posApi.updateCounter(c.id, { status: c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }), "Counter updated")}>
                          {c.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </Button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className={`${s.callout} ${s.calloutWarn}`}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>{pending.length} device{pending.length === 1 ? " is" : "s are"} waiting for approval: {pending.map((t) => t.name).join(", ")}</div>
        </div>
      )}

      <div className={s.panel}>
        <div className={s.panelHead}>
          <div className={s.panelTitle}><Monitor size={16} />Terminals</div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} /> Show archived & decommissioned
          </label>
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Terminal</th><th>Counter</th><th>Status</th><th>Session</th><th>Device</th><th>Last seen</th><th /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className={s.muted}>No terminals registered yet — each browser registers itself when it opens the POS.</td></tr>}
              {rows.map((t) => (
                <tr key={t.id} style={{ opacity: t.status === "ARCHIVED" || t.status === "DECOMMISSIONED" ? 0.55 : 1 }}>
                  <td>
                    <span className={s.strong}>{t.name}</span>{" "}
                    {t.isMain && <Pill tone="blue"><Star size={11} style={{ display: "inline", marginRight: 3, verticalAlign: -1 }} />Main</Pill>}{" "}
                    {mine?.id === t.id && <Pill tone="purple">This computer</Pill>}
                    <div className={`${s.small} ${s.muted}`}>{t.terminalCode}</div>
                  </td>
                  <td>{t.counterName || "—"}{t.hardwareProfileName && <div className={`${s.small} ${s.muted}`}>Kit: {t.hardwareProfileName}</div>}</td>
                  <td>{terminalPill(t)}{t.statusReason && <div className={`${s.small} ${s.muted}`}>{t.statusReason}</div>}</td>
                  <td className={s.small}>{t.currentSessionNumber ? <>{t.currentSessionNumber}<div className={s.muted}>{t.currentSessionUser}</div></> : "—"}</td>
                  <td className={s.small}>{[t.browser, t.operatingSystem].filter(Boolean).join(" · ") || "—"}{t.ipAddress && <div className={s.muted}>{t.ipAddress}</div>}</td>
                  <td className={s.small} style={{ whiteSpace: "nowrap" }}>{t.lastSeenAt ? fmtDateTime(t.lastSeenAt) : "—"}{t.lastUser && <div className={s.muted}>{t.lastUser}</div>}</td>
                  <td className={s.num} style={{ whiteSpace: "nowrap" }}>
                    {canEdit && t.status === "PENDING" && <>
                      <Button size="sm" className={primaryBtn} disabled={busy} onClick={() => run(() => posApi.approveTerminal(t.id), `${t.name} approved`)}>Approve</Button>{" "}
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => ask({ title: `Reject ${t.name}`, label: "Reason", required: false, run: (r) => posApi.rejectTerminal(t.id, r) })}>Reject</Button>
                    </>}
                    {canEdit && ["ACTIVE", "MAINTENANCE", "BLOCKED"].includes(t.status) && <>
                      <Button size="sm" variant="outline" onClick={() => { setEditing(t); setName(t.name); setCounterId(t.counterId ? String(t.counterId) : "NONE"); setProfileId(t.hardwareProfileId ? String(t.hardwareProfileId) : "NONE"); }}>Edit</Button>{" "}
                      <Select value="" onValueChange={(v) => {
                        if (v === "MAIN") run(() => posApi.setMainTerminal(t.id), `${t.name} is now the main terminal`);
                        if (v === "ACTIVE") run(() => posApi.setTerminalStatus(t.id, "ACTIVE"), `${t.name} is active`);
                        if (v === "MAINTENANCE" || v === "BLOCKED") ask({ title: `${v === "BLOCKED" ? "Block" : "Maintenance for"} ${t.name}`, label: "Reason", required: true, run: (r) => posApi.setTerminalStatus(t.id, v, r) });
                        if (v === "ARCHIVE") ask({ title: `Archive ${t.name}`, label: "Reason", required: false, run: (r) => posApi.archiveTerminal(t.id, r) });
                        if (v === "DECOMMISSION") ask({ title: `Decommission ${t.name} (permanent)`, label: "Reason", required: true, run: (r) => posApi.decommissionTerminal(t.id, r) });
                      }}>
                        <SelectTrigger style={{ width: 110, display: "inline-flex", height: 32 }}><SelectValue placeholder="More" /></SelectTrigger>
                        <SelectContent>
                          {!t.isMain && t.status === "ACTIVE" && <SelectItem value="MAIN">Make main</SelectItem>}
                          {t.status !== "ACTIVE" && <SelectItem value="ACTIVE">Set active</SelectItem>}
                          {t.status !== "MAINTENANCE" && <SelectItem value="MAINTENANCE">Maintenance…</SelectItem>}
                          {t.status !== "BLOCKED" && <SelectItem value="BLOCKED">Block…</SelectItem>}
                          <SelectItem value="ARCHIVE">Archive…</SelectItem>
                          <SelectItem value="DECOMMISSION">Decommission…</SelectItem>
                        </SelectContent>
                      </Select>
                    </>}
                    {canEdit && t.status === "ARCHIVED" && <>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => posApi.restoreTerminal(t.id), `${t.name} restored`)}>Restore</Button>{" "}
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => ask({ title: `Decommission ${t.name} (permanent)`, label: "Reason", required: true, run: (r) => posApi.decommissionTerminal(t.id, r) })}>Decommission</Button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent style={{ maxWidth: 460 }}>
          <DialogHeader>
            <DialogTitle>Edit terminal</DialogTitle>
            <DialogDescription>{editing?.terminalCode} · printers assigned to this terminal follow a rename.</DialogDescription>
          </DialogHeader>
          <div className={s.field}><Label>Name</Label><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
          <div className={s.field}>
            <Label>Counter</Label>
            <Select value={counterId} onValueChange={setCounterId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No counter</SelectItem>
                {activeCounters.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={s.field}>
            <Label>Hardware profile</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None — printers matched by terminal name</SelectItem>
                {profiles.filter((p) => p.status === "ACTIVE").map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className={s.fieldHint}>The profile's receipt printer is used for this terminal's receipts and drawer.</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className={primaryBtn} disabled={busy || !name.trim()} onClick={async () => {
              if (!editing) return;
              const nextProfile = profileId === "NONE" ? null : Number(profileId);
              const ok = await run(async () => {
                await posApi.updateTerminal(editing.id, {
                  name: name.trim(), counterId: counterId === "NONE" ? null : Number(counterId), clearCounter: counterId === "NONE" && editing.counterId != null,
                });
                if (nextProfile !== editing.hardwareProfileId) await posApi.assignHardwareProfile(editing.id, nextProfile);
              }, "Terminal saved");
              if (ok) setEditing(null);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(prompt)} onOpenChange={(o) => !o && setPrompt(null)}>
        <DialogContent style={{ maxWidth: 440 }}>
          <DialogHeader><DialogTitle>{prompt?.title}</DialogTitle><DialogDescription>Recorded in the POS audit trail.</DialogDescription></DialogHeader>
          <div className={s.field}><Label>{prompt?.label}{prompt?.required ? " *" : ""}</Label><Input autoFocus value={promptText} onChange={(e) => setPromptText(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrompt(null)}>Cancel</Button>
            <Button className={primaryBtn} disabled={busy || (Boolean(prompt?.required) && !promptText.trim())} onClick={async () => {
              if (!prompt) return;
              const ok = await run(() => prompt.run(promptText.trim()), "Done");
              if (ok) setPrompt(null);
            }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(counterEdit)} onOpenChange={(o) => !o && setCounterEdit(null)}>
        <DialogContent style={{ maxWidth: 440 }}>
          <DialogHeader><DialogTitle>{counterEdit?.id ? "Edit counter" : "New counter"}</DialogTitle><DialogDescription>A checkout point terminals can be assigned to.</DialogDescription></DialogHeader>
          {counterEdit && <>
            <div className={s.field}><Label>Name *</Label><Input autoFocus value={counterEdit.name ?? ""} onChange={(e) => setCounterEdit({ ...counterEdit, name: e.target.value })} placeholder="e.g. Reception" /></div>
            <div className={s.field}><Label>Code</Label><Input value={counterEdit.code ?? ""} onChange={(e) => setCounterEdit({ ...counterEdit, code: e.target.value })} placeholder="Auto" /></div>
            <div className={s.field}><Label>Description</Label><Input value={counterEdit.description ?? ""} onChange={(e) => setCounterEdit({ ...counterEdit, description: e.target.value })} /></div>
          </>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterEdit(null)}>Cancel</Button>
            <Button className={primaryBtn} disabled={busy || !counterEdit?.name?.trim()} onClick={async () => {
              if (!counterEdit) return;
              const body = { name: counterEdit.name?.trim(), code: counterEdit.code?.trim() || undefined, description: counterEdit.description ?? "" };
              const ok = await run(() => counterEdit.id ? posApi.updateCounter(counterEdit.id, body) : posApi.createCounter(body), "Counter saved");
              if (ok) setCounterEdit(null);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
