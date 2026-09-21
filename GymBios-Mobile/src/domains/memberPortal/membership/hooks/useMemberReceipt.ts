import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';

export const MEMBER_RECEIPT_QUERY_KEY = (receiptId: number) => ['member-receipt', receiptId];

export function useMemberReceipt(receiptId: number | null) {
  return useQuery({
    queryKey: MEMBER_RECEIPT_QUERY_KEY(receiptId as number),
    queryFn: () => membershipApi.getMemberReceipt(receiptId as number),
    enabled: receiptId !== null,
  });
}
