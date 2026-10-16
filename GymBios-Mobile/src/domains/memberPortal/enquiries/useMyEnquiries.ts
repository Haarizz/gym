import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enquiriesApi, type CreateEnquiryRequest, type MemberEnquiry } from './enquiriesApi';

export const enquiryKeys = {
  mine: ['memberEnquiries'] as const,
};

/** The member's enquiries; refetched on open so a fresh reply shows straight away. */
export function useMyEnquiries(enabled = true) {
  return useQuery({
    queryKey: enquiryKeys.mine,
    queryFn: enquiriesApi.list,
    enabled,
    staleTime: 0,
  });
}

export function useCreateEnquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateEnquiryRequest) => enquiriesApi.create(request),
    onSuccess: (created) => {
      queryClient.setQueryData<MemberEnquiry[]>(enquiryKeys.mine, (old) => [created, ...(old ?? [])]);
      queryClient.invalidateQueries({ queryKey: enquiryKeys.mine });
    },
  });
}
