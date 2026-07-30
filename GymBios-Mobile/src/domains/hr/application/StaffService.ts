import type {
  CreateStaffRequest,
  StaffFilters,
  StaffRepository,
  UpdateStaffRequest,
} from './StaffRepository';
import type { Staff, StaffPage } from '../domain/Staff';

export class StaffService {
  constructor(private readonly repository: StaffRepository) {}

  getStaff(filters?: StaffFilters): Promise<StaffPage> {
    return this.repository.getStaff(filters);
  }

  getStaffById(id: string): Promise<Staff> {
    return this.repository.getStaffById(id);
  }

  createStaff(request: CreateStaffRequest): Promise<Staff> {
    return this.repository.createStaff(request);
  }

  updateStaff(
    id: string,
    request: UpdateStaffRequest,
  ): Promise<Staff> {
    return this.repository.updateStaff(id, request);
  }

  deleteStaff(id: string): Promise<void> {
    return this.repository.deleteStaff(id);
  }
}