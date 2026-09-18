import api from '../../api/axiosConfig';

interface DeactivationReasonWire {
  id: number;
  reason: string;
  active: boolean;
  sort_order: number;
}

export interface DeactivationReason {
  id: number;
  reason: string;
  active: boolean;
  sortOrder: number;
}

export interface DeactivationReasonRequestData {
  reason?: string;
  active?: boolean;
  sortOrder?: number;
}

function mapReason(w: DeactivationReasonWire): DeactivationReason {
  return { id: w.id, reason: w.reason, active: w.active, sortOrder: w.sort_order };
}

export const deactivationReasonService = {
  getAll: async (): Promise<DeactivationReason[]> => {
    const res = await api.get<DeactivationReasonWire[]>('/gymos/deactivation-reasons');
    return res.data.map(mapReason);
  },

  create: async (data: DeactivationReasonRequestData): Promise<DeactivationReason> => {
    const res = await api.post<DeactivationReasonWire>('/gymos/deactivation-reasons', data);
    return mapReason(res.data);
  },

  update: async (id: number, data: DeactivationReasonRequestData): Promise<DeactivationReason> => {
    const res = await api.put<DeactivationReasonWire>(`/gymos/deactivation-reasons/${id}`, data);
    return mapReason(res.data);
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/gymos/deactivation-reasons/${id}`);
  },
};
