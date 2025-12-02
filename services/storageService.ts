import { IProduct, IKardexEntry, ISale, TransactionType, ICustomer, IFinancialRecord, IUser, ISettings, ICashRegister, ICashTransaction } from '../types';

// Seed data
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
    environment: '2', // Homologation default
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
  PRODUCTS: 'varejo_br_products',
  KARDEX: 'varejo_br_kardex',
  SALES: 'varejo_br_sales',
  CUSTOMERS: 'varejo_br_customers',
  FINANCE: 'varejo_br_finance',
  SESSION: 'varejo_br_session',
  SETTINGS: 'varejo_br_settings',
  CASH_REGISTER: 'varejo_br_cash_register',
  CASH_TRANSACTIONS: 'varejo_br_cash_transactions',
  USERS: 'varejo_br_users',
};

// Helper to simulate sync delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const StorageService = {
  // Auth
  initUsers: () => {
    if (!localStorage.getItem(KEYS.USERS)) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
  },

  login: async (email: string, password: string): Promise<IUser | null> => {
    StorageService.initUsers();
    await delay(600);
    
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const user = users.find((u: any) => u.email === email && u.password === password);

    if (user) {
      // Remove password before saving to session
      const { password, ...safeUser } = user;
      localStorage.setItem(KEYS.SESSION, JSON.stringify(safeUser));
      return safeUser;
    }
    return null;
  },
  
  logout: () => {
    localStorage.removeItem(KEYS.SESSION);
  },

  getCurrentUser: (): IUser | null => {
    const data = localStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  },

  // Settings
  getSettings: (): ISettings => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },

  saveSettings: (settings: ISettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Products
  getProducts: (): IProduct[] => {
    const data = localStorage.getItem(KEYS.PRODUCTS);
    return data ? JSON.parse(data) : INITIAL_PRODUCTS;
  },
  
  saveProduct: (product: IProduct) => {
    const products = StorageService.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.push(product);
    }
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  saveProductsBatch: (newProducts: IProduct[]) => {
    const products = StorageService.getProducts();
    // Merge strategy: Update if code exists, add if not
    newProducts.forEach(np => {
        const idx = products.findIndex(p => p.code === np.code);
        if (idx >= 0) {
            products[idx] = { ...products[idx], ...np, id: products[idx].id }; // Keep original ID
        } else {
            products.push(np);
        }
    });
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  updateStock: (productId: string, qtyDelta: number, type: TransactionType, docRef: string, desc: string) => {
    const products = StorageService.getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) throw new Error("Product not found");

    const oldStock = product.stock;
    const newStock = oldStock + qtyDelta;
    product.stock = newStock;

    // 1. Update Product
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));

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
    localStorage.setItem(KEYS.KARDEX, JSON.stringify(kardex));
  },

  // Kardex
  getKardex: (): IKardexEntry[] => {
    const data = localStorage.getItem(KEYS.KARDEX);
    return data ? JSON.parse(data) : [];
  },

  // Customers
  getCustomers: (): ICustomer[] => {
    const data = localStorage.getItem(KEYS.CUSTOMERS);
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
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  // Finance
  getFinancialRecords: (): IFinancialRecord[] => {
    const data = localStorage.getItem(KEYS.FINANCE);
    return data ? JSON.parse(data) : INITIAL_FINANCE;
  },

  addFinancialRecord: (record: IFinancialRecord) => {
    const records = StorageService.getFinancialRecords();
    records.push(record);
    localStorage.setItem(KEYS.FINANCE, JSON.stringify(records));
  },

  // Cash Register Management
  getCurrentRegister: (): ICashRegister | null => {
    const data = localStorage.getItem(KEYS.CASH_REGISTER);
    if (!data) return null;
    const register = JSON.parse(data) as ICashRegister;
    return register.status === 'OPEN' ? register : null;
  },

  getLastClosedRegister: (): ICashRegister | null => {
    const data = localStorage.getItem(KEYS.CASH_REGISTER);
    if (!data) return null;
    const register = JSON.parse(data) as ICashRegister;
    return register.status === 'CLOSED' ? register : null;
  },

  // Calculate detailed summary for the current open register
  getRegisterSummary: () => {
    const register = StorageService.getCurrentRegister();
    if (!register) return null;

    const allTx = JSON.parse(localStorage.getItem(KEYS.CASH_TRANSACTIONS) || '[]') as ICashTransaction[];
    const currentTx = allTx.filter(tx => tx.registerId === register.id);

    const summary = {
      opening: register.openingBalance,
      supply: 0,
      bleed: 0,
      salesCash: 0,
      calculated: 0
    };

    currentTx.forEach(tx => {
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
    localStorage.setItem(KEYS.CASH_REGISTER, JSON.stringify(register));
    StorageService.addCashTransaction({
      id: crypto.randomUUID(),
      registerId: register.id,
      type: 'OPENING',
      amount: openingBalance,
      description: 'Abertura de Caixa',
      date: new Date().toISOString()
    });
    return register;
  },

  closeRegister: (userCountedAmount: number) => {
    const register = StorageService.getCurrentRegister();
    if (!register) return;
    
    // Get summary to check data integrity
    const summary = StorageService.getRegisterSummary();
    const systemBalance = summary ? summary.calculated : register.currentBalance;

    register.status = 'CLOSED';
    register.closedAt = new Date().toISOString();
    register.finalCount = userCountedAmount;
    register.difference = userCountedAmount - systemBalance;
    
    // Update Register Entity
    localStorage.setItem(KEYS.CASH_REGISTER, JSON.stringify(register));
    
    // Log the Closing Transaction (Using system balance for continuity, but Register object has the real count)
    StorageService.addCashTransaction({
      id: crypto.randomUUID(),
      registerId: register.id,
      type: 'CLOSING',
      amount: systemBalance,
      description: `Fechamento de Caixa. Físico: ${userCountedAmount.toFixed(2)} / Dif: ${register.difference.toFixed(2)}`,
      date: new Date().toISOString()
    });

    return register;
  },

  addCashTransaction: (tx: ICashTransaction) => {
    const history = JSON.parse(localStorage.getItem(KEYS.CASH_TRANSACTIONS) || '[]');
    history.push(tx);
    localStorage.setItem(KEYS.CASH_TRANSACTIONS, JSON.stringify(history));

    // Update Register Balance if open
    const register = StorageService.getCurrentRegister();
    if (register && register.id === tx.registerId) {
       if (tx.type === 'SUPPLY' || tx.type === 'SALE' || tx.type === 'OPENING') {
          register.currentBalance += tx.amount;
       } else if (tx.type === 'BLEED') {
          register.currentBalance -= tx.amount;
       }
       localStorage.setItem(KEYS.CASH_REGISTER, JSON.stringify(register));
    }
  },

  // Sales (POS)
  getSales: (): ISale[] => {
    const data = localStorage.getItem(KEYS.SALES);
    return data ? JSON.parse(data) : [];
  },

  createSale: async (sale: ISale): Promise<ISale | null> => {
    await delay(300); // Simulate API latency
    const sales = StorageService.getSales();
    sales.push(sale);
    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));

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

    // Automatically generate financial record
    const record: IFinancialRecord = {
      id: crypto.randomUUID(),
      type: 'INCOME',
      description: `Venda PDV #${sale.id.slice(0,8)}`,
      amount: sale.total,
      category: 'Vendas',
      date: sale.date,
      status: 'PAID', // Assuming POS is immediate payment
      referenceId: sale.id
    };
    StorageService.addFinancialRecord(record);

    // Update Cash Register
    const register = StorageService.getCurrentRegister();
    if (register && sale.paymentMethod === 'CASH') {
        StorageService.addCashTransaction({
            id: crypto.randomUUID(),
            registerId: register.id,
            type: 'SALE',
            amount: sale.total,
            description: `Venda ${sale.id.slice(0,8)}`,
            date: new Date().toISOString()
        });
    }

    return sale;
  }
};