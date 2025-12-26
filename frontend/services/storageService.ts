import { IProduct, IKardexEntry, ISale, TransactionType, ICustomer, IFinancialRecord, IUser, ISettings, ICashRegister, ICashTransaction } from '../types';
import { AuditService } from './auditService';
import { supabase } from './supabaseClient';

// --- INITIAL SEED DATA ---
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
  SESSION: 'pdv_master_session',
};

export const StorageService = {
  // --- AUTH (SUPABASE AUTH) ---
  login: async (email: string, password: string): Promise<IUser | null> => {
    try {
      // 1. Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        return null;
      }

      if (!data.user) return null;

      // 2. Get user details from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        console.error('User data error:', userError);
        await supabase.auth.signOut();
        return null;
      }

      // 3. Create session
      const safeUser: IUser = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role
      };

      localStorage.setItem(KEYS.SESSION, JSON.stringify(safeUser));
      AuditService.log('LOGIN', `Acesso realizado: ${safeUser.name}`, 'INFO', safeUser);
      return safeUser;
    } catch (error) {
      console.error('Login exception:', error);
      return null;
    }
  },

  logout: async () => {
    const user = StorageService.getCurrentUser();
    if (user) AuditService.log('LOGOUT', `Saída do sistema: ${user.name}`, 'INFO');

    // Sign out from Supabase
    await supabase.auth.signOut();
    localStorage.removeItem(KEYS.SESSION);
  },

  getCurrentUser: (): IUser | null => {
    const data = localStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  },

  // --- SETTINGS (SUPABASE) ---
  getSettings: async (): Promise<ISettings> => {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value');

    if (error || !data) return DEFAULT_SETTINGS;

    const settings: any = { ...DEFAULT_SETTINGS };
    data.forEach(item => {
      if (item.key === 'company') settings.company = item.value;
      if (item.key === 'fiscal') settings.fiscal = item.value;
      if (item.key === 'payment') settings.payment = item.value;
      if (item.key === 'app_logo_path') settings.appearance.logoUrl = item.value;
    });

    return settings;
  },

  saveSettings: async (settings: ISettings) => {
    const updates = [
      { key: 'company', value: settings.company },
      { key: 'fiscal', value: settings.fiscal },
      { key: 'payment', value: settings.payment }
    ];

    const { error } = await supabase
      .from('settings')
      .upsert(updates, { onConflict: 'key' });

    if (error) throw error;
    AuditService.log('SETTINGS_CHANGE', 'Configurações do sistema alteradas no Supabase', 'WARNING');
  },

  // --- PRODUCTS (SUPABASE) ---
  getProducts: async (): Promise<IProduct[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) return [];

    return data.map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      price: Number(p.price),
      cost: Number(p.cost),
      stock: Number(p.stock),
      minStock: Number(p.min_stock),
      ncm: p.ncm,
      cest: p.cest,
      origin: p.origin,
      taxGroup: p.tax_group,
      unit: p.unit,
      barcode: p.barcode,
      description: p.description,
      imageUrl: p.image_url
    }));
  },

  saveProduct: async (product: IProduct) => {
    const { error } = await supabase
      .from('products')
      .upsert({
        id: product.id || undefined,
        code: product.code,
        name: product.name,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        min_stock: product.minStock,
        ncm: product.ncm,
        cest: product.cest,
        origin: product.origin,
        tax_group: product.taxGroup,
        unit: product.unit,
        barcode: product.barcode,
        description: product.description,
        image_url: product.imageUrl,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    AuditService.log('STOCK_UPDATE', `Produto salvo no Supabase: ${product.name}`, 'INFO');
  },

  // --- SALES (SUPABASE) ---
  createSale: async (sale: ISale): Promise<ISale | null> => {
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        id: sale.id,
        total: sale.total,
        subtotal: sale.subtotal,
        discount: sale.discount,
        payment_method: sale.paymentMethod,
        customer_id: sale.customerId,
        operator_id: sale.operatorId,
        register_id: sale.registerId,
        date: sale.date
      })
      .select()
      .single();

    if (saleError) throw saleError;

    const items = sale.items.map(item => ({
      sale_id: sale.id,
      product_id: item.id,
      quantity: item.qty,
      unit_price: item.price,
      total: item.total
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(items);

    if (itemsError) throw itemsError;

    for (const item of sale.items) {
      await supabase.rpc('decrement_stock', {
        p_id: item.id,
        p_qty: item.qty
      });
    }

    AuditService.log('SALE_COMPLETE', `Venda #${sale.id?.slice(0, 8) || 'UNKNOWN'} salva no Supabase`, 'INFO');
    return sale;
  },

  // --- CUSTOMERS (SUPABASE) ---
  getCustomers: async (): Promise<ICustomer[]> => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) return [];
    return data.map(c => ({
      id: c.id,
      name: c.name,
      document: c.document,
      email: c.email,
      phone: c.phone,
      address: c.address,
      creditLimit: Number(c.credit_limit)
    }));
  },

  saveCustomer: async (customer: ICustomer) => {
    const { error } = await supabase
      .from('customers')
      .upsert({
        id: customer.id || undefined,
        name: customer.name,
        document: customer.document,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        credit_limit: customer.creditLimit,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    AuditService.log('CUSTOMER_UPDATE', `Cliente salvo no Supabase: ${customer.name}`, 'INFO');
  },

  // --- FINANCE (SUPABASE) ---
  getFinancialRecords: async (): Promise<IFinancialRecord[]> => {
    const { data, error } = await supabase
      .from('financial_records')
      .select('*')
      .order('date', { ascending: false });

    if (error) return [];
    return data.map(r => ({
      id: r.id,
      type: r.type,
      description: r.description,
      amount: Number(r.amount),
      category: r.category,
      date: r.date,
      status: r.status,
      referenceId: r.reference_id
    }));
  },

  addFinancialRecord: async (record: IFinancialRecord) => {
    const { error } = await supabase
      .from('financial_records')
      .insert({
        id: record.id || undefined,
        type: record.type,
        description: record.description,
        amount: record.amount,
        category: record.category,
        date: record.date,
        status: record.status,
        reference_id: record.referenceId
      });

    if (error) throw error;
    AuditService.log('FINANCE_UPDATE', `Lançamento financeiro salvo: ${record.description}`, 'INFO');
  },

  // --- CASH REGISTER (SUPABASE) ---
  getCurrentRegister: async (operatorId: string): Promise<ICashRegister | null> => {
    const { data, error } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('operator_id', operatorId)
      .eq('status', 'OPEN')
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      status: data.status,
      openedAt: data.opened_at,
      openingBalance: Number(data.opening_balance),
      currentBalance: Number(data.current_balance),
      operatorId: data.operator_id
    };
  },

  getLastClosedRegister: async (): Promise<ICashRegister | null> => {
    const { data, error } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('status', 'CLOSED')
      .order('closed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      status: data.status,
      openedAt: data.opened_at,
      closedAt: data.closed_at,
      openingBalance: Number(data.opening_balance),
      currentBalance: Number(data.current_balance),
      finalCount: Number(data.final_count),
      difference: Number(data.difference),
      operatorId: data.operator_id
    };
  },

  openRegister: async (openingBalance: number, operatorId: string) => {
    const { data, error } = await supabase
      .from('cash_registers')
      .insert({
        status: 'OPEN',
        opened_at: new Date().toISOString(),
        opening_balance: openingBalance,
        current_balance: openingBalance,
        operator_id: operatorId
      })
      .select()
      .single();

    if (error) throw error;
    AuditService.log('REGISTER_OPEN', `Caixa aberto no Supabase com R$ ${openingBalance.toFixed(2)}`, 'INFO');
    return data;
  },

  closeRegister: async (registerId: string, userCountedAmount: number): Promise<void> => {
    const { data: summary, error: summaryError } = await supabase.rpc('get_register_summary', { p_register_id: registerId });
    if (summaryError) throw summaryError;

    const systemBalance = Number(summary.calculated_balance);
    const difference = userCountedAmount - systemBalance;

    const { error: updateError } = await supabase
      .from('cash_registers')
      .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        final_count: userCountedAmount,
        difference: difference,
        current_balance: systemBalance
      })
      .eq('id', registerId);

    if (updateError) throw updateError;

    AuditService.log('REGISTER_CLOSE', `Caixa fechado. Diferença: R$ ${difference.toFixed(2)}`, difference !== 0 ? 'WARNING' : 'INFO');
  },

  getRegisterSummary: async (registerId: string) => {
    const { data, error } = await supabase.rpc('get_register_summary', { p_register_id: registerId });
    if (error) throw error;
    return data;
  },

  addCashTransaction: async (tx: ICashTransaction) => {
    const { error } = await supabase
      .from('cash_transactions')
      .insert({
        register_id: tx.registerId,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        date: tx.date || new Date().toISOString()
      });

    if (error) throw error;

    const balanceChange = (tx.type === 'SUPPLY' || tx.type === 'SALE') ? tx.amount : -tx.amount;
    await supabase.rpc('update_register_balance', {
      p_register_id: tx.registerId,
      p_amount: balanceChange
    });
  },

  // --- REPORTS (SUPABASE) ---
  getSales: async (): Promise<ISale[]> => {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*, product:products(*))')
      .order('date', { ascending: false })
      .limit(100);

    if (error) return [];
    return data;
  },

  getSalesByPeriod: async (start: string, end: string): Promise<ISale[]> => {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*, product:products(*))')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    if (error) return [];
    return data;
  },

  getFinancialRecordsByPeriod: async (start: string, end: string): Promise<IFinancialRecord[]> => {
    const { data, error } = await supabase
      .from('financial_records')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    if (error) return [];
    return data;
  },

  // --- KARDEX (TODO: Implement properly) ---
  getKardex: async (): Promise<IKardexEntry[]> => {
    // TODO: Implement kardex entries from Supabase
    return [];
  },

  updateStock: async (productId: string, quantity: number, type: TransactionType, documentRef: string, notes?: string) => {
    // TODO: Implement stock update with kardex entry
    console.log('updateStock called:', { productId, quantity, type, documentRef, notes });
  },

  saveProductsBatch: async (products: IProduct[]) => {
    // TODO: Implement batch product save
    for (const product of products) {
      await StorageService.saveProduct(product);
    }
  },

  // --- USERS (TODO: Implement) ---
  getUsers: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true);

    if (error) return [];
    return data;
  },

  // --- CASH REGISTER REPORTS (TODO: Implement) ---
  getClosedRegisters: async () => {
    const { data, error } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('status', 'CLOSED')
      .order('closed_at', { ascending: false });

    if (error) return [];
    return data;
  },

  getAllCashTransactions: async () => {
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) return [];
    return data;
  },

  // --- USER MANAGEMENT (TODO: Implement) ---
  saveUser: async (user: any) => {
    // TODO: Implement user save
    console.log('saveUser called:', user);
  },

  deleteUser: async (userId: string) => {
    // TODO: Implement user delete
    console.log('deleteUser called:', userId);
  }
};
