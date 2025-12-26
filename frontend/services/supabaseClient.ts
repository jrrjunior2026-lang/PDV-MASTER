import { createClient } from '@supabase/supabase-js';

// Essas informações você encontra em Settings > API no seu dashboard do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase URL ou Anon Key não configurados no arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
