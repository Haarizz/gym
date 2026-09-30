import { configureForegroundNotifications } from '../infrastructure/notificationPresentation';
import { useNotificationDeepLinks } from '../hooks/useNotificationDeepLinks';
import { usePushTokenRegistration } from '../hooks/usePushTokenRegistration';

configureForegroundNotifications();

/** Mounted once in the member area: registers the device and routes notification taps. */
export function MemberPushNotifications() {
  usePushTokenRegistration();
  useNotificationDeepLinks();
  return null;
}
