import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@/shared/components/Toasts/toastStore';
import { useAuthStore } from '@/domains/auth/store/authStore';

import type { GymMembership } from './gymMembershipsApi';
import { switchGym } from './switchGym';

/** Switches gym from a list, tracking the one in progress so its row can show a spinner. */
export function useGymSwitch({ goHome = true, announce = true }: { goHome?: boolean; announce?: boolean } = {}) {
  const { t } = useTranslation();
  const activeTenant = useAuthStore((s) => s.activeTenant);
  const [pendingTenant, setPendingTenant] = useState<string | null>(null);

  const select = useCallback(
    async (gym: GymMembership) => {
      if (gym.tenantSlug === activeTenant) return;
      setPendingTenant(gym.tenantSlug);
      try {
        await switchGym(gym, { goHome });
        if (announce) toast.success(t('gymSwitcher.switched', { gym: gym.gymName }));
      } finally {
        setPendingTenant(null);
      }
    },
    [activeTenant, goHome, announce, t],
  );

  return { activeTenant, pendingTenant, select };
}
