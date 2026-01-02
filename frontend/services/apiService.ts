import { supabase } from './supabaseClient';

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
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
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
            return response.json();
        } catch (error: any) {
            // Detecta erros de conexão
            if (error.message?.includes('Failed to fetch') || 
                error.message?.includes('ERR_CONNECTION_REFUSED') ||
                error.message?.includes('NetworkError') ||
                error.name === 'TypeError') {
                const isSupabase = API_BASE_URL.includes('supabase.co');
                const isFirebase = API_BASE_URL.includes('cloudfunctions.net');
                
                if (isSupabase) {
                    throw new Error('Não foi possível conectar ao backend no Supabase. Verifique se a Edge Function está deployada e se VITE_SUPABASE_URL está configurado corretamente.');
                } else if (isFirebase) {
                    throw new Error('Não foi possível conectar ao backend no Firebase. Verifique se a Cloud Function está deployada e se VITE_API_URL está configurado corretamente.');
                } else {
                    throw new Error('Servidor backend não está rodando. Verifique se o servidor está iniciado na porta 3001 ou configure VITE_API_URL com a URL do seu backend.');
                }
            }
            throw error;
        }
    },

    post: async (endpoint: string, data?: any) => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
            return response.json();
        } catch (error: any) {
            // Detecta erros de conexão
            if (error.message?.includes('Failed to fetch') || 
                error.message?.includes('ERR_CONNECTION_REFUSED') ||
                error.message?.includes('NetworkError') ||
                error.name === 'TypeError') {
                const isSupabase = API_BASE_URL.includes('supabase.co');
                const isFirebase = API_BASE_URL.includes('cloudfunctions.net');
                
                if (isSupabase) {
                    throw new Error('Não foi possível conectar ao backend no Supabase. Verifique se a Edge Function está deployada e se VITE_SUPABASE_URL está configurado corretamente.');
                } else if (isFirebase) {
                    throw new Error('Não foi possível conectar ao backend no Firebase. Verifique se a Cloud Function está deployada e se VITE_API_URL está configurado corretamente.');
                } else {
                    throw new Error('Servidor backend não está rodando. Verifique se o servidor está iniciado na porta 3001 ou configure VITE_API_URL com a URL do seu backend.');
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
