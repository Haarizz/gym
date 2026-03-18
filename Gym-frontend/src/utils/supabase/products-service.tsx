import { authService } from './auth-service';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── Frontend interfaces (camelCase) ──────────────────────────────────────────

export interface Warehouse {
  id: number;
  name: string;
  type: string; // MAIN_WAREHOUSE | BRANCH | ONLINE
  location?: string;
  isActive: boolean;
}

export interface ProductCategory {
  id: number;
  name: string;
  categoryType: string;
  color: string;
  iconName: string;
  productCount: number;
}

export interface ProductStock {
  id: number;
  productId: number;
  warehouseId: number;
  warehouseName: string;
  currentStock: number;
  openingStock: number;
  reorderLevel: number;
  stockStatus: string; // IN_STOCK | LOW_STOCK | OUT_OF_STOCK
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  categoryName: string;
  brand?: string;
  description?: string;
  isActive: boolean;
  hasVariants: boolean;
  hasRecipe: boolean;
  isManufactured: boolean;
  imageUrls: string[];
  barcode?: string;
  barcodeTemplate?: string;
  defaultUnit?: string;
  sellingPrice: number;
  costPrice: number;
  taxRate: number;
  supplier?: string;
  totalStock: number;
  inventoryValue: number;
  stockStatus: string; // ACTIVE | LOW_STOCK | OUT_OF_STOCK | INACTIVE
  stockByWarehouse: ProductStock[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductRequest {
  name: string;
  categoryId: number;
  brand?: string;
  description?: string;
  isActive: boolean;
  hasVariants: boolean;
  hasRecipe: boolean;
  isManufactured: boolean;
  imageUrls: string[];
  barcode?: string;
  barcodeTemplate?: string;
  defaultUnit?: string;
  sellingPrice: number;
  costPrice: number;
  taxRate: number;
  supplier?: string;
  openingStock: number;
  reorderLevel: number;
  warehouseId: number;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;
  categoriesCount: number;
}

export interface StockAdjustmentRequest {
  warehouseId: number;
  adjustmentType: 'ADD' | 'SUBTRACT' | 'SET';
  quantity: number;
  reason?: string;
}

export interface ProductsPage {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Response mappers: snake_case API → camelCase frontend ────────────────────

function mapWarehouse(r: any): Warehouse {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    location: r.location,
    isActive: r.is_active ?? r.isActive ?? true,
  };
}

function mapCategory(r: any): ProductCategory {
  return {
    id: r.id,
    name: r.name,
    categoryType: r.category_type ?? r.categoryType ?? '',
    color: r.color ?? 'bg-blue-500',
    iconName: r.icon_name ?? r.iconName ?? 'package',
    productCount: r.product_count ?? r.productCount ?? 0,
  };
}

function mapProductStock(r: any): ProductStock {
  return {
    id: r.id,
    productId: r.product_id ?? r.productId,
    warehouseId: r.warehouse_id ?? r.warehouseId,
    warehouseName: r.warehouse_name ?? r.warehouseName ?? '',
    currentStock: r.current_stock ?? r.currentStock ?? 0,
    openingStock: r.opening_stock ?? r.openingStock ?? 0,
    reorderLevel: r.reorder_level ?? r.reorderLevel ?? 0,
    stockStatus: r.stock_status ?? r.stockStatus ?? 'IN_STOCK',
  };
}

function mapProduct(r: any): Product {
  const rawImages = r.image_urls ?? r.imageUrls ?? [];
  let imageUrls: string[] = [];
  if (Array.isArray(rawImages)) {
    imageUrls = rawImages;
  } else if (typeof rawImages === "string") {
    try {
      const parsed = JSON.parse(rawImages);
      imageUrls = Array.isArray(parsed) ? parsed : rawImages.split(",").map((s: string) => s.trim());
    } catch {
      imageUrls = rawImages.split(",").map((s: string) => s.trim());
    }
  }
  const stocks: ProductStock[] = (r.stock_by_warehouse ?? r.stockByWarehouse ?? []).map(mapProductStock);
  return {
    id: r.id,
    name: r.name,
    sku: r.sku ?? '',
    categoryId: r.category_id ?? r.categoryId ?? 0,
    categoryName: r.category_name ?? r.categoryName ?? '',
    brand: r.brand,
    description: r.description,
    isActive: r.is_active ?? r.isActive ?? true,
    hasVariants: r.has_variants ?? r.hasVariants ?? false,
    hasRecipe: r.has_recipe ?? r.hasRecipe ?? false,
    isManufactured: r.is_manufactured ?? r.isManufactured ?? false,
    imageUrls,
    barcode: r.barcode,
    barcodeTemplate: r.barcode_template ?? r.barcodeTemplate,
    defaultUnit: r.default_unit ?? r.defaultUnit,
    sellingPrice: Number(r.selling_price ?? r.sellingPrice ?? 0),
    costPrice: Number(r.cost_price ?? r.costPrice ?? 0),
    taxRate: Number(r.tax_rate ?? r.taxRate ?? 5),
    supplier: r.supplier,
    totalStock: r.total_stock ?? r.totalStock ?? 0,
    inventoryValue: Number(r.inventory_value ?? r.inventoryValue ?? 0),
    stockStatus: r.stock_status ?? r.stockStatus ?? 'ACTIVE',
    stockByWarehouse: stocks,
    createdAt: r.created_at ?? r.createdAt ?? '',
    updatedAt: r.updated_at ?? r.updatedAt ?? '',
  };
}

function mapStats(r: any): ProductStats {
  return {
    totalProducts: r.total_products ?? r.totalProducts ?? 0,
    activeProducts: r.active_products ?? r.activeProducts ?? 0,
    lowStockItems: r.low_stock_items ?? r.lowStockItems ?? 0,
    outOfStockItems: r.out_of_stock_items ?? r.outOfStockItems ?? 0,
    totalInventoryValue: Number(r.total_inventory_value ?? r.totalInventoryValue ?? 0),
    categoriesCount: r.categories_count ?? r.categoriesCount ?? 0,
  };
}

// Convert camelCase ProductRequest → snake_case body for backend
function toRequestBody(data: ProductRequest): Record<string, any> {
  return {
    name: data.name,
    category_id: data.categoryId,
    brand: data.brand,
    description: data.description,
    is_active: data.isActive,
    has_variants: data.hasVariants,
    has_recipe: data.hasRecipe,
    is_manufactured: data.isManufactured,
    image_urls: data.imageUrls,
    barcode: data.barcode,
    barcode_template: data.barcodeTemplate,
    default_unit: data.defaultUnit,
    selling_price: data.sellingPrice,
    cost_price: data.costPrice,
    tax_rate: data.taxRate,
    supplier: data.supplier,
    opening_stock: data.openingStock,
    reorder_level: data.reorderLevel,
    warehouse_id: data.warehouseId,
  };
}

function toAdjustBody(req: StockAdjustmentRequest): Record<string, any> {
  return {
    warehouse_id: req.warehouseId,
    adjustment_type: req.adjustmentType,
    quantity: req.quantity,
    reason: req.reason,
  };
}

function toWarehouseBody(data: Partial<Warehouse>): Record<string, any> {
  return {
    name: data.name,
    type: data.type,
    location: data.location,
    is_active: data.isActive,
  };
}

function toCategoryBody(data: Partial<ProductCategory>): Record<string, any> {
  return {
    name: data.name,
    category_type: data.categoryType,
    color: data.color,
    icon_name: data.iconName,
  };
}

// ── Service class ─────────────────────────────────────────────────────────────

class ProductsService {

  // ── Warehouses ──────────────────────────────────────────────────────────────

  async getActiveWarehouses(): Promise<Warehouse[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/warehouses/active`);
    if (!res.ok) throw new Error(`Failed to fetch warehouses: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(mapWarehouse) : [];
  }

  async getAllWarehouses(): Promise<Warehouse[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/warehouses`);
    if (!res.ok) throw new Error(`Failed to fetch warehouses: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(mapWarehouse) : [];
  }

  async createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/warehouses`, {
      method: 'POST',
      body: JSON.stringify(toWarehouseBody(data)),
    });
    if (!res.ok) throw new Error(`Failed to create warehouse: ${res.status}`);
    return mapWarehouse(await res.json());
  }

  async updateWarehouse(id: number, data: Partial<Warehouse>): Promise<Warehouse> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toWarehouseBody(data)),
    });
    if (!res.ok) throw new Error(`Failed to update warehouse: ${res.status}`);
    return mapWarehouse(await res.json());
  }

  async deleteWarehouse(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/warehouses/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete warehouse: ${res.status}`);
  }

  // ── Categories ──────────────────────────────────────────────────────────────

  async getCategories(): Promise<ProductCategory[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/product-categories`);
    if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(mapCategory) : [];
  }

  async createCategory(data: Partial<ProductCategory>): Promise<ProductCategory> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/product-categories`, {
      method: 'POST',
      body: JSON.stringify(toCategoryBody(data)),
    });
    if (!res.ok) throw new Error(`Failed to create category: ${res.status}`);
    return mapCategory(await res.json());
  }

  async updateCategory(id: number, data: Partial<ProductCategory>): Promise<ProductCategory> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/product-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toCategoryBody(data)),
    });
    if (!res.ok) throw new Error(`Failed to update category: ${res.status}`);
    return mapCategory(await res.json());
  }

  async deleteCategory(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/product-categories/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete category: ${res.status}`);
  }

  // ── Products ────────────────────────────────────────────────────────────────

  async getProducts(filters?: {
    search?: string;
    categoryId?: number;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<ProductsPage> {
    const params = new URLSearchParams();
    if (filters?.search)     params.append('search',     filters.search);
    if (filters?.categoryId) params.append('categoryId', String(filters.categoryId));
    if (filters?.status)     params.append('status',     filters.status);
    if (filters?.page)       params.append('page',       String(filters.page));
    if (filters?.size)       params.append('size',       String(filters.size));

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/products?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
    const raw = await res.json();
    return {
      products: (raw.products ?? []).map(mapProduct),
      pagination: {
        page: raw.pagination?.page ?? 1,
        limit: raw.pagination?.limit ?? 20,
        total: raw.pagination?.total ?? 0,
        totalPages: raw.pagination?.total_pages ?? raw.pagination?.totalPages ?? 0,
      },
    };
  }

  async getProductById(id: number): Promise<Product> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/products/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch product: ${res.status}`);
    return mapProduct(await res.json());
  }

  async createProduct(data: ProductRequest): Promise<Product> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/products`, {
      method: 'POST',
      body: JSON.stringify(toRequestBody(data)),
    });
    if (!res.ok) throw new Error(`Failed to create product: ${res.status}`);
    return mapProduct(await res.json());
  }

  async updateProduct(id: number, data: ProductRequest): Promise<Product> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toRequestBody(data)),
    });
    if (!res.ok) throw new Error(`Failed to update product: ${res.status}`);
    return mapProduct(await res.json());
  }

  async deleteProduct(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/products/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete product: ${res.status}`);
  }

  async adjustStock(id: number, req: StockAdjustmentRequest): Promise<Product> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(toAdjustBody(req)),
    });
    if (!res.ok) throw new Error(`Failed to adjust stock: ${res.status}`);
    return mapProduct(await res.json());
  }

  async duplicateProduct(id: number): Promise<Product> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/products/${id}/duplicate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Failed to duplicate product: ${res.status}`);
    return mapProduct(await res.json());
  }

  async getStats(): Promise<ProductStats> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/products/stats`);
    if (!res.ok) throw new Error(`Failed to fetch product stats: ${res.status}`);
    return mapStats(await res.json());
  }

  async getLowStockProducts(): Promise<Product[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/products/low-stock`);
    if (!res.ok) throw new Error(`Failed to fetch low stock products: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(mapProduct) : [];
  }
}

export const productsService = new ProductsService();
