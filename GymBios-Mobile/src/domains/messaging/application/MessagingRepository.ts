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

export interface MessagingRepository {
  getRecipients(type?: string, search?: string): Promise<MessagingRecipient[]>;

  getTemplates(): Promise<MessageTemplate[]>;
  createTemplate(request: MessageTemplateRequest): Promise<MessageTemplate>;
  updateTemplate(id: number, request: MessageTemplateRequest): Promise<MessageTemplate>;
  deleteTemplate(id: number): Promise<void>;

  getGroups(): Promise<MessageGroup[]>;
  createGroup(request: MessageGroupRequest): Promise<MessageGroup>;
  updateGroup(id: number, request: MessageGroupRequest): Promise<MessageGroup>;
  deleteGroup(id: number): Promise<void>;

  getHistory(memberId?: number): Promise<MessageHistory[]>;
  deleteHistory(id: string): Promise<void>;

  getAnalytics(): Promise<MessagingAnalytics>;

  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
}
