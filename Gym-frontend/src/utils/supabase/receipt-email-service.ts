import api from '../../api/axiosConfig';

// Billing › Email receipt / Email invoice (backend: ReceiptEmailController). camelCase on the wire.

export interface ReceiptEmailHistoryItem {
  documentType: 'RECEIPT' | 'INVOICE';
  toEmail: string;
  subject: string;
  status: 'SENT' | 'FAILED';
  error?: string | null;
  sentBy?: string | null;
  sentAt: string;
}

export interface ReceiptEmailInfo {
  memberEmail?: string | null;
  memberName?: string | null;
  /** The gym (or the server) has an SMTP account to send with. */
  mailConfigured: boolean;
  history: ReceiptEmailHistoryItem[];
}

export interface ReceiptEmailRequest {
  document: 'RECEIPT' | 'INVOICE';
  to: string;
  subject: string;
  message: string;
  companyName?: string;
  accentColor?: string;
  pdfBase64: string;
  pdfFileName: string;
}

export const receiptEmailService = {
  info: async (receiptId: string | number): Promise<ReceiptEmailInfo> =>
    (await api.get<ReceiptEmailInfo>(`/receipts/${receiptId}/email-info`)).data,
  send: async (receiptId: string | number, data: ReceiptEmailRequest): Promise<{ ok: boolean; message: string; to: string; sentAt: string }> =>
    (await api.post(`/receipts/${receiptId}/email`, data, { timeout: 120000 })).data,
};

export function receiptEmailError(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;
  if (data && typeof data.message === 'string' && data.message) return data.message;
  return fallback;
}
