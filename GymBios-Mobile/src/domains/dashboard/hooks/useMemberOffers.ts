import { useQuery } from '@tanstack/react-query';
import type { MemberOffer } from '../domain/MemberDashboardData';
import { memberDashboardRepository } from '../infrastructure/ApiMemberDashboardRepository';
import { dashboardKeys } from './useStaffDashboard';
import { useBranchContext } from '@/shared/providers/BranchProvider';
import { useAuthStore } from '@/domains/auth/store/authStore';

/** Every offer the member can use, best first — the All Offers screen. */
export function useMemberOffers() {
  const { selectedBranchId } = useBranchContext();
  const activeTenant = useAuthStore((s) => s.activeTenant);

  return useQuery<MemberOffer[]>({
    // Same scoping as the dashboard: another gym's offers must not be reused
    queryKey: [...dashboardKeys.all, 'member', 'offers', activeTenant, selectedBranchId],
    queryFn: () => memberDashboardRepository.getOffers(),
    retry: 1,
    staleTime: 1000 * 60 * 2,
  });
}
