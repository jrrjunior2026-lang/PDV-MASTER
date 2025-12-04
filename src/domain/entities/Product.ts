import { z } from 'zod';

// Product entity schema
export const ProductSchema = z.object({
  id: z.string().uuid(),
  code: z.string()
    .min(1, 'Código é obrigatório')
    .max(20, 'Código deve ter no máximo 20 caracteres')
    .regex(/^[A-Z0-9-_]+$/, 'Código deve conter apenas letras maiúsculas, números, hífen ou underscore'),
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().optional(),
  price: z.number()
    .min(0.01, 'Preço deve ser maior que zero')
    .max(999999.99, 'Preço muito alto'),
  cost: z.number()
    .min(0, 'Custo deve ser maior ou igual a zero')
    .optional()
    .default(0),
  stock: z.number()
    .int('Estoque deve ser um número inteiro')
    .min(0, 'Estoque não pode ser negativo'),
  minStock: z.number()
    .int('Estoque mínimo deve ser um número inteiro')
    .min(0, 'Estoque mínimo não pode ser negativo'),
  unit: z.enum(['UN', 'KG', 'LT', 'MT', 'PC']),
  category: z.string().optional(),
  // Brazilian fiscal fields
  ncm: z.string().regex(/^\d{8}(\.\d{2})?$/, 'NCM deve ter 8 dígitos').optional(),
  cest: z.string().regex(/^\d{7}$/, 'CEST deve ter 7 dígitos').optional(),
  origin: z.string().regex(/^[0-9]$/, 'Origem deve ser um dígito 0-9').optional(),
  taxGroup: z.enum(['A', 'B', 'C', 'D']).optional(),
  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean().default(true),
});

// Product entity
export type Product = z.infer<typeof ProductSchema>;

// Product creation input (without system fields)
export const CreateProductSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

// Product update input
export const UpdateProductSchema = ProductSchema.partial().omit({
  id: true,
  createdAt: true
});
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

// Value object for product's stock level
export class StockLevel {
  private constructor(
    private readonly current: number,
    private readonly minimum: number
  ) {}

  static create(current: number, minimum: number): StockLevel {
    if (current < 0) throw new Error('Estoque atual não pode ser negativo');
    if (minimum < 0) throw new Error('Estoque mínimo não pode ser negativo');

    return new StockLevel(current, minimum);
  }

  getCurrent(): number {
    return this.current;
  }

  getMinimum(): number {
    return this.minimum;
  }

  isLowStock(): boolean {
    return this.current <= this.minimum;
  }

  isOutOfStock(): boolean {
    return this.current === 0;
  }

  needsReorder(): boolean {
    return this.current < this.minimum * 1.2; // 120% do mínimo
  }

  toString(): string {
    return `${this.current}/${this.minimum}`;
  }
}

// Domain service for product calculations
export class ProductService {
  static calculateMargin(product: Product): number {
    if (!product.cost || product.cost === 0) return 0;
    return ((product.price - product.cost) / product.cost) * 100;
  }

  static calculateProfit(product: Product): number {
    if (!product.cost) return product.price;
    return product.price - product.cost;
  }

  static canSell(product: Product, quantity: number): boolean {
    return product.stock >= quantity && product.isActive;
  }

  static getStockStatus(product: Product): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'INACTIVE' {
    if (!product.isActive) return 'INACTIVE';
    if (product.stock === 0) return 'OUT_OF_STOCK';
    if (product.stock <= product.minStock) return 'LOW_STOCK';
    return 'IN_STOCK';
  }

  static needsReorder(product: Product): boolean {
    return this.getStockStatus(product) === 'LOW_STOCK' ||
           product.stock < product.minStock * 1.2;
  }
}

// Business rules validation
export class ProductBusinessRules {
  static validateCreation(input: CreateProductInput): void {
    // Check if product code is unique (this would be checked by repository)
    if (!input.code || input.code.trim().length === 0) {
      throw new DomainError('Código do produto é obrigatório');
    }

    if (!input.name || input.name.trim().length < 2) {
      throw new DomainError('Nome do produto deve ter pelo menos 2 caracteres');
    }

    if (input.cost && input.cost >= input.price) {
      throw new DomainError('Custo não pode ser maior ou igual ao preço de venda');
    }

    if (input.stock < 0) {
      throw new DomainError('Estoque inicial não pode ser negativo');
    }

    if (input.minStock < 0) {
      throw new DomainError('Estoque mínimo não pode ser negativo');
    }

    if (input.minStock > input.stock) {
      throw new DomainError('Estoque mínimo não pode ser maior que estoque atual');
    }
  }

  static validateUpdate(product: Product, updates: UpdateProductInput): void {
    const merged = { ...product, ...updates };

    if (merged.name && merged.name.trim().length < 2) {
      throw new DomainError('Nome do produto deve ter pelo menos 2 caracteres');
    }

    if (merged.cost && merged.price && merged.cost >= merged.price) {
      throw new DomainError('Custo não pode ser maior ou igual ao preço de venda');
    }

    if (typeof merged.stock === 'number' && merged.stock < 0) {
      throw new DomainError('Estoque não pode ser negativo');
    }

    if (typeof merged.minStock === 'number' && merged.minStock < 0) {
      throw new DomainError('Estoque mínimo não pode ser negativo');
    }
  }
}

// Domain error
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
