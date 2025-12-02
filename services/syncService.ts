
import { db } from './db';

/**
 * Service responsible for synchronizing local Dexie DB with Cloud Backend (Firebase Data Connect)
 * In this environment, it simulates the connection.
 */
export const SyncService = {
  
  /**
   * Pushes all local changes (synced = 0) to the cloud
   */
  pushChanges: async (): Promise<{ syncedCount: number, error: boolean }> => {
    // Check for internet connection
    if (!navigator.onLine) {
        return { syncedCount: 0, error: false };
    }

    try {
        let count = 0;

        // 1. Sync Sales
        const pendingSales = await db.sales.where('synced').equals(0).toArray();
        if (pendingSales.length > 0) {
            // Simulate Upload API Call
            await new Promise(r => setTimeout(r, 500)); // Mock network latency
            
            // Mark as synced locally
            const updatedSales = pendingSales.map(s => ({ ...s, synced: 1 }));
            await db.sales.bulkPut(updatedSales);
            count += pendingSales.length;
        }

        // 2. Sync Customers
        const pendingCustomers = await db.customers.where('synced').equals(0).toArray();
        if (pendingCustomers.length > 0) {
            await new Promise(r => setTimeout(r, 300));
            const updatedCustomers = pendingCustomers.map(c => ({ ...c, synced: 1 }));
            await db.customers.bulkPut(updatedCustomers);
            count += pendingCustomers.length;
        }

        // 3. Sync Products
        const pendingProducts = await db.products.where('synced').equals(0).toArray();
        if (pendingProducts.length > 0) {
            await new Promise(r => setTimeout(r, 300));
            const updatedProducts = pendingProducts.map(p => ({ ...p, synced: 1 }));
            await db.products.bulkPut(updatedProducts);
            count += pendingProducts.length;
        }

        // 4. Sync Financial
        const pendingFinance = await db.financial.where('synced').equals(0).toArray();
        if (pendingFinance.length > 0) {
            await new Promise(r => setTimeout(r, 300));
            const updatedFinance = pendingFinance.map(f => ({ ...f, synced: 1 }));
            await db.financial.bulkPut(updatedFinance);
            count += pendingFinance.length;
        }

        return { syncedCount: count, error: false };

    } catch (e) {
        console.error("Sync Error:", e);
        return { syncedCount: 0, error: true };
    }
  },

  /**
   * Pulls updates from cloud to local (Products, Customers)
   */
  pullUpdates: async () => {
      // Simulate fetching fresh data from PostgreSQL
      // In real implementation: 
      // const data = await listProducts({ updatedSince: lastSyncDate });
      // await db.products.bulkPut(data);
      console.log("Checking for cloud updates...");
  },

  /**
   * Helper to count pending items for UI Badge
   */
  getPendingCount: async () => {
      const sales = await db.sales.where('synced').equals(0).count();
      const products = await db.products.where('synced').equals(0).count();
      return sales + products;
  }
};
