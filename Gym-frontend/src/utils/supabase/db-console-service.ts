import api from '../../api/axiosConfig';

/** Super admin Database Console — see DbConsoleController on the backend. */

export interface DbConsoleStatus {
  enabled: boolean;
  connected: boolean;
  host: string;
  user: string;
  host_key: string | null;
  opened_at: string | null;
  expires_at: string | null;
  max_rows: number;
  statement_timeout_seconds: number;
}

export type DbKind = 'tenant' | 'primary' | 'control' | 'other';

export interface DbInfo {
  name: string;
  size_bytes: number | null;
  kind: DbKind;
  gym_name: string | null;
  slug: string | null;
  tenant_status: string | null;
}

export interface DbColumn { name: string; type: string }

export interface DbResultBlock {
  columns: DbColumn[];
  rows: unknown[][];
  row_count: number;
  truncated: boolean;
  update_count: number | null;
}

export interface DbQueryResult {
  database: string;
  writes: boolean;
  committed: boolean;
  elapsed_ms: number;
  results: DbResultBlock[];
  notices: string[];
  error: { message: string; sql_state: string | null } | null;
}

const base = '/platform/db-console';

export const dbConsoleApi = {
  status: async () => (await api.get<DbConsoleStatus>(`${base}/status`)).data,
  connect: async (password: string) => (await api.post<DbConsoleStatus>(`${base}/connect`, { password })).data,
  disconnect: async () => (await api.post<DbConsoleStatus>(`${base}/disconnect`)).data,
  databases: async () => (await api.get<DbInfo[]>(`${base}/databases`)).data,
  // no client timeout beyond the server's statement timeout
  query: async (database: string, sql: string, allowWrites: boolean) =>
    (await api.post<DbQueryResult>(`${base}/query`, { database, sql, allow_writes: allowWrites }, { timeout: 0 })).data,
  cancel: async () => (await api.post<{ cancelled: boolean }>(`${base}/cancel`)).data,

  /**
   * Downloads the database as a plain .sql file ('sql') or that gym's member photos as a
   * .zip ('member-photos') and saves it. `onProgress` gets the bytes received so far.
   */
  download: async (kind: 'sql' | 'member-photos', database: string, onProgress?: (bytes: number) => void) => {
    try {
      const res = await api.get<Blob>(`${base}/download/${kind}`, {
        params: { database }, responseType: 'blob', timeout: 0,
        onDownloadProgress: e => onProgress?.(e.loaded),
      });
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
      const name = (res.headers['x-download-filename'] as string | undefined)
        ?? (kind === 'sql' ? `${database}-${stamp}.sql` : `${database}-member-photos-${stamp}.zip`);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return { name, size: res.data.size };
    } catch (e: any) {
      // A failed blob request carries the server's JSON {code, message} as a Blob.
      const data = e?.response?.data;
      if (data instanceof Blob) {
        try { e.response.data = JSON.parse(await data.text()); } catch { /* not JSON */ }
      }
      throw e;
    }
  },
};

/** The console's own error ({code, message}) or a fallback. */
export function dbConsoleError(error: unknown, fallback: string): { code: string | null; message: string } {
  const data = (error as any)?.response?.data;
  if (data && typeof data.message === 'string' && data.message) return { code: data.code ?? null, message: data.message };
  return { code: null, message: fallback };
}
