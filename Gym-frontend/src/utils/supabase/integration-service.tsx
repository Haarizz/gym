import api from '../../api/axiosConfig';

// GymOS's "API Integration" widget. Backend serializes DTO-bound bodies with
// spring.jackson.property-naming-strategy=SNAKE_CASE (see module-service.tsx's
// note) — IntegrationResponseDTO comes back snake_case, mapped to camelCase.

export type IntegrationStatus = 'CONNECTED' | 'ERROR' | 'DISCONNECTED';

interface IntegrationWire {
  id: number;
  integration_key: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  success_rate?: number;
  last_sync_at?: string;
  notes?: string;
}

export interface IntegrationResponse {
  id: number;
  integrationKey: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  successRate?: number;
  lastSyncAt?: string;
  notes?: string;
}

export interface IntegrationRequestData {
  integrationKey?: string;
  name?: string;
  category?: string;
  status?: IntegrationStatus;
  successRate?: number;
  notes?: string;
}

function mapIntegration(w: IntegrationWire): IntegrationResponse {
  return {
    id: w.id,
    integrationKey: w.integration_key,
    name: w.name,
    category: w.category,
    status: w.status,
    successRate: w.success_rate,
    lastSyncAt: w.last_sync_at,
    notes: w.notes,
  };
}

export const integrationService = {
  getAll: async (): Promise<IntegrationResponse[]> => {
    const res = await api.get<IntegrationWire[]>('/gymos/integrations');
    return res.data.map(mapIntegration);
  },

  create: async (data: IntegrationRequestData): Promise<IntegrationResponse> => {
    const res = await api.post<IntegrationWire>('/gymos/integrations', data);
    return mapIntegration(res.data);
  },

  update: async (id: number, data: IntegrationRequestData): Promise<IntegrationResponse> => {
    const res = await api.put<IntegrationWire>(`/gymos/integrations/${id}`, data);
    return mapIntegration(res.data);
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/gymos/integrations/${id}`);
  },

  setStatus: async (id: number, status: IntegrationStatus): Promise<IntegrationResponse> => {
    const res = await api.patch<IntegrationWire>(`/gymos/integrations/${id}/status`, { status });
    return mapIntegration(res.data);
  },
};
