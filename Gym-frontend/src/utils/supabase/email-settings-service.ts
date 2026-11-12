import api from '../../api/axiosConfig';

// GymOS › Settings › Email (backend: EmailSettingsController). camelCase on the wire.

export type MailSecurity = 'SSL' | 'STARTTLS' | 'NONE';

export interface EmailSettings {
  /** False until the gym saves its first settings. */
  saved: boolean;
  enabled: boolean;
  host?: string | null;
  port?: number | null;
  security: MailSecurity;
  username?: string | null;
  hasPassword: boolean;
  fromEmail?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
  lastTestAt?: string | null;
  lastTestOk?: boolean | null;
  lastTestMessage?: string | null;
  /** The server has its own SMTP_* settings (used while the gym has none). */
  serverFallback: boolean;
  /** Which account emails go out through right now. */
  activeSource: 'GYM' | 'SERVER' | 'NONE';
}

export interface EmailSettingsRequest {
  enabled: boolean;
  host: string;
  port: number | null;
  security: MailSecurity;
  username: string;
  /** Blank keeps the saved password. */
  password?: string;
  clearPassword?: boolean;
  fromEmail: string;
  fromName: string;
  replyTo: string;
}

export interface EmailTestResult {
  ok: boolean;
  message: string;
  testedAt: string;
}

export const emailSettingsService = {
  get: async (): Promise<EmailSettings> => (await api.get<EmailSettings>('/email-settings')).data,
  save: async (data: EmailSettingsRequest): Promise<EmailSettings> => (await api.put<EmailSettings>('/email-settings', data)).data,
  test: async (to: string, pdf?: { base64: string; fileName: string }): Promise<EmailTestResult> =>
    (await api.post<EmailTestResult>('/email-settings/test', {
      to, pdfBase64: pdf?.base64, pdfFileName: pdf?.fileName,
    }, { timeout: 90000 })).data,
};

export function emailSettingsError(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;
  if (data && typeof data.message === 'string' && data.message) return data.message;
  return fallback;
}
