import type { PaymentSplit } from '@/shared/payment';
import type { Member, MemberPage } from '../../domain/Member';

export interface MemberFilters {
  search?: string;
  status?: string;
  membershipType?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
}

export interface CreateMemberRequest {
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  photoUrl?: string;
  address?: string;
  branchId?: number;

  membershipType: string;
  membershipPlanId?: number;
  status: string;
  startDate: string;
  paymentStatus: string;

  paymentMethodUsed?: string;
  paymentBreakdown?: PaymentSplit[];
  discountApplied?: number;
  outstandingBalance?: number;
  bankAccountCode?: string;
  bankAccountName?: string;

  // Medical
  bloodGroup?: string;
  height?: string;
  weight?: string;
  medicalConditions?: string;
  chronicIllnesses?: string;
  allergies?: string;
  currentMedications?: string;
  healthNotes?: string;

  // App Access
  appAccessEnabled?: boolean;
  appUsername?: string;
  appPassword?: string;

  // Family
  isFamilyHead?: boolean;
  relationshipToHead?: string;
  familyMembers?: Array<{
    name: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    relationship: string;
  }>;
}

export interface UpdateMemberRequest {
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  photoUrl?: string;
  address?: string;
  branchId?: number;

  membershipType: string;
  membershipPlanId?: number;
  status: string;
  startDate: string;
  endDate?: string;
  paymentStatus: string;

  // Medical
  bloodGroup?: string;
  height?: string;
  weight?: string;
  medicalConditions?: string;
  chronicIllnesses?: string;
  allergies?: string;
  currentMedications?: string;
  healthNotes?: string;

  // App Access
  appAccessEnabled?: boolean;
  appUsername?: string;
  appPassword?: string;

  // Family
  isFamilyHead?: boolean;
  relationshipToHead?: string;
  familyMembers?: Array<{
    name: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    relationship: string;
  }>;
}

export interface MemberDirectoryRepository {
  getMembers(filters?: MemberFilters): Promise<MemberPage>;

  getMember(id: number): Promise<Member>;

  getCurrentMember(): Promise<Member>;

  getMemberByUser(userId: number): Promise<Member>;

  createMember(request: CreateMemberRequest): Promise<Member>;

  updateMember(id: number, request: UpdateMemberRequest): Promise<Member>;

  deleteMember(id: number): Promise<void>;
}