import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Database, Download, Eye, EyeOff, FileCode2, History, Images, KeyRound, Loader2, LogOut, Play, RefreshCw,
  Search, ShieldCheck, Square, TerminalSquare, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHead, PlatformPage, Panel, Pill } from '../components/platform/platform-ui';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  dbConsoleApi, dbConsoleError, DbConsoleStatus, DbInfo, DbQueryResult, DbResultBlock,
} from '../utils/supabase/db-console-service';
import s from './db-console.module.css';

/**
 * Super admin → Database Console. Connect to the server with its SSH root password
 * (used once, never saved), pick any database on it and run SQL. Read-only unless
 * "Allow writes" is on; with writes the whole run is one transaction.
 */

const SQL_KEY = 'gymbios:db-console:sql';
const DB_KEY = 'gymbios:db-console:db';
const HISTORY_KEY = 'gymbios:db-console:history';

interface HistoryItem { sql: string; db: string; at: string; ok: boolean }

const store = {
  get(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
};

const formatSize = (n: number | null) => {
  if (n == null) return '';
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
};

const cellText = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

function downloadCsv(block: DbResultBlock, name: string) {
  const esc = (v: unknown) => {
    const t = cellText(v);
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lines = [block.columns.map(c => esc(c.name)).join(','), ...block.rows.map(r => r.map(esc).join(','))];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const KIND_LABEL: Record<string, string> = { tenant: 'Gyms', primary: 'GymBios', control: 'GymBios', other: 'Other databases' };

export function DbConsole() {
  const [status, setStatus] = useState<DbConsoleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [dbs, setDbs] = useState<DbInfo[]>([]);
  const [dbsLoading, setDbsLoading] = useState(false);
  const [dbFilter, setDbFilter] = useState('');
  const [db, setDb] = useState<string>(() => store.get(DB_KEY) ?? '');

  const [sql, setSql] = useState<string>(() => store.get(SQL_KEY) ?? 'SELECT now();');
  const [allowWrites, setAllowWrites] = useState(false);
  const [confirmWrites, setConfirmWrites] = useState(false);
  const [confirmRun, setConfirmRun] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DbQueryResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try { return JSON.parse(store.get(HISTORY_KEY) ?? '[]'); } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [downloading, setDownloading] = useState<{ kind: 'sql' | 'member-photos'; bytes: number } | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);

  const lostConnection = useCallback((message: string) => {
    setStatus(prev => (prev ? { ...prev, connected: false, host_key: null } : prev));
    setDbs([]); setResult(null); setAllowWrites(false);
    toast.error(message);
  }, []);

  const handleError = useCallback((e: unknown, fallback: string) => {
    const { code, message } = dbConsoleError(e, fallback);
    if (code === 'NOT_CONNECTED') lostConnection(message);
    else toast.error(message);
  }, [lostConnection]);

  const loadDatabases = useCallback(async () => {
    setDbsLoading(true);
    try {
      const list = await dbConsoleApi.databases();
      setDbs(list);
      setDb(cur => (list.some(d => d.name === cur) ? cur : ''));
    } catch (e) {
      handleError(e, 'Could not list the databases.');
    } finally {
      setDbsLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    dbConsoleApi.status()
      .then(st => { setStatus(st); if (st.connected) loadDatabases(); })
      .catch(e => setConnectError(dbConsoleError(e, 'Could not reach the console.').message))
      .finally(() => setLoading(false));
  }, [loadDatabases]);

  useEffect(() => { store.set(SQL_KEY, sql); }, [sql]);
  useEffect(() => { if (db) store.set(DB_KEY, db); }, [db]);

  const connect = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password) return;
    setConnecting(true); setConnectError(null);
    try {
      const st = await dbConsoleApi.connect(password);
      setPassword('');
      setStatus(st);
      toast.success(`Connected to ${st.user}@${st.host}`);
      loadDatabases();
    } catch (err) {
      setConnectError(dbConsoleError(err, 'Could not connect.').message);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try { setStatus(await dbConsoleApi.disconnect()); } catch { /* already gone */ }
    setDbs([]); setResult(null); setAllowWrites(false);
  };

  const selectedDb = dbs.find(d => d.name === db) ?? null;
  const dbLabel = (d: DbInfo | null) => (d ? (d.gym_name ? `${d.gym_name} (${d.name})` : d.name) : '');

  const sqlToRun = () => {
    const el = editor.current;
    if (el && el.selectionStart !== el.selectionEnd) return el.value.slice(el.selectionStart, el.selectionEnd);
    return sql;
  };

  const run = async (text: string) => {
    if (!db || !text.trim()) return;
    setRunning(true);
    try {
      const res = await dbConsoleApi.query(db, text, allowWrites);
      setResult(res);
      const item: HistoryItem = { sql: text.trim(), db, at: new Date().toISOString(), ok: !res.error };
      setHistory(prev => {
        const next = [item, ...prev.filter(h => h.sql !== item.sql || h.db !== item.db)].slice(0, 30);
        store.set(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
      if (res.writes && res.committed) toast.success('Committed.');
    } catch (e) {
      handleError(e, 'The query could not be run.');
    } finally {
      setRunning(false);
    }
  };

  const requestRun = () => {
    const text = sqlToRun();
    if (!db) { toast.error('Pick a database first.'); return; }
    if (!text.trim()) return;
    if (allowWrites) setConfirmRun(text);
    else run(text);
  };

  const download = async (kind: 'sql' | 'member-photos') => {
    if (!db || downloading) return;
    setDownloading({ kind, bytes: 0 });
    try {
      const { name, size } = await dbConsoleApi.download(kind, db, bytes => setDownloading({ kind, bytes }));
      toast.success(`Downloaded ${name} (${formatSize(size)})`);
    } catch (e) {
      handleError(e, kind === 'sql' ? 'Could not download the database.' : 'Could not download the photos.');
    } finally {
      setDownloading(null);
    }
  };

  const cancel = async () => {
    try { await dbConsoleApi.cancel(); } catch (e) { handleError(e, 'Could not cancel.'); }
  };

  const onEditorKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (!running) requestRun(); }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const el = e.currentTarget; const { selectionStart: a, selectionEnd: b } = el;
      const next = el.value.slice(0, a) + '  ' + el.value.slice(b);
      setSql(next);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 2; });
    }
  };

  const grouped = useMemo(() => {
    const q = dbFilter.trim().toLowerCase();
    const match = (d: DbInfo) => !q || d.name.toLowerCase().includes(q) || (d.gym_name ?? '').toLowerCase().includes(q)
      || (d.slug ?? '').toLowerCase().includes(q);
    const groups: { label: string; items: DbInfo[] }[] = [];
    for (const label of ['Gyms', 'GymBios', 'Other databases']) {
      const items = dbs.filter(d => KIND_LABEL[d.kind] === label && match(d))
        .sort((x, y) => (x.gym_name ?? x.name).localeCompare(y.gym_name ?? y.name));
      if (items.length) groups.push({ label, items });
    }
    return groups;
  }, [dbs, dbFilter]);

  if (loading) {
    return <PlatformPage><div className={s.center}><Loader2 className={s.spin} /></div></PlatformPage>;
  }

  const connected = !!status?.connected;

  return (
    <PlatformPage>
      <PageHead
        icon={TerminalSquare}
        title="Database Console"
        subtitle={connected
          ? <>Connected to <b>{status!.user}@{status!.host}</b> — closes after 15 minutes without use.</>
          : <>Run SQL on any database on the server. Sign in with the server's SSH password.</>}
        actions={connected ? (
          <>
            {status?.host_key && <span className={s.hostKey} title="Server SSH key fingerprint"><ShieldCheck /> {status.host_key}</span>}
            <Button variant="outline" onClick={disconnect}><LogOut className="h-4 w-4" /> Disconnect</Button>
          </>
        ) : undefined}
      />

      {!connected ? (
        <div className={s.connectWrap}>
          <form className={s.connectCard} onSubmit={connect} autoComplete="off">
            <div className={s.connectIcon}><KeyRound /></div>
            <h2 className={s.connectTitle}>Connect to the server</h2>
            <p className={s.connectSub}>
              <span className={s.mono}>ssh {status?.user ?? 'root'}@{status?.host ?? ''}</span>
            </p>
            {status && !status.enabled ? (
              <div className={s.errorBox}><AlertTriangle /> The database console is turned off on this server.</div>
            ) : (
              <>
                <label className={s.pwLabel} htmlFor="db-console-pw">Password</label>
                <div className={s.pwField}>
                  <input
                    id="db-console-pw"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    placeholder="Server password"
                    disabled={connecting}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {connectError && <div className={s.errorBox}><AlertTriangle /> {connectError}</div>}
                <Button type="submit" disabled={!password || connecting} className={s.connectBtn}>
                  {connecting ? <><Loader2 className={`h-4 w-4 ${s.spin}`} /> Connecting…</> : 'Connect'}
                </Button>
                <p className={s.note}>The password is used once to open the connection. It is never saved.</p>
              </>
            )}
          </form>
        </div>
      ) : (
        <div className={s.layout}>
          <aside className={s.dbPanel}>
            <div className={s.dbHead}>
              <span className={s.dbTitle}><Database /> Databases <span className={s.count}>{dbs.length}</span></span>
              <button type="button" className={s.iconBtn} onClick={loadDatabases} title="Refresh" disabled={dbsLoading}>
                <RefreshCw className={dbsLoading ? s.spin : undefined} />
              </button>
            </div>
            <label className={s.search}>
              <Search aria-hidden />
              <input value={dbFilter} onChange={e => setDbFilter(e.target.value)} placeholder="Search gym or database" />
            </label>
            <div className={s.dbList}>
              {dbsLoading && !dbs.length && <div className={s.center}><Loader2 className={s.spin} /></div>}
              {grouped.map(g => (
                <div key={g.label}>
                  <div className={s.groupLabel}>{g.label}</div>
                  {g.items.map(d => (
                    <button
                      key={d.name}
                      type="button"
                      className={s.dbItem}
                      data-active={d.name === db}
                      onClick={() => { setDb(d.name); setResult(null); }}
                    >
                      <span className={s.dbName}>{d.gym_name ?? d.name}</span>
                      <span className={s.dbMeta}>
                        {d.gym_name && <span className={s.mono}>{d.name}</span>}
                        {d.kind === 'primary' && <span>main app database</span>}
                        {d.kind === 'control' && <span>control plane</span>}
                        {d.tenant_status && d.tenant_status !== 'ACTIVE' && <span className={s.warnText}>{d.tenant_status.toLowerCase()}</span>}
                        <span className={s.size}>{formatSize(d.size_bytes)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
              {!dbsLoading && !grouped.length && <div className={s.empty}>No databases match.</div>}
            </div>
          </aside>

          <section className={s.main}>
            <div className={s.editorCard} data-writes={allowWrites}>
              <div className={s.editorBar}>
                <div className={s.target}>
                  {selectedDb
                    ? <><Database /> <b>{dbLabel(selectedDb)}</b></>
                    : <span className={s.muted}>Pick a database on the left</span>}
                </div>
                <div className={s.barActions}>
                  <button type="button" className={s.ghostBtn} onClick={() => setShowHistory(v => !v)} data-on={showHistory}>
                    <History /> History
                  </button>
                  <label className={s.writes} data-on={allowWrites}>
                    <Switch
                      checked={allowWrites}
                      onCheckedChange={on => (on ? setConfirmWrites(true) : setAllowWrites(false))}
                    />
                    Allow writes
                  </label>
                  {running ? (
                    <Button variant="outline" onClick={cancel}><Square className="h-4 w-4" /> Cancel</Button>
                  ) : (
                    <Button onClick={requestRun} disabled={!db || !sql.trim()} variant={allowWrites ? 'destructive' : 'default'}>
                      <Play className="h-4 w-4" /> Run
                    </Button>
                  )}
                </div>
              </div>
              {selectedDb && (
                <div className={s.downloads}>
                  <span className={s.downloadsLabel}>Download</span>
                  <button type="button" className={s.dlBtn} onClick={() => download('sql')} disabled={!!downloading}
                    title="The whole database as a plain .sql file (pg_dump) — restore with psql">
                    {downloading?.kind === 'sql' ? <Loader2 className={s.spin} /> : <FileCode2 />}
                    {downloading?.kind === 'sql'
                      ? `Downloading… ${downloading.bytes ? formatSize(downloading.bytes) : ''}`
                      : 'Database (.sql)'}
                  </button>
                  {(selectedDb.kind === 'tenant' || selectedDb.kind === 'primary') && (
                    <button type="button" className={s.dlBtn} onClick={() => download('member-photos')} disabled={!!downloading}
                      title="This gym's member photos as a .zip, named by member number and name, with index.csv">
                      {downloading?.kind === 'member-photos' ? <Loader2 className={s.spin} /> : <Images />}
                      {downloading?.kind === 'member-photos'
                        ? `Downloading… ${downloading.bytes ? formatSize(downloading.bytes) : ''}`
                        : 'Member photos (.zip)'}
                    </button>
                  )}
                  {downloading && <span className={s.muted}>Keep this page open until it finishes.</span>}
                </div>
              )}
              {allowWrites && (
                <div className={s.writeWarn}>
                  <AlertTriangle />
                  <span>Writes are on — INSERT / UPDATE / DELETE / DDL will be committed to <b>{selectedDb ? dbLabel(selectedDb) : 'the database'}</b>.</span>
                </div>
              )}
              <textarea
                ref={editor}
                className={s.editor}
                value={sql}
                onChange={e => setSql(e.target.value)}
                onKeyDown={onEditorKey}
                spellCheck={false}
                placeholder="SELECT * FROM members LIMIT 50;"
                aria-label="SQL"
              />
              <div className={s.hint}>
                <span>Ctrl + Enter to run · select text to run just that part</span>
                <span>Read-only unless writes are on · up to {status?.max_rows ?? 1000} rows · {status?.statement_timeout_seconds ?? 120}s limit</span>
              </div>
            </div>

            {showHistory && (
              <Panel title="History" sub="This browser only" action={
                <button type="button" className={s.iconBtn} onClick={() => setShowHistory(false)} aria-label="Close history"><X /></button>
              }>
                {history.length === 0 ? <div className={s.empty}>Nothing run yet.</div> : (
                  <div className={s.history}>
                    {history.map((h, i) => (
                      <button key={i} type="button" className={s.historyItem} onClick={() => {
                        setSql(h.sql);
                        if (dbs.some(d => d.name === h.db)) setDb(h.db);
                        setShowHistory(false);
                      }}>
                        <span className={s.historySql}>{h.sql}</span>
                        <span className={s.historyMeta}>
                          {!h.ok && <Pill kind="bad">error</Pill>}
                          <span className={s.mono}>{h.db}</span> · {new Date(h.at).toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </Panel>
            )}

            {running && !result && <div className={s.center}><Loader2 className={s.spin} /></div>}
            {result && <Results result={result} running={running} />}
          </section>
        </div>
      )}

      <AlertDialog open={confirmWrites} onOpenChange={setConfirmWrites}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Allow writes?</AlertDialogTitle>
            <AlertDialogDescription>
              Statements that change data or structure will be committed to the live database. Each run is one
              transaction: if any statement fails, nothing is saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep read-only</AlertDialogCancel>
            <AlertDialogAction onClick={() => setAllowWrites(true)}>Allow writes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRun !== null} onOpenChange={open => { if (!open) setConfirmRun(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run with writes on {selectedDb ? dbLabel(selectedDb) : db}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Changes are committed if every statement succeeds.</p>
                <pre className={s.confirmSql}>{(confirmRun ?? '').slice(0, 1200)}</pre>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const t = confirmRun; setConfirmRun(null); if (t) run(t); }}>
              Run and commit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PlatformPage>
  );
}

function Results({ result, running }: { result: DbQueryResult; running: boolean }) {
  const summary = result.error
    ? (result.writes ? 'Failed — nothing was committed' : 'Failed')
    : result.writes ? (result.committed ? 'Committed' : 'Done') : 'Done (read-only)';
  return (
    <div className={s.results} data-stale={running}>
      <div className={s.resultHead}>
        <Pill kind={result.error ? 'bad' : result.writes && result.committed ? 'warn' : 'good'}>{summary}</Pill>
        <span className={s.muted}>{result.elapsed_ms.toLocaleString()} ms · <span className={s.mono}>{result.database}</span></span>
      </div>

      {result.error && (
        <div className={s.sqlError}>
          <AlertTriangle />
          <pre>{result.error.message}{result.error.sql_state ? `\n(SQLSTATE ${result.error.sql_state})` : ''}</pre>
        </div>
      )}

      {result.notices.length > 0 && (
        <div className={s.notices}>
          {result.notices.map((n, i) => <div key={i}>NOTICE: {n}</div>)}
        </div>
      )}

      {result.results.map((block, i) => (
        block.columns.length === 0 ? (
          <div key={i} className={s.command}>
            Statement {i + 1}: OK{block.update_count != null && block.update_count > 0 ? ` — ${block.update_count.toLocaleString()} row${block.update_count === 1 ? '' : 's'} affected` : ''}
          </div>
        ) : (
          <div key={i} className={s.block}>
            <div className={s.blockHead}>
              <span>
                {result.results.length > 1 && <b>Result {i + 1} · </b>}
                {block.row_count.toLocaleString()} row{block.row_count === 1 ? '' : 's'}
                {block.truncated && <span className={s.warnText}> (first {block.row_count.toLocaleString()} shown — add a LIMIT or narrow the query)</span>}
              </span>
              {block.row_count > 0 && (
                <button type="button" className={s.ghostBtn} onClick={() => downloadCsv(block, `${result.database}-result-${i + 1}`)}>
                  <Download /> CSV
                </button>
              )}
            </div>
            <div className={s.gridWrap}>
              <table className={s.grid}>
                <thead>
                  <tr>
                    <th className={s.rowNum}>#</th>
                    {block.columns.map((c, j) => (
                      <th key={j} title={c.type}>{c.name}<span className={s.colType}>{c.type}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r}>
                      <td className={s.rowNum}>{r + 1}</td>
                      {row.map((v, j) => (
                        <td key={j} data-null={v === null} title={cellText(v).length > 60 ? cellText(v).slice(0, 2000) : undefined}>
                          {v === null ? 'NULL' : cellText(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {block.rows.length === 0 && (
                    <tr><td colSpan={block.columns.length + 1} className={s.empty}>No rows.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ))}
    </div>
  );
}
