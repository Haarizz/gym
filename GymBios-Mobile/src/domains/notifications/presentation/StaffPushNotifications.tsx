import { configureForegroundNotifications } from '../infrastructure/notificationPresentation';
import { useNotificationDeepLinks } from '../hooks/useNotificationDeepLinks';
import { useForegroundNotificationRefresh } from '../hooks/useForegroundNotificationRefresh';
import { useStaffPushTokenRegistration } from '../hooks/useStaffPushTokenRegistration';

configureForegroundNotifications();

/** Mounted once in the staff and trainer areas: registers the device and opens chats from tapped pushes. */
export function StaffPushNotifications() {
  useStaffPushTokenRegistration();
  useNotificationDeepLinks();
  useForegroundNotificationRefresh();
  return null;
}
