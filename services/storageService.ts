import { IProduct, IKardexEntry, ISale, TransactionType, ICustomer, IFinancialRecord, IUser, ISettings, ICashRegister, ICashTransaction } from '../types';
import { AuditService } from './auditService'; // Import Audit
import bcrypt from 'bcryptjs';

// --- INITIAL SEED DATA ---
const INITIAL_PRODUCTS: IProduct[] = [
  { id: '1', code: '7891000100103', name: 'Arroz Branco 5kg', price: 29.90, cost: 22.50, stock: 150, ncm: '1006.30.21', cest: '17.001.00', origin: '0', taxGroup: 'A', unit: 'UN', minStock: 20 },
  { id: '2', code: '7891000200201', name: 'Feijão Carioca 1kg', price: 8.50, cost: 5.20, stock: 300, ncm: '0713.33.99', cest: '17.002.00', origin: '0', taxGroup: 'A', unit: 'UN', minStock: 50 },
  { id: '3', code: '7894900011517', name: 'Refrigerante Cola 2L', price: 10.99, cost: 7.50, stock: 45, ncm: '2202.10.00', cest: '03.007.00', origin: '0', taxGroup: 'B', unit: 'UN', minStock: 24 },
  { id: '4', code: '2000000000012', name: 'Pão Francês', price: 14.99, cost: 6.00, stock: 10.5, ncm: '1905.90.90', cest: '17.062.00', origin: '0', taxGroup: 'A', unit: 'KG', minStock: 5 },
];

const INITIAL_CUSTOMERS: ICustomer[] = [
  { id: '1', name: 'Cliente Consumidor', document: '000.000.000-00', email: '', phone: '', address: 'Balcão' },
  { id: '2', name: 'Maria Silva', document: '123.456.789-00', email: 'maria@email.com', phone: '(11) 99999-9999', address: 'Rua A, 123', creditLimit: 500 },
];

const INITIAL_FINANCE: IFinancialRecord[] = [
  { id: '1', type: 'EXPENSE', description: 'Conta de Energia', amount: 1250.00, category: 'Utilidades', date: new Date().toISOString(), status: 'PENDING' },
  { id: '2', type: 'INCOME', description: 'Vendas do Dia Anterior', amount: 4500.00, category: 'Vendas', date: new Date().toISOString(), status: 'PAID' },
];

const INITIAL_USERS = [
  { id: '1', name: 'Administrador', email: 'admin@pdvmaster.br', password: 'admin', role: 'ADMIN' },
  { id: '2', name: 'Operador de Caixa', email: 'caixa@pdvmaster.br', password: 'caixa', role: 'CASHIER' }
];

const DEFAULT_SETTINGS: ISettings = {
  id: '1',
  company: {
    corporateName: 'Minha Loja LTDA',
    fantasyName: 'PDV MASTER Supermercados',
    cnpj: '00.000.000/0001-00',
    ie: '',
    taxRegime: '1',
    address: 'Rua Exemplo, 1000 - Centro, SP',
    phone: '(11) 90000-0000'
  },
  fiscal: {
    environment: '2',
    nfeSeries: 1,
    nfceSeries: 1,
    cscId: '000001',
    cscToken: 'TOKEN-DE-HOMOLOGACAO-SEFAZ'
  },
  payment: {
    pixKey: '00.000.000/0001-00',
    pixKeyType: 'CNPJ'
  },
  appearance: {
    logoUrl: null,
    primaryColor: '#0ea5e9'
  }
};

const KEYS = {
  PRODUCTS: 'pdv_master_products',
  KARDEX: 'pdv_master_kardex',
  SALES: 'pdv_master_sales',
  CUSTOMERS: 'pdv_master_customers',
  FINANCE: 'pdv_master_finance',
  SESSION: 'pdv_master_session',
  SETTINGS: 'pdv_master_settings',
  CASH_REGISTER: 'pdv_master_cash_register',
  CASH_TRANSACTIONS: 'pdv_master_cash_transactions',
  USERS: 'pdv_master_users',
  CASH_REGISTER_HISTORY: 'pdv_master_cash_register_history'
};

// --- SAFE STORAGE WRAPPER ---
const memoryStorage: Record<string, string> = {};

const SafeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return memoryStorage[key] || null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      memoryStorage[key] = value;
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete memoryStorage[key];
    }
  }
};

// Helper for simulating async behavior
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const StorageService = {
  // Auth - Security enhanced with bcrypt
  initUsers: async () => {
    if (!SafeStorage.getItem(KEYS.USERS)) {
      // Hash initial passwords
      const hashedUsers = await Promise.all(INITIAL_USERS.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 12)
      })));
      SafeStorage.setItem(KEYS.USERS, JSON.stringify(hashedUsers));
    } else {
      // Migrate plain text passwords to hashed if any exist
      await StorageService.migratePasswords();
    }
  },

  migratePasswords: async () => {
    const users = JSON.parse(SafeStorage.getItem(KEYS.USERS) || '[]');
    let needsUpdate = false;

    for (const user of users) {
      // Check if password is not hashed (plain text passwords are typically short and don't start with bcrypt hash)
      if (user.password && user.password.length < 60 && !user.password.startsWith('$2a$')) {
        console.log(`Migrating password for user: ${user.email}`);
        user.password = await bcrypt.hash(user.password, 12);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      SafeStorage.setItem(KEYS.USERS, JSON.stringify(users));
      console.log('Password migration completed');
    }
  },

  getUsers: (): any[] => {
    const users = SafeStorage.getItem(KEYS.USERS);
    return users ? JSON.parse(users) : [];
  },

  saveUser: async (userData: any) => {
    const users = StorageService.getUsers();
    const index = users.findIndex((u: any) => u.id === userData.id);
    let action = 'Criou';

    // Hash password if provided and not already hashed
    if (userData.password && !userData.password.startsWith('$2a$')) {
      userData.password = await bcrypt.hash(userData.password, 12);
    }

    if (index >= 0) {
      users[index] = { ...users[index], ...userData };
      action = 'Editou';
    } else {
      users.push({ ...userData, id: crypto.randomUUID() });
    }

    SafeStorage.setItem(KEYS.USERS, JSON.stringify(users));
    AuditService.log('USER_MGMT', `${action} usuário: ${userData.name} (${userData.role})`, 'WARNING');
  },

  deleteUser: (id: string) => {
    let users = StorageService.getUsers();
    const userToDelete = users.find((u: any) => u.id === id);
    users = users.filter((u: any) => u.id !== id);
    SafeStorage.setItem(KEYS.USERS, JSON.stringify(users));
    AuditService.log('USER_MGMT', `Excluiu usuário: ${userToDelete?.name || id}`, 'CRITICAL');
  },

  login: async (email: string, password: string): Promise<IUser | null> => {
    await StorageService.initUsers();
    await delay(300);

    const users = StorageService.getUsers();
    const user = users.find((u: any) => u.email === email);

    if (user && await bcrypt.compare(password, user.password)) {
      const { password: _, ...safeUser } = user;
      SafeStorage.setItem(KEYS.SESSION, JSON.stringify(safeUser));
      AuditService.log('LOGIN', `Acesso realizado: ${safeUser.name}`, 'INFO', safeUser);
      return safeUser;
    }
    return null;
  },

  logout: () => {
    const user = StorageService.getCurrentUser();
    if (user) AuditService.log('LOGOUT', `Saída do sistema: ${user.name}`, 'INFO');
    SafeStorage.removeItem(KEYS.SESSION);
  },

  getCurrentUser: (): IUser | null => {
    const data = SafeStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  },

  // Settings
  getSettings: (): ISettings => {
    const data = SafeStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },

  saveSettings: (settings: ISettings) => {
    SafeStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    AuditService.log('SETTINGS_CHANGE', 'Configurações do sistema alteradas', 'WARNING');
  },

  // Products
  getProducts: (): IProduct[] => {
    const data = SafeStorage.getItem(KEYS.PRODUCTS);
    return data ? JSON.parse(data) : INITIAL_PRODUCTS;
  },

  saveProduct: (product: IProduct) => {
    const products = StorageService.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    let action = "Criou";
    if (index >= 0) {
      products[index] = product;
      action = "Editou";
    } else {
      products.push(product);
    }
    SafeStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    AuditService.log('STOCK_UPDATE', `${action} produto: ${product.name} (Estoque: ${product.stock})`, 'INFO');
  },

  saveProductsBatch: (newProducts: IProduct[]) => {
    const products = StorageService.getProducts();
    newProducts.forEach(np => {
      const idx = products.findIndex(p => p.code === np.code);
      if (idx >= 0) {
        products[idx] = { ...products[idx], ...np, id: products[idx].id };
      } else {
        products.push(np);
      }
    });
    SafeStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    AuditService.log('STOCK_UPDATE', `Importação em lote: ${newProducts.length} produtos processados`, 'WARNING');
  },

  updateStock: (productId: string, qtyDelta: number, type: TransactionType, docRef: string, desc: string) => {
    const products = StorageService.getProducts();
    const product = products.find(p => p.id === productId);

    if (!product) throw new Error("Product not found");

    const oldStock = product.stock;
    const newStock = oldStock + qtyDelta;
    product.stock = newStock;

    // 1. Update Product
    SafeStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));

    // 2. Add Kardex Entry
    const entry: IKardexEntry = {
      id: crypto.randomUUID(),
      productId,
      date: new Date().toISOString(),
      type,
      quantity: qtyDelta,
      balanceAfter: newStock,
      documentRef: docRef,
      description: desc
    };

    const kardex = StorageService.getKardex();
    kardex.push(entry);
    SafeStorage.setItem(KEYS.KARDEX, JSON.stringify(kardex));

    // Log manual adjustments explicitly
    if (type === TransactionType.ADJUSTMENT) {
      AuditService.log('STOCK_UPDATE', `Ajuste manual: ${product.name} (${qtyDelta > 0 ? '+' : ''}${qtyDelta}). Motivo: ${desc}`, 'WARNING');
    }
  },

  // Kardex
  getKardex: (): IKardexEntry[] => {
    const data = SafeStorage.getItem(KEYS.KARDEX);
    return data ? JSON.parse(data) : [];
  },

  // Customers
  getCustomers: (): ICustomer[] => {
    const data = SafeStorage.getItem(KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : INITIAL_CUSTOMERS;
  },

  saveCustomer: (customer: ICustomer) => {
    const customers = StorageService.getCustomers();
    const index = customers.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      customers[index] = customer;
    } else {
      customers.push(customer);
    }
    SafeStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  // Finance
  getFinancialRecords: (): IFinancialRecord[] => {
    const data = SafeStorage.getItem(KEYS.FINANCE);
    return data ? JSON.parse(data) : INITIAL_FINANCE;
  },

  addFinancialRecord: (record: IFinancialRecord) => {
    const records = StorageService.getFinancialRecords();
    records.push(record);
    SafeStorage.setItem(KEYS.FINANCE, JSON.stringify(records));
  },

  // Cash Register Management
  getCurrentRegister: (): ICashRegister | null => {
    const data = SafeStorage.getItem(KEYS.CASH_REGISTER);
    if (!data) return null;
    const register = JSON.parse(data) as ICashRegister;
    return register.status === 'OPEN' ? register : null;
  },

  getLastClosedRegister: (): ICashRegister | null => {
    const history = JSON.parse(SafeStorage.getItem(KEYS.CASH_REGISTER_HISTORY) || '[]');
    if (history.length > 0) {
      return history[history.length - 1];
    }
    return null;
  },

  getRegisterSummary: () => {
    const register = StorageService.getCurrentRegister();
    if (!register) return null;

    const txs = JSON.parse(SafeStorage.getItem(KEYS.CASH_TRANSACTIONS) || '[]').filter((tx: ICashTransaction) => tx.registerId === register.id);

    const summary = {
      opening: register.openingBalance,
      supply: 0, bleed: 0, salesCash: 0, calculated: 0
    };

    txs.forEach((tx: ICashTransaction) => {
      if (tx.type === 'SUPPLY') summary.supply += tx.amount;
      if (tx.type === 'BLEED') summary.bleed += tx.amount;
      if (tx.type === 'SALE') summary.salesCash += tx.amount;
    });

    summary.calculated = summary.opening + summary.supply + summary.salesCash - summary.bleed;
    return summary;
  },

  openRegister: (openingBalance: number, operatorId: string) => {
    const register: ICashRegister = {
      id: crypto.randomUUID(),
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      openingBalance,
      currentBalance: openingBalance,
      operatorId
    };
    SafeStorage.setItem(KEYS.CASH_REGISTER, JSON.stringify(register));
    StorageService.addCashTransaction({
      id: crypto.randomUUID(),
      registerId: register.id,
      type: 'OPENING',
      amount: openingBalance,
      description: 'Abertura de Caixa',
      date: new Date().toISOString()
    });
    AuditService.log('REGISTER_OPEN', `Caixa aberto com R$ ${openingBalance.toFixed(2)}`, 'INFO');
    return register;
  },

  closeRegister: (userCountedAmount: number): ICashRegister | undefined => {
    const register = StorageService.getCurrentRegister();
    if (!register) return;

    const summary = StorageService.getRegisterSummary();
    const systemBalance = summary ? summary.calculated : register.currentBalance;
    const diff = userCountedAmount - systemBalance;

    register.status = 'CLOSED';
    register.closedAt = new Date().toISOString();
    register.finalCount = userCountedAmount;
    register.difference = diff;
    register.currentBalance = systemBalance;

    // Move to history
    const history = JSON.parse(SafeStorage.getItem(KEYS.CASH_REGISTER_HISTORY) || '[]');
    history.push(register);
    SafeStorage.setItem(KEYS.CASH_REGISTER_HISTORY, JSON.stringify(history));

    // Clear current register
    SafeStorage.removeItem(KEYS.CASH_REGISTER);

    StorageService.addCashTransaction({
      id: crypto.randomUUID(),
      registerId: register.id,
      type: 'CLOSING',
      amount: systemBalance,
      description: `Fechamento. Contado: ${userCountedAmount}`,
      date: new Date().toISOString()
    });

    const severity = Math.abs(diff) > 10 ? 'CRITICAL' : (Math.abs(diff) > 0 ? 'WARNING' : 'INFO');
    AuditService.log('REGISTER_CLOSE', `Caixa fechado. Dif: R$ ${diff.toFixed(2)} (Físico: ${userCountedAmount} vs Sist: ${systemBalance})`, severity);

    return register;
  },

  addCashTransaction: (tx: ICashTransaction) => {
    const history = JSON.parse(SafeStorage.getItem(KEYS.CASH_TRANSACTIONS) || '[]');
    history.push(tx);
    SafeStorage.setItem(KEYS.CASH_TRANSACTIONS, JSON.stringify(history));

    const register = StorageService.getCurrentRegister();
    if (register && register.id === tx.registerId) {
      if (tx.type === 'SUPPLY' || tx.type === 'SALE') {
        register.currentBalance += tx.amount;
      } else if (tx.type === 'BLEED') {
        register.currentBalance -= tx.amount;
      }
      SafeStorage.setItem(KEYS.CASH_REGISTER, JSON.stringify(register));
    }
  },

  // Sales (POS)
  getSales: (): ISale[] => {
    const data = SafeStorage.getItem(KEYS.SALES);
    return data ? JSON.parse(data) : [];
  },

  createSale: async (sale: ISale): Promise<ISale | null> => {
    await delay(300); // Simulate API latency
    const sales = StorageService.getSales();
    sales.push(sale);
    SafeStorage.setItem(KEYS.SALES, JSON.stringify(sales));

    // Update stock for each item
    sale.items.forEach(item => {
      StorageService.updateStock(
        item.id,
        -item.qty,
        TransactionType.SALE,
        sale.id,
        `Venda PDV #${sale.id.slice(0, 8)}`
      );
    });

    const record: IFinancialRecord = {
      id: crypto.randomUUID(),
      type: 'INCOME',
      description: `Venda PDV #${sale.id.slice(0, 8)}`,
      amount: sale.total,
      category: 'Vendas',
      date: sale.date,
      status: 'PAID',
      referenceId: sale.id
    };
    StorageService.addFinancialRecord(record);

    if (sale.paymentMethod === 'CASH') {
      const register = StorageService.getCurrentRegister();
      if (register) {
        StorageService.addCashTransaction({
          id: crypto.randomUUID(),
          registerId: register.id,
          type: 'SALE',
          amount: sale.total,
          description: `Venda ${sale.id.slice(0, 8)}`,
          date: new Date().toISOString()
        });
      }
    }

    AuditService.log('SALE_COMPLETE', `Venda #${sale.id.slice(0, 8)} finalizada. Total: R$ ${sale.total.toFixed(2)}`, 'INFO');

    return sale;
  },

  // Report-specific getters
  getSalesByPeriod(start: Date, end: Date): ISale[] {
    const sales = this.getSales();
    return sales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate >= start && saleDate <= end;
    });
  },

  getClosedRegisters(): ICashRegister[] {
    const history = SafeStorage.getItem(KEYS.CASH_REGISTER_HISTORY);
    return history ? JSON.parse(history) : [];
  },

  getAllCashTransactions(): ICashTransaction[] {
    const txs = SafeStorage.getItem(KEYS.CASH_TRANSACTIONS);
    return txs ? JSON.parse(txs) : [];
  },

  getFinancialRecordsByPeriod(start: Date, end: Date): IFinancialRecord[] {
    const records = StorageService.getFinancialRecords();
    return records.filter(r => {
      const d = new Date(r.date);
      return d >= start && d <= end;
    });
  }
};
