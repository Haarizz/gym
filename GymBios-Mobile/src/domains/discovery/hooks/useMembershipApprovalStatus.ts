import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/network/apiClient';
import { useAuthStore } from '@/domains/auth/store/authStore';

/**
 * What this gym's membership lets the member use (backend MemberAccessState). Anything
 * but ACTIVE closes this gym's member features — never the account itself, Community
 * or gym discovery.
 */
export type MemberAccessState = 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL' | 'PAYMENT_REJECTED';

export interface MembershipApprovalStatus {
  // 'PENDING' — Cash/Credit/Mixed purchase awaiting reception approval, app access
  // locked. 'APPROVED' / 'REJECTED' / null — resolved or never required.
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  membershipPlan: string | null;
  gymName: string | null;
  // Staff's reason, set when approvalStatus is 'REJECTED'.
  rejectionReason: string | null;
  // A rejected purchase leaves app access off, so TenantContextFilter keeps 403ing
  // member endpoints exactly as while pending — the app must stay gated.
  isRejectedLocked: boolean;
  accessState: MemberAccessState;
  // Staff's reason, set when accessState is 'SUSPENDED'.
  suspendedReason: string | null;
}

/** True while TenantContextFilter blocks this gym's member endpoints (suspended, pending or rejected purchase). */
export function isMemberAccessLocked(status: MembershipApprovalStatus | undefined): boolean {
  return !!status && status.accessState !== 'ACTIVE';
}

// Older backends don't send access_state; derive it the way they gated access.
function deriveAccessState(data: any): MemberAccessState {
  if (data?.access_state) return data.access_state;
  if (data?.approval_status === 'PENDING') return 'PENDING_APPROVAL';
  if (data?.approval_status === 'REJECTED' && data?.app_access_enabled === false) return 'PAYMENT_REJECTED';
  return 'ACTIVE';
}

/**
 * True once tenant-scoped member endpoints are safe to call: /api/members/me has
 * answered and access isn't locked. Non-members are never gated. Use it as the
 * `enabled` flag of queries mounted outside MemberApprovalGate (profile hub,
 * providers), which would otherwise fire straight into TenantContextFilter's 403.
 */
export function useMemberTenantAccess(): boolean {
  const appRole = useAuthStore((s) => s.appRole);
  const isMember = appRole === 'member';
  const approval = useMembershipApprovalStatus({ enabled: isMember });
  return !isMember || (!approval.isLoading && !isMemberAccessLocked(approval.data));
}

/**
 * Checks GET /api/members/me for the active tenant's member access state: a staff
 * suspension, or a Cash/Credit/Mixed purchase awaiting (or refused) approval (see
 * MobileDiscoveryController.purchaseMembership on the backend). While locked,
 * TenantContextFilter 403s every other member-facing endpoint of this gym, but
 * deliberately leaves /api/members/me reachable so the app can keep polling this
 * exact status.
 */
export function useMembershipApprovalStatus(
  options: { enabled?: boolean; pollWhilePendingMs?: number } = {},
) {
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
        // gym_name, not name — name is the member's own name.
        gymName: data?.gym_name ?? null,
        rejectionReason: data?.rejection_reason ?? null,
        isRejectedLocked: data?.approval_status === 'REJECTED' && data?.app_access_enabled === false,
        accessState: deriveAccessState(data),
        suspendedReason: data?.suspended_reason ?? null,
      };
    },
    enabled: !!activeTenant && (options.enabled ?? true),
    retry: false,
    staleTime: 1000 * 30,
    refetchInterval: (query) =>
      options.pollWhilePendingMs && query.state.data?.approvalStatus === 'PENDING'
        ? options.pollWhilePendingMs
        : false,
  });
}
