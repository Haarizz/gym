import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';

import { useAuthStore } from '@/domains/auth/store/authStore';
import { getMyGymMemberships } from '@/domains/gymSwitcher/gymMembershipsApi';
import { switchGym } from '@/domains/gymSwitcher/switchGym';
import { resolveNotificationPath } from '../domain/notificationRoutes';
// Leaf import (not the module index) so this stays free of screen imports.
import { GYM_REVIEW_REQUEST_PUSH_TYPE, openGymRatingSheet } from '@/domains/memberPortal/gymRating/gymRating';

/**
 * A notification from one of the member's other gyms opens in that gym: switch to it
 * first (the backend names the sending gym in `tenantSlug`). Only to a gym the member
 * belongs to — anything else is left on the current gym.
 */
async function switchToSendingGym(tenantSlug: unknown): Promise<void> {
  if (typeof tenantSlug !== 'string' || !tenantSlug) return;
  const { appRole, activeTenant } = useAuthStore.getState();
  if (appRole !== 'member' || tenantSlug === activeTenant) return;
  const gym = (await getMyGymMemberships()).find((g) => g.tenantSlug === tenantSlug);
  if (gym) {
    await switchGym(gym, { goHome: false });
  }
}

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

    switchToSendingGym(data?.tenantSlug)
      .catch((e) => console.error('Failed to switch to the notification\'s gym', e))
      .finally(() => {
        // "Rate us" from the gym opens the gym rate sheet wherever the member is.
        if (data?.type === GYM_REVIEW_REQUEST_PUSH_TYPE) {
          openGymRatingSheet();
          return;
        }
        const path = resolveNotificationPath(data, useAuthStore.getState().appRole);
        if (path) router.push(path as Href);
      });
  }, [response, router]);
}
