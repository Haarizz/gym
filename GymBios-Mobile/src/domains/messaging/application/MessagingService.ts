import type { MessagingRepository } from './MessagingRepository';
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

export class MessagingService {
  constructor(private readonly repository: MessagingRepository) {}

  getRecipients(type?: string, search?: string): Promise<MessagingRecipient[]> {
    return this.repository.getRecipients(type, search);
  }

  getTemplates(): Promise<MessageTemplate[]> {
    return this.repository.getTemplates();
  }

  createTemplate(request: MessageTemplateRequest): Promise<MessageTemplate> {
    return this.repository.createTemplate(request);
  }

  updateTemplate(id: number, request: MessageTemplateRequest): Promise<MessageTemplate> {
    return this.repository.updateTemplate(id, request);
  }

  deleteTemplate(id: number): Promise<void> {
    return this.repository.deleteTemplate(id);
  }

  getGroups(): Promise<MessageGroup[]> {
    return this.repository.getGroups();
  }

  createGroup(request: MessageGroupRequest): Promise<MessageGroup> {
    return this.repository.createGroup(request);
  }

  updateGroup(id: number, request: MessageGroupRequest): Promise<MessageGroup> {
    return this.repository.updateGroup(id, request);
  }

  deleteGroup(id: number): Promise<void> {
    return this.repository.deleteGroup(id);
  }

  getHistory(memberId?: number): Promise<MessageHistory[]> {
    return this.repository.getHistory(memberId);
  }

  deleteHistory(id: string): Promise<void> {
    return this.repository.deleteHistory(id);
  }

  getAnalytics(): Promise<MessagingAnalytics> {
    return this.repository.getAnalytics();
  }

  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    return this.repository.sendMessage(request);
  }
}
