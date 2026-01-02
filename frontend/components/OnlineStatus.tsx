import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import SyncService from '../services/syncService';

export const OnlineStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncStatus, setSyncStatus] = useState(SyncService.getSyncStatus());

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setSyncStatus(SyncService.getSyncStatus());
        };

        const handleOffline = () => {
            setIsOnline(false);
            setSyncStatus(SyncService.getSyncStatus());
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Atualizar status periodicamente
        const interval = setInterval(() => {
            setSyncStatus(SyncService.getSyncStatus());
        }, 5000);

        // Escutar mudanças no sync
        const unsubscribe = SyncService.onStatusChange((status) => {
            setSyncStatus(status);
            setIsOnline(status.isOnline);
        });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
            unsubscribe();
        };
    }, []);

    if (isOnline && syncStatus.pendingItems === 0) {
        return null; // Não mostrar quando tudo está sincronizado
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className={`
                flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg
                ${isOnline 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }
                animate-slideInRight
            `}>
                {isOnline ? (
                    <>
                        <Wifi size={18} />
                        <span className="text-sm font-medium">
                            {syncStatus.pendingItems > 0 
                                ? `Sincronizando... (${syncStatus.pendingItems})`
                                : 'Online'
                            }
                        </span>
                    </>
                ) : (
                    <>
                        <WifiOff size={18} />
                        <span className="text-sm font-medium">Modo Offline</span>
                    </>
                )}
            </div>
        </div>
    );
};

