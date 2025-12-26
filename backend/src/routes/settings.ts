import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/index.js';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/index.js';
import { encrypt } from '../utils/crypto.js';

const router = express.Router();

// Multer configuration for certificate upload
const certificateStorage = multer.memoryStorage(); // Store file in memory to process it
const certificateUpload = multer({
    storage: certificateStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/x-pkcs12' || file.originalname.endsWith('.pfx')) {
            cb(null, true);
        } else {
            cb(new Error('Formato de arquivo inválido. Apenas .pfx é permitido.'));
        }
    }
});

// Multer configuration for logo upload
// Multer configuration for logo upload
const logoStorage = multer.memoryStorage(); // Store file in memory to process it manually
const logoUpload = multer({
    storage: logoStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
            cb(null, true);
        } else {
            cb(new Error('Formato de imagem inválido. Apenas JPG, PNG e WebP são permitidos.'));
        }
    }
});


// Get all settings
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const settings = await query('SELECT key, value, description FROM settings WHERE is_system = false');
        const systemSettings = await query('SELECT key, value, description FROM settings WHERE is_system = true');

        res.json({
            settings: settings,
            system: systemSettings
        });
    } catch (error) {
        console.error('Settings get error:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// Update setting
router.put('/:key', [
    authenticate,
    requireAdmin,
    param('key').isString(),
    body('value').exists()
], handleValidationErrors, async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        const userId = req.user!.id;

        await query(`
            INSERT INTO settings (key, value, updated_by)
            VALUES ($1, $2, $3)
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                updated_at = NOW(),
                updated_by = EXCLUDED.updated_by
        `, [key, JSON.stringify(value), userId]);

        res.json({ message: 'Configuração atualizada com sucesso' });
    } catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ error: 'Erro ao atualizar configuração' });
    }
});

// Upload and save digital certificate
router.post('/certificate', [
    // authenticate,  // Temporarily disabled for development
    // requireAdmin,
    certificateUpload.single('certificateFile') // 'certificateFile' must match the FormData key
], async (req: Request, res: Response) => {
    console.log('[CERT_UPLOAD] Endpoint /certificate atingido.');
    try {
        const { certificatePassword } = req.body;
        const certificateFile = req.file;
        const userId = req.user?.id || 'system';  // Default to system if no auth

        if (!certificateFile) {
            console.error('[CERT_UPLOAD] Erro: Arquivo do certificado não enviado.');
            return res.status(400).json({ error: 'Arquivo do certificado não enviado.' });
        }
        console.log(`[CERT_UPLOAD] Arquivo recebido: ${certificateFile.originalname}, Tamanho: ${certificateFile.size} bytes`);

        if (!certificatePassword) {
            console.error('[CERT_UPLOAD] Erro: Senha do certificado não informada.');
            return res.status(400).json({ error: 'Senha do certificado não informada.' });
        }
        console.log('[CERT_UPLOAD] Senha recebida.');

        // --- Convert to Base64 ---
        console.log('[CERT_UPLOAD] Convertendo certificado para Base64...');
        const certBase64 = certificateFile.buffer.toString('base64');
        console.log('[CERT_UPLOAD] Conversão concluída.');

        // --- Encrypt Password ---
        console.log('[CERT_UPLOAD] Criptografando senha...');
        const encryptedPassword = encrypt(certificatePassword);
        console.log('[CERT_UPLOAD] Senha criptografada com sucesso.');

        // --- Save to Database ---
        // We save the actual content as base64 instead of a file path
        console.log(`[CERT_UPLOAD] Salvando conteúdo do certificado no BD: key='nfce_cert_data'`);
        await query(
            `INSERT INTO settings (key, value) VALUES ($1, to_jsonb($2::text))
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            ['nfce_cert_data', certBase64]
        );
        console.log('[CERT_UPLOAD] Conteúdo do certificado salvo no BD.');

        console.log('[CERT_UPLOAD] Salvando senha criptografada no BD: key=nfce_cert_password');
        await query(
            `INSERT INTO settings (key, value) VALUES ($1, to_jsonb($2::text))
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            ['nfce_cert_password', encryptedPassword]
        );
        console.log('[CERT_UPLOAD] Senha criptografada salva no BD.');

        console.log('[CERT_UPLOAD] Processo concluído com sucesso!');
        res.json({ message: 'Certificado e senha salvos com sucesso!' });

    } catch (error) {
        console.error('[CERT_UPLOAD] Erro catastrófico no processo de upload:', error);
        if (error instanceof Error && error.message.includes('Formato de arquivo inválido')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Erro no upload do certificado' });
    }
});

// Upload and save company logo
router.post('/logo', [
    // authenticate, // Temporarily disabled
    // requireAdmin,
    logoUpload.single('logoFile')
], async (req: Request, res: Response) => {
    console.log('[LOGO_UPLOAD] Endpoint /logo atingido.');
    try {
        const logoFile = req.file;
        if (!logoFile) {
            console.error('[LOGO_UPLOAD] Erro: Arquivo da logo não enviado.');
            return res.status(400).json({ error: 'Arquivo da logo não enviado.' });
        }

        console.log(`[LOGO_UPLOAD] Logo recebida: ${logoFile.originalname}, Tamanho: ${logoFile.size} bytes`);

        // --- Convert to Base64 ---
        // Create a Data URI: data:<mime-type>;base64,<data>
        const base64Image = `data:${logoFile.mimetype};base64,${logoFile.buffer.toString('base64')}`;
        console.log('[LOGO_UPLOAD] Imagem convertida para Base64.');

        // --- Save to Database ---
        // We save the Data URI directly in the database
        console.log(`[LOGO_UPLOAD] Salvando logo no BD: key='app_logo_path'`);
        // Note: We keep the key 'app_logo_path' for compatibility, but now it stores the actual data URI
        await query(
            `INSERT INTO settings (key, value) VALUES ($1, to_jsonb($2::text))
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            ['app_logo_path', base64Image]
        );
        console.log('[LOGO_UPLOAD] Logo salva no BD.');

        console.log('[LOGO_UPLOAD] Processo concluído com sucesso!');
        res.json({
            message: 'Logo salva com sucesso!',
            path: base64Image // Return the data URI so frontend can display it immediately
        });

    } catch (error) {
        console.error('[LOGO_UPLOAD] Erro no upload da logo:', error);
        if (error instanceof Error) {
            console.error('[LOGO_UPLOAD] Mensagem de erro:', error.message);
            console.error('[LOGO_UPLOAD] Stack trace:', error.stack);
        }
        if (error instanceof Error && error.message.includes('Formato de imagem inválido')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({
            error: 'Erro no upload da logo',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});


export { router as settingRoutes };
