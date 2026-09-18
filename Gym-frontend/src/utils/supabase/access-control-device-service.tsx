import api from '../../api/axiosConfig';

// GymOS's "Access Control Devices" widget. Backend serializes DTO-bound
// bodies with spring.jackson.property-naming-strategy=SNAKE_CASE (see
// module-service.tsx's note) — AccessControlDeviceResponseDTO comes back
// snake_case, mapped to camelCase.

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';

interface AccessControlDeviceWire {
  id: number;
  device_code: string;
  name: string;
  device_type: string;
  location?: string;
  status: DeviceStatus;
  last_sync_at?: string;
  branch_id?: number;
}

export interface AccessControlDeviceResponse {
  id: number;
  deviceCode: string;
  name: string;
  deviceType: string;
  location?: string;
  status: DeviceStatus;
  lastSyncAt?: string;
  branchId?: number;
}

export interface AccessControlDeviceRequestData {
  deviceCode?: string;
  name?: string;
  deviceType?: string;
  location?: string;
  status?: DeviceStatus;
  branchId?: number;
}

function mapDevice(w: AccessControlDeviceWire): AccessControlDeviceResponse {
  return {
    id: w.id,
    deviceCode: w.device_code,
    name: w.name,
    deviceType: w.device_type,
    location: w.location,
    status: w.status,
    lastSyncAt: w.last_sync_at,
    branchId: w.branch_id,
  };
}

export const accessControlDeviceService = {
  getAll: async (): Promise<AccessControlDeviceResponse[]> => {
    const res = await api.get<AccessControlDeviceWire[]>('/gymos/access-devices');
    return res.data.map(mapDevice);
  },

  create: async (data: AccessControlDeviceRequestData): Promise<AccessControlDeviceResponse> => {
    const res = await api.post<AccessControlDeviceWire>('/gymos/access-devices', data);
    return mapDevice(res.data);
  },

  update: async (id: number, data: AccessControlDeviceRequestData): Promise<AccessControlDeviceResponse> => {
    const res = await api.put<AccessControlDeviceWire>(`/gymos/access-devices/${id}`, data);
    return mapDevice(res.data);
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/gymos/access-devices/${id}`);
  },

  setStatus: async (id: number, status: DeviceStatus): Promise<AccessControlDeviceResponse> => {
    const res = await api.patch<AccessControlDeviceWire>(`/gymos/access-devices/${id}/status`, { status });
    return mapDevice(res.data);
  },
};
