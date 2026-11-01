import { useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/domains/auth/store/authStore';
import { useMyGymMemberships } from '@/domains/gymSwitcher/gymMembershipsApi';
import { pushNotificationsService } from './pushNotificationsService';

/**
 * Registers this device for the signed-in member's push notifications at every gym
 * they belong to — each gym keeps its own member records and device tokens, and a
 * member using the app at one gym should still hear from the others. Runs again when
 * they switch gym or join another.
 */
export function usePushTokenRegistration() {
  const activeTenant = useAuthStore((s) => s.activeTenant);
  const { data: gyms } = useMyGymMemberships();

  const tenants = useMemo(() => {
    const all = new Set<string>(gyms?.map((g) => g.tenantSlug) ?? []);
    if (activeTenant) all.add(activeTenant);
    return [...all].sort();
  }, [gyms, activeTenant]);
  const tenantsKey = tenants.join(',');

  const { mutate } = useMutation({
    mutationFn: (slugs: string[]) => pushNotificationsService.registerCurrentDevice(slugs),
  });

  useEffect(() => {
    if (tenantsKey) mutate(tenantsKey.split(','));
  }, [tenantsKey, mutate]);
}
