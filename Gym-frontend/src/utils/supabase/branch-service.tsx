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
  lat?: number;
  lng?: number;
  center_type?: string;
  access_type?: string;
  operating_hours?: string;
  description?: string;
  established_year?: number;
  accepted_payment_methods?: string[];
  bnpl_enabled?: boolean;
  bnpl_provider?: string;
  tax_percentage?: number;
  tax_inclusive?: boolean;
  terms_and_policies?: string;
}

export interface BranchRequestDTO {
  branch_name?: string;
  branch_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: string;
  isDefault?: boolean;
  lat?: number;
  lng?: number;
  center_type?: string;
  access_type?: string;
  operating_hours?: string;
  description?: string;
  established_year?: number;
  accepted_payment_methods?: string[];
  bnpl_enabled?: boolean;
  bnpl_provider?: string;
  tax_percentage?: number;
  tax_inclusive?: boolean;
  terms_and_policies?: string;
}

export interface BranchImageDTO {
  id: number;
  image_url: string;
  is_cover: boolean;
  sort_order: number;
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

  getBranchById: async (id: number) => {
    const res = await api.get<BranchDTO>(`/branches/${id}`);
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
  },

  getBranchImages: async (branchId: number) => {
    const res = await api.get<BranchImageDTO[]>(`/branches/${branchId}/images`);
    return res.data;
  },

  uploadBranchImage: async (branchId: number, file: File, isCover: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isCover', String(isCover));
    const res = await api.post<BranchImageDTO>(`/branches/${branchId}/images`, formData);
    return res.data;
  },

  setBranchImageCover: async (branchId: number, imageId: number) => {
    const res = await api.patch<BranchImageDTO>(`/branches/${branchId}/images/${imageId}/cover`);
    return res.data;
  },

  deleteBranchImage: async (branchId: number, imageId: number) => {
    await api.delete(`/branches/${branchId}/images/${imageId}`);
  }
};
