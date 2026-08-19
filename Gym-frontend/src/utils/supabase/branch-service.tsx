import api from '../../api/axiosConfig';

export interface BranchDTO {
  id: number;
  branch_name: string;
  branch_code: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
  is_default?: boolean;
  created_at?: string;
}

export interface BranchRequestDTO {
  branch_name: string;
  branch_code: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
  isDefault?: boolean;
}

export interface BranchStaffAssignmentDTO {
  staffId: number;
  staffName: string;
  role: string;
  assignedAt: string;
}

export const branchApi = {
  getAllBranches: async () => {
    const res = await api.get<BranchDTO[]>('/branches');
    return res.data;
  },

  getMyBranches: async () => {
    const res = await api.get<BranchDTO[]>('/branches/my-branches');
    return res.data;
  },

  createBranch: async (data: BranchRequestDTO) => {
    const res = await api.post<BranchDTO>('/branches', data);
    return res.data;
  },

  updateBranch: async (id: number, data: BranchRequestDTO) => {
    const res = await api.put<BranchDTO>(`/branches/${id}`, data);
    return res.data;
  },

  updateBranchStatus: async (id: number, status: string) => {
    const res = await api.patch<BranchDTO>(`/branches/${id}/status`, { status });
    return res.data;
  },

  getStaffForBranch: async (id: number) => {
    const res = await api.get<BranchStaffAssignmentDTO[]>(`/branches/${id}/staff`);
    return res.data;
  },

  getTrainersForBranch: async (id: number) => {
    const res = await api.get<BranchStaffAssignmentDTO[]>(`/branches/${id}/trainers`);
    return res.data;
  },

  assignStaffToBranch: async (branchId: number, staffId: number) => {
    await api.post(`/branches/${branchId}/staff/${staffId}`);
  },

  removeStaffFromBranch: async (branchId: number, staffId: number) => {
    await api.delete(`/branches/${branchId}/staff/${staffId}`);
  }
};
