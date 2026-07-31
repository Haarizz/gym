import type { MembershipPlan } from '../domain/MembershipPlan';

export interface MembershipPlanRequest {
  name: string;
  type: string;
  planType: string;
  durationType: string;
  durationValue: string;
  price: number;
  discount: number;
  status: string;
  description: string;

  maxSessions?: number;
  assignableTrainers: string[];

  familyBillingMode?: string;
  pricePerMember?: number;
  maxFamilyMembers?: number;
  maxAdultMembers?: number;
  maxChildMembers?: number;
  allowAdditionalMembers?: boolean;
  additionalMemberPrice?: number;
  autoCalculateTotal?: boolean;

  membershipCapacity?: string;
  maxCapacity?: number;
  attendanceLimit?: string;
  attendanceValue?: number;
  attendancePeriod?: string;

  maxFreezeDays?: number;
  maxFreezeOccurrences?: number;
  chargePerExtraDay?: number;
  freeDaysAllowed?: number;
  autoUnfreeze?: boolean;

  trainingStreams: number[];
  selectedFacilities: string[];
  selectedPromotions: number[];
  selectedCampaigns: number[];
}

export interface MembershipPlanRepository {
  getPlans(status?: string): Promise<MembershipPlan[]>;

  getPlanById(id: number): Promise<MembershipPlan>;

  createPlan(request: MembershipPlanRequest): Promise<MembershipPlan>;

  updatePlan(
    id: number,
    request: MembershipPlanRequest,
  ): Promise<MembershipPlan>;

  deletePlan(id: number): Promise<void>;

  duplicatePlan(id: number): Promise<MembershipPlan>;
}