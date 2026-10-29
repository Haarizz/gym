import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, ChevronDown, Database, Eye, EyeOff, FileCode2, FolderOpen, ImageIcon,
  Loader2, RotateCcw, Upload, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  gymImportApi, gymImportErrorMessage, GymImportJob, ImportReport,
} from '../utils/supabase/gym-import-service';
import { gymApi } from '../utils/supabase/gym-service';
import styles from './gym-import.module.css';

/**
 * Super admin → Import Gym: moves a gym from the previous GymBios. Pick the
 * member photos folder and the SQL export, review what will come over, then
 * onboard — the gym is created with its owner login and all its data.
 */

type Phase = 'upload' | 'importing' | 'review' | 'onboarding' | 'done';

const JOB_KEY = 'gymbios:gym-import-job';
const IMAGE_RE = /\.(jpe?g|jfif|jpe|png|webp|gif|heic|heif)$/i;

// Gym time zones (minutes east of UTC) the previous GymBios was used in.
const TIME_ZONES: { minutes: number; label: string }[] = [
  { minutes: 240, label: 'UAE / Oman (UTC+4)' },
  { minutes: 180, label: 'Saudi Arabia / Qatar / Kuwait / Bahrain (UTC+3)' },
  { minutes: 330, label: 'India (UTC+5:30)' },
  { minutes: 300, label: 'Pakistan (UTC+5)' },
  { minutes: 120, label: 'Egypt (UTC+2)' },
  { minutes: 0, label: 'UTC' },
];

const ONBOARD_STAGES: { from: number; label: string }[] = [
  { from: 0, label: 'Create the gym and owner login' },
  { from: 26, label: 'Load members, plans and history' },
  { from: 56, label: 'Copy member photos' },
  { from: 60, label: 'Post the history to the accounts' },
];

const formatBytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
const money = (n: number) => Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface OnboardForm {
  name: string; slug: string; address: string; phone: string; email: string;
  ownerUsername: string; ownerEmail: string; password: string; confirm: string; tz: number;
}

export function GymImport() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('upload');
  const [job, setJob] = useState<GymImportJob | null>(null);
  const [sqlFile, setSqlFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState({ percent: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<OnboardForm>({
    name: '', slug: '', address: '', phone: '', email: '', ownerUsername: '', ownerEmail: '', password: '', confirm: '', tz: 240,
  });
  const [slugTaken, setSlugTaken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const folderInput = useRef<HTMLInputElement>(null);
  const sqlInput = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const photoBytes = useMemo(() => photoFiles.reduce((s, f) => s + f.size, 0), [photoFiles]);

  // Picking the import back up after a refresh (onboarding can take a few minutes).
  useEffect(() => {
    const id = sessionStorage.getItem(JOB_KEY);
    if (!id) return;
    gymImportApi.get(id).then(j => {
      setJob(j);
      if (j.status === 'ONBOARDING') { setPhase('onboarding'); followOnboarding(j.id); }
      else if (j.status === 'COMPLETED') setPhase('done');
      else if (j.status === 'READY' || (j.status === 'FAILED' && j.failed_during === 'ONBOARD')) {
        prefill(j);
        setPhase('review');
        if (j.status === 'FAILED') setError(j.error);
      } else sessionStorage.removeItem(JOB_KEY);
    }).catch(() => sessionStorage.removeItem(JOB_KEY));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prefill = (j: GymImportJob) => {
    const name = j.onboarding?.name ?? (j.gym?.name ? titleCase(j.gym.name) : '');
    const slug = j.onboarding?.slug ?? slugify(j.gym?.website?.split('.')[0] || name);
    setForm(f => ({
      ...f,
      name,
      slug,
      address: f.address || j.gym?.address || '',
      phone: f.phone || j.gym?.phone || '',
      email: f.email || j.gym?.email || '',
      ownerUsername: j.onboarding?.owner_username ?? (slug ? `${slug}.admin` : ''),
      ownerEmail: j.onboarding?.owner_email ?? j.gym?.email ?? '',
      tz: j.onboarding?.utc_offset_minutes ?? f.tz,
    }));
  };

  /** Polls the job until `done` says stop, reporting each status. */
  const poll = async (id: string, onStatus: (j: GymImportJob) => void, done: (j: GymImportJob) => boolean) => {
    for (;;) {
      if (!alive.current) throw new Error('cancelled');
      const j = await gymImportApi.get(id);
      onStatus(j);
      if (done(j)) return j;
      await sleep(1000);
    }
  };

  // ── 1. Upload + analyse ──────────────────────────────────────────────────

  const startImport = async () => {
    if (!sqlFile) { toast.error('Choose the SQL export first'); return; }
    setError(null);
    setPhase('importing');
    const step = (percent: number, label: string) => setProgress({ percent: Math.round(percent), label });
    try {
      step(0, 'Starting the import');
      let j = await gymImportApi.create();
      setJob(j);
      sessionStorage.setItem(JOB_KEY, j.id);
      await gymImportApi.uploadDump(j.id, sqlFile, f => step(f * 15, 'Uploading the SQL file'));
      await gymImportApi.analyze(j.id);
      j = await poll(j.id, s => step(15 + s.progress * 0.3, s.step), s => s.status !== 'ANALYZING');
      if (j.status === 'FAILED') throw new Error(j.error || 'The SQL file could not be read');

      // Only the photos the export actually uses are sent.
      const wanted = new Set(j.referenced_photos);
      const needed = photoFiles.filter(f => wanted.has(f.name));
      if (needed.length > 0) {
        await gymImportApi.uploadPhotos(j.id, needed, f =>
          step(45 + f * 52, `Uploading member photos (${Math.round(f * needed.length)} of ${needed.length})`));
      }
      step(98, 'Checking the photos');
      j = await gymImportApi.photosDone(j.id);
      setJob(j);
      prefill(j);
      step(100, 'Ready');
      setPhase('review');
    } catch (e) {
      if ((e as Error)?.message === 'cancelled') return;
      setError(gymImportErrorMessage(e, 'The import could not be prepared.'));
      setPhase('upload');
    }
  };

  // ── 2. Onboard ───────────────────────────────────────────────────────────

  const followOnboarding = async (id: string) => {
    try {
      const j = await poll(id, s => { setJob(s); setProgress({ percent: s.progress, label: s.step }); },
        s => s.status === 'COMPLETED' || s.status === 'FAILED');
      setJob(j);
      if (j.status === 'COMPLETED') {
        setPhase('done');
        sessionStorage.removeItem(JOB_KEY);
      } else {
        setError(j.error || 'Onboarding failed.');
        setPhase('review');
      }
    } catch (e) {
      if ((e as Error)?.message !== 'cancelled') setError(gymImportErrorMessage(e, 'Lost track of the onboarding — refresh to check on it.'));
    }
  };

  const onboard = async () => {
    if (!job) return;
    if (form.password.length < 8) { toast.error('The password needs at least 8 characters'); return; }
    if (form.password !== form.confirm) { toast.error('The passwords don’t match'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const j = await gymImportApi.onboard(job.id, {
        name: form.name.trim(), slug: form.slug.trim(), address: form.address.trim(), phone: form.phone.trim(),
        email: form.email.trim(), owner_username: form.ownerUsername.trim(), owner_password: form.password,
        owner_email: form.ownerEmail.trim(), utc_offset_minutes: form.tz,
      });
      setJob(j);
      setProgress({ percent: j.progress, label: j.step });
      setPhase('onboarding');
      followOnboarding(j.id);
    } catch (e) {
      setError(gymImportErrorMessage(e, 'Onboarding could not start.'));
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = async () => {
    const id = job?.id;
    sessionStorage.removeItem(JOB_KEY);
    setJob(null); setSqlFile(null); setPhotoFiles([]); setError(null);
    setForm(f => ({ ...f, password: '', confirm: '' }));
    setPhase('upload');
    if (id && job?.status !== 'COMPLETED') gymImportApi.discard(id).catch(() => {});
  };

  // Gym ID availability, checked as it's typed.
  useEffect(() => {
    if (phase !== 'review' || !form.slug || (job?.tenant_id && form.slug === job?.onboarding?.slug)) { setSlugTaken(false); return; }
    const timer = setTimeout(() => {
      gymApi.checkSlugAvailable(form.slug).then(ok => setSlugTaken(!ok)).catch(() => setSlugTaken(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [form.slug, phase, job?.tenant_id, job?.onboarding?.slug]);

  // ── Render ───────────────────────────────────────────────────────────────

  const stepIndex = { upload: 0, importing: 0, review: 1, onboarding: 2, done: 3 }[phase];
  const retrying = job?.status === 'FAILED' && job?.failed_during === 'ONBOARD';
  const gymCreated = !!job?.tenant_id;

  return (
    <div className={styles.root}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Import Gym</h1>
          <p className={styles.subtitle}>
            Bring a gym over from the previous GymBios: its members and photos, plans, payments, refunds,
            add-ons, freezes, day passes and visits. The gym is created with its own owner login.
          </p>
        </div>
      </header>

      <ol className={styles.steps}>
        {['Upload', 'Review', 'Onboard', 'Done'].map((s, i) => (
          <li key={s} className={styles.stepItem} data-state={i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo'}>
            <span className={styles.stepDot}>{i < stepIndex ? <CheckCircle2 /> : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {error && (
        <div className={styles.error} role="alert">
          <XCircle />
          <div>
            <strong>{phase === 'review' && retrying ? 'Onboarding stopped' : 'Something went wrong'}</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {phase === 'upload' && (
        <section className={styles.card}>
          <div className={styles.pickers}>
            <button type="button" className={styles.picker} data-filled={photoFiles.length > 0}
              onClick={() => folderInput.current?.click()}>
              <FolderOpen />
              <span className={styles.pickerTitle}>Member photos folder</span>
              {photoFiles.length > 0 ? (
                <span className={styles.pickerMeta}>{photoFiles.length.toLocaleString()} photos · {formatBytes(photoBytes)}</span>
              ) : (
                <span className={styles.pickerHint}>Choose the old system's <code>members</code> folder. Only photos the export uses are uploaded.</span>
              )}
            </button>
            <input ref={folderInput} type="file" multiple hidden
              {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
              onChange={e => { setPhotoFiles(Array.from(e.target.files ?? []).filter(f => IMAGE_RE.test(f.name))); e.target.value = ''; }} />

            <button type="button" className={styles.picker} data-filled={!!sqlFile}
              onClick={() => sqlInput.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setSqlFile(f); }}>
              <FileCode2 />
              <span className={styles.pickerTitle}>SQL export</span>
              {sqlFile ? (
                <span className={styles.pickerMeta}>{sqlFile.name} · {formatBytes(sqlFile.size)}</span>
              ) : (
                <span className={styles.pickerHint}>The <code>.sql</code> file exported from phpMyAdmin. Click or drop it here.</span>
              )}
            </button>
            <input ref={sqlInput} type="file" accept=".sql,text/plain,application/sql" hidden
              onChange={e => { setSqlFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </div>
          <div className={styles.footer}>
            {photoFiles.length === 0 && sqlFile && (
              <span className={styles.note}><AlertTriangle /> No photos folder chosen — members will be imported without photos.</span>
            )}
            <Button onClick={startImport} disabled={!sqlFile}>
              <Upload className="mr-2 h-4 w-4" />Import
            </Button>
          </div>
        </section>
      )}

      {(phase === 'importing' || phase === 'onboarding') && (
        <section className={`${styles.card} ${styles.progressCard}`}>
          <div className={styles.percent}>{progress.percent}%</div>
          <div className={styles.bar}><div className={styles.barFill} style={{ width: `${progress.percent}%` }} /></div>
          <p className={styles.progressLabel}><Loader2 className={styles.spin} />{progress.label || 'Working…'}</p>
          {phase === 'onboarding' && (
            <ul className={styles.stages}>
              {ONBOARD_STAGES.map((s, i) => {
                const next = ONBOARD_STAGES[i + 1]?.from ?? 100;
                const state = progress.percent >= next ? 'done' : progress.percent >= s.from ? 'current' : 'todo';
                return (
                  <li key={s.label} data-state={state}>
                    {state === 'done' ? <CheckCircle2 /> : state === 'current' ? <Loader2 className={styles.spin} /> : <span className={styles.todoDot} />}
                    {s.label}
                  </li>
                );
              })}
            </ul>
          )}
          <p className={styles.keepOpen}>
            {phase === 'onboarding'
              ? 'This keeps running on the server — you can leave this page and come back.'
              : 'Keep this page open while the files upload.'}
          </p>
        </section>
      )}

      {phase === 'review' && job?.report && (
        <>
          <ReportView report={job.report} photosChosen={photoFiles.length} />

          <section className={styles.card}>
            <div className={styles.cardHead}>
              <Database />
              <div>
                <h2 className={styles.cardTitle}>{retrying ? 'Finish onboarding this gym' : 'Ready to onboard this gym?'}</h2>
                <p className={styles.cardSub}>
                  {gymCreated
                    ? `Gym "${job.onboarding?.slug}" was already created — retrying picks up where it stopped.`
                    : 'This creates the gym with its own database and owner login, then loads everything above.'}
                </p>
              </div>
            </div>
            <div className={styles.formGrid}>
              <Field label="Gym name">
                <Input value={form.name} disabled={gymCreated}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug === slugify(f.name) ? slugify(e.target.value) : f.slug }))} />
              </Field>
              <Field label="Gym ID" hint={slugTaken ? 'Already taken — choose another.' : 'Used for its database; lowercase letters, numbers and hyphens.'} invalid={slugTaken}>
                <Input value={form.slug} disabled={gymCreated} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} />
              </Field>
              <Field label="Address" wide>
                <Input value={form.address} disabled={gymCreated} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </Field>
              <Field label="Gym phone">
                <Input value={form.phone} disabled={gymCreated} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </Field>
              <Field label="Gym email">
                <Input type="email" value={form.email} disabled={gymCreated} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="Time zone" hint="Old check-in times are in the gym's local time.">
                <select className={styles.select} value={form.tz} onChange={e => setForm(f => ({ ...f, tz: Number(e.target.value) }))}>
                  {TIME_ZONES.map(z => <option key={z.minutes} value={z.minutes}>{z.label}</option>)}
                </select>
              </Field>
            </div>

            <h3 className={styles.subhead}>Owner login</h3>
            <div className={styles.formGrid}>
              <Field label="Username">
                <Input value={form.ownerUsername} disabled={gymCreated} autoComplete="off"
                  onChange={e => setForm(f => ({ ...f, ownerUsername: e.target.value.replace(/\s/g, '') }))} />
              </Field>
              <Field label="Owner email">
                <Input type="email" value={form.ownerEmail} disabled={gymCreated} onChange={e => setForm(f => ({ ...f, ownerEmail: e.target.value }))} />
              </Field>
              <Field label="Password" hint="At least 8 characters.">
                <div className={styles.passwordWrap}>
                  <Input type={showPassword ? 'text' : 'password'} value={form.password} autoComplete="new-password"
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  <button type="button" className={styles.eye} onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm password" invalid={!!form.confirm && form.confirm !== form.password}
                hint={form.confirm && form.confirm !== form.password ? 'Doesn’t match.' : undefined}>
                <Input type={showPassword ? 'text' : 'password'} value={form.confirm} autoComplete="new-password"
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
              </Field>
            </div>

            <div className={styles.footer}>
              {!gymCreated && (
                <Button variant="outline" onClick={startOver}><RotateCcw className="mr-2 h-4 w-4" />Start over</Button>
              )}
              <Button onClick={onboard} disabled={submitting || slugTaken || !form.name || !form.slug || !form.ownerUsername || !form.ownerEmail || !form.password}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {retrying ? 'Retry onboarding' : 'Onboard gym'}
              </Button>
            </div>
          </section>
        </>
      )}

      {phase === 'done' && job?.result && (
        <section className={`${styles.card} ${styles.doneCard}`}>
          <CheckCircle2 className={styles.doneIcon} />
          <h2 className={styles.cardTitle}>{String(job.result.name ?? 'The gym')} is ready</h2>
          <p className={styles.cardSub}>
            The owner signs in as <strong>{String(job.result.owner_username)}</strong> with the password you set.
          </p>
          <div className={styles.doneStats}>
            <Stat value={job.result.members} label="Members" />
            <Stat value={job.result.receipts} label="Receipts" />
            <Stat value={job.result.photos} label="Photos" />
            <Stat value={(job.result.ledger as Record<string, number> | undefined)?.receipts_posted} label="Payments posted" />
          </div>
          <div className={styles.footer} style={{ justifyContent: 'center' }}>
            <Button variant="outline" onClick={startOver}>Import another gym</Button>
            <Button onClick={() => navigate('/gym-management')}>Go to Gym Management</Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, hint, invalid, wide, children }: {
  label: string; hint?: string; invalid?: boolean; wide?: boolean; children: ReactNode;
}) {
  return (
    <div className={`${styles.field} ${wide ? styles.wide : ''}`}>
      <Label>{label}</Label>
      {children}
      {hint && <span className={styles.hint} data-invalid={invalid || undefined}>{hint}</span>}
    </div>
  );
}

function Stat({ value, label }: { value: unknown; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{Number(value ?? 0).toLocaleString()}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function ReportView({ report, photosChosen }: { report: ImportReport; photosChosen: number }) {
  const m = report.money;
  const status = report.members_by_status;
  const reviewTotal = report.review.reduce((s, r) => s + r.items.length, 0);
  const matched = report.photos.matched ?? 0;
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <ImageIcon />
        <div>
          <h2 className={styles.cardTitle}>What will be imported</h2>
          <p className={styles.cardSub}>Read from the export — nothing has been created yet.</p>
        </div>
      </div>

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Members</span>
          <span className={styles.kpiValue}>{report.counts.find(c => c.label === 'Members')?.imported.toLocaleString()}</span>
          <span className={styles.kpiSub}>
            {Object.entries(status).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(' · ')}
          </span>
        </div>
        <div className={styles.kpi} data-tone={m.matches ? 'good' : 'bad'}>
          <span className={styles.kpiLabel}>Money collected</span>
          <span className={styles.kpiValue}>{money(m.imported_total)}</span>
          <span className={styles.kpiSub}>
            {m.matches ? <><CheckCircle2 /> Matches the old system exactly</> : <><AlertTriangle /> Old system: {money(m.old_total)}</>}
          </span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Still owed by members</span>
          <span className={styles.kpiValue}>{money(m.imported_dues)}</span>
          <span className={styles.kpiSub}>Old dues table: {money(m.old_open_dues)}</span>
        </div>
        <div className={styles.kpi} data-tone={report.photos.referenced > 0 && matched < report.photos.referenced ? 'warn' : undefined}>
          <span className={styles.kpiLabel}>Photos</span>
          <span className={styles.kpiValue}>{matched.toLocaleString()} / {report.photos.referenced.toLocaleString()}</span>
          <span className={styles.kpiSub}>{photosChosen > 0 || matched > 0 ? 'matched to members' : 'no photos folder uploaded'}</span>
        </div>
      </div>

      <div className={styles.twoCol}>
        <table className={styles.table}>
          <thead><tr><th>Old system</th><th className={styles.num}>Rows</th><th>Imported as</th></tr></thead>
          <tbody>
            {report.counts.map(c => (
              <tr key={c.label}><td>{c.label}</td><td className={styles.num}>{c.old.toLocaleString()}</td><td>{c.imported_as}</td></tr>
            ))}
          </tbody>
        </table>
        <table className={styles.table}>
          <thead><tr><th>Money</th><th className={styles.num}>Amount</th></tr></thead>
          <tbody>
            <tr><td>Collected in the old system (memberships, add-ons, instalments, less refunds)</td><td className={styles.num}>{money(m.old_cash)}</td></tr>
            <tr><td>Day passes in the old system</td><td className={styles.num}>{money(m.old_day_passes)}</td></tr>
            <tr className={styles.totalRow}><td>Old total</td><td className={styles.num}>{money(m.old_total)}</td></tr>
            <tr><td>Received on imported receipts</td><td className={styles.num}>{money(m.received)}</td></tr>
            <tr><td>Refunded through credit notes</td><td className={styles.num}>−{money(m.refunded)}</td></tr>
            <tr className={styles.totalRow}><td>Imported total</td><td className={styles.num}>{money(m.imported_total)}</td></tr>
          </tbody>
        </table>
      </div>

      {reviewTotal > 0 && (
        <div className={styles.review}>
          <h3 className={styles.subhead}><AlertTriangle /> {reviewTotal} rows worth checking with the gym</h3>
          {report.review.map(r => (
            <details key={r.section} className={styles.reviewItem}>
              <summary><ChevronDown />{r.section}<span className={styles.count}>{r.items.length}</span></summary>
              <ul>{r.items.map((i, k) => <li key={k}>{i}</li>)}</ul>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
