import { authService } from './auth-service';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface RecipeIngredient {
  id?: number;
  recipeId?: number;
  productId?: number;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitCost: number;
  notes?: string;
}

export interface Recipe {
  id: number;
  name: string;
  description?: string;
  categoryId?: number;
  categoryName?: string;
  outputProductId?: number;
  outputProductName?: string;
  outputQuantity: number;
  outputUnit: string;
  prepTimeMinutes?: number;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  estimatedCost: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  items: RecipeIngredient[];
}

export interface RecipeRequest {
  name: string;
  description?: string;
  categoryId?: number;
  categoryName?: string;
  outputProductId?: number;
  outputProductName?: string;
  outputQuantity: number;
  outputUnit: string;
  prepTimeMinutes?: number;
  status?: string;
  notes?: string;
  items: RecipeIngredientRequest[];
}

export interface RecipeIngredientRequest {
  productId?: number;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitCost: number;
  notes?: string;
}

export interface RecipePage {
  recipes: Recipe[];
  pagination: { page: number; size: number; total: number; totalPages: number };
}

export interface ProductionOrder {
  id: number;
  orderNumber: string;
  recipeId: number;
  recipeName: string;
  quantityToProduce: number;
  outputUnit: string;
  outputProductId?: number;
  outputProductName?: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate?: string;
  completedDate?: string;
  warehouseId?: number;
  totalIngredientCost: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  ingredients: RecipeIngredient[];
}

export interface ProductionOrderRequest {
  recipeId: number;
  quantityToProduce: number;
  outputUnit?: string;
  scheduledDate?: string;
  warehouseId?: number;
  notes?: string;
}

export interface ProductionOrderPage {
  orders: ProductionOrder[];
  pagination: { page: number; size: number; total: number; totalPages: number };
}

export interface ProductionStats {
  totalRecipes: number;
  activeRecipes: number;
  totalOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  draftOrders: number;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapIngredient(r: any): RecipeIngredient {
  return {
    id: r.id,
    recipeId: r.recipe_id ?? r.recipeId,
    productId: r.product_id ?? r.productId,
    productName: r.product_name ?? r.productName ?? '',
    sku: r.sku ?? '',
    quantity: Number(r.quantity ?? 0),
    unit: r.unit ?? '',
    unitCost: Number(r.unit_cost ?? r.unitCost ?? 0),
    notes: r.notes,
  };
}

function mapRecipe(r: any): Recipe {
  return {
    id: r.id,
    name: r.name ?? '',
    description: r.description,
    categoryId: r.category_id ?? r.categoryId,
    categoryName: r.category_name ?? r.categoryName,
    outputProductId: r.output_product_id ?? r.outputProductId,
    outputProductName: r.output_product_name ?? r.outputProductName,
    outputQuantity: Number(r.output_quantity ?? r.outputQuantity ?? 1),
    outputUnit: r.output_unit ?? r.outputUnit ?? '',
    prepTimeMinutes: r.prep_time_minutes ?? r.prepTimeMinutes,
    status: r.status ?? 'ACTIVE',
    notes: r.notes,
    estimatedCost: Number(r.estimated_cost ?? r.estimatedCost ?? 0),
    createdAt: r.created_at ?? r.createdAt ?? '',
    updatedAt: r.updated_at ?? r.updatedAt,
    createdBy: r.created_by ?? r.createdBy,
    items: (r.items ?? []).map(mapIngredient),
  };
}

function mapOrder(r: any): ProductionOrder {
  return {
    id: r.id,
    orderNumber: r.order_number ?? r.orderNumber ?? '',
    recipeId: r.recipe_id ?? r.recipeId ?? 0,
    recipeName: r.recipe_name ?? r.recipeName ?? '',
    quantityToProduce: Number(r.quantity_to_produce ?? r.quantityToProduce ?? 0),
    outputUnit: r.output_unit ?? r.outputUnit ?? '',
    outputProductId: r.output_product_id ?? r.outputProductId,
    outputProductName: r.output_product_name ?? r.outputProductName,
    status: r.status ?? 'DRAFT',
    scheduledDate: r.scheduled_date ?? r.scheduledDate,
    completedDate: r.completed_date ?? r.completedDate,
    warehouseId: r.warehouse_id ?? r.warehouseId,
    totalIngredientCost: Number(r.total_ingredient_cost ?? r.totalIngredientCost ?? 0),
    notes: r.notes,
    createdAt: r.created_at ?? r.createdAt ?? '',
    updatedAt: r.updated_at ?? r.updatedAt,
    createdBy: r.created_by ?? r.createdBy,
    ingredients: (r.ingredients ?? []).map(mapIngredient),
  };
}

function mapStats(r: any): ProductionStats {
  return {
    totalRecipes: Number(r.total_recipes ?? r.totalRecipes ?? 0),
    activeRecipes: Number(r.active_recipes ?? r.activeRecipes ?? 0),
    totalOrders: Number(r.total_orders ?? r.totalOrders ?? 0),
    inProgressOrders: Number(r.in_progress_orders ?? r.inProgressOrders ?? 0),
    completedOrders: Number(r.completed_orders ?? r.completedOrders ?? 0),
    draftOrders: Number(r.draft_orders ?? r.draftOrders ?? 0),
  };
}

function toIngredientBody(i: RecipeIngredientRequest): Record<string, any> {
  return {
    product_id: i.productId,
    product_name: i.productName,
    sku: i.sku,
    quantity: i.quantity,
    unit: i.unit,
    unit_cost: i.unitCost,
    notes: i.notes,
  };
}

function toRecipeBody(req: RecipeRequest): Record<string, any> {
  return {
    name: req.name,
    description: req.description,
    category_id: req.categoryId,
    category_name: req.categoryName,
    output_product_id: req.outputProductId,
    output_product_name: req.outputProductName,
    output_quantity: req.outputQuantity,
    output_unit: req.outputUnit,
    prep_time_minutes: req.prepTimeMinutes,
    status: req.status ?? 'ACTIVE',
    notes: req.notes,
    items: req.items.map(toIngredientBody),
  };
}

function toOrderBody(req: ProductionOrderRequest): Record<string, any> {
  return {
    recipe_id: req.recipeId,
    quantity_to_produce: req.quantityToProduce,
    output_unit: req.outputUnit,
    scheduled_date: req.scheduledDate,
    warehouse_id: req.warehouseId,
    notes: req.notes,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

class ProductionRecipeService {

  // ── Recipes ────────────────────────────────────────────────────────────────

  async getRecipes(filters?: { page?: number; size?: number; status?: string; search?: string }): Promise<RecipePage> {
    const params = new URLSearchParams();
    if (filters?.page)   params.append('page',   String(filters.page));
    if (filters?.size)   params.append('size',   String(filters.size));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/recipes?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch recipes: ${res.status}`);
    const raw = await res.json();
    return {
      recipes: (raw.recipes ?? raw.content ?? (Array.isArray(raw) ? raw : [])).map(mapRecipe),
      pagination: {
        page: raw.pagination?.page ?? 1,
        size: raw.pagination?.size ?? raw.pagination?.limit ?? 20,
        total: raw.pagination?.total ?? raw.totalElements ?? 0,
        totalPages: raw.pagination?.totalPages ?? raw.pagination?.total_pages ?? 0,
      },
    };
  }

  async getRecipeById(id: number): Promise<Recipe> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/recipes/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch recipe: ${res.status}`);
    return mapRecipe(await res.json());
  }

  async createRecipe(req: RecipeRequest): Promise<Recipe> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/recipes`, {
      method: 'POST',
      body: JSON.stringify(toRecipeBody(req)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to create recipe: ${res.status}`);
    }
    return mapRecipe(await res.json());
  }

  async updateRecipe(id: number, req: RecipeRequest): Promise<Recipe> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toRecipeBody(req)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to update recipe: ${res.status}`);
    }
    return mapRecipe(await res.json());
  }

  async deleteRecipe(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/recipes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete recipe: ${res.status}`);
  }

  async toggleRecipeStatus(id: number): Promise<Recipe> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/recipes/${id}/toggle-status`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to toggle recipe status: ${res.status}`);
    return mapRecipe(await res.json());
  }

  // ── Production Orders ──────────────────────────────────────────────────────

  async getOrders(filters?: { page?: number; size?: number; status?: string; search?: string }): Promise<ProductionOrderPage> {
    const params = new URLSearchParams();
    if (filters?.page)   params.append('page',   String(filters.page));
    if (filters?.size)   params.append('size',   String(filters.size));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/production-orders?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch production orders: ${res.status}`);
    const raw = await res.json();
    return {
      orders: (raw.orders ?? raw.content ?? (Array.isArray(raw) ? raw : [])).map(mapOrder),
      pagination: {
        page: raw.pagination?.page ?? 1,
        size: raw.pagination?.size ?? raw.pagination?.limit ?? 20,
        total: raw.pagination?.total ?? raw.totalElements ?? 0,
        totalPages: raw.pagination?.totalPages ?? raw.pagination?.total_pages ?? 0,
      },
    };
  }

  async getOrderById(id: number): Promise<ProductionOrder> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/production-orders/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch production order: ${res.status}`);
    return mapOrder(await res.json());
  }

  async createOrder(req: ProductionOrderRequest): Promise<ProductionOrder> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/production-orders`, {
      method: 'POST',
      body: JSON.stringify(toOrderBody(req)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to create production order: ${res.status}`);
    }
    return mapOrder(await res.json());
  }

  async startProduction(id: number): Promise<ProductionOrder> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/production-orders/${id}/start`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to start production: ${res.status}`);
    }
    return mapOrder(await res.json());
  }

  async completeProduction(id: number): Promise<ProductionOrder> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/production-orders/${id}/complete`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to complete production: ${res.status}`);
    }
    return mapOrder(await res.json());
  }

  async cancelOrder(id: number): Promise<ProductionOrder> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/production-orders/${id}/cancel`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to cancel order: ${res.status}`);
    }
    return mapOrder(await res.json());
  }

  async deleteOrder(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/production-orders/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete production order: ${res.status}`);
  }

  async getStats(): Promise<ProductionStats> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/production-orders/stats`);
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
    return mapStats(await res.json());
  }
}

export const productionRecipeService = new ProductionRecipeService();
