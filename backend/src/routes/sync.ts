import express from 'express';
import { deviceAuth, syncLogging } from '../middleware/deviceAuth.js';
import { syncService } from '../services/syncService.js';
import {
    SyncRequestData,
    SyncPushResult,
    SyncStats,
    ConflictResolution,
    SyncAuthenticatedRequest
} from '../types/sync.js';

const router = express.Router();

// Middleware para todas as rotas de sync
router.use(deviceAuth);
router.use(syncLogging);

/**
 * GET /sync/status - Verifica status da sincronização
 */
router.get('/status', async (req: express.Request, res: express.Response) => {
    try {
        const syncReq = req as SyncAuthenticatedRequest;
        const stats = await syncService.getSyncStats(syncReq.device.deviceId);

        res.json({
            success: true,
            device: syncReq.device,
            stats,
            timestamp: Date.now()
        });
    } catch (error: any) {
        console.error('Sync status error:', error);
        res.status(500).json({
            error: 'Erro ao buscar status de sincronização',
            code: 'SYNC_STATUS_FAILED'
        });
    }
});

/**
 * POST /sync/push - Recebe operações do dispositivo (CREATE/UPDATE/DELETE)
 */
router.post('/push', async (req: express.Request, res: express.Response) => {
    try {
        const syncReq = req as SyncAuthenticatedRequest;
        const { operations } = req.body;

        if (!Array.isArray(operations)) {
            return res.status(400).json({
                error: 'Campo operations deve ser um array',
                code: 'INVALID_OPERATIONS_FORMAT'
            });
        }

        // Validar operações
        for (const op of operations) {
            if (!op.collection || !op.operation || !op.data) {
                return res.status(400).json({
                    error: 'Cada operação deve ter collection, operation e data',
                    code: 'INCOMPLETE_OPERATION'
                });
            }
        }

        const result = await syncService.processPush(syncReq.device.deviceId, operations);

        res.json(result);

        console.log(`📤 Device ${syncReq.device.deviceId}: ${result.acknowledged} ops processed, ${result.errors?.length || 0} errors`);

    } catch (error: any) {
        console.error('Sync push error:', error);
        res.status(500).json({
            error: 'Erro no processamento da sincronização',
            code: 'SYNC_PUSH_FAILED',
            details: error.message
        });
    }
});

/**
 * POST /sync/pull - Disponibiliza operações do servidor ao dispositivo
 */
router.post('/pull', async (req: express.Request, res: express.Response) => {
    try {
        const syncReq = req as SyncAuthenticatedRequest;
        const requestData: SyncRequestData = req.body;

        if (!requestData.collections || !Array.isArray(requestData.collections)) {
            return res.status(400).json({
                error: 'Campo collections é obrigatório e deve ser um array',
                code: 'INVALID_COLLECTIONS_FORMAT'
            });
        }

        // Validar deviceId no request
        if (!requestData.deviceId) {
            requestData.deviceId = syncReq.device.deviceId;
        }

        const response = await syncService.processPull(requestData);

        res.json(response);

        // Log detalhado
        const totalItems = Object.values(response.collections).reduce(
            (sum, col: any) => sum + (col?.items?.length || 0), 0
        );

        console.log(`📥 Device ${syncReq.device.deviceId}: ${totalItems} items sent, ${response.conflicts?.length || 0} conflicts`);

    } catch (error: any) {
        console.error('Sync pull error:', error);
        res.status(500).json({
            error: 'Erro ao processar solicitud de sincronização',
            code: 'SYNC_PULL_FAILED',
            details: error.message
        });
    }
});

/**
 * POST /sync/resolve-conflicts - Resolve conflitos de sincronização
 */
router.post('/resolve-conflicts', async (req: express.Request, res: express.Response) => {
    try {
        const syncReq = req as SyncAuthenticatedRequest;
        const { resolutions }: { resolutions: ConflictResolution[] } = req.body;

        if (!Array.isArray(resolutions)) {
            return res.status(400).json({
                error: 'Campo resolutions deve ser um array',
                code: 'INVALID_RESOLUTIONS_FORMAT'
            });
        }

        await syncService.resolveConficts(resolutions);

        res.json({
            success: true,
            resolved: resolutions.length,
            timestamp: Date.now()
        });

        console.log(`⚖️ Device ${syncReq.device.deviceId}: ${resolutions.length} conflicts resolved`);

    } catch (error: any) {
        console.error('Conflict resolution error:', error);
        res.status(500).json({
            error: 'Erro ao resolver conflitos',
            code: 'CONFLICT_RESOLUTION_FAILED',
            details: error.message
        });
    }
});

/**
 * GET /sync/stats - Estatísticas detalhadas de sincronização
 */
router.get('/stats', async (req: express.Request, res: express.Response) => {
    try {
        const syncReq = req as SyncAuthenticatedRequest;

        // Parâmetros de filtro
        const { collection, days = 30 } = req.query;
        const deviceId = req.query.deviceId as string || syncReq.device.deviceId;

        const stats = await syncService.getSyncStats(deviceId);

        // Enriquecer dados (se necessário filtrar por data/coleção)
        const detailedStats = {
            ...stats,
            deviceId,
            timeframe: `${days} days`,
            recommendations: []
        };

        // Adicionar recomendações baseado no status
        if (stats.failedItems > 0) {
            (detailedStats.recommendations as string[]).push(`tem ${stats.failedItems} operações falhadas que precisam ser reprocessadas`);
        }

        if (stats.pendingItems > 10) {
            (detailedStats.recommendations as string[]).push(`tem ${stats.pendingItems} operações pendentes na fila`);
        }

        res.json(detailedStats);

    } catch (error: any) {
        console.error('Sync stats error:', error);
        res.status(500).json({
            error: 'Erro ao obter estatísticas de sincronização',
            code: 'SYNC_STATS_FAILED'
        });
    }
});

/**
 * DELETE /sync/cleanup - Remove dados antigos de sincronização
 */
router.delete('/cleanup', async (req: express.Request, res: express.Response) => {
    try {
        const syncReq = req as SyncAuthenticatedRequest;
        const { days = 90 } = req.query; // Remover dados mais antigos que X dias

        // Validar permissão (só administrador pode fazer cleanup)
        // Por enquanto, permitir apenas própria limpeza

        const result = await syncService.cleanupOldData(syncReq.device.deviceId, parseInt(days as string));

        res.json({
            success: true,
            cleaned: result,
            deviceId: syncReq.device.deviceId,
            message: `Limpeza concluída: ${result} registros removidos`
        });

        console.log(`🧹 Device ${syncReq.device.deviceId}: ${result} records cleaned up`);

    } catch (error: any) {
        console.error('Sync cleanup error:', error);
        res.status(500).json({
            error: 'Erro na limpeza de dados de sincronização',
            code: 'SYNC_CLEANUP_FAILED'
        });
    }
});

export { router as syncRoutes };
