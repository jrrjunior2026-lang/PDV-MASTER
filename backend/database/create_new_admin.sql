-- =====================================================
-- PDV MASTER - CRIAR NOVO USUÁRIO ADMIN NO SUPABASE
-- Email: admin@admin.com
-- Senha: admin
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. Verificar se o usuário já existe no Auth
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@admin.com';
  
  -- 2. Se não existir no Auth, criar
  IF v_user_id IS NULL THEN
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
    
    -- Criar identidade para o login funcionar
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
  END IF;

  -- 3. Vincular/Atualizar na tabela pública public.users
  -- Usamos UPSERT para garantir que os dados estejam corretos
  INSERT INTO public.users (id, name, email, password_hash, role, is_active)
  VALUES (
    v_user_id,
    'Administrador Master',
    'admin@admin.com',
    -- O hash aqui é apenas ilustrativo para a tabela pública, 
    -- o login real usa o encrypted_password da tabela auth.users
    crypt('240105', gen_salt('bf')), 
    'ADMIN',
    true
  )
  ON CONFLICT (email) DO UPDATE 
  SET id = EXCLUDED.id, 
      name = EXCLUDED.name, 
      role = 'ADMIN', 
      is_active = true;

END $$;
