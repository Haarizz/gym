export interface CenterSummary {
  tenantSlug: string;
  branchId: number;
  centerName: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  centerType: string | null;
  startingPrice: number | null;
  accessType: string | null;
  coverImageUrl: string | null;
  avgRating: number | null;
  reviewCount: number;
  acceptedPaymentMethods: string[];
}

export interface FacilityResponse {
  id: string;
  facility_id: string;
  name: string;
  occupancy_limit: number | null;
  status: string;
  description: string | null;
  icon_name: string | null;
  rates: Record<string, number> | null;
  bookings_this_month: number;
}

/** A staff member as shown publicly on a center's page. */
export interface CenterTrainer {
  id: number;
  name: string;
  role: string | null;
  department: string | null;
  photoUrl: string | null;
  /** Average of the branch's member ratings; null until someone rates. */
  averageRating: number | null;
  ratingCount: number;
}

export interface CenterDetails {
  tenantSlug: string;
  branchId: number;
  centerName: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  centerType: string | null;
  phone: string | null;
  operatingHours: string | null;
  accessType: string | null;
  about: string | null;
  establishedYear: number | null;
  coverImageUrl: string | null;
  galleryImageUrls: string[];
  acceptedPaymentMethods: string[];
  bnplEnabled: boolean;
  bnplProvider: string | null;
  taxPercentage: number | null;
  taxInclusive: boolean;
  termsAndPolicies: string | null;
  avgRating: number | null;
  reviewCount: number;
  amenities: FacilityResponse[];
  trainers: CenterTrainer[];
}

export interface CenterPlan {
  id: number;
  name: string;
  type: string;
  planType: string;
  durationType: string;
  durationValue: string;
  duration: string;
  /** Regular price. */
  price: number;
  /** Legacy percent field — not used for pricing; see the offer fields. */
  discount: number;
  offerType: 'percentage' | 'fixed' | null;
  offerValue: number | null;
  offerLabel: string | null;
  offerStartDate: string | null;
  offerEndDate: string | null;
  /** Server-computed for today: is the offer running, what it takes off, and the resulting price. */
  offerActive: boolean;
  offerDiscountAmount: number;
  effectivePrice: number;
  status: string;
  description: string;
  maxSessions: number | null;
  assignableTrainers: string[];
  familyBillingMode: string | null;
  pricePerMember: number | null;
  maxFamilyMembers: number | null;
  maxAdultMembers: number | null;
  maxChildMembers: number | null;
  allowAdditionalMembers: boolean | null;
  additionalMemberPrice: number | null;
  autoCalculateTotal: boolean | null;
  membershipCapacity: string | null;
  maxCapacity: number | null;
  attendanceLimit: string | null;
  attendanceValue: number | null;
  attendancePeriod: string | null;
  maxFreezeDays: number | null;
  maxFreezeOccurrences: number | null;
  chargePerExtraDay: number | null;
  freeDaysAllowed: number | null;
  autoUnfreeze: boolean | null;
  trainingStreams: number[];
  selectedFacilities: string[];
  selectedPromotions: number[];
  selectedCampaigns: number[];
  createdAt: string | null;
  updatedAt: string | null;
}
