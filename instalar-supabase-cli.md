# 🚀 Script de Instalação do Supabase CLI

## Opção 1: Via npm (Recomendado)
npm install -g supabase

## Opção 2: Via Chocolatey
# Primeiro instale o Chocolatey se não tiver:
# https://chocolatey.org/install

choco install supabase

## Opção 3: Via Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

## Após a instalação, verifique:
supabase --version

## Login no Supabase:
supabase login

## Link com o projeto:
cd c:\Users\Usuario\Documents\PDV-MASTER
supabase link --project-ref pjaiqrlhfocholazjgdc

## Deploy da Edge Function:
supabase functions deploy encrypt-certificate

## Configurar variável de ambiente:
# No Dashboard do Supabase:
# Edge Functions > encrypt-certificate > Settings
# Adicionar: CERTIFICATE_ENCRYPTION_KEY = sua-chave-secreta-aqui
