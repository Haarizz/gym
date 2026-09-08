export interface CenterSummary {
  tenantSlug: string;
  branchId: number;
  centerName: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  centerType: string | null;
  startingPrice: number | null;
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

export interface StaffResponse {
  id: string;
  staffId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  branch: string | null;
  monthlyTarget: number | null;
  baseSalary: number | null;
  status: string;
  joinDate: string | null;
  address: string | null;
  photoUrl: string | null;
  certifications: any[];
  schedule: Record<string, string[]>;
  createdAt: string | null;
  updatedAt: string | null;
  userId: number | null;
  appUsername: string | null;
  appAccessEnabled: boolean | null;
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
  amenities: FacilityResponse[];
  trainers: StaffResponse[];
}

export interface CenterPlan {
  id: number;
  name: string;
  type: string;
  planType: string;
  durationType: string;
  durationValue: string;
  duration: string;
  price: number;
  discount: number;
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
