import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';

export const memberAddOnKeys = {
  all: ['member-add-ons'] as const,
  catalog: (page: number, limit: number) => [...memberAddOnKeys.all, 'catalog', page, limit] as const,
};

interface UseMemberAddOnsOptions {
  page?: number;
  limit?: number;
}

export function useMemberAddOns({ page = 1, limit = 10 }: UseMemberAddOnsOptions = {}) {
  return useQuery({
    queryKey: memberAddOnKeys.catalog(page, limit),
    queryFn: () => membershipApi.getMemberAddOns(page, limit),
    placeholderData: (previousData) => previousData, // keep previous data while fetching new page
  });
}
