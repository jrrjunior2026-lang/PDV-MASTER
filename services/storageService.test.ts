import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StorageService } from './storageService';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$12$mockedHash1234567890123456'),
    compare: vi.fn().mockResolvedValue(true)
  }
}));

// Mock AuditService
vi.mock('./auditService', () => ({
  AuditService: {
    log: vi.fn()
  }
}));

describe('StorageService', () => {
  beforeEach(() => {
    // Clear all localStorage mocks
    vi.clearAllMocks();
  });

  describe('User Management', () => {
    it('should initialize users with hashed passwords', async () => {
      const bcrypt = await import('bcryptjs');

      await StorageService.initUsers();

      expect(bcrypt.default.hash).toHaveBeenCalledWith('admin', 12);
      expect(bcrypt.default.hash).toHaveBeenCalledWith('caixa', 12);

      const users = StorageService.getUsers();
      expect(users).toHaveLength(2);
      expect(users[0].password).toBe('$2a$12$mockedHash1234567890123456');
      expect(users[0].email).toBe('admin@pdvmaster.br');
    });

    it('should migrate plain text passwords', async () => {
      const bcrypt = await import('bcryptjs');

      // Simulate existing users with plain text passwords
      const mockUsers = [
        { id: '1', name: 'Test User', email: 'test@test.com', password: 'plaintext', role: 'ADMIN' }
      ];

      // Mock getUsers to return plain text users
      const originalGetUsers = StorageService.getUsers;
      vi.spyOn(StorageService, 'getUsers').mockReturnValue(mockUsers);

      // Mock setItem
      const setItemSpy = vi.fn();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(setItemSpy);

      await StorageService.migratePasswords();

      expect(bcrypt.default.hash).toHaveBeenCalledWith('plaintext', 12);
      expect(setItemSpy).toHaveBeenCalled();
    });

    it('should login user with correct credentials', async () => {
      const bcrypt = await import('bcryptjs');

      await StorageService.initUsers();

      const result = await StorageService.login('admin@pdvmaster.br', 'admin');

      expect(bcrypt.default.compare).toHaveBeenCalledWith('admin', '$2a$12$mockedHash1234567890123456');
      expect(result?.email).toBe('admin@pdvmaster.br');
      expect(result?.role).toBe('ADMIN');
      expect(result).not.toHaveProperty('password'); // Password should not be exposed
    });

    it('should reject login with incorrect credentials', async () => {
      await StorageService.initUsers();

      const result = await StorageService.login('admin@pdvmaster.br', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return current user from session', () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@test.com', role: 'ADMIN' };

      // Mock sessionStorage
      vi.spyOn(Storage.prototype, 'getItem')
        .mockReturnValueOnce(null) // users not initialized
        .mockReturnValueOnce(JSON.stringify(mockUser)); // existing session

      const result = StorageService.getCurrentUser();
      expect(result).toEqual(mockUser);
    });

    it('should logout user', () => {
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      StorageService.logout();

      expect(removeItemSpy).toHaveBeenCalledWith('pdv_master_session');
    });
  });

  describe('Product Management', () => {
    it('should return initial products when none stored', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const products = StorageService.getProducts();

      expect(products).toHaveLength(4); // Initial products
      expect(products[0].name).toBe('Arroz Branco 5kg');
      expect(getItemSpy).toHaveBeenCalledWith('pdv_master_products');
    });

    it('should save and retrieve product', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const newProduct = {
        id: 'test-1',
        code: 'TEST001',
        name: 'Produto Teste',
        price: 29.99,
        cost: 20.00,
        stock: 100,
        minStock: 10,
        unit: 'UN' as const
      };

      StorageService.saveProduct(newProduct);

      expect(setItemSpy).toHaveBeenCalledWith(
        'pdv_master_products',
        expect.stringContaining('"name":"Produto Teste"')
      );
    });

    it('should update stock correctly', () => {
      const { TransactionType } = require('../types');

      // Setup initial products
      const products = [{ id: 'test-1', name: 'Test', stock: 100 }];
      vi.spyOn(StorageService, 'getProducts').mockReturnValue(products);
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      StorageService.updateStock('test-1', -10, TransactionType.SALE, 'sale-123', 'Venda');

      expect(setItemSpy).toHaveBeenCalledWith(
        'pdv_master_products',
        expect.stringContaining('"stock":90')
      );
    });

    it('should throw error for invalid product update', () => {
      const { TransactionType } = require('../types');

      vi.spyOn(StorageService, 'getProducts').mockReturnValue([]);

      expect(() => {
        StorageService.updateStock('invalid-id', -10, TransactionType.SALE, 'sale-123', 'Venda');
      }).toThrow('Product not found');
    });
  });

  describe('Customer Management', () => {
    it('should return initial customers when none stored', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const customers = StorageService.getCustomers();

      expect(customers).toHaveLength(2);
      expect(customers[0].name).toBe('Cliente Consumidor');
      expect(customers[1].name).toBe('Maria Silva');
    });

    it('should save customer successfully', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const newCustomer = {
        id: 'test-customer-1',
        name: 'João Teste',
        document: '123.456.789-00',
        email: 'joao@teste.com'
      };

      StorageService.saveCustomer(newCustomer);

      expect(setItemSpy).toHaveBeenCalledWith(
        'pdv_master_customers',
        expect.stringContaining('"name":"João Teste"')
      );
    });
  });

  describe('Sales Management', () => {
    beforeEach(() => {
      vi.clearAllTimers();
    });

    it('should create sale and update stock', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const getProductsSpy = vi.spyOn(StorageService, 'getProducts').mockReturnValue([
        { id: 'prod-1', name: 'Test Product', stock: 100, unit: 'UN' }
      ]);

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const sale = {
        id: 'sale-123',
        date: new Date().toISOString(),
        customerId: null,
        items: [{ id: 'prod-1', qty: 2 }],
        subtotal: 59.98,
        total: 59.98,
        paymentMethod: 'CASH' as const,
        status: 'COMPLETED' as const
      };

      const result = await StorageService.createSale(sale);

      expect(result).toEqual(sale);
      expect(setItemSpy).toHaveBeenCalled();
      expect(getProductsSpy).toHaveBeenCalled();
    });

    it('should return empty sales array when none stored', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const sales = StorageService.getSales();

      expect(sales).toEqual([]);
    });
  });

  describe('Cash Register Management', () => {
    it('should open register successfully', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const addTransactionSpy = vi.spyOn(StorageService, 'addCashTransaction').mockImplementation(() => {});

      const register = StorageService.openRegister(500.00, 'user-123');

      expect(register.openingBalance).toBe(500.00);
      expect(register.currentBalance).toBe(500.00);
      expect(register.operatorId).toBe('user-123');
      expect(register.status).toBe('OPEN');

      expect(setItemSpy).toHaveBeenCalledWith(
        'pdv_master_cash_register',
        expect.stringContaining('"openingBalance":500')
      );
      expect(addTransactionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'OPENING', amount: 500.00 })
      );
    });

    it('should close register with correct calculations', () => {
      const mockRegister = {
        id: 'reg-123',
        status: 'OPEN' as const,
        openingBalance: 500.00,
        currentBalance: 550.00,
        operatorId: 'user-123'
      };

      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(mockRegister));
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const closedRegister = StorageService.closeRegister(540.00);

      expect(closedRegister?.status).toBe('CLOSED');
      expect(closedRegister?.finalCount).toBe(540.00);
      expect(closedRegister?.difference).toBe(-10.00); // 550 - 540

      expect(setItemSpy).toHaveBeenCalledWith(
        'pdv_master_cash_register_history',
        expect.any(String)
      );
    });

    it('should return null when closing register without active register', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const result = StorageService.closeRegister(540.00);

      expect(result).toBeUndefined();
    });
  });

  describe('Settings Management', () => {
    it('should return default settings when none stored', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const settings = StorageService.getSettings();

      expect(settings.company.corporateName).toBe('Minha Loja LTDA');
      expect(settings.company.fantasyName).toBe('PDV MASTER Supermercados');
      expect(settings.fiscal.environment).toBe('2'); // Homologation
    });

    it('should save settings successfully', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const newSettings = {
        id: '1',
        company: {
          corporateName: 'Test Company',
          fantasyName: 'Test Store',
          cnpj: '00.000.000/0001-00'
        }
      };

      StorageService.saveSettings(newSettings as any);

      expect(setItemSpy).toHaveBeenCalledWith(
        'pdv_master_settings',
        expect.stringContaining('"corporateName":"Test Company"')
      );
    });
  });
});
