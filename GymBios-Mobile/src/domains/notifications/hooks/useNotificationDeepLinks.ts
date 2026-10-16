import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';

import { resolveNotificationPath } from '../domain/notificationRoutes';
// Leaf import (not the module index) so this stays free of screen imports.
import { GYM_REVIEW_REQUEST_PUSH_TYPE, openGymRatingSheet } from '@/domains/memberPortal/gymRating/gymRating';

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
    const data = response.notification.request.content.data;
    Notifications.clearLastNotificationResponse();
    // "Rate us" from the gym opens the gym rate sheet wherever the member is.
    if (data?.type === GYM_REVIEW_REQUEST_PUSH_TYPE) {
      openGymRatingSheet();
      return;
    }
    const path = resolveNotificationPath(data);
    if (path) router.push(path as Href);
  }, [response, router]);
}
