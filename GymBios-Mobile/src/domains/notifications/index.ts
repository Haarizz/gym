import { queryClient } from '@/core/providers/QueryProvider';
import { useAuthStore } from '@/domains/auth/store/authStore';
import { gymMembershipKeys, type GymMembership } from '@/domains/gymSwitcher/gymMembershipsApi';

import { pushNotificationsService } from './hooks/pushNotificationsService';

export { MemberPushNotifications } from './presentation/MemberPushNotifications';
export { resolveNotificationPath } from './domain/notificationRoutes';

/**
 * Best-effort; call before signing out so the device stops receiving this member's
 * pushes — from every gym it was registered with, not just the one on screen.
 */
export const unregisterPushNotifications = () => {
  const { activeTenant, user } = useAuthStore.getState();
  const gyms = queryClient.getQueryData<GymMembership[]>(gymMembershipKeys.mine(user?.id)) ?? [];
  const tenants = new Set(gyms.map((g) => g.tenantSlug));
  if (activeTenant) tenants.add(activeTenant);
  return pushNotificationsService.unregisterCurrentDevice([...tenants]);
};
