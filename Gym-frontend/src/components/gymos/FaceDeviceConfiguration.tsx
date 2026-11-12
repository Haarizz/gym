import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle, BookOpen, Camera, CheckCircle2, ChevronDown, ChevronUp, Loader2, Mail, Pencil, Plus,
  RefreshCw, RotateCcw, ScanFace, Search, Trash2, UploadCloud, Wifi, WifiOff, XCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import { usePermission } from '../../utils/permissions';
import {
  faceDeviceService, faceDeviceError, FaceDevice, FaceDeviceRequest, FaceMemberStatus, FaceSyncState,
} from '../../utils/supabase/face-device-service';
import styles from './FaceDeviceConfiguration.module.css';

/**
 * GymOS › Face Device Configuration. Heystar face terminals reached through their HTTP
 * middleware (the API the old GymBios PHP cron used). Each device belongs to the active
 * branch; the server pushes that branch's members to it every minute: active members get
 * their photo enrolled, members who may not enter (expired, frozen, suspended, pending)
 * have their face removed.
 */

/** New devices default to UAE time (the gyms are in the UAE), not the browser's zone. */
const DEFAULT_ZONE = 'Asia/Dubai';

const zoneList: string[] = (() => {
  try { return (Intl as any).supportedValuesOf?.('timeZone') ?? []; } catch { return []; }
})();

const STATE_META: Record<FaceSyncState, { label: string; tone: string }> = {
  ENROLLED: { label: 'Enrolled', tone: 'green' },
  NO_PHOTO: { label: 'No photo', tone: 'amber' },
  REMOVED: { label: 'Removed', tone: 'gray' },
  NOT_ON_DEVICE: { label: 'Not on device', tone: 'gray' },
  FAILED: { label: 'Failed', tone: 'red' },
  RETRY: { label: 'Retrying', tone: 'amber' },
  PENDING: { label: 'Waiting', tone: 'blue' },
};

const FILTERS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Waiting to sync' },
  { value: 'ENROLLED', label: 'Enrolled' },
  { value: 'NO_PHOTO', label: 'No photo' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'RETRY', label: 'Retrying' },
  { value: 'REMOVED', label: 'Removed' },
  { value: 'NOT_ON_DEVICE', label: 'Not on device' },
];

const fmt = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/** "23:30" → "11:30 PM" (gym time). */
const reportTimeLabel = (hhmm: string) => {
  const [h, m] = (hhmm || '23:30').split(':').map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  return `${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} gym time`;
};

const emptyForm = (): FormState => ({
  name: '', middlewareUrl: '', deviceKey: '', secret: '',
  timeZone: DEFAULT_ZONE, reportEmails: '',
  enabled: true, autoSync: true,
});

interface FormState {
  name: string; middlewareUrl: string; deviceKey: string; secret: string;
  timeZone: string; reportEmails: string;
  enabled: boolean; autoSync: boolean;
}

export function FaceDeviceConfiguration() {
  const canEdit = usePermission('GYMOS_EDIT');
  const [devices, setDevices] = useState<FaceDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FaceDevice | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<FaceDevice | null>(null);
  const [openMembers, setOpenMembers] = useState<number | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const list = await faceDeviceService.list();
      setDevices(list);
      setError(null);
      if (!quiet && list.length === 0) setGuideOpen(true);
    } catch (e) {
      setError(faceDeviceError(e, 'Could not load face devices'));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // While a sync runs in the background, refresh the counts every few seconds.
  const anySyncing = devices.some((d) => d.syncing);
  useEffect(() => {
    if (!anySyncing) return;
    const t = window.setInterval(() => load(true), 4000);
    return () => window.clearInterval(t);
  }, [anySyncing, load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setFormOpen(true); };
  const openEdit = (d: FaceDevice) => {
    setEditing(d);
    setForm({
      name: d.name, middlewareUrl: d.middlewareUrl, deviceKey: d.deviceKey, secret: '',
      timeZone: d.timeZone, enabled: d.enabled, autoSync: d.autoSync, reportEmails: d.reportEmails ?? '',
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.middlewareUrl.trim() || !form.deviceKey.trim() || (!editing && !form.secret.trim())) {
      toast.error('Fill in the name, middleware URL, device key and secret');
      return;
    }
    const body: FaceDeviceRequest = {
      name: form.name.trim(), middlewareUrl: form.middlewareUrl.trim(),
      deviceKey: form.deviceKey.trim(), secret: form.secret.trim() || undefined,
      timeZone: form.timeZone.trim() || DEFAULT_ZONE, reportEmails: form.reportEmails.trim(),
      enabled: form.enabled, autoSync: form.autoSync,
    };
    setSaving(true);
    try {
      const saved = editing ? await faceDeviceService.update(editing.id, body) : await faceDeviceService.create(body);
      toast.success(editing ? 'Device saved' : 'Device added — now press Test connection');
      setFormOpen(false);
      setDevices((list) => {
        const rest = list.filter((x) => x.id !== saved.id);
        return [...rest, saved].sort((a, b) => a.name.localeCompare(b.name));
      });
    } catch (e) {
      toast.error(faceDeviceError(e, 'Could not save the device'));
    } finally {
      setSaving(false);
    }
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  const test = (d: FaceDevice) => run(`test-${d.id}`, async () => {
    try {
      const r = await faceDeviceService.test(d.id);
      if (r.ok) toast.success(r.message); else toast.error(r.message, { duration: 10000 });
      await load(true);
    } catch (e) {
      toast.error(faceDeviceError(e, 'Connection test failed'));
    }
  });

  const sync = (d: FaceDevice, full: boolean) => run(`sync-${d.id}`, async () => {
    try {
      await faceDeviceService.sync(d.id, full);
      toast.success(full ? 'Full resync started — every member is pushed again' : 'Sync started');
      await load(true);
    } catch (e) {
      toast.error(faceDeviceError(e, 'Could not start the sync'));
    }
  });

  const sendReport = (d: FaceDevice) => run(`report-${d.id}`, async () => {
    try {
      const r = await faceDeviceService.sendReport(d.id);
      toast.success(r.message);
    } catch (e) {
      toast.error(faceDeviceError(e, 'Could not send the report'), { duration: 10000 });
    }
    await load(true);
  });

  const retry = (d: FaceDevice) => run(`retry-${d.id}`, async () => {
    try {
      await faceDeviceService.retryFailed(d.id);
      toast.success('Failed members queued again');
      await load(true);
    } catch (e) {
      toast.error(faceDeviceError(e, 'Could not retry'));
    }
  });

  const confirmDelete = async () => {
    if (!toDelete) return;
    const d = toDelete;
    setToDelete(null);
    try {
      await faceDeviceService.remove(d.id);
      toast.success('Device removed from GymBios');
      setDevices((list) => list.filter((x) => x.id !== d.id));
    } catch (e) {
      toast.error(faceDeviceError(e, 'Could not delete the device'));
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}><ScanFace className={styles.titleIcon} /> Face Device Configuration</h2>
          <p className={styles.sub}>
            Connect face-recognition entry terminals (Heystar) to this branch. Active members are enrolled with their
            photo automatically; expired, frozen, suspended and pending members are removed so they can't walk in.
          </p>
        </div>
        <div className={styles.headActions}>
          <Button variant="outline" onClick={() => setGuideOpen((v) => !v)}>
            <BookOpen className="h-4 w-4 mr-2" /> How to set up {guideOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
          <Button variant="outline" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          {canEdit && (
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Device</Button>
          )}
        </div>
      </div>

      {guideOpen && <SetupGuide />}

      {error && <div className={styles.errorBox}><AlertTriangle className="h-4 w-4" /> {error}</div>}

      {loading ? (
        <div className={styles.empty}><Loader2 className="h-5 w-5 animate-spin" /> Loading devices…</div>
      ) : devices.length === 0 && !error ? (
        <div className={styles.empty}>
          <Camera className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>No face device connected to this branch yet</div>
          <div className={styles.emptyText}>Follow “How to set up” above, then add the device with its middleware URL, device key and secret.</div>
          {canEdit && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Device</Button>}
        </div>
      ) : (
        devices.map((d) => (
          <DeviceCard
            key={d.id}
            device={d}
            canEdit={canEdit}
            busy={busy}
            membersOpen={openMembers === d.id}
            onToggleMembers={() => setOpenMembers((v) => (v === d.id ? null : d.id))}
            onTest={() => test(d)}
            onSync={(full) => sync(d, full)}
            onRetry={() => retry(d)}
            onReport={() => sendReport(d)}
            onEdit={() => openEdit(d)}
            onDelete={() => setToDelete(d)}
            onChanged={() => load(true)}
          />
        ))
      )}

      <Dialog open={formOpen} onOpenChange={(o) => !saving && setFormOpen(o)}>
        <DialogContent className={styles.dialog}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit face device' : 'Add face device'}</DialogTitle>
            <DialogDescription>
              The device is added to the branch selected at the top of the screen. Its members are pushed to it.
            </DialogDescription>
          </DialogHeader>
          <div className={styles.formGrid}>
            <Field label="Device name" hint="Shown in GymBios only, e.g. “Main entrance”.">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main entrance" />
            </Field>
            <Field label="Gym time zone" hint="Membership start/end dates are sent in this zone.">
              <Input list="face-device-zones" value={form.timeZone} onChange={(e) => setForm({ ...form, timeZone: e.target.value })} />
              <datalist id="face-device-zones">{zoneList.map((z) => <option key={z} value={z} />)}</datalist>
            </Field>
            <Field label="Middleware URL" hint="Address and port of the Heystar middleware, e.g. http://77.37.54.38:8080" wide>
              <Input value={form.middlewareUrl} onChange={(e) => setForm({ ...form, middlewareUrl: e.target.value })} placeholder="http://77.37.54.38:8080" />
            </Field>
            <Field label="Device key (serial number)" hint="The SN on the device's About / Device info screen or its label.">
              <Input value={form.deviceKey} onChange={(e) => setForm({ ...form, deviceKey: e.target.value })} placeholder="77ab8918b33af83d88" />
            </Field>
            <Field label="Device secret (password)" hint={editing ? 'Leave blank to keep the saved secret.' : 'The communication password set on the device.'}>
              <Input type="password" autoComplete="new-password" value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })} placeholder={editing ? '•••••• (unchanged)' : '123456'} />
            </Field>
            <Field label="Daily report emails (optional)" wide
              hint="A detailed sync report is emailed every night at 11:30 PM gym time: who was enrolled or removed, rejected photos, members without a photo, and any time the device was offline. Separate addresses with commas.">
              <Input value={form.reportEmails} onChange={(e) => setForm({ ...form, reportEmails: e.target.value })}
                placeholder="owner@yourgym.com, manager@yourgym.com" />
            </Field>
            <div className={styles.switchRow}>
              <div>
                <div className={styles.switchLabel}>Device enabled</div>
                <div className={styles.hint}>Off pauses every push to this device.</div>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
            </div>
            <div className={styles.switchRow}>
              <div>
                <div className={styles.switchLabel}>Automatic sync</div>
                <div className={styles.hint}>Every minute, push members whose details changed (25 at a time).</div>
              </div>
              <Switch checked={form.autoSync} onCheckedChange={(v) => setForm({ ...form, autoSync: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? 'Save changes' : 'Add device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              GymBios stops syncing this device. People already enrolled on the terminal stay there until they are
              removed on the device itself or the device is added again and synced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? `${styles.field} ${styles.fieldWide}` : styles.field}>
      <Label>{label}</Label>
      {children}
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}

function DeviceCard({ device: d, canEdit, busy, membersOpen, onToggleMembers, onTest, onSync, onRetry, onReport, onEdit, onDelete, onChanged }: {
  device: FaceDevice; canEdit: boolean; busy: string | null; membersOpen: boolean;
  onToggleMembers: () => void; onTest: () => void; onSync: (full: boolean) => void; onRetry: () => void; onReport: () => void;
  onEdit: () => void; onDelete: () => void; onChanged: () => void;
}) {
  const c = d.counts;
  const connection = d.lastTestOk == null
    ? { tone: 'gray', label: 'Not tested', icon: <Wifi className="h-3.5 w-3.5" /> }
    : d.lastTestOk
      ? { tone: 'green', label: 'Connected', icon: <Wifi className="h-3.5 w-3.5" /> }
      : { tone: 'red', label: 'Connection failed', icon: <WifiOff className="h-3.5 w-3.5" /> };

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitleWrap}>
          <div className={styles.cardTitle}>{d.name}</div>
          <div className={styles.pills}>
            <span className={styles.pill} data-tone={connection.tone}>{connection.icon}{connection.label}</span>
            {!d.enabled && <span className={styles.pill} data-tone="gray">Disabled</span>}
            {d.enabled && <span className={styles.pill} data-tone={d.autoSync ? 'blue' : 'gray'}>{d.autoSync ? 'Auto-sync on' : 'Auto-sync off'}</span>}
            {d.syncing && <span className={styles.pill} data-tone="violet"><Loader2 className="h-3.5 w-3.5 animate-spin" />Syncing…</span>}
            {d.offlineSince && <span className={styles.pill} data-tone="red"><WifiOff className="h-3.5 w-3.5" />Offline since {fmt(d.offlineSince)}</span>}
          </div>
        </div>
        {canEdit && (
          <div className={styles.cardActions}>
            <Button size="sm" variant="outline" onClick={onTest} disabled={busy === `test-${d.id}`}>
              {busy === `test-${d.id}` ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wifi className="h-4 w-4 mr-1" />} Test connection
            </Button>
            <Button size="sm" onClick={() => onSync(false)} disabled={!d.enabled || d.syncing || busy === `sync-${d.id}`}>
              <UploadCloud className="h-4 w-4 mr-1" /> Sync now
            </Button>
            {d.reportEmails && (
              <Button size="sm" variant="outline" onClick={onReport} disabled={busy === `report-${d.id}`}
                title={`Email today's report now to ${d.reportEmails}`}>
                {busy === `report-${d.id}` ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />} Send report now
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
            <Button size="sm" variant="outline" onClick={onDelete} aria-label="Delete device"><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      <div className={styles.details}>
        <Detail label="Middleware URL" value={d.middlewareUrl} mono />
        <Detail label="Device key" value={d.deviceKey} mono />
        <Detail label="Time zone" value={d.timeZone} />
        <Detail label="Last test" value={fmt(d.lastTestAt)} />
        <Detail label="Last sync" value={fmt(d.lastSyncAt)} />
        <Detail label="Daily report" value={d.reportEmails ? `${reportTimeLabel(d.reportTime)} to ${d.reportEmails}` : 'Off — add an email in Edit'} />
      </div>

      {d.reportEmails && !d.mailConfigured && (
        <div className={styles.note} data-tone="amber">
          <AlertTriangle className="h-4 w-4" /> Email isn't set up on this server, so the daily report can't be sent. Ask your
          administrator to set the SMTP settings (SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, MESSAGE_EMAIL_FROM).
        </div>
      )}
      {d.lastReportMessage && (
        <div className={styles.note} data-tone="gray"><Mail className="h-4 w-4" /> {fmt(d.lastReportAt)}: {d.lastReportMessage}</div>
      )}

      {d.lastTestMessage && (
        <div className={styles.note} data-tone={d.lastTestOk ? 'green' : 'red'}>
          {d.lastTestOk ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {d.lastTestMessage}
        </div>
      )}
      {d.lastSyncMessage && <div className={styles.note} data-tone="gray"><RefreshCw className="h-4 w-4" /> {d.lastSyncMessage}</div>}

      <div className={styles.tiles}>
        <Tile label="Active members" value={c.allowedIn} sub={`${c.withPhoto} with photo`} tone="teal" />
        <Tile label="Enrolled on device" value={c.enrolled} tone="green" />
        <Tile label="No photo" value={c.noPhoto} sub="added without a face" tone="amber" />
        <Tile label="Removed" value={c.removed} sub="not allowed in" tone="gray" />
        <Tile label="Failed" value={c.failed + c.retry} sub={c.retry ? `${c.retry} retrying` : undefined} tone="red" />
        <Tile label="Waiting to sync" value={c.pending} tone="blue" />
      </div>

      <div className={styles.cardFoot}>
        <Button size="sm" variant="ghost" onClick={onToggleMembers}>
          {membersOpen ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
          {membersOpen ? 'Hide members' : 'Show members'}
        </Button>
        {canEdit && (
          <div className={styles.footActions}>
            {c.failed > 0 && (
              <Button size="sm" variant="outline" onClick={onRetry} disabled={busy === `retry-${d.id}` || d.syncing}>
                <RotateCcw className="h-4 w-4 mr-1" /> Retry failed ({c.failed})
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => onSync(true)} disabled={!d.enabled || d.syncing || busy === `sync-${d.id}`}
              title="Push every member again, not just the ones that changed">
              <RefreshCw className="h-4 w-4 mr-1" /> Full resync
            </Button>
          </div>
        )}
      </div>

      {membersOpen && <MembersPanel device={d} canEdit={canEdit} onChanged={onChanged} />}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.detail}>
      <div className={styles.detailLabel}>{label}</div>
      <div className={mono ? `${styles.detailValue} ${styles.mono}` : styles.detailValue}>{value || '—'}</div>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone: string }) {
  return (
    <div className={styles.tile} data-tone={tone}>
      <div className={styles.tileValue}>{value.toLocaleString()}</div>
      <div className={styles.tileLabel}>{label}</div>
      {sub && <div className={styles.tileSub}>{sub}</div>}
    </div>
  );
}

function MembersPanel({ device, canEdit, onChanged }: { device: FaceDevice; canEdit: boolean; onChanged: () => void }) {
  const [state, setState] = useState('ALL');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<FaceMemberStatus[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const page = await faceDeviceService.members(device.id, { state, q: q.trim() || undefined, limit: 200 });
      if (id !== reqId.current) return;
      setRows(page.items);
      setTotal(page.total);
    } catch (e) {
      if (id === reqId.current) toast.error(faceDeviceError(e, 'Could not load members'));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [device.id, state, q]);

  useEffect(() => {
    const t = window.setTimeout(load, q ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, q]);

  // Follow a running sync.
  useEffect(() => {
    if (!device.syncing) return;
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, [device.syncing, load]);

  const syncOne = async (m: FaceMemberStatus) => {
    setSyncingId(m.memberId);
    try {
      const res = await faceDeviceService.syncMember(device.id, m.memberId);
      setRows((list) => list.map((x) => (x.memberId === m.memberId ? res : x)));
      const meta = STATE_META[res.state];
      if (res.state === 'FAILED' || res.state === 'RETRY') toast.error(`${m.name}: ${res.lastMessage ?? meta.label}`);
      else toast.success(`${m.name}: ${meta.label}`);
      onChanged();
    } catch (e) {
      toast.error(faceDeviceError(e, 'Could not sync this member'));
    } finally {
      setSyncingId(null);
    }
  };

  const shown = rows;

  return (
    <div className={styles.members}>
      <div className={styles.membersBar}>
        <div className={styles.chips}>
          {FILTERS.map((f) => (
            <button key={f.value} type="button" className={styles.chip} data-active={state === f.value || undefined}
              onClick={() => setState(f.value)}>{f.label}</button>
          ))}
        </div>
        <div className={styles.search}>
          <Search className={styles.searchIcon} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or member ID" className={styles.searchInput} />
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Membership</th>
              <th>Photo</th>
              <th>On device</th>
              <th>Last result</th>
              <th>Last attempt</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {loading && shown.length === 0 ? (
              <tr><td colSpan={canEdit ? 7 : 6} className={styles.cellEmpty}><Loader2 className="h-4 w-4 animate-spin" /> Loading…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={canEdit ? 7 : 6} className={styles.cellEmpty}>No members match.</td></tr>
            ) : shown.map((m) => {
              const meta = STATE_META[m.state] ?? STATE_META.PENDING;
              return (
                <tr key={m.memberId}>
                  <td>
                    <div className={styles.memberName}>{m.name}</div>
                    <div className={`${styles.muted} ${styles.mono}`}>{m.memberCode}</div>
                  </td>
                  <td><span className={styles.pill} data-tone={m.allowedIn ? 'green' : 'gray'}>{m.membershipStatus.replace('_', ' ')}</span></td>
                  <td>{m.hasPhoto ? <CheckCircle2 className={styles.okIcon} aria-label="Has photo" /> : <span className={styles.muted}>None</span>}</td>
                  <td>
                    <span className={styles.pill} data-tone={meta.tone}>{meta.label}</span>
                    {m.needsSync && m.state !== 'PENDING' && <span className={styles.pill} data-tone="blue">update due</span>}
                  </td>
                  <td className={styles.msgCell}>{m.lastMessage || <span className={styles.muted}>—</span>}</td>
                  <td className={styles.nowrap}>{fmt(m.lastAttemptAt)}</td>
                  {canEdit && (
                    <td>
                      <Button size="sm" variant="outline" onClick={() => syncOne(m)} disabled={syncingId !== null || !device.enabled || device.syncing}>
                        {syncingId === m.memberId ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                        <span className={styles.btnText}>Sync</span>
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {total > shown.length && <div className={styles.muted}>Showing {shown.length} of {total.toLocaleString()} — search to narrow down.</div>}
    </div>
  );
}

function SetupGuide() {
  return (
    <div className={styles.guide}>
      <div className={styles.guideTitle}><BookOpen className="h-5 w-5" /> How to configure a face device</div>
      <ol className={styles.steps}>
        <li>
          <strong>Install and connect the terminal.</strong> Mount the Heystar face terminal at the entrance, power it on
          and connect it to the internet (LAN cable or Wi-Fi in the device's Network settings). Wire its relay to the
          door lock or turnstile.
        </li>
        <li>
          <strong>Make sure the middleware can see the device.</strong> The terminal is controlled through the Heystar
          middleware (gateway) server. The device must be registered and online there. Note the middleware's address
          and port, e.g. <code>http://77.37.54.38:8080</code>. The GymBios server must be able to reach that port, so
          open it in the firewall if needed.
        </li>
        <li>
          <strong>Note the device key and secret.</strong> The <em>device key</em> is the terminal's serial number (SN),
          shown on its About / Device info screen and on the label, e.g. <code>77ab8918b33af83d88</code>. The
          <em> secret</em> is the device communication password set on the terminal; the old system used
          <code> 123456</code>.
        </li>
        <li>
          <strong>Pick the branch</strong> in the branch selector at the top. A device syncs the members of the branch
          it was added in.
        </li>
        <li>
          <strong>Add the device here:</strong> press <em>Add Device</em>, enter a name, the middleware URL, the
          device key, the secret and your gym's time zone.
        </li>
        <li>
          <strong>Press Test connection.</strong> Green means GymBios reached the middleware and the device answered.
          Red tells you which part failed: the address, the device being offline, or the key or secret.
        </li>
        <li>
          <strong>Press Sync now.</strong> The first sync pushes every active member. Each one takes about 3 seconds,
          because the device needs a pause between creating the person and adding the face. After that, automatic
          sync runs every minute and only pushes members whose details changed.
        </li>
        <li>
          <strong>Add member photos.</strong> Members need a clear, front-facing, well-lit photo on their profile.
          Members without one are added to the device but can't be recognised (shown as <em>No photo</em>).
        </li>
        <li>
          <strong>Get the daily report (optional).</strong> Add one or more email addresses in <em>Daily report emails</em>.
          Every night at 11:30 PM gym time they get a detailed report: who was enrolled or removed, photos the device
          rejected, members without a photo, and any time the device was offline. Use <em>Send report now</em> to try it.
        </li>
      </ol>
      <div className={styles.rules}>
        <div className={styles.rule} data-tone="green"><strong>Active member</strong>: added to the device with their membership start and end dates, and their face enrolled.</div>
        <div className={styles.rule} data-tone="red"><strong>Expired, frozen, suspended or pending</strong>: their access window is ended and their face removed, so the door won't open.</div>
        <div className={styles.rule} data-tone="blue"><strong>Renewed, unfrozen or new photo</strong>: pushed again automatically within a minute or two.</div>
        <div className={styles.rule} data-tone="amber"><strong>Failed</strong>: the device rejected the photo (no face found, too dark…). Fix the photo, then press Sync on that member or Retry failed.</div>
      </div>
      <div className={styles.muted}>
        Each member is identified on the device by their GymBios member ID. Members imported from the old GymBios keep
        their old ID, so people already on the terminal are updated, not duplicated.
      </div>
    </div>
  );
}
