import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/network/apiClient';
import { useAuthStore } from '@/domains/auth/store/authStore';

export interface MembershipApprovalStatus {
  // 'PENDING' — Cash/Credit/Mixed purchase awaiting reception approval, app access
  // locked. 'APPROVED' / 'REJECTED' / null — resolved or never required.
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  membershipPlan: string | null;
  gymName: string | null;
}

/**
 * Checks GET /api/members/me for the active tenant's Cash/Credit/Mixed purchase
 * approval gate (see MobileDiscoveryController.purchaseMembership on the backend).
 * While PENDING, TenantContextFilter 403s every other member-facing mobile
 * endpoint, but deliberately leaves /api/members/me reachable so the app can keep
 * polling this exact status (see TenantContextFilter's isOwnStatusCheckPath).
 */
export function useMembershipApprovalStatus() {
  const activeTenant = useAuthStore((s) => s.activeTenant);

  return useQuery<MembershipApprovalStatus>({
    queryKey: ['membership-approval-status', activeTenant],
    queryFn: async () => {
      const response = await apiClient.get<any>('/members/me', {
        skipGlobalErrorToast: true,
      });
      const data = response.data;
      return {
        approvalStatus: data?.approval_status ?? null,
        membershipPlan: data?.membership_plan ?? null,
        gymName: data?.name ?? null,
      };
    },
    enabled: !!activeTenant,
    retry: false,
    staleTime: 1000 * 30,
  });
}
