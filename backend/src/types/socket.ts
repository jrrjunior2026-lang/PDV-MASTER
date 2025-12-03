import { Socket } from 'socket.io';

// Extended socket interface with authentication
export interface AuthenticatedSocket extends Socket {
    userId: string;
    deviceId: string;
}

// User socket information
export interface UserSocket {
    userId: string;
    deviceId: string;
    socketId: string;
    connectedAt: Date;
    lastActivity: Date;
}

// Socket event types
export interface SocketEvents {
    // Authentication events
    'authenticated': (data: { userId: string; deviceId: string }) => void;
    'unauthenticated': (data: { message: string }) => void;
    'connection-error': (data: { message: string }) => void;

    // Room management
    'join-room': (room: string) => void;
    'leave-room': (room: string) => void;
    'room-joined': (data: { room: string; timestamp: string }) => void;
    'room-left': (data: { room: string; timestamp: string }) => void;

    // Real-time business events
    'connected': (data: { message: string; user: any; timestamp: string }) => void;
    'user-online': (data: { userId: string; deviceId: string; timestamp: string }) => void;
    'user-offline': (data: { userId: string; deviceId: string; timestamp: string }) => void;

    // Product events
    'product-updated': (data: ProductUpdateEvent) => void;
    'stock-alert': (data: StockAlertEvent) => void;

    // Sale events
    'sale-created': (data: SaleCreatedEvent) => void;

    // Sync events
    'sync-status-updated': (data: SyncStatusEvent) => void;
    'sync-state': (data: SyncStateEvent) => void;
    'sync-progress': (data: SyncProgressEvent) => void;
    'sync-confirmed': (data: SyncConfirmEvent) => void;
    'sync-request': () => void;
    'sync-confirm': (data: { syncId: string }) => void;

    // Typing indicators
    'typing-start': (data: { targetUserId: string }) => void;
    'typing-stop': (data: { targetUserId: string }) => void;
    'user-typing-start': (data: TypingEvent) => void;
    'user-typing-stop': (data: TypingEvent) => void;

    // Cash register events
    'cash-register-update': (data: CashRegisterUpdateEvent) => void;
}

// Event data interfaces
export interface ProductUpdateEvent {
    productId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    data: any;
    updatedBy: string;
    timestamp: string;
}

export interface StockAlertEvent {
    productId: string;
    productName: string;
    currentStock: number;
    minStock: number;
    severity: 'LOW' | 'CRITICAL';
    timestamp: string;
}

export interface SaleCreatedEvent {
    saleId: string;
    amount: number;
    paymentMethod: string;
    customerId?: string;
    createdBy: string;
    timestamp: string;
}

export interface SyncStatusEvent {
    deviceId: string;
    pendingItems: number;
    status: 'syncing' | 'completed' | 'error';
    lastSync: string;
    timestamp: string;
}

export interface SyncStateEvent {
    userId: string;
    deviceId: string;
    pendingSyncItems: number;
    lastSync: string;
    status: 'up-to-date' | 'pending' | 'syncing' | 'error';
}

export interface SyncProgressEvent {
    syncId: string;
    processed: number;
    total: number;
    percentage: number;
    currentItem: string;
    timestamp: string;
}

export interface SyncConfirmEvent {
    deviceId: string;
    syncId: string;
    timestamp: string;
}

export interface TypingEvent {
    from: string;
    target: string;
    timestamp: string;
}

export interface CashRegisterUpdateEvent {
    registerId: string;
    action: string;
    data: any;
    timestamp: string;
}

// Socket room types
export type SocketRoom =
    | `user:${string}`       // User-specific room
    | `device:${string}`     // Device-specific room
    | `cash-register:${string}` // Cash register room
    | `sync:${string}`       // Sync-specific room
    | string;                // Other rooms
