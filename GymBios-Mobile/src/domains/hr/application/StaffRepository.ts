import type { Staff, StaffPage } from '../domain/Staff';
import type { StaffTarget, StaffTargetFilters } from '../domain/StaffTarget';

export interface StaffFilters {
  search?: string;
  role?: string;
  department?: string;
  status?: string;
  branch?: string;
  page?: number;
  limit?: number;
}

export interface CreateStaffRequest {
  name: string;
  email: string;
  phone: string;

  role: string;
  department: string;
  branch: string;

  monthlyTarget: number;
  baseSalary: number;

  status: string;
  joinDate: string;

  address: string;
  photoUrl?: string;

  certifications: Staff['certifications'];
  schedule: Staff['schedule'];

  appUsername?: string;
  appPassword?: string;
}

export interface UpdateStaffRequest extends CreateStaffRequest { }

export interface StaffRepository {
  getStaff(filters?: StaffFilters): Promise<StaffPage>;

  getStaffById(id: string): Promise<Staff>;

  createStaff(request: CreateStaffRequest): Promise<Staff>;

  updateStaff(
    id: string,
    request: UpdateStaffRequest,
  ): Promise<Staff>;

  deleteStaff(id: string): Promise<void>;

  getTargets(filters?: StaffTargetFilters): Promise<StaffTarget[]>;
}