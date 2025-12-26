-- =====================================================
-- PDV MASTER - CRIAR USUÁRIO ADMIN NO SUPABASE AUTH
-- Execute APÓS supabase_complete_migration.sql
-- Execute ANTES de supabase_rls_policies.sql
-- =====================================================

-- 1. Criar usuário no Supabase Auth (se não existir)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verificar se o usuário já existe
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@pdvmaster.br';
  
  -- Se não existir, criar
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
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
      'admin@pdvmaster.br',
      crypt('admin', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO v_user_id;
    
    RAISE NOTICE 'Usuário admin criado com ID: %', v_user_id;
  ELSE
    RAISE NOTICE 'Usuário admin já existe com ID: %', v_user_id;
  END IF;
END $$;

-- 2. Criar identidade do usuário (se não existir)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@pdvmaster.br';
  
  IF NOT EXISTS (
    SELECT 1 FROM auth.identities 
    WHERE user_id = v_user_id AND provider = 'email'
  ) THEN
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
      format('{"sub":"%s","email":"%s"}', v_user_id::text, 'admin@pdvmaster.br')::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Identidade criada para o usuário admin';
  ELSE
    RAISE NOTICE 'Identidade já existe para o usuário admin';
  END IF;
END $$;

-- 3. Vincular ao sistema PDV (tabela public.users)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@pdvmaster.br';
  
  -- Deletar se já existir (para recriar com o ID correto)
  DELETE FROM public.users WHERE email = 'admin@pdvmaster.br';
  
  -- Inserir com o ID do auth.users
  INSERT INTO public.users (id, name, email, password_hash, role, is_active)
  VALUES (
    v_user_id,
    'Administrador',
    'admin@pdvmaster.br',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeaseUEjgaXK3Ji',
    'ADMIN',
    true
  );
  
  RAISE NOTICE 'Usuário vinculado ao sistema PDV com ID: %', v_user_id;
END $$;

-- =====================================================
-- SUCESSO! Agora você pode fazer login com:
-- Email: admin@pdvmaster.br
-- Senha: admin
-- 
-- PRÓXIMO PASSO: Execute supabase_rls_policies.sql
-- =====================================================
