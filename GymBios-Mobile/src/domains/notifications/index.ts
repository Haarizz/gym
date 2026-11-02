import { queryClient } from '@/core/providers/QueryProvider';
import { useAuthStore } from '@/domains/auth/store/authStore';
import { gymMembershipKeys, type GymMembership } from '@/domains/gymSwitcher/gymMembershipsApi';

import { pushNotificationsService, staffPushNotificationsService } from './hooks/pushNotificationsService';

export { MemberPushNotifications } from './presentation/MemberPushNotifications';
export { StaffPushNotifications } from './presentation/StaffPushNotifications';
export { resolveNotificationPath } from './domain/notificationRoutes';

/**
 * Best-effort; call before signing out so the device stops receiving this user's
 * pushes — for a member, from every gym it was registered with, not just the one on screen.
 */
export const unregisterPushNotifications = () => {
  const { activeTenant, user, appRole } = useAuthStore.getState();
  if (appRole === 'staff' || appRole === 'trainer') {
    return staffPushNotificationsService.unregisterCurrentDevice(activeTenant ? [activeTenant] : []);
  }
  const gyms = queryClient.getQueryData<GymMembership[]>(gymMembershipKeys.mine(user?.id)) ?? [];
  const tenants = new Set(gyms.map((g) => g.tenantSlug));
  if (activeTenant) tenants.add(activeTenant);
  return pushNotificationsService.unregisterCurrentDevice([...tenants]);
};
