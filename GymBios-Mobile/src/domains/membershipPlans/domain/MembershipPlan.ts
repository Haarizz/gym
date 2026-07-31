export interface MembershipPlan {
  id: number;

  // Basic Information
  name: string;
  type: string;
  planType: string;
  status: string;
  description: string;

  // Duration
  durationType: string;
  durationValue: string;
  duration: string;

  // Pricing
  price: number;
  discount: number;

  // Sessions
  maxSessions?: number;
  assignableTrainers: string[];

  // Family Plan
  familyBillingMode?: string;
  pricePerMember?: number;
  maxFamilyMembers?: number;
  maxAdultMembers?: number;
  maxChildMembers?: number;
  allowAdditionalMembers?: boolean;
  additionalMemberPrice?: number;
  autoCalculateTotal?: boolean;

  // Capacity
  membershipCapacity?: string;
  maxCapacity?: number;
  attendanceLimit?: string;
  attendanceValue?: number;
  attendancePeriod?: string;

  // Freeze Policy
  maxFreezeDays?: number;
  maxFreezeOccurrences?: number;
  chargePerExtraDay?: number;
  freeDaysAllowed?: number;
  autoUnfreeze?: boolean;

  // Associations
  trainingStreams: number[];
  selectedFacilities: string[];
  selectedPromotions: number[];
  selectedCampaigns: number[];

  // Audit
  createdAt?: string;
  updatedAt?: string;
}