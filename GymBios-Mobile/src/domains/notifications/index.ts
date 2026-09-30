import { pushNotificationsService } from './hooks/pushNotificationsService';

export { MemberPushNotifications } from './presentation/MemberPushNotifications';
export { resolveNotificationPath } from './domain/notificationRoutes';

/** Best-effort; call before signing out so the device stops receiving this member's pushes. */
export const unregisterPushNotifications = () => pushNotificationsService.unregisterCurrentDevice();
