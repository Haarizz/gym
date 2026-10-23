import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/core/network/apiClient';
import { useAuthStore } from '@/domains/auth/store/authStore';

/**
 * The signed-in person's own GymBios account (backend MobileAccountController) and
 * forgotten-password reset (MobilePasswordResetController). None of it depends on the
 * gym selected in the app — see docs/global-accounts-for-gym-created-members-plan.md §1–2.
 */

export interface MyAccount {
  username: string;
  email: string | null;
  emailVerified: boolean;
}

export interface CodeSent {
  maskedEmail: string;
  emailed: boolean;
  /** Only in dev mode when no email could be sent. */
  devCode: string | null;
}

export interface LinkRequest {
  id: number;
  tenantSlug: string;
  gymName: string | null;
  memberName: string | null;
  requestedAt: string | null;
  expiresAt: string | null;
}

const toAccount = (d: any): MyAccount => ({
  username: d?.username,
  email: d?.email ?? null,
  emailVerified: !!d?.email_verified,
});

const toCodeSent = (d: any): CodeSent => ({
  maskedEmail: d?.masked_email,
  emailed: !!d?.emailed,
  devCode: d?.dev_code ?? null,
});

const toLinkRequest = (d: any): LinkRequest => ({
  id: d.id,
  tenantSlug: d.tenant_slug,
  gymName: d.gym_name ?? null,
  memberName: d.member_name ?? null,
  requestedAt: d.requested_at ?? null,
  expiresAt: d.expires_at ?? null,
});

export const accountKeys = {
  me: ['account', 'me'] as const,
  linkRequests: ['account', 'link-requests'] as const,
};

export function useMyAccount(enabled = true) {
  return useQuery({
    queryKey: accountKeys.me,
    queryFn: async () => toAccount((await apiClient.get('/mobile/account', { skipGlobalErrorToast: true })).data),
    enabled,
    retry: false,
  });
}

/** Members only — gyms asking to link a membership to this account. */
export function useLinkRequests(enabled = true) {
  const isMember = useAuthStore((s) => s.appRole === 'member');
  return useQuery({
    queryKey: accountKeys.linkRequests,
    queryFn: async () => {
      const res = await apiClient.get<any[]>('/mobile/account/link-requests', { skipGlobalErrorToast: true });
      return (res.data ?? []).map(toLinkRequest);
    },
    enabled: enabled && isMember,
    retry: false,
    staleTime: 1000 * 60,
  });
}

export function useAccountMutations() {
  const queryClient = useQueryClient();
  const refreshAccount = () => queryClient.invalidateQueries({ queryKey: accountKeys.me });

  const changeEmail = useMutation({
    mutationFn: async (email: string) => toCodeSent((await apiClient.put('/mobile/account/email', { email })).data),
    onSuccess: refreshAccount,
  });
  const sendEmailCode = useMutation({
    mutationFn: async () => toCodeSent((await apiClient.post('/mobile/account/email/send-code')).data),
  });
  const verifyEmail = useMutation({
    mutationFn: async (code: string) => toAccount((await apiClient.post('/mobile/account/email/verify', { code })).data),
    onSuccess: (account) => queryClient.setQueryData(accountKeys.me, account),
  });

  const acceptLink = useMutation({
    mutationFn: async (request: LinkRequest) => {
      await apiClient.post(`/mobile/account/link-requests/${request.id}/accept`);
      return request;
    },
    onSuccess: (request) => {
      // The membership now belongs to this account — switch the app to that gym and
      // drop everything cached for the previous one.
      useAuthStore.getState().setActiveTenant(request.tenantSlug);
      queryClient.invalidateQueries();
    },
  });
  const declineLink = useMutation({
    mutationFn: async (request: LinkRequest) => {
      await apiClient.post(`/mobile/account/link-requests/${request.id}/decline`);
      return request;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.linkRequests }),
  });

  return { changeEmail, sendEmailCode, verifyEmail, acceptLink, declineLink };
}

/** Public — always succeeds the same way, whether or not the email has an account. */
export async function requestPasswordReset(email: string): Promise<{ devCode: string | null }> {
  const res = await apiClient.post('/mobile/auth/password-reset/request', { email });
  return { devCode: res.data?.dev_code ?? null };
}

export async function confirmPasswordReset(email: string, code: string, newPassword: string): Promise<void> {
  await apiClient.post('/mobile/auth/password-reset/confirm', { email, code, new_password: newPassword });
}
