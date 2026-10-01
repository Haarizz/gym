import type { useRouter } from 'expo-router';

import type { Lead } from '../../domain/Lead';

/**
 * Opens the admin New Member wizard pre-filled from a lead. Saving it links the member to
 * the lead (marking it converted) and credits the sale to the lead's assigned staff.
 */
export function registerLeadAsMember(router: ReturnType<typeof useRouter>, lead: Lead) {
  router.push({
    pathname: '/(admin)/members/create',
    params: {
      leadId: String(lead.id),
      name: `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim(),
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      assignedStaff: lead.assignedStaff ?? '',
    },
  } as any);
}
