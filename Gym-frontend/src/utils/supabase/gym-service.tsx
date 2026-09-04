import api from '../../api/axiosConfig';

export interface GymDTO {
  id: number;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  lat?: number;
  lng?: number;
  status: string;
  isDefault?: boolean;
  createdAt?: string;
  branchCount?: number;
  ownerUsername?: string;
  // Phase 8: "PRIMARY" (id = a real primary-DB Gym.id) or "TENANT" (id = a
  // control-plane Tenant.id — every gym created since Phase 3's cutover). The two
  // are separate id spaces that can numerically collide, so this field (not id
  // alone) decides which update/status endpoint variant a given row must use.
  source?: string;
  tenantId?: number;
}

export interface GymRequestDTO {
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  lat?: number;
  lng?: number;
  status?: string;
  ownerUsername?: string;
  ownerPassword?: string;
  ownerEmail?: string;
}

// Phase 3: POST /gyms now always provisions a brand-new tenant database
// asynchronously and returns 202 with this shape instead of a full GymDTO —
// tenantId is the control-plane Tenant id, not a primary-DB Gym id.
export interface TenantProvisioningResponseDTO {
  tenantId: number;
  name: string;
  slug: string;
  status: string;
}

// The backend deserializes with spring.jackson.property-naming-strategy=SNAKE_CASE,
// so GymRequestDTO's owner_username/owner_password/owner_email/contact_person must
// be sent on the wire in that exact shape — sending the camelCase field names
// verbatim (as this file used to) means Jackson never binds them, silently
// producing nulls and a "Owner username and password are required" error even
// though the form fields were genuinely filled in.
function toGymRequestBody(data: Partial<GymRequestDTO>) {
  const body: Record<string, unknown> = {
    name: data.name,
    slug: data.slug,
    address: data.address,
    phone: data.phone,
    email: data.email,
    status: data.status,
    lat: data.lat,
    lng: data.lng,
  };
  if (data.contactPerson !== undefined) body.contact_person = data.contactPerson;
  if (data.ownerUsername !== undefined) body.owner_username = data.ownerUsername;
  if (data.ownerPassword !== undefined) body.owner_password = data.ownerPassword;
  if (data.ownerEmail !== undefined) body.owner_email = data.ownerEmail;
  return body;
}

export interface LocationSuggestion {
  displayName: string;
  lat: number;
  lng: number;
}

export const geocodingApi = {
  search: async (query: string): Promise<LocationSuggestion[]> => {
    const res = await api.get<Array<{ displayName?: string; display_name?: string; lat: number; lng?: number; lon?: number }>>(
      '/geocoding/search',
      { params: { q: query } }
    );
    return res.data.map((r) => ({
      displayName: r.displayName ?? r.display_name ?? '',
      lat: r.lat,
      lng: r.lng ?? r.lon ?? 0,
    }));
  },
};

export const gymApi = {
  getAllGyms: async () => {
    const res = await api.get<GymDTO[]>('/gyms');
    return res.data;
  },

  getActiveGyms: async () => {
    const res = await api.get<GymDTO[]>('/gyms/active');
    return res.data;
  },

  createGym: async (data: GymRequestDTO) => {
    const res = await api.post<TenantProvisioningResponseDTO>('/gyms', toGymRequestBody(data));
    return res.data;
  },

  retryProvisioning: async (tenantId: number, data: Partial<GymRequestDTO>) => {
    const res = await api.post<TenantProvisioningResponseDTO>(`/gyms/${tenantId}/retry-provisioning`, toGymRequestBody(data));
    return res.data;
  },

  updateGym: async (id: number, data: GymRequestDTO) => {
    const res = await api.put<GymDTO>(`/gyms/${id}`, toGymRequestBody(data));
    return res.data;
  },

  updateGymStatus: async (id: number, status: string) => {
    const res = await api.patch<GymDTO>(`/gyms/${id}/status`, { status });
    return res.data;
  },

  issueOwnerLogin: async (id: number, username: string, password: string, email?: string) => {
    const res = await api.post<GymDTO>(`/gyms/${id}/owner`, { username, password, email });
    return res.data;
  },

  // Phase 8: parallel to updateGym/updateGymStatus, for a gym that exists only as
  // a control-plane tenant (gym.source === 'TENANT') — see GymDTO's doc comment.
  updateTenantGym: async (tenantId: number, data: GymRequestDTO) => {
    const res = await api.put<GymDTO>(`/gyms/tenant/${tenantId}`, toGymRequestBody(data));
    return res.data;
  },

  updateTenantGymStatus: async (tenantId: number, status: string) => {
    const res = await api.patch<GymDTO>(`/gyms/tenant/${tenantId}/status`, { status });
    return res.data;
  }
};
