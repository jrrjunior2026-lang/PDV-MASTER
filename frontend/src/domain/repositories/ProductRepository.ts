import { Product, CreateProductInput, UpdateProductInput } from '../entities/Product';

// Repository interface (contract) - DIP principle
export interface IProductRepository {
  // CRUD operations
  findById(id: string): Promise<Product | null>;
  findByCode(code: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  findActive(): Promise<Product[]>;
  findLowStock(): Promise<Product[]>;
  findByCategory(category: string): Promise<Product[]>;

  // Search and filter
  search(query: string): Promise<Product[]>;
  findByPriceRange(min: number, max: number): Promise<Product[]>;
  findByStockStatus(status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'): Promise<Product[]>;

  // Persistence
  create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product>;
  update(id: string, product: UpdateProductInput): Promise<Product | null>;
  delete(id: string): Promise<boolean>;

  // Bulk operations
  bulkUpdate(products: Array<{ id: string; updates: UpdateProductInput }>): Promise<Product[]>;
  bulkUpdateStock(updates: Array<{ id: string; quantityDelta: number }>): Promise<boolean>;

  // Statistics
  count(): Promise<number>;
  countByStatus(): Promise<{ active: number; inactive: number; lowStock: number }>;
  getTotalValue(): Promise<{ cost: number; sale: number; profit: number }>;
}

// Result type for operations that can fail
export type RepositoryResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

// Base repository implementation with common error handling
export abstract class BaseProductRepository implements IProductRepository {
  protected abstract executeFindById(id: string): Promise<Product | null>;
  protected abstract executeFindByCode(code: string): Promise<Product | null>;
  protected abstract executeFindAll(): Promise<Product[]>;
  protected abstract executeCreate(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product>;
  protected abstract executeUpdate(id: string, product: UpdateProductInput): Promise<Product | null>;
  protected abstract executeDelete(id: string): Promise<boolean>;

  // Implemented methods
  async findById(id: string): Promise<Product | null> {
    try {
      return await this.executeFindById(id);
    } catch (error) {
      console.error('Repository error in findById:', error);
      throw new Error('Erro ao buscar produto por ID');
    }
  }

  async findByCode(code: string): Promise<Product | null> {
    try {
      return await this.executeFindByCode(code);
    } catch (error) {
      console.error('Repository error in findByCode:', error);
      throw new Error('Erro ao buscar produto por código');
    }
  }

  async findAll(): Promise<Product[]> {
    try {
      return await this.executeFindAll();
    } catch (error) {
      console.error('Repository error in findAll:', error);
      throw new Error('Erro ao buscar produtos');
    }
  }

  async findActive(): Promise<Product[]> {
    try {
      const products = await this.executeFindAll();
      return products.filter(p => p.isActive);
    } catch (error) {
      console.error('Repository error in findActive:', error);
      throw new Error('Erro ao buscar produtos ativos');
    }
  }

  async findLowStock(): Promise<Product[]> {
    try {
      const products = await this.findActive();
      return products.filter(p => p.stock <= p.minStock);
    } catch (error) {
      console.error('Repository error in findLowStock:', error);
      throw new Error('Erro ao buscar produtos com estoque baixo');
    }
  }

  async findByCategory(category: string): Promise<Product[]> {
    try {
      const products = await this.findActive();
      return products.filter(p => p.category?.toLowerCase() === category.toLowerCase());
    } catch (error) {
      console.error('Repository error in findByCategory:', error);
      throw new Error('Erro ao buscar produtos por categoria');
    }
  }

  async search(query: string): Promise<Product[]> {
    try {
      const products = await this.findActive();
      const searchTerm = query.toLowerCase();

      return products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.code.toLowerCase().includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Repository error in search:', error);
      throw new Error('Erro ao buscar produtos');
    }
  }

  async findByPriceRange(min: number, max: number): Promise<Product[]> {
    try {
      const products = await this.findActive();
      return products.filter(p => p.price >= min && p.price <= max);
    } catch (error) {
      console.error('Repository error in findByPriceRange:', error);
      throw new Error('Erro ao buscar produtos por faixa de preço');
    }
  }

  async findByStockStatus(status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'): Promise<Product[]> {
    try {
      const products = await this.findActive();

      return products.filter(product => {
        switch (status) {
          case 'OUT_OF_STOCK':
            return product.stock === 0;
          case 'LOW_STOCK':
            return product.stock > 0 && product.stock <= product.minStock;
          case 'IN_STOCK':
            return product.stock > product.minStock;
          default:
            return false;
        }
      });
    } catch (error) {
      console.error('Repository error in findByStockStatus:', error);
      throw new Error('Erro ao buscar produtos por status de estoque');
    }
  }

  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    try {
      // Validate business rules first (would be done in use case)
      return await this.executeCreate(product);
    } catch (error) {
      console.error('Repository error in create:', error);
      throw new Error('Erro ao criar produto');
    }
  }

  async update(id: string, product: UpdateProductInput): Promise<Product | null> {
    try {
      return await this.executeUpdate(id, product);
    } catch (error) {
      console.error('Repository error in update:', error);
      throw new Error('Erro ao atualizar produto');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      return await this.executeDelete(id);
    } catch (error) {
      console.error('Repository error in delete:', error);
      throw new Error('Erro ao excluir produto');
    }
  }

  // Default implementations for bulk operations (can be overridden)
  async bulkUpdate(products: Array<{ id: string; updates: UpdateProductInput }>): Promise<Product[]> {
    const results: Product[] = [];

    for (const { id, updates } of products) {
      const updated = await this.update(id, updates);
      if (updated) {
        results.push(updated);
      }
    }

    return results;
  }

  async bulkUpdateStock(updates: Array<{ id: string; quantityDelta: number }>): Promise<boolean> {
    try {
      for (const { id, quantityDelta } of updates) {
        const product = await this.findById(id);
        if (product) {
          const newStock = Math.max(0, product.stock + quantityDelta);
          await this.update(id, { stock: newStock });
        }
      }
      return true;
    } catch (error) {
      console.error('Repository error in bulkUpdateStock:', error);
      return false;
    }
  }

  async count(): Promise<number> {
    try {
      const products = await this.findAll();
      return products.length;
    } catch (error) {
      console.error('Repository error in count:', error);
      return 0;
    }
  }

  async countByStatus(): Promise<{ active: number; inactive: number; lowStock: number }> {
    try {
      const products = await this.findAll();
      const active = products.filter(p => p.isActive).length;
      const inactive = products.filter(p => !p.isActive).length;
      const lowStock = products.filter(p => p.isActive && p.stock <= p.minStock).length;

      return { active, inactive, lowStock };
    } catch (error) {
      console.error('Repository error in countByStatus:', error);
      return { active: 0, inactive: 0, lowStock: 0 };
    }
  }

  async getTotalValue(): Promise<{ cost: number; sale: number; profit: number }> {
    try {
      const products = await this.findActive();

      const totals = products.reduce(
        (acc, product) => {
          const costValue = (product.cost || 0) * product.stock;
          const saleValue = product.price * product.stock;
          const profit = saleValue - costValue;

          return {
            cost: acc.cost + costValue,
            sale: acc.sale + saleValue,
            profit: acc.profit + profit
          };
        },
        { cost: 0, sale: 0, profit: 0 }
      );

      return totals;
    } catch (error) {
      console.error('Repository error in getTotalValue:', error);
      return { cost: 0, sale: 0, profit: 0 };
    }
  }
}
