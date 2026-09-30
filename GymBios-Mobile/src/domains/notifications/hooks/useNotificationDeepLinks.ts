import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';

import { resolveNotificationPath } from '../domain/notificationRoutes';

/**
 * Opens the screen a tapped notification points to — including the tap that
 * launched the app. The response is cleared once handled so it isn't replayed
 * the next time this mounts (e.g. after switching accounts).
 */
export function useNotificationDeepLinks() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const path = resolveNotificationPath(response.notification.request.content.data);
    Notifications.clearLastNotificationResponse();
    if (path) router.push(path as Href);
  }, [response, router]);
}
