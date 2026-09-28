export const promotionKeys = {
  all: ['promotions'] as const,
  lists: () => [...promotionKeys.all, 'list'] as const,
  list: (status?: string) => [...promotionKeys.lists(), status] as const,
  details: () => [...promotionKeys.all, 'detail'] as const,
  detail: (id: number) => [...promotionKeys.details(), id] as const,
  impact: () => [...promotionKeys.all, 'impact'] as const,
  eligibilityMembers: () => [...promotionKeys.all, 'eligibilityMembers'] as const,
};
