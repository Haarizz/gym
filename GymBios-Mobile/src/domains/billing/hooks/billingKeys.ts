/**
 * Centralized TanStack Query keys for the Billing domain.
 * Follows the project's query key conventions.
 *
 * Key functions accept `number | undefined` so that screens can pass
 * the raw selected-member ID (which is `undefined` until a member is
 * selected) without resorting to fake IDs like 0.  When the ID is
 * `undefined` the corresponding query is disabled via the `enabled`
 * option in the hook, so no API request is ever made with an invalid ID.
 */
export const billingKeys = {
  all: ['billing'] as const,

  stats: ['billing', 'stats'] as const,

  receipts: ['billing', 'receipts'] as const,
  receipt: (id: number | undefined) => [...billingKeys.receipts, id] as const,

  dues: ['billing', 'dues'] as const,

  statement: (memberId: number | undefined) =>
    ['billing', 'statement', memberId] as const,

  pendingBills: (memberId: number | undefined) =>
    ['billing', 'pendingBills', memberId] as const,
};
