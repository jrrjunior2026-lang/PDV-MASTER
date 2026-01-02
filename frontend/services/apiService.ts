import { supabase } from './supabaseClient';
import OfflineCacheService from './offlineCacheService';

// Determina a URL da API baseado na configuração
// Prioridade: VITE_API_URL > Supabase Functions > Firebase Functions > localhost
const getApiBaseUrl = (): string => {
    // Se VITE_API_URL estiver configurado, usa ele
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    
    // Se VITE_SUPABASE_URL estiver configurado, constrói a URL das Edge Functions
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
        // Remove trailing slash se houver
        const baseUrl = supabaseUrl.replace(/\/$/, '');
        // Supabase Edge Functions: https://PROJECT_REF.supabase.co/functions/v1/api
        return `${baseUrl}/functions/v1/api`;
    }
    
    // Fallback para localhost (desenvolvimento local)
    return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

// Verifica se está online
const isOnline = (): boolean => {
    return navigator.onLine;
};

// Log da URL da API em desenvolvimento (para debug)
if (import.meta.env.DEV) {
    console.log('🔗 API Base URL:', API_BASE_URL);
    console.log('📋 Configuração:', {
        VITE_API_URL: import.meta.env.VITE_API_URL || 'não configurado',
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'não configurado',
        URL_Final: API_BASE_URL
    });
}

export const apiService = {
    get: async (endpoint: string) => {
        const url = `${API_BASE_URL}${endpoint}`;
        
        // Tentar buscar do cache primeiro se offline
        if (!isOnline()) {
            const cached = await OfflineCacheService.get(url, 'GET');
            if (cached) {
                console.log('📦 Usando cache offline:', endpoint);
                return cached;
            }
            throw new Error('Modo offline: dados não disponíveis no cache local.');
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                if (response.status === 0 || response.status === 503) {
                    // Tentar cache como fallback
                    const cached = await OfflineCacheService.get(url, 'GET');
                    if (cached) {
                        console.log('📦 Usando cache devido a erro de servidor:', endpoint);
                        return cached;
                    }
                    
                    const isSupabase = API_BASE_URL.includes('supabase.co');
                    const isFirebase = API_BASE_URL.includes('cloudfunctions.net');
                    if (isSupabase) {
                        throw new Error('Backend no Supabase não está respondendo. Verifique se a Edge Function está deployada.');
                    } else if (isFirebase) {
                        throw new Error('Backend no Firebase não está respondendo. Verifique se a Cloud Function está deployada.');
                    } else {
                        throw new Error('Servidor backend não está rodando. Verifique se o servidor está iniciado na porta 3001.');
                    }
                }
                throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            
            // Salvar no cache para uso offline
            await OfflineCacheService.set(url, 'GET', data);
            
            return data;
        } catch (error: any) {
            // Detecta erros de conexão e tenta cache
            if (error.message?.includes('Failed to fetch') || 
                error.message?.includes('ERR_CONNECTION_REFUSED') ||
                error.message?.includes('NetworkError') ||
                error.name === 'TypeError') {
                
                // Tentar cache como último recurso
                const cached = await OfflineCacheService.get(url, 'GET');
                if (cached) {
                    console.log('📦 Usando cache devido a erro de rede:', endpoint);
                    return cached;
                }
                
                const isSupabase = API_BASE_URL.includes('supabase.co');
                const isFirebase = API_BASE_URL.includes('cloudfunctions.net');
                
                if (isSupabase) {
                    throw new Error('Não foi possível conectar ao backend no Supabase. Modo offline ativado - alguns recursos podem estar limitados.');
                } else if (isFirebase) {
                    throw new Error('Não foi possível conectar ao backend no Firebase. Modo offline ativado - alguns recursos podem estar limitados.');
                } else {
                    throw new Error('Servidor backend não está rodando. Modo offline ativado - alguns recursos podem estar limitados.');
                }
            }
            throw error;
        }
    },

    post: async (endpoint: string, data?: any) => {
        const url = `${API_BASE_URL}${endpoint}`;
        
        // Se offline, enfileirar para sincronização posterior
        if (!isOnline()) {
            // Importar SyncService dinamicamente para evitar dependência circular
            const { default: SyncService } = await import('./syncService');
            SyncService.queueOperation('CREATE', 'SALES', { endpoint, data });
            throw new Error('Modo offline: operação enfileirada para sincronização quando voltar online.');
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: data ? JSON.stringify(data) : undefined
            });
            if (!response.ok) {
                if (response.status === 0 || response.status === 503) {
                    const isSupabase = API_BASE_URL.includes('supabase.co');
                    const isFirebase = API_BASE_URL.includes('cloudfunctions.net');
                    if (isSupabase) {
                        throw new Error('Backend no Supabase não está respondendo. Verifique se a Edge Function está deployada.');
                    } else if (isFirebase) {
                        throw new Error('Backend no Firebase não está respondendo. Verifique se a Cloud Function está deployada.');
                    } else {
                        throw new Error('Servidor backend não está rodando. Verifique se o servidor está iniciado na porta 3001.');
                    }
                }
                throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
            }
            const result = await response.json();
            
            // Salvar no cache para referência
            await OfflineCacheService.set(url, 'POST', result, data, 5 * 60 * 1000); // 5 minutos
            
            return result;
        } catch (error: any) {
            // Detecta erros de conexão e enfileira para sync
            if (error.message?.includes('Failed to fetch') || 
                error.message?.includes('ERR_CONNECTION_REFUSED') ||
                error.message?.includes('NetworkError') ||
                error.name === 'TypeError') {
                
                // Enfileirar para sincronização
                const { default: SyncService } = await import('./syncService');
                SyncService.queueOperation('CREATE', 'SALES', { endpoint, data });
                
                const isSupabase = API_BASE_URL.includes('supabase.co');
                const isFirebase = API_BASE_URL.includes('cloudfunctions.net');
                
                if (isSupabase) {
                    throw new Error('Não foi possível conectar ao backend no Supabase. Operação enfileirada para sincronização.');
                } else if (isFirebase) {
                    throw new Error('Não foi possível conectar ao backend no Firebase. Operação enfileirada para sincronização.');
                } else {
                    throw new Error('Servidor backend não está rodando. Operação enfileirada para sincronização.');
                }
            }
            throw error;
        }
    },

    // --- Logo Upload using Supabase ---
    uploadLogo: async (logoFile: File): Promise<{ message: string, path: string }> => {
        try {
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `logo-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `settings/${fileName}`;

            // 1. Upload to Supabase Storage (Bucket 'assets')
            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(filePath, logoFile);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('assets')
                .getPublicUrl(filePath);

            // 3. Save reference in 'settings' table
            const { error: dbError } = await supabase
                .from('settings')
                .upsert({
                    key: 'app_logo_path',
                    value: publicUrl,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (dbError) throw dbError;

            return { message: 'Logo salva com sucesso!', path: publicUrl };
        } catch (error: any) {
            console.error('Error uploading logo to Supabase:', error);
            throw new Error(error.message || 'Falha no upload da logo.');
        }
    },

    // --- Certificate Upload SIMPLIFICADO (sem Edge Function) ---
    uploadCertificate: async (certFile: File, password: string): Promise<{ message: string }> => {
        try {
            // 1. Upload do certificado para o Storage
            const fileName = `certificate-${Date.now()}.pfx`;
            const filePath = `certificates/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(filePath, certFile, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // 2. Converter senha para Base64 (ofuscação básica - NÃO É CRIPTOGRAFIA!)
            const passwordBase64 = btoa(password);

            // 3. Salvar a senha ofuscada
            const { error: passError } = await supabase
                .from('settings')
                .upsert({
                    key: 'nfce_cert_password',
                    value: passwordBase64,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (passError) throw passError;

            // 4. Salvar o caminho do certificado
            const { error: pathError } = await supabase
                .from('settings')
                .upsert({
                    key: 'nfce_cert_path',
                    value: filePath,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (pathError) throw pathError;

            return { message: 'Certificado salvo com sucesso!' };
        } catch (error: any) {
            console.error('Error uploading certificate:', error);
            throw new Error(error.message || 'Falha no upload do certificado.');
        }
    }
};
