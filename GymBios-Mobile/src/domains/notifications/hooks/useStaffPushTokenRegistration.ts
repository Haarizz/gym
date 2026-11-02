import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/domains/auth/store/authStore';
import { staffPushNotificationsService } from './pushNotificationsService';

/**
 * Registers this device for the signed-in staff member's or trainer's pushes (chat
 * messages from members). Staff work at one gym, so only the gym the app is in.
 */
export function useStaffPushTokenRegistration() {
  const activeTenant = useAuthStore((s) => s.activeTenant);
  const userId = useAuthStore((s) => s.user?.id);

  const { mutate } = useMutation({
    mutationFn: (tenant: string | null) => staffPushNotificationsService.registerCurrentDevice([tenant]),
  });

  useEffect(() => {
    if (userId) mutate(activeTenant ?? null);
  }, [userId, activeTenant, mutate]);
}
