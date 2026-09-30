import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/domains/auth/store/authStore';
import { pushNotificationsService } from './pushNotificationsService';

/**
 * Registers this device for the signed-in member's push notifications — again
 * whenever they switch gym, since each gym keeps its own member records.
 */
export function usePushTokenRegistration() {
  const activeTenant = useAuthStore((s) => s.activeTenant);
  const { mutate } = useMutation({
    mutationFn: () => pushNotificationsService.registerCurrentDevice(),
  });

  useEffect(() => {
    if (activeTenant) mutate();
  }, [activeTenant, mutate]);
}
