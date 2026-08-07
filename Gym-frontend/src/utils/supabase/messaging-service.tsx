import { authService } from "./auth-service";

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface MessagingRecipientApi {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type: 'member' | 'prospect' | 'staff';
  membership_status?: string | null;
  membership_plan?: string | null;
  membership_expiry?: string | null;
  join_date?: string | null;
  is_vip?: boolean | null;
  location?: string | null;
  tags?: string[];
}

export interface MessageTemplateApi {
  id: string;
  name: string;
  category?: string | null;
  subject: string;
  content: string;
  type: 'sms' | 'whatsapp' | 'email' | 'in-app';
  variables?: string[];
  created_by?: string | null;
  created_date?: string | null;
  usage_count?: number | null;
  active?: boolean | null;
}

export interface MessageGroupApi {
  id: string;
  name: string;
  description?: string | null;
  member_count?: number | null;
  members?: string[];
  criteria?: any;
  created_by?: string | null;
  created_date?: string | null;
  system?: boolean | null;
}

export interface MessageHistoryApi {
  id: string;
  subject: string;
  content: string;
  type: 'sms' | 'whatsapp' | 'email' | 'in-app';
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'scheduled' | 'partial' | 'sending';
  recipient_count?: number | null;
  recipients?: string[];
  sent_date?: string | null;
  scheduled_date?: string | null;
  delivery_rate?: number | null;
  open_rate?: number | null;
  click_rate?: number | null;
  sent_by?: string | null;
  cost?: number | null;
}

export interface MessagingAnalyticsApi {
  sent_today?: number;
  scheduled_messages?: number;
  total_recipients?: number;
  open_rate?: number;
  click_rate?: number;
  total_cost?: number;
}

export interface MessageRecipientSelection {
  id: string;
  type: 'member' | 'prospect' | 'staff';
}

export interface SendMessagePayload {
  type: 'sms' | 'whatsapp' | 'email' | 'in-app';
  subject?: string;
  content: string;
  recipients: MessageRecipientSelection[];
  group_ids?: string[];
  personalization?: boolean;
  scheduled_at?: string;
  template_id?: number;
}

export interface SendMessageResponse {
  campaign_id: string;
  status: string;
  recipient_count: number;
}

class MessagingService {
  async getRecipients(type?: string, search?: string): Promise<MessagingRecipientApi[]> {
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (search) params.append("search", search);
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/messaging/recipients?${params.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch recipients: ${response.status}`);
    return response.json();
  }

  async getTemplates(): Promise<MessageTemplateApi[]> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/messaging/templates`);
    if (!response.ok) throw new Error(`Failed to fetch templates: ${response.status}`);
    return response.json();
  }

  async createTemplate(payload: Partial<MessageTemplateApi>): Promise<MessageTemplateApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/messaging/templates`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    if (!response.ok) throw new Error(`Failed to create template: ${response.status}`);
    return response.json();
  }

  async updateTemplate(id: string, payload: Partial<MessageTemplateApi>): Promise<MessageTemplateApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/messaging/templates/${id}`,
      { method: "PUT", body: JSON.stringify(payload) }
    );
    if (!response.ok) throw new Error(`Failed to update template: ${response.status}`);
    return response.json();
  }

  async deleteTemplate(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/messaging/templates/${id}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error(`Failed to delete template: ${response.status}`);
  }

  async getGroups(): Promise<MessageGroupApi[]> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/messaging/groups`);
    if (!response.ok) throw new Error(`Failed to fetch groups: ${response.status}`);
    return response.json();
  }

  async createGroup(payload: Partial<MessageGroupApi>): Promise<MessageGroupApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/messaging/groups`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    if (!response.ok) throw new Error(`Failed to create group: ${response.status}`);
    return response.json();
  }

  async updateGroup(id: string, payload: Partial<MessageGroupApi>): Promise<MessageGroupApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/messaging/groups/${id}`,
      { method: "PUT", body: JSON.stringify(payload) }
    );
    if (!response.ok) throw new Error(`Failed to update group: ${response.status}`);
    return response.json();
  }

  async deleteGroup(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/messaging/groups/${id}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error(`Failed to delete group: ${response.status}`);
  }

  async getHistory(): Promise<MessageHistoryApi[]> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/messaging/history`);
    if (!response.ok) throw new Error(`Failed to fetch history: ${response.status}`);
    return response.json();
  }

  // Campaigns this specific member was a recipient of — used by the member
  // analytics page's Communication History tab.
  async getMemberHistory(memberDbId: string | number): Promise<MessageHistoryApi[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/messaging/history?memberId=${memberDbId}`
    );
    if (!response.ok) throw new Error(`Failed to fetch member history: ${response.status}`);
    return response.json();
  }

  async deleteHistory(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/messaging/history/${id}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error(`Failed to delete history: ${response.status}`);
  }

  async getAnalytics(): Promise<MessagingAnalyticsApi> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/messaging/analytics`);
    if (!response.ok) throw new Error(`Failed to fetch analytics: ${response.status}`);
    return response.json();
  }

  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/messaging/send`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    if (!response.ok) throw new Error(`Failed to send message: ${response.status}`);
    return response.json();
  }
}

export const messagingService = new MessagingService();
