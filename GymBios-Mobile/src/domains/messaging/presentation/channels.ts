import type Feather from '@expo/vector-icons/Feather';
import { MessagingColors } from './theme';

/**
 * The message channels the backend can deliver (MessagingService.sendToProvider).
 * `in-app` is shown as "Push": it's delivered as an in-app notification to the
 * recipient's linked app account.
 */
export interface MessagingChannel {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  tint: string;
}

export const MESSAGING_CHANNELS: MessagingChannel[] = [
  { id: 'email', label: 'Email', icon: 'mail', color: MessagingColors.dark, tint: MessagingColors.tint },
  { id: 'sms', label: 'SMS', icon: 'message-circle', color: MessagingColors.sms, tint: MessagingColors.smsTint },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'phone', color: '#1F9D55', tint: '#E3F6EA' },
  { id: 'in-app', label: 'Push', icon: 'bell', color: MessagingColors.push, tint: MessagingColors.pushTint },
];

export function getChannel(type: string): MessagingChannel {
  return (
    MESSAGING_CHANNELS.find((c) => c.id === type) ?? {
      id: type,
      label: type,
      icon: 'message-square',
      color: MessagingColors.muted,
      tint: MessagingColors.line,
    }
  );
}
