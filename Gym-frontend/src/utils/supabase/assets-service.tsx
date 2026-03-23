import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface AssetMaintenance {
  id: number;
  date?: string;
  type?: string;
  cost?: number;
  notes?: string;
}

export interface AssetTransfer {
  id: number;
  date?: string;
  from?: string;
  to?: string;
  reason?: string;
}

export interface Asset {
  id: number;
  code?: string;
  name: string;
  model?: string;
  category?: string;
  subcategory?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  depreciationRate?: number;
  location?: string;
  branch?: string;
  vendor?: string;
  status?: string;
  condition?: string;
  warrantyExpiry?: string;
  serialNumber?: string;
  imageUrl?: string;
  nextMaintenanceDate?: string;
  utilizationRate?: number;
  disposalDate?: string;
  disposalReason?: string;
  maintenanceHistory: AssetMaintenance[];
  transferHistory: AssetTransfer[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  date?: string;
  amount?: number;
  location?: string;
  status?: string;
  details?: Record<string, any>;
}

export interface AssetStats {
  totalAssetsValue: number;
  activeAssetsCount: number;
  maintenanceDue: number;
  assetsForDisposal: number;
  totalAssets: number;
}

export interface AssetsPage {
  assets: Asset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function mapMaintenance(r: any): AssetMaintenance {
  return {
    id: r.id,
    date: r.date ?? r.maintenance_date ?? r.maintenanceDate,
    type: r.type,
    cost: r.cost != null ? Number(r.cost) : undefined,
    notes: r.notes,
  };
}

function mapTransfer(r: any): AssetTransfer {
  return {
    id: r.id,
    date: r.date ?? r.transfer_date ?? r.transferDate,
    from: r.from ?? r.from_location ?? r.fromLocation,
    to: r.to ?? r.to_location ?? r.toLocation,
    reason: r.reason,
  };
}

function mapAsset(r: any): Asset {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    model: r.model,
    category: r.category,
    subcategory: r.subcategory,
    purchaseDate: r.purchase_date ?? r.purchaseDate,
    purchasePrice: r.purchase_price != null ? Number(r.purchase_price) : r.purchasePrice != null ? Number(r.purchasePrice) : undefined,
    currentValue: r.current_value != null ? Number(r.current_value) : r.currentValue != null ? Number(r.currentValue) : undefined,
    depreciationRate: r.depreciation_rate != null ? Number(r.depreciation_rate) : r.depreciationRate != null ? Number(r.depreciationRate) : undefined,
    location: r.location,
    branch: r.branch,
    vendor: r.vendor,
    status: r.status,
    condition: r.condition,
    warrantyExpiry: r.warranty_expiry ?? r.warrantyExpiry,
    serialNumber: r.serial_number ?? r.serialNumber,
    imageUrl: r.image_url ?? r.imageUrl,
    nextMaintenanceDate: r.next_maintenance_date ?? r.nextMaintenanceDate,
    utilizationRate: r.utilization_rate ?? r.utilizationRate,
    disposalDate: r.disposal_date ?? r.disposalDate,
    disposalReason: r.disposal_reason ?? r.disposalReason,
    maintenanceHistory: Array.isArray(r.maintenance_history ?? r.maintenanceHistory)
      ? (r.maintenance_history ?? r.maintenanceHistory).map(mapMaintenance)
      : [],
    transferHistory: Array.isArray(r.transfer_history ?? r.transferHistory)
      ? (r.transfer_history ?? r.transferHistory).map(mapTransfer)
      : [],
    createdAt: r.created_at ?? r.createdAt,
    updatedAt: r.updated_at ?? r.updatedAt,
  };
}

function mapStats(r: any): AssetStats {
  return {
    totalAssetsValue: Number(r.total_assets_value ?? r.totalAssetsValue ?? 0),
    activeAssetsCount: Number(r.active_assets_count ?? r.activeAssetsCount ?? 0),
    maintenanceDue: Number(r.maintenance_due ?? r.maintenanceDue ?? 0),
    assetsForDisposal: Number(r.assets_for_disposal ?? r.assetsForDisposal ?? 0),
    totalAssets: Number(r.total_assets ?? r.totalAssets ?? 0),
  };
}

function mapEvent(r: any): AssetEvent {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    description: r.description,
    date: r.date,
    amount: r.amount != null ? Number(r.amount) : undefined,
    location: r.location,
    status: r.status,
    details: r.details,
  };
}

class AssetsService {
  async getAssets(filters?: {
    search?: string;
    branch?: string;
    category?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
  }): Promise<AssetsPage> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.branch) params.append("branch", filters.branch);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.fromDate) params.append("fromDate", filters.fromDate);
    if (filters?.toDate) params.append("toDate", filters.toDate);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.size) params.append("size", String(filters.size));

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/assets?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch assets: ${res.status}`);
    const raw = await res.json();
    return {
      assets: Array.isArray(raw.assets) ? raw.assets.map(mapAsset) : [],
      pagination: {
        page: raw.pagination?.page ?? 1,
        limit: raw.pagination?.limit ?? 50,
        total: raw.pagination?.total ?? 0,
        totalPages: raw.pagination?.total_pages ?? raw.pagination?.totalPages ?? 0,
      },
    };
  }

  async getStats(): Promise<AssetStats> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/assets/stats`);
    if (!res.ok) throw new Error(`Failed to fetch asset stats: ${res.status}`);
    return mapStats(await res.json());
  }

  async getAssetById(id: number): Promise<Asset> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/assets/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch asset: ${res.status}`);
    return mapAsset(await res.json());
  }

  async getAssetEvents(id: number): Promise<AssetEvent[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/assets/${id}/events`);
    if (!res.ok) throw new Error(`Failed to fetch asset events: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(mapEvent) : [];
  }

  async createAsset(payload: Partial<Asset> & { name: string }): Promise<Asset> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/assets`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to create asset: ${res.status}`);
    return mapAsset(await res.json());
  }

  async updateAsset(id: number, payload: Partial<Asset>): Promise<Asset> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/assets/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to update asset: ${res.status}`);
    return mapAsset(await res.json());
  }

  async deleteAsset(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/assets/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Failed to delete asset: ${res.status}`);
  }
}

export const assetsService = new AssetsService();
