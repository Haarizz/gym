import type { Facility, FacilityRequest, FacilityFilters } from '../domain/Facility';

export interface FacilityRepository {
  getFacilities(filters?: FacilityFilters): Promise<Facility[]>;
  createFacility(request: FacilityRequest): Promise<Facility>;
  updateFacility(id: number, request: FacilityRequest): Promise<Facility>;
  deleteFacility(id: number): Promise<void>;
  toggleStatus(id: number): Promise<Facility>;
}
