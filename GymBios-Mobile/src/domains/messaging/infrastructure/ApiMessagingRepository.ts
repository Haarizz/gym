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

interface MessagingRecipientResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  membershipStatus?: string;
  membershipPlan?: string;
  membershipExpiry?: string;
  lastVisit?: string;
  location?: string;
  tags: string[];
  avatar?: string;
  joinDate?: string;
  isVip?: boolean;
}

interface MessageTemplateResponse {
  id: number;
  name: string;
  category: string;
  subject: string;
  content: string;
  type: string;
  variables: string[];
  createdBy: string;
  createdDate: string;
  usageCount: number;
  active?: boolean;
}

interface MessageGroupResponse {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  members: string[];
  criteria: any;
  createdBy: string;
  createdDate: string;
  system: boolean;
}

interface MessageHistoryResponse {
  id: string;
  subject: string;
  content: string;
  type: string;
  status: string;
  recipientCount: number;
  recipients: string[];
  sentDate: string;
  scheduledDate?: string;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  sentBy: string;
  cost: number;
}

interface MessagingAnalyticsResponse {
  sentToday: number;
  scheduledMessages: number;
  totalRecipients: number;
  openRate: number;
  clickRate: number;
  totalCost: number;
}

export class ApiMessagingRepository implements MessagingRepository {
  async getRecipients(type?: string, search?: string): Promise<MessagingRecipient[]> {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    if (search) params.search = search;
    
    const response = await apiClient.get<MessagingRecipientResponse[]>('/messaging/recipients', {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
    
    return response.data.map(item => ({
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      type: item.type,
      membershipStatus: item.membershipStatus,
      membershipPlan: item.membershipPlan,
      membershipExpiry: item.membershipExpiry ? new Date(item.membershipExpiry) : undefined,
      lastVisit: item.lastVisit ? new Date(item.lastVisit) : undefined,
      location: item.location,
      tags: item.tags || [],
      avatar: item.avatar,
      joinDate: item.joinDate ? new Date(item.joinDate) : undefined,
      isVip: item.isVip,
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
      ...item,
      sentDate: new Date(item.sentDate),
      scheduledDate: item.scheduledDate ? new Date(item.scheduledDate) : undefined,
    }));
  }

  async deleteHistory(id: string): Promise<void> {
    await apiClient.delete(`/messaging/history/${id}`);
  }

  async getAnalytics(): Promise<MessagingAnalytics> {
    const response = await apiClient.get<any>('/messaging/analytics');
    const data = response.data;
    return {
      sentToday: data.sent_today ?? data.sentToday ?? 0,
      scheduledMessages: data.scheduled_messages ?? data.scheduledMessages ?? 0,
      totalRecipients: data.total_recipients ?? data.totalRecipients ?? 0,
      openRate: data.open_rate ?? data.openRate ?? 0,
      clickRate: data.click_rate ?? data.clickRate ?? 0,
      totalCost: data.total_cost ?? data.totalCost ?? 0,
    };
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>('/messaging/send', request);
    return response.data;
  }

  private mapTemplate(item: MessageTemplateResponse): MessageTemplate {
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      subject: item.subject,
      content: item.content,
      type: item.type,
      variables: item.variables || [],
      createdBy: item.createdBy,
      createdDate: new Date(item.createdDate),
      usageCount: item.usageCount,
      active: item.active,
    };
  }

  private mapGroup(item: MessageGroupResponse): MessageGroup {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      memberCount: item.memberCount,
      members: item.members || [],
      criteria: item.criteria,
      createdBy: item.createdBy,
      createdDate: new Date(item.createdDate),
      isSystem: item.system,
    };
  }
}
