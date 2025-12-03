import { Request, Response, NextFunction } from 'express';
import { DeviceAuth, SyncAuthenticatedRequest } from '../types/sync.js';
import { queryOne } from '../config/database.js';

// Middleware para autenticação de dispositivo
export const deviceAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const deviceId = req.headers['x-device-id'] as string ||
            req.query.deviceId as string ||
            (req.body?.deviceId);

        const authToken = req.headers['x-device-token'] as string ||
            req.headers.authorization;

        if (!deviceId) {
            res.status(400).json({
                error: 'Device ID obrigatório para sincronização',
                code: 'DEVICE_ID_MISSING'
            });
            return;
        }

        // Validar formato do Device ID (UUID v4)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(deviceId)) {
            res.status(400).json({
                error: 'Device ID deve ser um UUID válido',
                code: 'INVALID_DEVICE_ID_FORMAT'
            });
            return;
        }

        // Criar ou validar dispositivo na base
        const device: DeviceAuth = {
            deviceId,
            token: authToken?.replace('Bearer ', ''),
        };

        // Verificar se dispositivo existe na base
        try {
            const existingDevice = await queryOne(
                'SELECT id, device_id, user_id, last_seen FROM sync_devices WHERE device_id = $1',
                [deviceId]
            );

            if (!existingDevice) {
                // Primeiro acesso do dispositivo, registrar
                await queryOne(`
                    INSERT INTO sync_devices (device_id, last_seen, created_at)
                    VALUES ($1, NOW(), NOW())
                    ON CONFLICT (device_id) DO UPDATE SET
                        last_seen = NOW()
                `, [deviceId]);
            } else {
                // Atualizar último acesso
                await queryOne(
                    'UPDATE sync_devices SET last_seen = NOW() WHERE device_id = $1',
                    [deviceId]
                );
            }
        } catch (dbError: any) {
            // Se a tabela não existir ainda (durante migração), continue
            if (!dbError.message?.includes('sync_devices')) {
                throw dbError;
            }
        }

        // Anexar dispositivo ao request
        (req as SyncAuthenticatedRequest).device = device;

        next();
    } catch (error: any) {
        console.error('Device authentication error:', error);
        res.status(500).json({
            error: 'Erro na autenticação do dispositivo',
            code: 'DEVICE_AUTH_ERROR'
        });
    }
};

// Middleware opcional para autenticação de usuário junto ao dispositivo
export const optionalUserAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Tentar obter token de usuário para validação opcional
        const userToken = req.headers['x-user-token'] as string;
        if (userToken) {
            // Aqui você pode implementar validação JWT adicional se necessário
            // Por enquanto, apenas permite continuar
        }

        next();
    } catch (error) {
        console.error('Optional user auth error:', error);
        // Não bloqueia a sincronização se falhar
        next();
    }
};

// Middleware de logging específico para sync
export const syncLogging = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const device = (req as SyncAuthenticatedRequest).device;
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`🔄 SYNC ${req.method} ${req.path} - Device: ${device?.deviceId || 'unknown'} - ${res.statusCode} - ${duration}ms`);
    });

    next();
};
