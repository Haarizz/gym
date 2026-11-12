import api from '../../api/axiosConfig';

// GymOS › Face Device Configuration (backend: FaceDeviceController). These DTOs are
// @JsonNaming(LowerCamelCase), so requests and responses are camelCase on the wire.

export type FaceSyncState = 'ENROLLED' | 'NO_PHOTO' | 'REMOVED' | 'NOT_ON_DEVICE' | 'FAILED' | 'RETRY' | 'PENDING';

export interface FaceDeviceCounts {
  members: number;
  allowedIn: number;
  withPhoto: number;
  enrolled: number;
  noPhoto: number;
  removed: number;
  failed: number;
  retry: number;
  pending: number;
}

export interface FaceDevice {
  id: number;
  branchId: number;
  name: string;
  location?: string | null;
  middlewareUrl: string;
  deviceKey: string;
  hasSecret: boolean;
  accessGroup: number;
  verifyStyle: number;
  timeZone: string;
  photoBaseUrl?: string | null;
  enabled: boolean;
  autoSync: boolean;
  lastTestAt?: string | null;
  lastTestOk?: boolean | null;
  lastTestMessage?: string | null;
  lastSyncAt?: string | null;
  lastSyncMessage?: string | null;
  syncing: boolean;
  counts: FaceDeviceCounts;
  reportEmails?: string | null;
  /** Gym-local time of the nightly report, "HH:mm". */
  reportTime: string;
  /** False when the server has no SMTP set up, so no report can be sent. */
  mailConfigured: boolean;
  lastReportAt?: string | null;
  lastReportMessage?: string | null;
  offlineSince?: string | null;
}

export interface FaceDeviceRequest {
  name?: string;
  location?: string;
  middlewareUrl?: string;
  deviceKey?: string;
  /** Leave blank on edit to keep the saved secret. */
  secret?: string;
  accessGroup?: number;
  verifyStyle?: number;
  timeZone?: string;
  photoBaseUrl?: string;
  enabled?: boolean;
  autoSync?: boolean;
  /** Comma-separated; "" turns the daily report off. */
  reportEmails?: string;
}

export interface FaceDeviceTestResult {
  ok: boolean;
  message: string;
  testedAt: string;
}

export interface FaceMemberStatus {
  memberId: number;
  memberCode: string;
  name: string;
  membershipStatus: string;
  allowedIn: boolean;
  hasPhoto: boolean;
  photoUrl?: string | null;
  state: FaceSyncState;
  needsSync: boolean;
  lastMessage?: string | null;
  attempts: number;
  lastAttemptAt?: string | null;
  lastSuccessAt?: string | null;
}

export interface FaceMemberPage {
  total: number;
  items: FaceMemberStatus[];
}

const base = '/gymos/face-devices';

export const faceDeviceService = {
  list: async (): Promise<FaceDevice[]> => (await api.get<FaceDevice[]>(base)).data,
  get: async (id: number): Promise<FaceDevice> => (await api.get<FaceDevice>(`${base}/${id}`)).data,
  create: async (data: FaceDeviceRequest): Promise<FaceDevice> => (await api.post<FaceDevice>(base, data)).data,
  update: async (id: number, data: FaceDeviceRequest): Promise<FaceDevice> =>
    (await api.put<FaceDevice>(`${base}/${id}`, data)).data,
  remove: async (id: number): Promise<void> => { await api.delete(`${base}/${id}`); },
  test: async (id: number): Promise<FaceDeviceTestResult> =>
    (await api.post<FaceDeviceTestResult>(`${base}/${id}/test`)).data,
  sync: async (id: number, full = false): Promise<FaceDevice> =>
    (await api.post<FaceDevice>(`${base}/${id}/sync`, null, { params: { full } })).data,
  sendReport: async (id: number): Promise<{ message: string }> =>
    (await api.post<{ message: string }>(`${base}/${id}/report`)).data,
  retryFailed: async (id: number): Promise<FaceDevice> =>
    (await api.post<FaceDevice>(`${base}/${id}/retry-failed`)).data,
  members: async (id: number, params: { state?: string; q?: string; limit?: number }): Promise<FaceMemberPage> =>
    (await api.get<FaceMemberPage>(`${base}/${id}/members`, { params })).data,
  syncMember: async (id: number, memberId: number): Promise<FaceMemberStatus> =>
    (await api.post<FaceMemberStatus>(`${base}/${id}/members/${memberId}/sync`)).data,
};

/** The server's message for a failed request, else the fallback. */
export function faceDeviceError(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;
  if (data && typeof data.message === 'string' && data.message) return data.message;
  if (data && typeof data.error === 'string' && data.error) return data.error;
  return fallback;
}
