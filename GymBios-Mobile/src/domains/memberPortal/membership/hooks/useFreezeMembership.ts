import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import { memberMembershipKeys } from './useMemberMembership';
import { Alert } from 'react-native';

interface FreezeMembershipParams {
  durationDays: number;
  reason: string;
}

export function useFreezeMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: FreezeMembershipParams) =>
      membershipApi.freezeMembership(params.durationDays, params.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberMembershipKeys.all });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to freeze membership.';
      Alert.alert('Freeze Failed', message);
    },
  });
}
