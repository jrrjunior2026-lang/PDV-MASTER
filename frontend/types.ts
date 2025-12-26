export enum TransactionType {
  SALE = 'SALE',
  ENTRY = 'ENTRY',
  ADJUSTMENT = 'ADJUSTMENT'
}

export interface IProduct {
  id: string;
  code: string; // EAN/Barcode
  name: string;
  price: number;
  cost: number;
  stock: number;
  ncm: string; // Fiscal classification
  cest: string;
  origin: '0' | '1' | '2'; // 0: Nacional, 1: Importada, 2: Estrangeira adq. no mercado interno
  taxGroup: 'A' | 'B' | 'C'; // Simples Nacional tax groups simulation
  unit: 'UN' | 'KG' | 'L' | 'M';
  minStock: number;
  barcode?: string;
  description?: string;
  imageUrl?: string | null;
  synced?: number;
}

export interface IKardexEntry {
  id: string;
  productId: string;
  date: string; // ISO
  type: TransactionType;
  quantity: number;
  balanceAfter: number;
  documentRef?: string; // NF-e ID or Sale ID
  description: string;
  synced?: number;
}

export interface ICartItem extends IProduct {
  qty: number;
  total: number;
}

export interface ICustomer {
  id: string;
  name: string;
  document: string; // CPF or CNPJ
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  synced?: number;
}

export interface ISale {
  id: string;
  date: string;
  items: ICartItem[];
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: 'CREDIT' | 'DEBIT' | 'CASH' | 'PIX';
  fiscalStatus: 'PENDING' | 'AUTHORIZED' | 'REJECTED' | 'OFFLINE';
  operatorId: string;
  registerId?: string;
  accessKey?: string;
  customerId?: string; // CRM Link
  synced?: number;
  amountPaid?: number; // For cash transactions
  change?: number;     // For cash transactions
}

export interface IFinancialRecord {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: number;
  category: string;
  date: string;
  status: 'PAID' | 'PENDING';
  referenceId?: string; // Link to Sale ID or Purchase Order
  synced?: number;
}

export interface IDashboardStats {
  totalSales: number;
  transactionCount: number;
  averageTicket: number;
  topProducts: { name: string, value: number }[];
}

export interface IUser {
  id: string;
  name: string;
  role: 'ADMIN' | 'CASHIER';
  email: string;
}

export interface ISettings {
  id: string;
  company: {
    corporateName: string;
    fantasyName: string;
    cnpj: string;
    ie: string; // Inscrição Estadual
    taxRegime: '1' | '3'; // 1: Simples Nacional, 3: Regime Normal
    address: string;
    phone: string;
  };
  fiscal: {
    environment: '1' | '2'; // 1: Production, 2: Homologation
    nfeSeries: number;
    nfceSeries: number;
    cscId: string; // For NFC-e
    cscToken: string; // For NFC-e
  };
  payment: {
    pixKey: string;
    pixKeyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  };
  appearance: {
    logoUrl: string | null; // Base64 string
    primaryColor: string;
  };
}

export interface ICashRegister {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  currentBalance: number; // System calculated
  finalCount?: number; // User input
  difference?: number; // finalCount - currentBalance
  operatorId: string;
  synced?: number;
}

export interface ICashTransaction {
  id: string;
  registerId: string;
  type: 'OPENING' | 'CLOSING' | 'SUPPLY' | 'BLEED' | 'SALE';
  amount: number;
  description: string;
  date: string;
  synced?: number;
}

export interface IAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  ip?: string;
}