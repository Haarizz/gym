import { authService } from "./auth-service";

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface AddonPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  validity: number;
  category: "Training" | "Nutrition" | "Spa" | "Classes" | "Other";
  isActive: boolean;
}

export interface AddonPlanRequest {
  name?: string;
  description?: string;
  price?: number;
  validity?: number;
  category?: string;
  isActive?: boolean;
}

function mapAddonPlan(r: any): AddonPlan {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    price: Number(r.price ?? 0),
    validity: r.validity ?? 0,
    category: r.category,
    isActive: r.is_active ?? true,
  };
}

// The backend's Jackson naming strategy is SNAKE_CASE, so outgoing bodies
// must use snake_case keys — this mirrors the request shape the other
// CRUD services in this app already send.
function toRequestBody(req: AddonPlanRequest) {
  const body: Record<string, unknown> = {};
  if (req.name !== undefined) body.name = req.name;
  if (req.description !== undefined) body.description = req.description;
  if (req.price !== undefined) body.price = req.price;
  if (req.validity !== undefined) body.validity = req.validity;
  if (req.category !== undefined) body.category = req.category;
  if (req.isActive !== undefined) body.is_active = req.isActive;
  return body;
}

class AddonPlansService {
  async getAll(activeOnly?: boolean): Promise<AddonPlan[]> {
    const query = activeOnly ? "?activeOnly=true" : "";
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/addon-plans${query}`
    );
    if (!response.ok) throw new Error(`Failed to fetch add-on plans: ${response.status}`);
    const data = await response.json();
    return data.map(mapAddonPlan);
  }

  async create(req: AddonPlanRequest): Promise<AddonPlan> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/addon-plans`,
      { method: "POST", body: JSON.stringify(toRequestBody(req)) }
    );
    if (!response.ok) throw new Error(`Failed to create add-on plan: ${response.status}`);
    return mapAddonPlan(await response.json());
  }

  async update(id: number, req: AddonPlanRequest): Promise<AddonPlan> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/addon-plans/${id}`,
      { method: "PUT", body: JSON.stringify(toRequestBody(req)) }
    );
    if (!response.ok) throw new Error(`Failed to update add-on plan: ${response.status}`);
    return mapAddonPlan(await response.json());
  }

  async toggleActive(id: number): Promise<AddonPlan> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/addon-plans/${id}/toggle-active`,
      { method: "PATCH" }
    );
    if (!response.ok) throw new Error(`Failed to toggle add-on plan: ${response.status}`);
    return mapAddonPlan(await response.json());
  }

  async delete(id: number): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/addon-plans/${id}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error(`Failed to delete add-on plan: ${response.status}`);
  }
}

export const addonPlansService = new AddonPlansService();
