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

    // --- Certificate Upload using Supabase Edge Function ---
    uploadCertificate: async (certFile: File, password: string): Promise<{ message: string }> => {
        try {
            // Read file as base64
            const reader = new FileReader();
            const certBase64 = await new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                    const result = reader.result as string;
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(certFile);
            });

            // Get current session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');

            // Call Supabase Edge Function
            const { data, error } = await supabase.functions.invoke('encrypt-certificate', {
                body: { certBase64, password }
            });

            if (error) throw error;
            return data;
        } catch (error: any) {
            console.error('Error uploading certificate:', error);
            throw new Error(error.message || 'Falha no upload do certificado.');
        }
    }
};
