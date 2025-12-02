// Dexie dependency removed to prevent SecurityError in sandboxed environments.
// This file is kept to maintain module structure but no longer initializes a DB.

export const db = {
  // Mock structure to prevent import errors if referenced directly
  products: {},
  sales: {},
  customers: {},
  kardex: {},
  financial: {},
  users: {},
  settings: {},
  cashRegisters: {},
  cashTransactions: {}
};

export const initDB = async () => {
  console.log("DB Initialization skipped for SafeStorage mode.");
};