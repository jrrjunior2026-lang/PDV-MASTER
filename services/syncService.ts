// Sincronização de Dados Offline-Online
import { StorageService } from './storageService';
import { AuditService } from './auditService';

export interface SyncQueue {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: 'PRODUCTS' | 'CUSTOMERS' | 'SALES' | 'FINANCE';
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  status: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'FAILED';
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync?: number;
  pendingItems: number;
  conflicts: number;
  errors: string[];
}

class SyncService {
  private static syncQueue: SyncQueue[] = [];
  private static isOnline = navigator.onLine;
  private static syncInProgress = false;
  private static readonly QUEUE_KEY = 'pdv_master_sync_queue';
  private static readonly SYNC_STATUS_KEY = 'pdv_master_sync_status';
  private static readonly MAX_RETRY = 3;

  // Event listeners for sync status updates
  private static listeners: ((status: SyncStatus) => void)[] = [];

  static init() {
    // Load sync queue from storage
    this.loadSyncQueue();

    // Monitor online/offline status
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Start background sync
    this.startBackgroundSync();

    console.log('SyncService initialized');
  }

  static onStatusChange(callback: (status: SyncStatus) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  static notifyListeners() {
    const status = this.getSyncStatus();
    this.listeners.forEach(callback => callback(status));
  }

  private static loadSyncQueue() {
    try {
      const stored = localStorage.getItem(this.QUEUE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private static saveSyncQueue() {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private static handleOnline() {
    console.log('Connection restored, starting sync...');
    this.isOnline = true;
    this.performSync();
    this.notifyListeners();
  }

  private static handleOffline() {
    console.log('Connection lost');
    this.isOnline = false;
    this.notifyListeners();
  }

  private static async startBackgroundSync() {
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0 && !this.syncInProgress) {
        this.performSync();
      }
    }, 30000); // Sync every 30 seconds
  }

  // Queue operations for sync
  static queueOperation(type: SyncQueue['type'], collection: SyncQueue['collection'], data: any) {
    const queueItem: SyncQueue = {
      id: crypto.randomUUID(),
      type,
      collection,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING'
    };

    this.syncQueue.push(queueItem);
    this.saveSyncQueue();
    this.notifyListeners();

    // Try immediate sync if online
    if (this.isOnline) {
      this.performSync();
    }

    console.log(`Queued ${type} operation for ${collection}`);
  }

  // Main sync function
  private static async performSync() {
    if (this.syncInProgress || this.syncQueue.length === 0 || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    console.log('Starting data synchronization...');

    try {
      // Process items that are not being retried excessively
      const itemsToSync = this.syncQueue
        .filter(item => item.retryCount < this.MAX_RETRY && item.status !== 'SUCCESS')
        .sort((a, b) => a.timestamp - b.timestamp); // FIFO

      const results = await Promise.allSettled(
        itemsToSync.map(item => this.syncItem(item))
      );

      results.forEach((result, index) => {
        const item = itemsToSync[index];

        if (result.status === 'fulfilled') {
          item.status = 'SUCCESS';
          console.log(`✅ Synced ${item.type} ${item.collection}: ${item.id}`);
        } else {
          item.retryCount++;
          item.lastError = result.reason.message;
          item.status = item.retryCount >= this.MAX_RETRY ? 'FAILED' : 'PENDING';
          console.error(`❌ Sync failed ${item.type} ${item.collection}: ${result.reason.message}`);
        }
      });

      // Remove successful items
      this.syncQueue = this.syncQueue.filter(item =>
        !(item.status === 'SUCCESS' || (item.status === 'FAILED' && item.retryCount >= this.MAX_RETRY))
      );

      this.saveSyncQueue();

      // Update last sync timestamp
      localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify({
        lastSync: Date.now(),
        isOnline: this.isOnline
      }));

    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  // Sync individual item (simulated API call)
  private static async syncItem(item: SyncQueue): Promise<void> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Simulate random failures (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('Simulated network error');
    }

    // Simulate server-side validation
    switch (item.collection) {
      case 'PRODUCTS':
        if (item.type === 'CREATE' && !item.data.code) {
          throw new Error('Product code is required');
        }
        break;
      case 'CUSTOMERS':
        if (item.type === 'CREATE' && !item.data.document) {
          throw new Error('Customer document is required');
        }
        break;
      case 'SALES':
        if (item.type === 'CREATE' && item.data.total <= 0) {
          throw new Error('Sale total must be positive');
        }
        break;
    }

    // Log successful sync
    AuditService.log(
      'DATA_SYNC',
      `Synced ${item.type} ${item.collection}: ${item.data.name || item.data.id}`,
      'INFO'
    );
  }

  // Manual sync trigger
  static async forceSync(): Promise<SyncStatus> {
    if (!this.isOnline) {
      throw new Error('Sync not available - device offline');
    }

    await this.performSync();
    return this.getSyncStatus();
  }

  // Get current sync status
  static getSyncStatus(): SyncStatus {
    const pendingItems = this.syncQueue.filter(item =>
      item.status === 'PENDING' || item.status === 'FAILED'
    ).length;

    const conflicts = this.syncQueue.filter(item =>
      item.status === 'FAILED'
    ).length;

    const errors = this.syncQueue
      .filter(item => item.lastError)
      .map(item => item.lastError!)
      .slice(0, 5); // Last 5 errors

    let lastSync;
    try {
      const status = JSON.parse(localStorage.getItem(this.SYNC_STATUS_KEY) || '{}');
      lastSync = status.lastSync;
    } catch { }

    return {
      isOnline: this.isOnline,
      lastSync,
      pendingItems,
      conflicts,
      errors
    };
  }

  // Clear old sync data
  static clearOldSyncData(olderThanDays = 30) {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    this.syncQueue = this.syncQueue.filter(item => item.timestamp > cutoffTime);
    this.saveSyncQueue();

    console.log(`Cleared sync data older than ${olderThanDays} days`);
  }

  // Bulk operations
  static clearSyncQueue() {
    this.syncQueue = [];
    this.saveSyncQueue();
    this.notifyListeners();
    console.log('Sync queue cleared');
  }

  static getSyncQueue(): SyncQueue[] {
    return [...this.syncQueue];
  }

  static getPendingCount(): number {
    return this.syncQueue.filter(item => item.status === 'PENDING').length;
  }

  static isCurrentlySyncing(): boolean {
    return this.syncInProgress;
  }
}

// Enhanced StorageService with sync support
const originalSaveProduct = StorageService.saveProduct;
StorageService.saveProduct = (product) => {
  originalSaveProduct.call(StorageService, product);
  // Queue for sync if we're creating/updating
  setTimeout(() => {
    SyncService.queueOperation('UPDATE', 'PRODUCTS', product);
  }, 100);
};

const originalSaveCustomer = StorageService.saveCustomer;
StorageService.saveCustomer = (customer) => {
  originalSaveCustomer.call(StorageService, customer);
  // Queue for sync
  setTimeout(() => {
    SyncService.queueOperation('UPDATE', 'CUSTOMERS', customer);
  }, 100);
};

const originalCreateSale = StorageService.createSale;
StorageService.createSale = async (sale) => {
  const result = await originalCreateSale.call(StorageService, sale);
  // Queue for sync
  setTimeout(() => {
    SyncService.queueOperation('CREATE', 'SALES', sale);
  }, 100);
  return result;
};

export default SyncService;
