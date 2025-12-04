import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Mock do localStorage para tests
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    }
  };
};

// Wrapper provider com router
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'queries'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Test data factories
export const createMockProduct = (overrides = {}) => ({
  id: 'test-product-1',
  code: 'PROD001',
  name: 'Produto Teste',
  price: 29.99,
  cost: 20.00,
  stock: 100,
  minStock: 10,
  unit: 'UN' as const,
  category: 'Teste',
  ...overrides
});

export const createMockCustomer = (overrides = {}) => ({
  id: 'test-customer-1',
  name: 'Cliente Teste',
  document: '123.456.789-00',
  email: 'cliente@teste.com',
  phone: '(11) 99999-9999',
  address: 'Rua Teste, 123',
  creditLimit: 1000,
  ...overrides
});

export const createMockSale = (overrides = {}) => ({
  id: 'test-sale-1',
  date: new Date().toISOString(),
  customerId: 'test-customer-1',
  items: [
    {
      id: 'test-product-1',
      code: 'PROD001',
      name: 'Produto Teste',
      price: 29.99,
      qty: 2,
      discount: 0
    }
  ],
  subtotal: 59.98,
  discount: 0,
  total: 59.98,
  paymentMethod: 'CASH' as const,
  status: 'COMPLETED' as const,
  ...overrides
});

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-1',
  name: 'Usuário Teste',
  email: 'usuario@teste.com',
  role: 'ADMIN' as const,
  password: '$2a$12$mockHashForTesting123456789012',
  ...overrides
});

// Helper para simular async delays
export const waitForNextTick = () => new Promise(resolve => setImmediate(resolve));

// Helper para flush promises
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Mock API responses
export const mockApiResponse = (data: any, status = 200) => ({
  status,
  json: () => Promise.resolve(data),
  ok: status >= 200 && status < 300
});

export const mockApiError = (message: string, status = 400) => ({
  status,
  json: () => Promise.resolve({ error: message }),
  ok: false
});

// Re-export all testing library functions
export * from "@testing-library/react";
export * from "@testing-library/user-event";

// Override render method
export { customRender as render };
