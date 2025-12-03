import { useState, useMemo } from 'react';
import { z } from 'zod';

// Generic hook for form validation
export function useValidation<T extends Record<string, any>>(schema: z.ZodSchema<T>) {
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

    const validate = (data: T) => {
        try {
            schema.parse(data);
            setErrors({});
            return { isValid: true, errors: {} };
        } catch (error) {
            if (error instanceof z.ZodError) {
                const validationErrors: Partial<Record<keyof T, string>> = {};

                error.issues.forEach((err) => {
                    const path = err.path.join('.') as keyof T;
                    validationErrors[path] = err.message;
                });

                setErrors(validationErrors);
                return { isValid: false, errors: validationErrors };
            }
            return { isValid: false, errors: { general: 'Erro de validação desconhecido' } };
        }
    };

    const validateField = (field: keyof T, value: any) => {
        try {
            const fieldSchema = (schema as any).shape[field];
            fieldSchema.parse(value);

            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });

            return { isValid: true, error: null };
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errorMessage = error.errors[0]?.message || 'Campo inválido';
                setErrors(prev => ({ ...prev, [field]: errorMessage }));
                return { isValid: false, error: errorMessage };
            }
            return { isValid: false, error: 'Erro de validação desconhecido' };
        }
    };

    const markAsTouched = (field: keyof T) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const clearErrors = () => {
        setErrors({});
        setTouched({});
    };

    const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);
    const getFieldError = (field: keyof T) => errors[field];
    const isFieldTouched = (field: keyof T) => touched[field];

    return {
        errors,
        touched,
        validate,
        validateField,
        markAsTouched,
        clearErrors,
        hasErrors,
        getFieldError,
        isFieldTouched,
        isValid: !hasErrors
    };
}

// Hook for form state management with validation
export function useFormValidation<T extends Record<string, any>>(
    schema: z.ZodSchema<T>,
    initialValues: T
) {
    const [values, setValues] = useState<T>(initialValues);
    const validation = useValidation(schema);

    const setValue = (field: keyof T, value: any) => {
        setValues(prev => ({ ...prev, [field]: value }));
        validation.validateField(field, value);
        validation.markAsTouched(field);
    };

    const setValues = (newValues: Partial<T>) => {
        setValues(prev => ({ ...prev, ...newValues }));
    };

    const reset = () => {
        setValues(initialValues);
        validation.clearErrors();
    };

    const submit = () => {
        validation.markAsTouched(Object.keys(values).reduce((acc, key) => {
            acc[key as keyof T] = true;
            return acc;
        }, {} as Partial<Record<keyof T, boolean>>));

        const result = validation.validate(values);
        return result;
    };

    return {
        values,
        setValue,
        setValues,
        reset,
        submit,
        ...validation
    };
}

// Utility function to format validation errors for display
export function formatValidationErrors(errors: Record<string, string>): string[] {
    return Object.values(errors);
}

// Utility function to get field display name
const FIELD_DISPLAY_NAMES: Record<string, string> = {
    email: 'Email',
    password: 'Senha',
    name: 'Nome',
    document: 'CPF/CNPJ',
    phone: 'Telefone',
    address: 'Endereço',
    creditLimit: 'Limite de Crédito',
    code: 'Código',
    price: 'Preço',
    cost: 'Custo',
    stock: 'Estoque',
    ncm: 'NCM',
    cest: 'CEST',
    minStock: 'Estoque Mínimo',
    description: 'Descrição',
    amount: 'Valor',
    category: 'Categoria',
    date: 'Data',
    status: 'Status',
    corporateName: 'Razão Social',
    fantasyName: 'Nome Fantasia',
    cnpj: 'CNPJ',
    ie: 'Inscrição Estadual',
    taxRegime: 'Regime Tributário',
    environment: 'Ambiente',
    nfeSeries: 'Série NFE',
    nfceSeries: 'Série NFC-e',
    cscId: 'CSC ID',
    cscToken: 'CSC Token',
    pixKey: 'Chave PIX',
    pixKeyType: 'Tipo da Chave PIX',
    role: 'Função',
    type: 'Tipo',
    origin: 'Origem',
    taxGroup: 'Grupo Tributário',
    unit: 'Unidade'
};

export function getFieldDisplayName(field: string): string {
    return FIELD_DISPLAY_NAMES[field] || field;
}
