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
  /** Regular price. */
  price: number;
  /** Legacy percent field — not used for pricing any more; see the offer fields. */
  discount: number;

  // Offer: a manual discount every member gets, optionally between two dates.
  offerType: 'percentage' | 'fixed' | null;
  offerValue: number | null;
  offerLabel: string | null;
  offerStartDate: string | null; // yyyy-MM-dd
  offerEndDate: string | null;   // yyyy-MM-dd
  /** Server-computed for today. */
  offerActive: boolean;
  offerDiscountAmount: number;
  effectivePrice: number;

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