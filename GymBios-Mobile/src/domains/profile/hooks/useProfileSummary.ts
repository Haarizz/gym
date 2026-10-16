import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/domains/auth';
import { useMemberTenantAccess } from '@/domains/discovery/hooks/useMembershipApprovalStatus';
import type { SummaryRole } from '../domain';
import { profileKeys } from './profileKeys';
import { profileService } from './useProfile';

export function useProfileSummary() {
  const appRole = useAuthStore((s) => s.appRole);
  // Admins have no personal stats to show, so the summary row is hidden for them.
  const role: SummaryRole | null =
    appRole === 'staff' || appRole === 'trainer' || appRole === 'member' ? appRole : null;
  const hasTenantAccess = useMemberTenantAccess();

  const query = useQuery({
    queryKey: [...profileKeys.summary(), role],
    queryFn: () => profileService.getSummary(role as SummaryRole),
    // The member summary reads /mobile/member/dashboard, 403'd while a purchase awaits approval.
    enabled: role !== null && hasTenantAccess,
    staleTime: 1000 * 60 * 5,
  });

  return {
    summary: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
