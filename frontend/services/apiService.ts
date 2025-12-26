import { supabase } from './supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const apiService = {
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
