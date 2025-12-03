import { Request } from 'express';

// Tipos de operações de sincronização
export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE';

// Status da operação de sync
export type SyncStatus = 'PENDING' | 'SYNCING' | 'SUCCESS' | 'FAILED';

// Entidades que suportam sincronização
export type SyncCollection =
    | 'products'
    | 'sales'
    | 'customers'
    | 'financial_records'
    | 'cash_transactions'
    | 'settings';

// Item da fila de sincronização
export interface SyncQueueItem {
    id: string;
    deviceId: string;
    operation: SyncOperationType;
    collection: SyncCollection;
    data: Record<string, any>;
    timestamp: number;
    retryCount: number;
    lastError?: string;
    status: SyncStatus;
    createdAt: Date;
    syncedAt?: Date;
}

// Dados de sincronização do cliente
export interface SyncRequestData {
    deviceId: string;
    lastSyncTimestamp: number;
    collections: SyncCollection[];
    maxItems?: number;
}

// Dados de sincronização do servidor
export interface SyncResponseData {
    timestamp: number;
    collections: {
        [key in SyncCollection]?: {
            items: SyncQueueItem[];
            deletedIds: string[];
        };
    };
    conflicts: SyncConflict[];
}

// Conflito encontrado durante sincronização
export interface SyncConflict {
    deviceId: string;
    collection: SyncCollection;
    localItemId: string;
    serverItemId: string;
    conflictType: 'BOTH_MODIFIED' | 'SERVER_DELETED' | 'LOCAL_DELETED';
    localData: Record<string, any>;
    serverData: Record<string, any>;
    resolution: 'USE_LOCAL' | 'USE_SERVER' | 'MERGE' | 'PENDING';
}

// Resultado de uma operação de push
export interface SyncPushResult {
    success: boolean;
    acknowledged: number;
    conflicts: SyncConflict[];
    errors: SyncError[];
}

// Erro de sincronização
export interface SyncError {
    operationId?: string;
    message: string;
    code: string;
}

// Dados de resolução de conflito
export interface ConflictResolution {
    conflictId: string;
    resolution: 'USE_LOCAL' | 'USE_SERVER' | 'MERGE';
    mergedData?: Record<string, any>;
}

// Autenticação de dispositivo para sync
export interface DeviceAuth {
    deviceId: string;
    token?: string;
    userId?: string;
}

// Estatísticas de sincronização
export interface SyncStats {
    totalItems: number;
    pendingItems: number;
    failedItems: number;
    lastSyncTimestamp: number;
    collectionsStats: { [key in SyncCollection]: number };
}

// Request personalizado com dados de sync
export interface SyncAuthenticatedRequest extends Request {
    device: DeviceAuth;
    user?: any;
}

// Configurações de sincronização
export interface SyncConfig {
    maxRetries: number;
    retryDelay: number;
    batchSize: number;
    autoResolveConflicts: boolean;
    enableCompression: boolean;
    enableEncryption: boolean;
}
