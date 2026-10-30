import api from '../../api/axiosConfig';

/** Super-admin Import Gym (previous GymBios → new tenant). See GymImportController. */

export type GymImportStatus = 'UPLOADING' | 'ANALYZING' | 'READY' | 'ONBOARDING' | 'COMPLETED' | 'FAILED';

export interface ImportCount { label: string; old: number; imported: number; imported_as: string }
export interface ImportMoney {
  old_cash: number; old_day_passes: number; old_total: number;
  received: number; refunded: number; imported_total: number; matches: boolean;
  old_open_dues: number; imported_dues: number;
}
export interface ImportReport {
  counts: ImportCount[];
  members_by_status: Record<string, number>;
  money: ImportMoney;
  receipt_types: { type: string; count: number; billed: number; received: number }[];
  methods: { method: string; amount: number }[];
  photos: { referenced: number; matched: number | null };
  review: { section: string; items: string[] }[];
}

export interface GymImportJob {
  id: string;
  status: GymImportStatus;
  failed_during: 'ANALYZE' | 'ONBOARD' | null;
  progress: number;
  step: string;
  error: string | null;
  file_name: string | null;
  dump_bytes: number;
  referenced_photos: string[];
  photos_matched: number;
  gym: { name?: string; address?: string; phone?: string; email?: string; website?: string } | null;
  report: ImportReport | null;
  onboarding: { name: string; slug: string; owner_username: string; owner_email: string; utc_offset_minutes: number } | null;
  tenant_id: number | null;
  result: (Record<string, unknown> & { name?: string; slug?: string; owner_username?: string; photos?: number }) | null;
}

export interface ImportAppAccountRow {
  member_id: number;
  member_no: string | null;
  name: string | null;
  username: string | null;
  detail: string | null;
}

/** The members' GymBios app accounts made at the end of onboarding (result.app_accounts). */
export interface ImportAppAccounts {
  dry_run: boolean;
  starting_password: string;
  members: number;
  created: number;
  /** Member number already used elsewhere — the username got the gym ID added. */
  with_gym_id: ImportAppAccountRow[];
  failed: ImportAppAccountRow[];
}

export interface OnboardGymRequest {
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  owner_username: string;
  owner_password: string;
  owner_email: string;
  /** Gym time zone as minutes east of UTC (UAE = 240) */
  utc_offset_minutes: number;
}

// The server takes at most 10 MB per request; stay safely under it.
const CHUNK_BYTES = 8 * 1024 * 1024;
const PHOTO_BATCH_BYTES = 8 * 1024 * 1024;
const PHOTO_BATCH_FILES = 40;

const base = (id: string) => `/gym-imports/${encodeURIComponent(id)}`;

export const gymImportApi = {
  async create(): Promise<GymImportJob> {
    return (await api.post<GymImportJob>('/gym-imports')).data;
  },

  async get(id: string): Promise<GymImportJob> {
    return (await api.get<GymImportJob>(base(id))).data;
  },

  /** Sends the SQL export in chunks; onProgress gets 0–1. */
  async uploadDump(id: string, file: File, onProgress: (fraction: number) => void): Promise<GymImportJob> {
    let job: GymImportJob | null = null;
    for (let offset = 0; offset < file.size || offset === 0; offset += CHUNK_BYTES) {
      const chunk = file.slice(offset, Math.min(offset + CHUNK_BYTES, file.size));
      const form = new FormData();
      form.append('file', chunk, file.name);
      job = (await api.post<GymImportJob>(`${base(id)}/dump`, form, {
        params: { offset, file_name: file.name },
        onUploadProgress: (e: { loaded?: number }) => onProgress(Math.min(1, (offset + (e.loaded ?? 0)) / Math.max(1, file.size))),
      })).data;
      if (file.size === 0) break;
    }
    onProgress(1);
    return job!;
  },

  async analyze(id: string): Promise<GymImportJob> {
    return (await api.post<GymImportJob>(`${base(id)}/analyze`)).data;
  },

  /** Uploads the given photos in size-limited batches; onProgress gets 0–1. */
  async uploadPhotos(id: string, files: File[], onProgress: (fraction: number) => void): Promise<number> {
    const total = files.reduce((s, f) => s + f.size, 0) || 1;
    let sent = 0;
    let saved = 0;
    let batch: File[] = [];
    let batchBytes = 0;
    const flush = async () => {
      if (batch.length === 0) return;
      const form = new FormData();
      batch.forEach(f => form.append('files', f, f.name));
      const before = sent;
      const res = await api.post<GymImportJob & { saved: number }>(`${base(id)}/photos`, form, {
        onUploadProgress: (e: { loaded?: number }) => onProgress(Math.min(1, (before + (e.loaded ?? 0)) / total)),
      });
      saved += res.data.saved ?? 0;
      sent += batchBytes;
      onProgress(Math.min(1, sent / total));
      batch = [];
      batchBytes = 0;
    };
    for (const f of files) {
      if (batch.length > 0 && (batchBytes + f.size > PHOTO_BATCH_BYTES || batch.length >= PHOTO_BATCH_FILES)) await flush();
      batch.push(f);
      batchBytes += f.size;
    }
    await flush();
    onProgress(1);
    return saved;
  },

  async photosDone(id: string): Promise<GymImportJob> {
    return (await api.post<GymImportJob>(`${base(id)}/photos/done`)).data;
  },

  async onboard(id: string, req: OnboardGymRequest): Promise<GymImportJob> {
    return (await api.post<GymImportJob>(`${base(id)}/onboard`, req)).data;
  },

  async discard(id: string): Promise<void> {
    await api.delete(base(id));
  },
};

/** The server's message for a failed call (it explains what to fix), else the fallback. */
export function gymImportErrorMessage(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;
  if (data && typeof data.message === 'string' && data.message) return data.message;
  if (error instanceof Error && error.message && !/status code/i.test(error.message)) return error.message;
  return fallback;
}
