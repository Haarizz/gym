import api from '../../api/axiosConfig';

// GymOS Module Management. Backend serializes/deserializes DTO-bound bodies
// with spring.jackson.property-naming-strategy=SNAKE_CASE (see
// platform-lead-service.tsx's note) — PlatformModuleResponseDTO comes back
// snake_case below, mapped to camelCase for the rest of the app. The
// PATCH endpoints bind a raw Map<String, Boolean|String> server-side, so
// their request bodies are sent as literal single-word keys (enabled/status)
// same as they'd be either way.

export type ModuleStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

interface PlatformModuleWire {
  id: number;
  module_key: string;
  display_name: string;
  status: ModuleStatus;
  enabled: boolean;
  last_status_change_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface PlatformModuleResponse {
  id: number;
  moduleKey: string;
  displayName: string;
  status: ModuleStatus;
  enabled: boolean;
  lastStatusChangeAt?: string;
  createdAt: string;
  updatedAt?: string;
}

function mapModule(w: PlatformModuleWire): PlatformModuleResponse {
  return {
    id: w.id,
    moduleKey: w.module_key,
    displayName: w.display_name,
    status: w.status,
    enabled: w.enabled,
    lastStatusChangeAt: w.last_status_change_at,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

interface ModuleAuditLogWire {
  id: number;
  action: string;
  module_key: string;
  performed_by?: string;
  ip_address?: string;
  summary?: string;
  created_at: string;
}

export interface ModuleAuditLogEntry {
  id: number;
  action: string;
  moduleKey: string;
  performedBy?: string;
  ipAddress?: string;
  summary?: string;
  createdAt: string;
}

function mapAuditLog(w: ModuleAuditLogWire): ModuleAuditLogEntry {
  return {
    id: w.id,
    action: w.action,
    moduleKey: w.module_key,
    performedBy: w.performed_by,
    ipAddress: w.ip_address,
    summary: w.summary,
    createdAt: w.created_at,
  };
}

export const moduleService = {
  getAll: async (): Promise<PlatformModuleResponse[]> => {
    const res = await api.get<PlatformModuleWire[]>('/gymos/modules');
    return res.data.map(mapModule);
  },

  setEnabled: async (moduleKey: string, enabled: boolean): Promise<PlatformModuleResponse> => {
    const res = await api.patch<PlatformModuleWire>(`/gymos/modules/${moduleKey}/enabled`, { enabled });
    return mapModule(res.data);
  },

  setStatus: async (moduleKey: string, status: ModuleStatus): Promise<PlatformModuleResponse> => {
    const res = await api.patch<PlatformModuleWire>(`/gymos/modules/${moduleKey}/status`, { status });
    return mapModule(res.data);
  },

  getAuditLog: async (limit = 20): Promise<ModuleAuditLogEntry[]> => {
    const res = await api.get<ModuleAuditLogWire[]>('/gymos/modules/audit-log', { params: { limit } });
    return res.data.map(mapAuditLog);
  },
};
