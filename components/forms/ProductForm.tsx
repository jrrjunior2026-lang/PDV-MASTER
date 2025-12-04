import React, { useState } from 'react';
import { z } from 'zod';
import { Button } from '../UI';

// Schema de validação para produtos
const productSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  code: z.string()
    .min(1, 'Código é obrigatório')
    .max(20, 'Código deve ter no máximo 20 caracteres')
    .regex(/^[A-Z0-9-_]+$/, 'Código deve conter apenas letras maiúsculas, números, hífen ou underscore'),
  price: z.number()
    .min(0.01, 'Preço deve ser maior que zero')
    .max(999999.99, 'Preço muito alto'),
  cost: z.number()
    .min(0, 'Custo deve ser maior ou igual a zero')
    .optional(),
  stock: z.number()
    .int('Estoque deve ser um número inteiro')
    .min(0, 'Estoque não pode ser negativo'),
  minStock: z.number()
    .int('Estoque mínimo deve ser um número inteiro')
    .min(0, 'Estoque mínimo não pode ser negativo'),
  unit: z.enum(['UN', 'KG', 'LT', 'MT', 'PC']),
  category: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Partial<ProductFormData>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar dados
    const result = productSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0] as string] = error.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Limpar erros e enviar
    setErrors({});
    onSubmit(result.data);
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    // Converter valores numéricos
    if (['price', 'cost', 'stock', 'minStock'].includes(field)) {
      value = value === '' ? 0 : parseFloat(value) || 0;
    }

    setFormData(prev => ({ ...prev, [field]: value }));

    // Limpar erro do campo quando user começa a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Nome do Produto *
        </label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-slate-300'
          }`}
          placeholder="Digite o nome do produto"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Código */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Código/EAN *
        </label>
        <input
          type="text"
          value={formData.code || ''}
          onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono ${
            errors.code ? 'border-red-500' : 'border-slate-300'
          }`}
          placeholder="Ex: PROD001, 7891234567890"
        />
        {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Preço */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Preço de Venda (R$) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.price || ''}
            onChange={(e) => handleInputChange('price', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.price ? 'border-red-500' : 'border-slate-300'
            }`}
            placeholder="0,00"
          />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
        </div>

        {/* Custo */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Custo (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.cost || ''}
            onChange={(e) => handleInputChange('cost', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.cost ? 'border-red-500' : 'border-slate-300'
            }`}
            placeholder="0,00"
          />
          {errors.cost && <p className="text-red-500 text-xs mt-1">{errors.cost}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Estoque */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Estoque Atual *
          </label>
          <input
            type="number"
            min="0"
            value={formData.stock || ''}
            onChange={(e) => handleInputChange('stock', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.stock ? 'border-red-500' : 'border-slate-300'
            }`}
            placeholder="0"
          />
          {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
        </div>

        {/* Estoque Mínimo */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Estoque Mínimo *
          </label>
          <input
            type="number"
            min="0"
            value={formData.minStock || ''}
            onChange={(e) => handleInputChange('minStock', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.minStock ? 'border-red-500' : 'border-slate-300'
            }`}
            placeholder="0"
          />
          {errors.minStock && <p className="text-red-500 text-xs mt-1">{errors.minStock}</p>}
        </div>

        {/* Unidade */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Unidade *
          </label>
          <select
            value={formData.unit || ''}
            onChange={(e) => handleInputChange('unit', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.unit ? 'border-red-500' : 'border-slate-300'
            }`}
          >
            <option value="">Selecione...</option>
            <option value="UN">Unidade (UN)</option>
            <option value="KG">Quilograma (KG)</option>
            <option value="LT">Litro (LT)</option>
            <option value="MT">Metro (MT)</option>
            <option value="PC">Peça (PC)</option>
          </select>
          {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
        </div>
      </div>

      {/* Categoria */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Categoria
        </label>
        <input
          type="text"
          value={formData.category || ''}
          onChange={(e) => handleInputChange('category', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
            errors.category ? 'border-red-500' : 'border-slate-300'
          }`}
          placeholder="Ex: Bebidas, Alimentos, Limpeza..."
        />
        {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Produto'}
        </Button>
      </div>
    </form>
  );
};
