import type { DropdownOption } from '@/shared/components/Dropdown/Dropdown.types';

export interface MembershipTypeOption {
  value: string;
  label: string;
  icon: 'user' | 'users' | 'heart' | 'briefcase';
}

export const MEMBERSHIP_TYPES: MembershipTypeOption[] = [
  { value: 'INDIVIDUAL', label: 'Individual', icon: 'user' },
  { value: 'FAMILY',     label: 'Family',     icon: 'users' },
  { value: 'COUPLE',     label: 'Couple',     icon: 'heart' },
  { value: 'CORPORATE',  label: 'Corporate',  icon: 'briefcase' },
];

export const MEMBER_STATUSES: DropdownOption[] = [
  { label: 'Active',    value: 'ACTIVE'    },
  { label: 'Inactive',  value: 'INACTIVE'  },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Expired',   value: 'EXPIRED'   },
];

export const PAYMENT_STATUSES: DropdownOption[] = [
  { label: 'Paid',    value: 'PAID'    },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Overdue', value: 'OVERDUE' },
];

export const PAYMENT_METHODS: DropdownOption[] = [
  { label: 'Cash',          value: 'CASH'         },
  { label: 'Card',          value: 'CARD'         },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
];

export const BLOOD_GROUPS: DropdownOption[] = [
  { label: 'A+',  value: 'A+'  },
  { label: 'A-',  value: 'A-'  },
  { label: 'B+',  value: 'B+'  },
  { label: 'B-',  value: 'B-'  },
  { label: 'O+',  value: 'O+'  },
  { label: 'O-',  value: 'O-'  },
  { label: 'AB+', value: 'AB+' },
  { label: 'AB-', value: 'AB-' },
];

export const BLOOD_TYPES = BLOOD_GROUPS;

export const GENDERS: DropdownOption[] = [
  { label: 'Male',   value: 'MALE'   },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other',  value: 'OTHER'  },
];

export const RELATIONSHIPS: DropdownOption[] = [
  { label: 'Spouse',  value: 'SPOUSE'  },
  { label: 'Child',   value: 'CHILD'   },
  { label: 'Parent',  value: 'PARENT'  },
  { label: 'Sibling', value: 'SIBLING' },
  { label: 'Other',   value: 'OTHER'   },
];