import { z } from 'zod';

// === AUTHENTICATION SCHEMAS ===
export const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'Email é obrigatório')
        .email('Email inválido')
        .toLowerCase(),
    password: z
        .string()
        .min(1, 'Senha é obrigatória')
        .min(4, 'Senha deve ter pelo menos 4 caracteres')
});

export const userSchema = z.object({
    name: z
        .string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(50, 'Nome muito longo')
        .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
    email: z
        .string()
        .email('Email inválido')
        .toLowerCase(),
    password: z
        .string()
        .min(6, 'Senha deve ter pelo menos 6 caracteres')
        .max(50, 'Senha muito longa')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'
        ),
    role: z.enum(['ADMIN', 'CASHIER']).describe('Função deve ser Admin ou Caixa')
});

// === PRODUCT SCHEMAS ===
export const productSchema = z.object({
    code: z
        .string()
        .min(1, 'Código é obrigatório')
        .max(20, 'Código muito longo')
        .regex(/^[\w\-\.]+$/, 'Código deve conter apenas letras, números, hífens e pontos'),
    name: z
        .string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(100, 'Nome muito longo'),
    price: z
        .number()
        .positive('Preço deve ser maior que zero')
        .max(99999.99, 'Preço muito alto'),
    cost: z
        .number()
        .min(0, 'Custo não pode ser negativo')
        .max(99999.99, 'Custo muito alto'),
    stock: z
        .number()
        .min(0, 'Estoque não pode ser negativo'),
    ncm: z
        .string()
        .length(11, 'NCM deve ter exatamente 11 caracteres')
        .regex(/^\d{4}\.\d{2}\.\d{2}$/, 'NCM deve estar no formato XXXX.XX.XX'),
    cest: z
        .string()
        .length(8, 'CEST deve ter exatamente 8 caracteres')
        .regex(/^\d{2}\.\d{3}\.\d{2}$/, 'CEST deve estar no formato XX.XXX.XX'),
    origin: z.enum(['0', '1', '2']),
    taxGroup: z.enum(['A', 'B', 'C']),
    unit: z.enum(['UN', 'KG', 'L']),
    minStock: z
        .number()
        .min(0, 'Estoque mínimo não pode ser negativo')
        .max(9999, 'Estoque mínimo muito alto')
});

// === CUSTOMER SCHEMAS ===
export const customerSchema = z.object({
    name: z
        .string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(100, 'Nome muito longo')
        .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
    document: z
        .string()
        .transform(val => val.replace(/\D/g, '')) // Remove non-digits
        .refine(val => {
            if (val.length === 11) {
                // CPF validation
                if (/^(\d)\1+$/.test(val)) return false; // Not all same digits
                const cpf = val.split('').map(Number);
                let sum = 0, remainder;
                for (let i = 0; i < 9; i++) sum += cpf[i] * (10 - i);
                remainder = (sum * 10) % 11;
                if (remainder === 10 || remainder === 11) remainder = 0;
                if (remainder !== cpf[9]) return false;
                sum = 0;
                for (let i = 0; i < 10; i++) sum += cpf[i] * (11 - i);
                remainder = (sum * 10) % 11;
                if (remainder === 10 || remainder === 11) remainder = 0;
                return remainder === cpf[10];
            } else if (val.length === 14) {
                // CNPJ validation
                if (/^(\d)\1+$/.test(val)) return false; // Not all same digits
                const cnpj = val.split('').map(Number);
                let size = cnpj.length - 2, numbers = cnpj.slice(0, size), digits = cnpj.slice(size);
                let sum = 0, pos = size - 7;
                for (let i = size; i >= 1; i--) {
                    sum += numbers[size - i] * pos--;
                    if (pos < 2) pos = 9;
                }
                let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
                if (result !== digits[0]) return false;
                size = size + 1;
                numbers = cnpj.slice(0, size);
                sum = 0, pos = size - 7;
                for (let i = size; i >= 1; i--) {
                    sum += numbers[size - i] * pos--;
                    if (pos < 2) pos = 9;
                }
                result = sum % 11 < 2 ? 0 : 11 - sum % 11;
                return result === digits[1];
            }
            return false;
        }, 'CPF/CNPJ inválido')
        .transform(val => {
            // Format back
            if (val.length === 11) {
                return val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            } else if (val.length === 14) {
                return val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
            }
            return val;
        }),
    email: z
        .string()
        .optional()
        .refine(val => !val || z.string().email().safeParse(val).success, 'Email inválido'),
    phone: z
        .string()
        .optional()
        .refine(val => !val || /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(val), 'Telefone deve estar no formato (XX) XXXXX-XXXX')
        .transform(val => val?.replace(/\D/g, '') || '')
        .refine(val => !val || val.length >= 10, 'Telefone deve ter pelo menos 10 dígitos'),
    address: z
        .string()
        .max(200, 'Endereço muito longo')
        .optional(),
    creditLimit: z
        .number()
        .min(0, 'Crédito não pode ser negativo')
        .max(99999.99, 'Crédito muito alto')
        .optional()
});

// === FINANCIAL SCHEMAS ===
export const financialRecordSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    description: z
        .string()
        .min(3, 'Descrição deve ter pelo menos 3 caracteres')
        .max(100, 'Descrição muito longa'),
    amount: z
        .number()
        .positive('Valor deve ser maior que zero')
        .max(999999.99, 'Valor muito alto'),
    category: z
        .string()
        .min(2, 'Categoria deve ter pelo menos 2 caracteres')
        .max(30, 'Categoria muito longa'),
    date: z
        .string()
        .refine(val => !isNaN(Date.parse(val)), 'Data inválida'),
    status: z.enum(['PAID', 'PENDING'])
});

// === SETTINGS SCHEMAS ===
export const companySettingsSchema = z.object({
    corporateName: z
        .string()
        .min(5, 'Razão social deve ter pelo menos 5 caracteres')
        .max(100, 'Razão social muito longa'),
    fantasyName: z
        .string()
        .min(3, 'Nome fantasia deve ter pelo menos 3 caracteres')
        .max(50, 'Nome fantasia muito longo'),
    cnpj: z
        .string()
        .transform(val => val.replace(/\D/g, ''))
        .refine(val => val.length === 14, 'CNPJ deve ter 14 dígitos')
        .transform(val => val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')),
    ie: z
        .string()
        .max(20, 'IE muito longa')
        .optional(),
    taxRegime: z.enum(['1', '3']),
    address: z
        .string()
        .min(10, 'Endereço deve ter pelo menos 10 caracteres')
        .max(200, 'Endereço muito longo'),
    phone: z
        .string()
        .min(10, 'Telefone deve ter pelo menos 10 caracteres')
        .max(20, 'Telefone muito longo')
});

export const fiscalSettingsSchema = z.object({
    environment: z.enum(['1', '2']),
    nfeSeries: z
        .number()
        .int('Série deve ser um número inteiro')
        .min(1, 'Série deve ser maior que 0')
        .max(999, 'Série muito alta'),
    nfceSeries: z
        .number()
        .int('Série deve ser um número inteiro')
        .min(1, 'Série deve ser maior que 0')
        .max(999, 'Série muito alta'),
    cscId: z
        .string()
        .min(1, 'CSC ID é obrigatório')
        .max(20, 'CSC ID muito longo'),
    cscToken: z
        .string()
        .min(1, 'CSC Token é obrigatório')
        .max(100, 'CSC Token muito longo')
});

export const paymentSettingsSchema = z.object({
    pixKey: z
        .string()
        .min(1, 'Chave PIX é obrigatória')
        .max(100, 'Chave PIX muito longa'),
    pixKeyType: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'])
});

// Type exports
export type LoginForm = z.infer<typeof loginSchema>;
export type UserForm = z.infer<typeof userSchema>;
export type ProductForm = z.infer<typeof productSchema>;
export type CustomerForm = z.infer<typeof customerSchema>;
export type FinancialRecordForm = z.infer<typeof financialRecordSchema>;
export type CompanySettingsForm = z.infer<typeof companySettingsSchema>;
export type FiscalSettingsForm = z.infer<typeof fiscalSettingsSchema>;
export type PaymentSettingsForm = z.infer<typeof paymentSettingsSchema>;

// Utility functions
export const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
};
