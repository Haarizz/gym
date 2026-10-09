import { configureForegroundNotifications } from '../infrastructure/notificationPresentation';
import { useNotificationDeepLinks } from '../hooks/useNotificationDeepLinks';
import { useForegroundNotificationRefresh } from '../hooks/useForegroundNotificationRefresh';
import { usePushTokenRegistration } from '../hooks/usePushTokenRegistration';

configureForegroundNotifications();

/** Mounted once in the member area: registers the device, routes notification taps and refreshes on foreground pushes. */
export function MemberPushNotifications() {
  usePushTokenRegistration();
  useNotificationDeepLinks();
  useForegroundNotificationRefresh();
  return null;
}
