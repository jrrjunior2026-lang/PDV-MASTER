import {
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductBusinessRules,
  ProductService,
  DomainError
} from '../entities/Product';
import { IProductRepository } from '../repositories/ProductRepository';

// Use case result types
export type UseCaseResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: string;
};

// Product use cases - Application layer
export class ProductUseCases {
  constructor(private productRepository: IProductRepository) {}

  // Create product use case
  async createProduct(input: CreateProductInput): Promise<UseCaseResult<Product>> {
    try {
      // Validate business rules
      ProductBusinessRules.validateCreation(input);

      // Check if code already exists
      const existingProduct = await this.productRepository.findByCode(input.code.toUpperCase());
      if (existingProduct) {
        return {
          success: false,
          error: 'Já existe um produto com este código',
          code: 'DUPLICATE_CODE'
        };
      }

      // Create product entity
      const now = new Date();
      const productData = {
        ...input,
        code: input.code.toUpperCase(),
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        isActive: true
      };

      const product = await this.productRepository.create(productData);

      return { success: true, data: product };

    } catch (error) {
      if (error instanceof DomainError) {
        return { success: false, error: error.message };
      }

      console.error('Error creating product:', error);
      return {
        success: false,
        error: 'Erro interno ao criar produto',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Update product use case
  async updateProduct(id: string, input: UpdateProductInput): Promise<UseCaseResult<Product>> {
    try {
      // Check if product exists
      const existingProduct = await this.productRepository.findById(id);
      if (!existingProduct) {
        return {
          success: false,
          error: 'Produto não encontrado',
          code: 'NOT_FOUND'
        };
      }

      // Validate business rules
      ProductBusinessRules.validateUpdate(existingProduct, input);

      // Check code uniqueness if being updated
      if (input.code && input.code.toUpperCase() !== existingProduct.code) {
        const duplicateProduct = await this.productRepository.findByCode(input.code.toUpperCase());
        if (duplicateProduct && duplicateProduct.id !== id) {
          return {
            success: false,
            error: 'Já existe um produto com este código',
            code: 'DUPLICATE_CODE'
          };
        }
        input.code = input.code.toUpperCase();
      }

      // Update product
      const updatedProduct = await this.productRepository.update(id, {
        ...input,
        updatedAt: new Date()
      });

      if (!updatedProduct) {
        return {
          success: false,
          error: 'Erro ao atualizar produto',
          code: 'UPDATE_FAILED'
        };
      }

      return { success: true, data: updatedProduct };

    } catch (error) {
      if (error instanceof DomainError) {
        return { success: false, error: error.message };
      }

      console.error('Error updating product:', error);
      return {
        success: false,
        error: 'Erro interno ao atualizar produto',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Delete product use case
  async deleteProduct(id: string): Promise<UseCaseResult<boolean>> {
    try {
      // Check if product exists
      const product = await this.productRepository.findById(id);
      if (!product) {
        return {
          success: false,
          error: 'Produto não encontrado',
          code: 'NOT_FOUND'
        };
      }

      // Check if product has stock (business rule)
      if (product.stock > 0) {
        return {
          success: false,
          error: 'Não é possível excluir produto com estoque',
          code: 'HAS_STOCK'
        };
      }

      const deleted = await this.productRepository.delete(id);

      return { success: true, data: deleted };

    } catch (error) {
      console.error('Error deleting product:', error);
      return {
        success: false,
        error: 'Erro interno ao excluir produto',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Get product by ID use case
  async getProductById(id: string): Promise<UseCaseResult<Product>> {
    try {
      const product = await this.productRepository.findById(id);

      if (!product) {
        return {
          success: false,
          error: 'Produto não encontrado',
          code: 'NOT_FOUND'
        };
      }

      return { success: true, data: product };

    } catch (error) {
      console.error('Error getting product by ID:', error);
      return {
        success: false,
        error: 'Erro interno ao buscar produto',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Get product by code use case
  async getProductByCode(code: string): Promise<UseCaseResult<Product>> {
    try {
      const product = await this.productRepository.findByCode(code.toUpperCase());

      if (!product) {
        return {
          success: false,
          error: 'Produto não encontrado',
          code: 'NOT_FOUND'
        };
      }

      return { success: true, data: product };

    } catch (error) {
      console.error('Error getting product by code:', error);
      return {
        success: false,
        error: 'Erro interno ao buscar produto',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // List products use case
  async listProducts(options: {
    activeOnly?: boolean;
    category?: string;
    search?: string;
    stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    priceMin?: number;
    priceMax?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<UseCaseResult<Product[]>> {
    try {
      let products: Product[];

      // Apply filters based on options
      if (options.activeOnly && options.category) {
        products = await this.productRepository.findByCategory(options.category);
      } else if (options.activeOnly && options.stockStatus) {
        products = await this.productRepository.findByStockStatus(options.stockStatus);
      } else if (options.activeOnly && options.priceMin !== undefined && options.priceMax !== undefined) {
        products = await this.productRepository.findByPriceRange(options.priceMin, options.priceMax);
      } else if (options.search) {
        products = await this.productRepository.search(options.search);
      } else if (options.activeOnly) {
        products = await this.productRepository.findActive();
      } else if (options.category) {
        products = await this.productRepository.findByCategory(options.category);
      } else {
        products = await this.productRepository.findAll();
      }

      // Apply pagination
      if (options.limit !== undefined && options.offset !== undefined) {
        products = products.slice(options.offset, options.offset + options.limit);
      } else if (options.limit !== undefined) {
        products = products.slice(0, options.limit);
      }

      return { success: true, data: products };

    } catch (error) {
      console.error('Error listing products:', error);
      return {
        success: false,
        error: 'Erro interno ao listar produtos',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Update stock use case
  async updateStock(id: string, quantityDelta: number): Promise<UseCaseResult<Product>> {
    try {
      // Check if product exists
      const product = await this.productRepository.findById(id);
      if (!product) {
        return {
          success: false,
          error: 'Produto não encontrado',
          code: 'NOT_FOUND'
        };
      }

      // Calculate new stock
      const newStock = Math.max(0, product.stock + quantityDelta);

      // Update product
      const updatedProduct = await this.productRepository.update(id, {
        stock: newStock,
        updatedAt: new Date()
      });

      if (!updatedProduct) {
        return {
          success: false,
          error: 'Erro ao atualizar estoque',
          code: 'UPDATE_FAILED'
        };
      }

      return { success: true, data: updatedProduct };

    } catch (error) {
      console.error('Error updating stock:', error);
      return {
        success: false,
        error: 'Erro interno ao atualizar estoque',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Bulk operations use cases
  async bulkUpdateStock(updates: Array<{ id: string; quantityDelta: number }>): Promise<UseCaseResult<boolean>> {
    try {
      const success = await this.productRepository.bulkUpdateStock(updates);
      return success
        ? { success: true, data: true }
        : { success: false, error: 'Erro ao atualizar estoques em lote' };

    } catch (error) {
      console.error('Error bulk updating stock:', error);
      return {
        success: false,
        error: 'Erro interno ao atualizar estoques',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Analytics use cases
  async getInventoryAnalytics(): Promise<UseCaseResult<{
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    lowStockProducts: number;
    totalValue: { cost: number; sale: number; profit: number };
    stockStatus: {
      inStock: number;
      lowStock: number;
      outOfStock: number;
    };
  }>> {
    try {
      const [
        totalProducts,
        statusCount,
        totalValue
      ] = await Promise.all([
        this.productRepository.count(),
        this.productRepository.countByStatus(),
        this.productRepository.getTotalValue()
      ]);

      // Count stock status (we need products for this calculation)
      const activeProducts = await this.productRepository.findActive();
      const stockStatus = {
        inStock: activeProducts.filter(p => p.stock > p.minStock).length,
        lowStock: activeProducts.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
        outOfStock: activeProducts.filter(p => p.stock === 0).length
      };

      return {
        success: true,
        data: {
          totalProducts,
          activeProducts: statusCount.active,
          inactiveProducts: statusCount.inactive,
          lowStockProducts: statusCount.lowStock,
          totalValue,
          stockStatus
        }
      };

    } catch (error) {
      console.error('Error getting inventory analytics:', error);
      return {
        success: false,
        error: 'Erro interno ao gerar analytics',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Helper methods for product calculations (using domain services)
  calculateMargin(product: Product): number {
    return ProductService.calculateMargin(product);
  }

  calculateProfit(product: Product): number {
    return ProductService.calculateProfit(product);
  }

  canSell(product: Product, quantity: number): boolean {
    return ProductService.canSell(product, quantity);
  }

  getStockStatus(product: Product): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'INACTIVE' {
    return ProductService.getStockStatus(product);
  }

  needsReorder(product: Product): boolean {
    return ProductService.needsReorder(product);
  }
}
