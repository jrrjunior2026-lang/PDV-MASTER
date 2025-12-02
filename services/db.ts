
import Dexie, { Table } from 'dexie';
import { IProduct, IKardexEntry, ISale, ICustomer, IFinancialRecord, IUser, ISettings, ICashRegister, ICashTransaction } from '../types';

export class PDVMasterDB extends Dexie {
  products!: Table<IProduct, string>;
  sales!: Table<ISale, string>;
  customers!: Table<ICustomer, string>;
  kardex!: Table<IKardexEntry, string>;
  financial!: Table<IFinancialRecord, string>;
  users!: Table<IUser, string>;
  settings!: Table<ISettings, string>; // Will store a single record with ID '1'
  cashRegisters!: Table<ICashRegister, string>;
  cashTransactions!: Table<ICashTransaction, string>;

  constructor() {
    super('PDVMasterDB');
    
    // Define Database Schema (SQL-like but NoSQL)
    // Added 'synced' index to easily find pending uploads
    // FIX: Cast `this` to Dexie to resolve TypeScript type inference issue with the `version` method.
    (this as Dexie).version(1).stores({
      products: 'id, code, name, synced', 
      sales: 'id, date, customerId, synced',
      customers: 'id, document, name, synced',
      kardex: 'id, productId, date, type, synced',
      financial: 'id, date, type, status, synced',
      users: 'id, email',
      settings: 'id', // Singleton
      cashRegisters: 'id, status, operatorId, synced',
      cashTransactions: 'id, registerId, type, synced'
    });
  }
}

export const db = new PDVMasterDB();

// --- INITIAL SEED DATA ---
// Populates DB on first run only

const INITIAL_PRODUCTS: IProduct[] = [
  { id: '1', code: '7891000100103', name: 'Arroz Branco 5kg', price: 29.90, cost: 22.50, stock: 150, ncm: '1006.30.21', cest: '17.001.00', origin: '0', taxGroup: 'A', unit: 'UN', minStock: 20, synced: 0 },
  { id: '2', code: '7891000200201', name: 'Feijão Carioca 1kg', price: 8.50, cost: 5.20, stock: 300, ncm: '0713.33.99', cest: '17.002.00', origin: '0', taxGroup: 'A', unit: 'UN', minStock: 50, synced: 0 },
  { id: '3', code: '7894900011517', name: 'Refrigerante Cola 2L', price: 10.99, cost: 7.50, stock: 45, ncm: '2202.10.00', cest: '03.007.00', origin: '0', taxGroup: 'B', unit: 'UN', minStock: 24, synced: 0 },
  { id: '4', code: '2000000000012', name: 'Pão Francês', price: 14.99, cost: 6.00, stock: 10.5, ncm: '1905.90.90', cest: '17.062.00', origin: '0', taxGroup: 'A', unit: 'KG', minStock: 5, synced: 0 },
];

const INITIAL_USERS: IUser[] = [
  { id: '1', name: 'Administrador', email: 'admin@pdvmaster.br', role: 'ADMIN' }, // Password handled in logic
  { id: '2', name: 'Operador de Caixa', email: 'caixa@pdvmaster.br', role: 'CASHIER' }
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

export const initDB = async () => {
  try {
    const productsCount = await db.products.count();
    if (productsCount === 0) {
      await db.products.bulkAdd(INITIAL_PRODUCTS);
      await db.users.bulkAdd(INITIAL_USERS);
      await db.settings.put(DEFAULT_SETTINGS);
      
      // Seed Dummy Customers
      await db.customers.bulkAdd([
        { id: '1', name: 'Cliente Consumidor', document: '000.000.000-00', email: '', phone: '', address: 'Balcão', synced: 0 },
        { id: '2', name: 'Maria Silva', document: '123.456.789-00', email: 'maria@email.com', phone: '(11) 99999-9999', address: 'Rua A, 123', creditLimit: 500, synced: 0 },
      ]);
      
      // Seed Dummy Finance
      await db.financial.bulkAdd([
        { id: '1', type: 'EXPENSE', description: 'Conta de Energia', amount: 1250.00, category: 'Utilidades', date: new Date().toISOString(), status: 'PENDING', synced: 0 },
        { id: '2', type: 'INCOME', description: 'Vendas do Dia Anterior', amount: 4500.00, category: 'Vendas', date: new Date().toISOString(), status: 'PAID', synced: 0 },
      ]);
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
};

// Initialize immediately
initDB();