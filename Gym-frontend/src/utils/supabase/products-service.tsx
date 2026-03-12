import { authService } from './auth-service';
import { demoService } from './demo-service';
import { projectId } from './info';

const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-0a04502f`;

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock_quantity: number;
  min_stock_level: number;
  supplier?: string;
  barcode?: string;
  description?: string;
  status: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  updated_at: string;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  status?: string;
  low_stock?: boolean;
}

class ProductsService {
  // Get all products
  async getProducts(filters: ProductFilters = {}): Promise<Product[]> {
    try {
      // If demo mode, return demo data directly
      if (authService.isDemoMode()) {
        console.log('Demo mode detected, returning demo products');
        const demoProducts = demoService.getDemoProducts();
        
        // Apply filters to demo data
        let filteredProducts = demoProducts;
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchLower) ||
            product.category.toLowerCase().includes(searchLower) ||
            product.description?.toLowerCase().includes(searchLower)
          );
        }
        
        if (filters.category) {
          filteredProducts = filteredProducts.filter(product => 
            product.category === filters.category
          );
        }
        
        if (filters.status) {
          filteredProducts = filteredProducts.filter(product => 
            product.status === filters.status
          );
        }
        
        if (filters.low_stock) {
          filteredProducts = filteredProducts.filter(product => 
            product.stock_quantity <= product.min_stock_level
          );
        }
        
        return filteredProducts;
      }

      const queryParams = new URLSearchParams();
      
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.low_stock) queryParams.append('low_stock', 'true');

      const response = await authService.makeAuthenticatedRequest(
        `${baseUrl}/products?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch products');
      }

      return result.data;
    } catch (error) {
      console.error('Get products error:', error);
      
      // Fallback to demo data if authenticated and demo mode
      if (authService.isDemoMode()) {
        console.log('Backend failed, falling back to demo products');
        return demoService.getDemoProducts();
      }
      
      throw error;
    }
  }

  // Get product by ID
  async getProductById(id: string): Promise<Product> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/products/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch product');
      }

      return result.data;
    } catch (error) {
      console.error('Get product by ID error:', error);
      throw error;
    }
  }

  // Create new product
  async createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/products`, {
        method: 'POST',
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create product');
      }

      return result.data;
    } catch (error) {
      console.error('Create product error:', error);
      throw error;
    }
  }

  // Update product
  async updateProduct(id: string, updateData: Partial<Product>): Promise<Product> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update product');
      }

      return result.data;
    } catch (error) {
      console.error('Update product error:', error);
      throw error;
    }
  }

  // Delete product
  async deleteProduct(id: string): Promise<void> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/products/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Delete product error:', error);
      throw error;
    }
  }

  // Get product categories
  async getCategories(): Promise<string[]> {
    try {
      const products = await this.getProducts();
      const categories = [...new Set(products.map(p => p.category))];
      return categories.sort();
    } catch (error) {
      console.error('Get categories error:', error);
      return [];
    }
  }

  // Get low stock products
  async getLowStockProducts(): Promise<Product[]> {
    try {
      const products = await this.getProducts();
      return products.filter(product => 
        product.stock_quantity <= product.min_stock_level && 
        product.status === 'active'
      );
    } catch (error) {
      console.error('Get low stock products error:', error);
      return [];
    }
  }

  // Get inventory statistics
  async getInventoryStats(): Promise<{
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    categories: Record<string, number>;
  }> {
    try {
      const products = await this.getProducts({ status: 'active' });
      
      const stats = {
        totalProducts: products.length,
        totalValue: products.reduce((sum, p) => sum + (p.stock_quantity * p.cost), 0),
        lowStockCount: products.filter(p => p.stock_quantity <= p.min_stock_level).length,
        categories: {} as Record<string, number>
      };

      // Count by category
      products.forEach(product => {
        stats.categories[product.category] = (stats.categories[product.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Get inventory stats error:', error);
      throw error;
    }
  }

  // Update stock quantity
  async updateStock(id: string, quantity: number, type: 'add' | 'subtract' | 'set'): Promise<Product> {
    try {
      const product = await this.getProductById(id);
      let newQuantity: number;

      switch (type) {
        case 'add':
          newQuantity = product.stock_quantity + quantity;
          break;
        case 'subtract':
          newQuantity = Math.max(0, product.stock_quantity - quantity);
          break;
        case 'set':
          newQuantity = Math.max(0, quantity);
          break;
        default:
          throw new Error('Invalid stock update type');
      }

      return await this.updateProduct(id, { stock_quantity: newQuantity });
    } catch (error) {
      console.error('Update stock error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const productsService = new ProductsService();
