import type { MessagingRepository } from '../application/MessagingRepository';
import type {
  MessagingRecipient,
  MessageTemplate,
  MessageTemplateRequest,
  MessageGroup,
  MessageGroupRequest,
  MessageHistory,
  MessagingAnalytics,
  SendMessageRequest,
  SendMessageResponse,
} from '../domain/MessagingModels';
import { apiClient } from '@/core/network/apiClient';

// The backend serializes with Jackson SNAKE_CASE (spring.jackson.property-naming-strategy),
// so every response field below is snake_case and mapped to the camelCase domain models here.
interface MessagingRecipientResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  membership_status?: string | null;
  membership_plan?: string | null;
  membership_expiry?: string | null;
  location?: string | null;
  tags?: string[] | null;
  photo_url?: string | null;
  join_date?: string | null;
  is_vip?: boolean | null;
}

interface MessageTemplateResponse {
  id: string;
  name: string;
  category: string;
  subject: string;
  content: string;
  type: string;
  variables: string[] | null;
  created_by: string;
  created_date: string;
  usage_count: number | null;
  active?: boolean;
}

interface MessageGroupResponse {
  id: string;
  name: string;
  description: string;
  member_count: number | null;
  members: string[] | null;
  criteria: any;
  created_by: string;
  created_date: string;
  system: boolean;
}

interface MessageHistoryResponse {
  id: string;
  subject: string;
  content: string;
  type: string;
  status: string;
  recipient_count: number | null;
  recipients: string[] | null;
  sent_date: string | null;
  scheduled_date?: string | null;
  delivery_rate: number | null;
  open_rate: number | null;
  click_rate: number | null;
  sent_by: string | null;
  cost: number | null;
}

interface MessagingAnalyticsResponse {
  sent_today: number | null;
  scheduled_messages: number | null;
  total_recipients: number | null;
  open_rate: number | null;
  click_rate: number | null;
  total_cost: number | null;
}

interface SendMessageApiResponse {
  campaign_id: string;
  status: string;
  recipient_count: number;
}

const toDate = (value?: string | null) => (value ? new Date(value) : undefined);

/** Format a Date as a zone-less LocalDateTime string, which is what the backend parses. */
const toLocalDateTime = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export class ApiMessagingRepository implements MessagingRepository {
  async getRecipients(type?: string, search?: string): Promise<MessagingRecipient[]> {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    if (search) params.search = search;
    
    const response = await apiClient.get<MessagingRecipientResponse[]>('/messaging/recipients', {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
    
    return response.data.map(item => ({
      id: String(item.id),
      name: item.name ?? '',
      email: item.email ?? '',
      phone: item.phone ?? '',
      type: item.type,
      membershipStatus: item.membership_status ?? undefined,
      membershipPlan: item.membership_plan ?? undefined,
      membershipExpiry: toDate(item.membership_expiry),
      location: item.location ?? undefined,
      tags: item.tags ?? [],
      avatar: item.photo_url ?? undefined,
      joinDate: toDate(item.join_date),
      isVip: item.is_vip ?? false,
    }));
  }

  async getTemplates(): Promise<MessageTemplate[]> {
    const response = await apiClient.get<MessageTemplateResponse[]>('/messaging/templates');
    return response.data.map(item => this.mapTemplate(item));
  }

  async createTemplate(request: MessageTemplateRequest): Promise<MessageTemplate> {
    const response = await apiClient.post<MessageTemplateResponse>('/messaging/templates', request);
    return this.mapTemplate(response.data);
  }

  async updateTemplate(id: number, request: MessageTemplateRequest): Promise<MessageTemplate> {
    const response = await apiClient.put<MessageTemplateResponse>(`/messaging/templates/${id}`, request);
    return this.mapTemplate(response.data);
  }

  async deleteTemplate(id: number): Promise<void> {
    await apiClient.delete(`/messaging/templates/${id}`);
  }

  async getGroups(): Promise<MessageGroup[]> {
    const response = await apiClient.get<MessageGroupResponse[]>('/messaging/groups');
    return response.data.map(item => this.mapGroup(item));
  }

  async createGroup(request: MessageGroupRequest): Promise<MessageGroup> {
    const response = await apiClient.post<MessageGroupResponse>('/messaging/groups', request);
    return this.mapGroup(response.data);
  }

  async updateGroup(id: number, request: MessageGroupRequest): Promise<MessageGroup> {
    const response = await apiClient.put<MessageGroupResponse>(`/messaging/groups/${id}`, request);
    return this.mapGroup(response.data);
  }

  async deleteGroup(id: number): Promise<void> {
    await apiClient.delete(`/messaging/groups/${id}`);
  }

  async getHistory(memberId?: number): Promise<MessageHistory[]> {
    const params = memberId ? { memberId } : undefined;
    const response = await apiClient.get<MessageHistoryResponse[]>('/messaging/history', { params });
    return response.data.map(item => ({
      id: String(item.id),
      subject: item.subject,
      content: item.content,
      type: item.type,
      status: item.status,
      recipientCount: item.recipient_count ?? 0,
      recipients: item.recipients ?? [],
      // Scheduled campaigns have no sent date yet — fall back like the web page does.
      sentDate: toDate(item.sent_date) ?? toDate(item.scheduled_date) ?? new Date(),
      scheduledDate: toDate(item.scheduled_date),
      deliveryRate: item.delivery_rate ?? 0,
      openRate: item.open_rate ?? 0,
      clickRate: item.click_rate ?? 0,
      sentBy: item.sent_by || 'System',
      cost: item.cost ?? 0,
    }));
  }

  async deleteHistory(id: string): Promise<void> {
    await apiClient.delete(`/messaging/history/${id}`);
  }

  async getAnalytics(): Promise<MessagingAnalytics> {
    const response = await apiClient.get<MessagingAnalyticsResponse>('/messaging/analytics');
    const data = response.data;
    return {
      sentToday: data.sent_today ?? 0,
      scheduledMessages: data.scheduled_messages ?? 0,
      totalRecipients: data.total_recipients ?? 0,
      openRate: data.open_rate ?? 0,
      clickRate: data.click_rate ?? 0,
      totalCost: data.total_cost ?? 0,
    };
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageApiResponse>('/messaging/send', {
      type: request.type,
      subject: request.subject,
      content: request.content,
      recipients: request.recipients,
      group_ids: request.groupIds,
      personalization: request.personalization,
      scheduled_at: request.scheduledAt ? toLocalDateTime(request.scheduledAt) : undefined,
      template_id: request.templateId,
    });
    return {
      campaignId: response.data.campaign_id,
      status: response.data.status,
      recipientCount: response.data.recipient_count,
    };
  }

  private mapTemplate(item: MessageTemplateResponse): MessageTemplate {
    return {
      id: Number(item.id),
      name: item.name,
      category: item.category,
      subject: item.subject,
      content: item.content,
      type: item.type,
      variables: item.variables ?? [],
      createdBy: item.created_by,
      createdDate: new Date(item.created_date),
      usageCount: item.usage_count ?? 0,
      active: item.active,
    };
  }

  private mapGroup(item: MessageGroupResponse): MessageGroup {
    return {
      id: Number(item.id),
      name: item.name,
      description: item.description,
      memberCount: item.member_count ?? 0,
      members: item.members ?? [],
      criteria: item.criteria,
      createdBy: item.created_by,
      createdDate: new Date(item.created_date),
      isSystem: item.system,
    };
  }
}
