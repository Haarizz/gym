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

  // App Access
  userId?: number;
  appUsername?: string;
  appAccessEnabled: boolean;

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