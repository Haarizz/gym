export interface Member {
  id: number;
  memberId: string;

  // Personal Information
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  photoUrl?: string;
  address?: string;
  branchId?: number;

  // Membership
  membershipType: string;
  membershipPlanId?: number;
  membershipPlanName?: string;
  membershipPlanPrice?: number;
  status: string;
  startDate: string;
  endDate?: string;
  /** members.expiry_date — the backend checks this before endDate when gating check-in. */
  expiryDate?: string;
  paymentStatus: string;

  // Freeze
  isFrozen: boolean;
  freezeStartDate?: string;
  freezeEndDate?: string;
  freezeDaysUsed?: number;

  // Family
  familyHeadId?: number;
  familyHeadName?: string;
  familyBillingMode?: string;
  familyRole?: string;
  isMinor?: boolean;
  /** Billed into the family head's receipt (minors, and adults under family_head billing). */
  billedToHead?: boolean;

  // App Access
  userId?: number;
  /** Set when the member signed up through the app with a GymBios account (no local login). */
  globalUserId?: number;
  appUsername?: string;
  /** Only an explicit false blocks the app — the backend treats null as allowed. */
  appAccessEnabled?: boolean;

  // Medical
  bloodGroup?: string;
  height?: string;
  weight?: string;
  medicalConditions?: string;
  chronicIllnesses?: string;
  allergies?: string;
  currentMedications?: string;
  healthNotes?: string;

  // Audit
  createdAt?: string;
  updatedAt?: string;
}

export interface MemberPage {
  content: Member[];
  page: number;
  limit: number;
  totalElements: number;
  totalPages: number;
}