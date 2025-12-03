import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { query } from '../config/database.js';
import { AuthenticatedSocket, UserSocket } from '../types/socket';

// Active connections tracking
const activeUsers = new Map<string, UserSocket>();
const userSockets = new Map<string, Set<string>>(); // userId -> socketIds

// Device tracking for sync
const deviceConnections = new Map<string, string[]>(); // deviceId -> socketIds

export class SocketService {
    private io: SocketServer;

    constructor(server: HttpServer) {
        this.io = new SocketServer(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        this.setupMiddleware();
        this.setupEventHandlers();
        this.startCleanupInterval();
    }

    private setupMiddleware() {
        // Authentication middleware
        this.io.use(async (socket: any, next) => {
            try {
                const token = socket.handshake.auth.token;

                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                // Basic token validation (JWT verification would go here)
                if (!token.startsWith('Bearer ')) {
                    return next(new Error('Invalid token format'));
                }

                // In production, verify JWT here
                const userId = this.decodeToken(token);
                if (!userId) {
                    return next(new Error('Invalid token'));
                }

                // Attach user to socket
                socket.userId = userId;
                socket.deviceId = socket.handshake.auth.deviceId || 'default-device';

                next();
            } catch (error) {
                console.error('Socket authentication error:', error);
                next(new Error('Authentication failed'));
            }
        });
    }

    private decodeToken(token: string): string | null {
        // Simple token decoding (in production use proper JWT verification)
        try {
            // This would be replaced with actual JWT verification
            return token.replace('Bearer ', '');
        } catch {
            return null;
        }
    }

    private setupEventHandlers() {
        this.io.on('connection', (socket: any) => {
            console.log(`🔌 User ${socket.userId} connected with device ${socket.deviceId}`);

            // Register user
            this.registerUser(socket);

            // Setup event listeners
            socket.on('join-room', (room: string) => this.handleJoinRoom(socket, room));
            socket.on('leave-room', (room: string) => this.handleLeaveRoom(socket, room));

            // Business events
            socket.on('product-update', (data: any) => this.handleProductUpdate(socket, data));
            socket.on('sale-created', (data: any) => this.handleSaleCreated(socket, data));
            socket.on('sync-status', (data: any) => this.handleSyncStatus(socket, data));

            // Real-time sync events
            socket.on('sync-request', () => this.handleSyncRequest(socket));
            socket.on('sync-confirm', (data: any) => this.handleSyncConfirm(socket, data));

            // Typing indicators
            socket.on('typing-start', (data: any) => this.handleTypingStart(socket, data));
            socket.on('typing-stop', (data: any) => this.handleTypingStop(socket, data));

            // Disconnect handling
            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
    }

    private registerUser(socket: AuthenticatedSocket) {
        const { userId, deviceId, id: socketId } = socket;

        // Track user connection
        const userKey = `${userId}:${deviceId}`;
        activeUsers.set(userKey, {
            userId,
            deviceId,
            socketId,
            connectedAt: new Date(),
            lastActivity: new Date()
        });

        // Add socket to user's socket set
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId)!.add(socketId);

        // Track device connections
        if (!deviceConnections.has(deviceId)) {
            deviceConnections.set(deviceId, []);
        }
        deviceConnections.get(deviceId)!.push(socketId);

        // Join user-specific room
        socket.join(`user:${userId}`);
        socket.join(`device:${deviceId}`);

        // Broadcast user online status
        this.broadcastToOthers(socket, 'user-online', {
            userId,
            deviceId,
            timestamp: new Date().toISOString()
        });

        // Send welcome message with system info
        this.emitTo(socket, 'connected', {
            message: 'Welcome to PDV Master Real-time',
            user: { id: userId },
            timestamp: new Date().toISOString()
        });
    }

    private handleJoinRoom(socket: AuthenticatedSocket, room: string) {
        socket.join(room);
        this.emitTo(socket, 'room-joined', { room, timestamp: new Date().toISOString() });
    }

    private handleLeaveRoom(socket: AuthenticatedSocket, room: string) {
        socket.leave(room);
        this.emitTo(socket, 'room-left', { room, timestamp: new Date().toISOString() });
    }

    private handleProductUpdate(socket: AuthenticatedSocket, data: any) {
        // Broadcast product changes to all connected clients
        this.broadcast('product-updated', {
            ...data,
            updatedBy: socket.userId,
            timestamp: new Date().toISOString()
        });
    }

    private handleSaleCreated(socket: AuthenticatedSocket, data: any) {
        // Notify relevant users about new sales
        this.broadcast('sale-created', {
            ...data,
            createdBy: socket.userId,
            timestamp: new Date().toISOString()
        });
    }

    private handleSyncStatus(socket: AuthenticatedSocket, data: any) {
        // Update sync status for the user
        const syncKey = `sync:${socket.userId}:${socket.deviceId}`;
        socket.join(syncKey);

        this.emitTo(socket, 'sync-status-updated', {
            ...data,
            deviceId: socket.deviceId,
            timestamp: new Date().toISOString()
        });
    }

    private handleSyncRequest(socket: AuthenticatedSocket) {
        // Send current sync state
        const syncData = this.getSyncState(socket.userId, socket.deviceId);
        this.emitTo(socket, 'sync-state', syncData);
    }

    private handleSyncConfirm(socket: AuthenticatedSocket, data: any) {
        // Confirm sync completion
        this.broadcastToUser(socket.userId, 'sync-confirmed', {
            deviceId: socket.deviceId,
            syncId: data.syncId,
            timestamp: new Date().toISOString()
        });
    }

    private handleTypingStart(socket: AuthenticatedSocket, data: any) {
        socket.to(`user:${data.targetUserId}`).emit('user-typing-start', {
            from: socket.userId,
            target: data.targetUserId,
            timestamp: new Date().toISOString()
        });
    }

    private handleTypingStop(socket: AuthenticatedSocket, data: any) {
        socket.to(`user:${data.targetUserId}`).emit('user-typing-stop', {
            from: socket.userId,
            target: data.targetUserId,
            timestamp: new Date().toISOString()
        });
    }

    private handleDisconnect(socket: AuthenticatedSocket) {
        const { userId, deviceId, id: socketId } = socket;
        const userKey = `${userId}:${deviceId}`;

        console.log(`🔌 User ${userId} disconnected from device ${deviceId}`);

        // Remove from tracking
        activeUsers.delete(userKey);

        if (userSockets.has(userId)) {
            userSockets.get(userId)!.delete(socketId);
            if (userSockets.get(userId)!.size === 0) {
                userSockets.delete(userId);
            }
        }

        if (deviceConnections.has(deviceId)) {
            const deviceSockets = deviceConnections.get(deviceId)!;
            const index = deviceSockets.indexOf(socketId);
            if (index > -1) {
                deviceSockets.splice(index, 1);
            }
            if (deviceSockets.length === 0) {
                deviceConnections.delete(deviceId);
            }
        }

        // Broadcast disconnection
        socket.to(`user:${userId}`).emit('user-offline', {
            userId,
            deviceId,
            timestamp: new Date().toISOString()
        });
    }

    // Utility methods
    public emitTo(socket: AuthenticatedSocket, event: string, data: any) {
        socket.emit(event, data);
    }

    public broadcast(event: string, data: any) {
        this.io.emit(event, data);
    }

    public broadcastToUser(userId: string, event: string, data: any) {
        this.io.to(`user:${userId}`).emit(event, data);
    }

    public emitToDevice(deviceId: string, event: string, data: any) {
        this.io.to(`device:${deviceId}`).emit(event, data);
    }

    public broadcastToOthers(socket: AuthenticatedSocket, event: string, data: any) {
        socket.broadcast.emit(event, data);
    }

    public getActiveUsers(): UserSocket[] {
        return Array.from(activeUsers.values());
    }

    public getUserSockets(userId: string): string[] {
        const userSocketsSet = userSockets.get(userId);
        return userSocketsSet ? Array.from(userSocketsSet) : [];
    }

    public getDeviceConnections(deviceId: string): string[] {
        return deviceConnections.get(deviceId) || [];
    }

    private getSyncState(userId: string, deviceId: string) {
        // This would query the database for current sync state
        return {
            userId,
            deviceId,
            pendingSyncItems: 0, // Query from sync_queue table
            lastSync: new Date().toISOString(),
            status: 'up-to-date'
        };
    }

    private startCleanupInterval() {
        // Clean up stale connections every 5 minutes
        setInterval(() => {
            const now = Date.now();
            const staleThreshold = 5 * 60 * 1000; // 5 minutes

            // Clean up stale active users
            for (const [key, userSocket] of activeUsers.entries()) {
                if (now - userSocket.lastActivity.getTime() > staleThreshold) {
                    activeUsers.delete(key);
                    console.log(`🧹 Cleaned up stale user: ${key}`);
                }
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    // Public methods for external access
    public notifyCashRegisterUpdate(registerId: string, data: any) {
        this.io.to(`cash-register:${registerId}`).emit('cash-register-update', data);
    }

    public notifyStockAlert(productId: string, data: any) {
        this.io.emit('stock-alert', { productId, ...data });
    }

    public notifySyncProgress(userId: string, data: any) {
        this.broadcastToUser(userId, 'sync-progress', data);
    }
}

// Export singleton instance
export let socketService: SocketService;

// Initialize function (called from server.ts)
export function initializeSocketService(server: HttpServer): SocketService {
    socketService = new SocketService(server);
    return socketService;
}
