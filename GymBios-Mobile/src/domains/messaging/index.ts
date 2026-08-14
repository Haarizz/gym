// Domain Models
export type {
  MessagingRecipient,
  MessageTemplate,
  MessageTemplateRequest,
  MessageGroup,
  MessageGroupRequest,
  MessageHistory,
  MessagingAnalytics,
  MessageRecipientSelection,
  SendMessageRequest,
  SendMessageResponse,
} from './domain/MessagingModels';

// Utilities
export {
  getRecipientKey,
  normalizePhone,
  personalizeContent,
} from './domain/utils';

// Application
export type { MessagingRepository } from './application/MessagingRepository';
export { MessagingService } from './application/MessagingService';

// Infrastructure
export { ApiMessagingRepository } from './infrastructure/ApiMessagingRepository';

// Hooks
export { messagingKeys } from './hooks/useMessagingHooks';
export {
  useMessagingRecipients,
  useMessagingTemplates,
  useCreateMessageTemplate,
  useUpdateMessageTemplate,
  useDeleteMessageTemplate,
  useMessagingGroups,
  useCreateMessageGroup,
  useUpdateMessageGroup,
  useDeleteMessageGroup,
  useMessagingHistory,
  useMessagingMemberHistory,
  useDeleteMessageHistory,
  useMessagingAnalytics,
  useSendMessage,
} from './hooks/useMessagingHooks';

// Presentation
export { MessagingHubScreen } from './presentation/screens/MessagingHubScreen';
export { RecipientSelectionScreen } from './presentation/screens/RecipientSelectionScreen';
export { ComposeMessageScreen } from './presentation/screens/ComposeMessageScreen';
export { MessagingHistoryScreen } from './presentation/screens/MessagingHistoryScreen';
export { MessagingTemplatesScreen } from './presentation/screens/MessagingTemplatesScreen';
