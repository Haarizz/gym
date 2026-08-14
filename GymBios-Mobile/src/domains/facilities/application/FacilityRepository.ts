import type { Facility, FacilityRequest, FacilityFilters } from '../domain/Facility';
import type { Booking, BookingFilters } from '../domain/Booking';

export interface FacilityRepository {
  getFacilities(filters?: FacilityFilters): Promise<Facility[]>;
  createFacility(request: FacilityRequest): Promise<Facility>;
  updateFacility(id: number, request: FacilityRequest): Promise<Facility>;
  deleteFacility(id: number): Promise<void>;
  toggleStatus(id: number): Promise<Facility>;
  getBookings(filters?: BookingFilters): Promise<Booking[]>;
}

