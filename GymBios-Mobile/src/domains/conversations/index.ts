// Member ↔ staff chat. Not the `messaging` domain (staff bulk SMS / email / WhatsApp).
export * from './domain/types';
export { conversationsApi } from './infrastructure/conversationsApi';
export {
  conversationKeys,
  useUnreadChatCount,
  useStaffInbox,
  useStaffChatMembers,
  useChatSwitch,
  useSetChatSwitch,
} from './hooks/useConversations';
export { ChatScreen } from './presentation/screens/ChatScreen';
export { ChatRouteScreen } from './presentation/screens/ChatRouteScreen';
export { StaffChatsScreen } from './presentation/screens/StaffChatsScreen';
