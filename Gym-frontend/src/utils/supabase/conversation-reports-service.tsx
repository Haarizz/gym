import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

/** OPEN until an admin resolves it: ACTIONED (conversation closed / member banned) or DISMISSED. */
export type ReportStatus = 'OPEN' | 'ACTIONED' | 'DISMISSED';
export type ReportResolution = 'DISMISS' | 'BLOCK_CONVERSATION' | 'BAN_MEMBER';
export type SenderType = 'MEMBER' | 'STAFF';

export interface ReportMessage {
  id: number;
  sender_type: SenderType;
  sender_name: string | null;
  /** Always filled for admins, even when deleted. This is what the other side saw. */
  body: string | null;
  deleted: boolean;
  /** Contact details were hidden from what was typed; original_body is what was typed. */
  masked: boolean;
  original_body: string | null;
  created_at: string;
}

export interface ConversationReport {
  id: number;
  branch_id: number;
  branch_name: string | null;
  conversation_id: number;
  member_id: number;
  member_name: string | null;
  member_code: string | null;
  /** "Front desk" for the shared inbox. */
  staff_name: string | null;
  reported_by_type: SenderType;
  reported_by_name: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolution: ReportResolution | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  reported_message: ReportMessage | null;
  conversation_blocked: boolean;
  member_chat_banned: boolean;
  /** Detail view only: the whole conversation up to the moment of the report. */
  transcript: ReportMessage[] | null;
}

export interface ReportPage {
  items: ConversationReport[];
  total: number;
  page: number;
  size: number;
  status_counts: Record<ReportStatus, number>;
}

// English labels for the reason keys the mobile app sends.
export const REPORT_REASON_LABELS: Record<string, string> = {
  HARASSMENT: 'Harassment or bullying',
  SPAM: 'Spam',
  INAPPROPRIATE: 'Inappropriate content',
  OFF_PLATFORM: 'Asking to move off the app',
  OTHER: 'Something else',
};

export const MAX_RESOLUTION_NOTE_LENGTH = 500;

async function readError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json();
    return new Error(body?.message || fallback);
  } catch {
    return new Error(fallback);
  }
}

/** Chat reports from the mobile app. Gym owners only (ADMIN / SUPER_ADMIN on the backend). */
class ConversationReportsService {

  async list(params: { status?: ReportStatus | null; page?: number; size?: number }): Promise<ReportPage> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 20));
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/conversation-reports?${query}`);
    if (!response.ok) throw await readError(response, `Failed to fetch chat reports: ${response.status}`);
    return response.json();
  }

  async get(id: number): Promise<ConversationReport> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/conversation-reports/${id}`);
    if (!response.ok) throw await readError(response, `Failed to load the report: ${response.status}`);
    return response.json();
  }

  async resolve(id: number, action: ReportResolution, note: string): Promise<ConversationReport> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/conversation-reports/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note: note.trim() || null }),
    });
    if (!response.ok) throw await readError(response, `Failed to resolve the report: ${response.status}`);
    return response.json();
  }

  async liftChatBan(memberId: number): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/conversation-reports/members/${memberId}/chat-ban`,
      { method: 'DELETE' },
    );
    if (!response.ok) throw await readError(response, `Failed to lift the chat ban: ${response.status}`);
  }
}

export const conversationReportsService = new ConversationReportsService();
