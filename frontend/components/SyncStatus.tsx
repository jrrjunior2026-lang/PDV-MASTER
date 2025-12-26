import React, { useState, useEffect } from 'react';
import SyncService, { SyncStatus } from '../services/syncService';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import { Button } from './UI';

interface SyncStatusProps {
    compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusProps> = ({ compact = false }) => {
    const [status, setStatus] = useState<SyncStatus>(SyncService.getSyncStatus());
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        // Listen for sync status changes
        const unsubscribe = SyncService.onStatusChange((newStatus) => {
            setStatus(newStatus);
        });

        // Update status periodically
        const interval = setInterval(() => {
            setStatus(SyncService.getSyncStatus());
        }, 5000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const handleManualSync = async () => {
        setIsRefreshing(true);
        try {
            await SyncService.forceSync();
        } catch (error) {
            console.error('Manual sync failed:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const formatLastSync = (timestamp?: number) => {
        if (!timestamp) return 'Nunca';

        const now = Date.now();
        const diff = Math.floor((now - timestamp) / 1000);

        if (diff < 60) return `${diff}s atrás`;
        if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
        return `${Math.floor(diff / 86400)}d atrás`;
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white border shadow-sm">
                {status.isOnline ? (
                    <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                    <WifiOff className="w-4 h-4 text-red-600" />
                )}

                {SyncService.isCurrentlySyncing() ? (
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                )}

                {status.pendingItems > 0 && (
                    <span className="text-xs font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                        {status.pendingItems}
                    </span>
                )}

                <span className="text-xs text-slate-500">
                    {SyncService.isCurrentlySyncing() ? 'Syncing...' : 'Sync OK'}
                </span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-brand-600" />
                    <h3 className="font-semibold text-slate-800">Sincronização</h3>
                </div>

                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleManualSync}
                    disabled={!status.isOnline || isRefreshing}
                    className="gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Sincronizar
                </Button>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-4">
                {/* Connection Status */}
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className={`p-2 rounded-full ${status.isOnline
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}>
                        {status.isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                    </div>
                    <div>
                        <p className="font-medium text-sm">
                            {status.isOnline ? 'Online' : 'Offline'}
                        </p>
                        <p className="text-xs text-slate-500">Conexão</p>
                    </div>
                </div>

                {/* Last Sync */}
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className={`p-2 rounded-full ${status.lastSync ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-medium text-sm">
                            {formatLastSync(status.lastSync)}
                        </p>
                        <p className="text-xs text-slate-500">Última sync</p>
                    </div>
                </div>
            </div>

            {/* Sync Statistics */}
            <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-slate-50">
                    <p className="text-2xl font-bold text-blue-600">{status.pendingItems}</p>
                    <p className="text-xs text-slate-600">Pendentes</p>
                </div>

                <div className="text-center p-3 rounded-lg bg-amber-50">
                    <p className="text-2xl font-bold text-amber-600">{status.conflicts}</p>
                    <p className="text-xs text-slate-600">Conflitos</p>
                </div>

                <div className="text-center p-3 rounded-lg bg-green-50">
                    <p className="text-green-600 flex items-center justify-center gap-1">
                        {SyncService.isCurrentlySyncing() ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span className="text-xs font-medium">Sincronizando</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">OK</span>
                            </>
                        )}
                    </p>
                </div>
            </div>

            {/* Errors */}
            {status.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Erros de Sincronização</p>
                            <ul className="text-xs text-red-700 space-y-1 mt-1">
                                {status.errors.map((error, index) => (
                                    <li key={index} className="truncate">• {error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Offline Message */}
            {!status.isOnline && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-800">
                        <WifiOff className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            Modo Offline - Dados serão sincronizados quando houver conexão
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

// Hook version for custom components
export function useSyncStatus() {
    const [status, setStatus] = useState<SyncStatus>(SyncService.getSyncStatus());

    useEffect(() => {
        const unsubscribe = SyncService.onStatusChange(setStatus);

        // Update status periodically
        const interval = setInterval(() => {
            setStatus(SyncService.getSyncStatus());
        }, 5000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const forceSync = async () => {
        return SyncService.forceSync();
    };

    const getPendingCount = () => SyncService.getPendingCount();
    const isCurrentlySyncing = () => SyncService.isCurrentlySyncing();

    return {
        status,
        forceSync,
        getPendingCount,
        isCurrentlySyncing
    };
}
