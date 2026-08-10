export interface Facility {
  id: string;
  facilityId?: string;
  name?: string;
  occupancyLimit?: number;
  status?: string;
  description?: string;
  iconName?: string;
  rates?: Record<string, number>;
  bookingsThisMonth?: number;
}

export interface FacilityRequest {
  name: string;
  occupancyLimit?: number;
  status?: string;
  description?: string;
  iconName?: string;
  rates?: Record<string, number>;
}

export interface FacilityFilters {
  search?: string;
  status?: string;
}
