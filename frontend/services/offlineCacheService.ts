// Serviço de Cache Offline usando IndexedDB
// Armazena requisições e respostas para uso offline

interface CachedRequest {
    key: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
    response: any;
    timestamp: number;
    expiresAt: number;
}

class OfflineCacheService {
    private static dbName = 'pdv_master_cache';
    private static dbVersion = 1;
    private static storeName = 'api_cache';
    private static db: IDBDatabase | null = null;
    private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hora

    static async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ Offline cache initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('expiresAt', 'expiresAt', { unique: false });
                }
            };
        });
    }

    private static getCacheKey(url: string, method: string, body?: any): string {
        const bodyStr = body ? JSON.stringify(body) : '';
        return `${method}:${url}:${bodyStr}`;
    }

    static async get(url: string, method: string = 'GET', body?: any): Promise<any | null> {
        if (!this.db) {
            await this.init();
        }

        const key = this.getCacheKey(url, method, body);
        
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(null);
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                const cached = request.result as CachedRequest | undefined;
                
                if (!cached) {
                    resolve(null);
                    return;
                }

                // Verificar se expirou
                if (Date.now() > cached.expiresAt) {
                    // Remover cache expirado
                    this.delete(key);
                    resolve(null);
                    return;
                }

                console.log('📦 Cache hit:', url);
                resolve(cached.response);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    static async set(url: string, method: string, response: any, body?: any, ttl?: number): Promise<void> {
        if (!this.db) {
            await this.init();
        }

        const key = this.getCacheKey(url, method, body);
        const now = Date.now();
        const expiresAt = now + (ttl || this.CACHE_DURATION);

        const cached: CachedRequest = {
            key,
            url,
            method,
            headers: {},
            body,
            response,
            timestamp: now,
            expiresAt
        };

        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(cached);

            request.onsuccess = () => {
                console.log('💾 Cached:', url);
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    static async delete(key: string): Promise<void> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    static async clearExpired(): Promise<void> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('expiresAt');
            const now = Date.now();
            const range = IDBKeyRange.upperBound(now);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    console.log('🧹 Expired cache cleared');
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    static async clearAll(): Promise<void> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('🗑️ All cache cleared');
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    static async getAllKeys(): Promise<string[]> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAllKeys();

            request.onsuccess = () => {
                resolve(request.result as string[]);
            };

            request.onerror = () => reject(request.error);
        });
    }
}

// Inicializar ao carregar
if (typeof window !== 'undefined') {
    OfflineCacheService.init().catch(console.error);
    
    // Limpar cache expirado a cada hora
    setInterval(() => {
        OfflineCacheService.clearExpired().catch(console.error);
    }, 60 * 60 * 1000);
}

export default OfflineCacheService;

