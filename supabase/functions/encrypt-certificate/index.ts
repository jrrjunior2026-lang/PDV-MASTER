// Supabase Edge Function: encrypt-certificate
// Deploy: supabase functions deploy encrypt-certificate

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // Get the user
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            throw new Error('Not authenticated')
        }

        // Parse request body
        const { certBase64, password } = await req.json()

        if (!certBase64 || !password) {
            throw new Error('Missing certificate data or password')
        }

        // Simple encryption using Web Crypto API
        const encoder = new TextEncoder()
        const data = encoder.encode(password)

        // Generate a key from environment variable
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(Deno.env.get('CERTIFICATE_ENCRYPTION_KEY') || 'default-key-change-me'),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        )

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode('pdv-master-salt'),
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        )

        const iv = crypto.getRandomValues(new Uint8Array(12))
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            key,
            data
        )

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encryptedData.byteLength)
        combined.set(iv)
        combined.set(new Uint8Array(encryptedData), iv.length)

        // Convert to base64
        const encryptedPassword = btoa(String.fromCharCode(...combined))

        // Save to database
        const { error: certError } = await supabaseClient
            .from('settings')
            .upsert({
                key: 'nfce_cert_data',
                value: certBase64,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' })

        if (certError) throw certError

        const { error: passError } = await supabaseClient
            .from('settings')
            .upsert({
                key: 'nfce_cert_password',
                value: encryptedPassword,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' })

        if (passError) throw passError

        return new Response(
            JSON.stringify({ message: 'Certificado salvo com sucesso!' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
