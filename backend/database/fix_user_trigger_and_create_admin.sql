-- =====================================================
-- CORREÇÃO: TRIGGER DE SINCRONIZAÇÃO DE USUÁRIOS
-- Resolve o erro de "null value in column password_hash"
-- =====================================================

-- 1. Atualizar a função do trigger para incluir um valor padrão no password_hash
-- ou permitir que ele seja nulo (já que o Auth gerencia a senha real)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, password_hash, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'AUTH_MANAGED', -- Valor padrão indicando que a senha é gerida pelo Supabase Auth
    'CASHIER',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Tornar a coluna password_hash opcional na tabela public.users
-- Isso evita erros futuros se outros processos tentarem criar usuários
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

-- 3. Agora, vamos tentar criar o usuário admin@admin.com novamente
-- Primeiro limpamos qualquer tentativa anterior que possa ter ficado incompleta
DELETE FROM auth.users WHERE email = 'admin@admin.com';

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Criar no Auth
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@admin.com',
    crypt('240105', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Administrador Master"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO v_user_id;

  -- Criar identidade
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id::text, 'admin@admin.com')::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Atualizar o cargo para ADMIN (o trigger cria como CASHIER por padrão)
  UPDATE public.users SET role = 'ADMIN' WHERE id = v_user_id;

END $$;
