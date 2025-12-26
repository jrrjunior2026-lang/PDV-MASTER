# 🔧 Solução: Erro de CORS na Edge Function

## 📌 Problema
```
Access to fetch at 'https://pjaiqrlhfocholazjgdc.supabase.co/functions/v1/encrypt-certificate' 
from origin 'https://jrrjunior2026-lang.github.io' has been blocked by CORS policy
```

**Causa**: A Edge Function `encrypt-certificate` não foi deployada no Supabase ou está com erro.

---

## ✅ Solução: Deploy da Edge Function

### Opção 1: Deploy via Supabase CLI (RECOMENDADO)

#### Passo 1: Instalar Supabase CLI
```bash
# Windows (via npm)
npm install -g supabase

# Ou via Chocolatey
choco install supabase
```

#### Passo 2: Login no Supabase
```bash
supabase login
```

#### Passo 3: Link com seu Projeto
```bash
cd c:\Users\Usuario\Documents\PDV-MASTER
supabase link --project-ref pjaiqrlhfocholazjgdc
```

#### Passo 4: Deploy da Edge Function
```bash
supabase functions deploy encrypt-certificate
```

#### Passo 5: Configurar Variável de Ambiente
No Supabase Dashboard:
1. Vá em **Edge Functions** > **encrypt-certificate**
2. Clique em **Settings**
3. Adicione a variável de ambiente:
   - **Nome**: `CERTIFICATE_ENCRYPTION_KEY`
   - **Valor**: Uma chave secreta forte (ex: `minha-chave-super-secreta-123`)

---

### Opção 2: Solução Alternativa (SEM Edge Function)

Se você não conseguir fazer o deploy da Edge Function, podemos **salvar o certificado diretamente no Storage** sem criptografia adicional:

#### Modificar `apiService.ts`:

```typescript
// Substituir a função uploadCertificate por:
uploadCertificate: async (certFile: File, password: string): Promise<{ message: string }> => {
    try {
        // 1. Upload do certificado para o Storage
        const fileName = `certificate-${Date.now()}.pfx`;
        const filePath = `certificates/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('assets')
            .upload(filePath, certFile);

        if (uploadError) throw uploadError;

        // 2. Salvar a senha (ATENÇÃO: Não é seguro em produção!)
        const { error: passError } = await supabase
            .from('settings')
            .upsert({
                key: 'nfce_cert_password',
                value: password, // ⚠️ Senha em texto plano!
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

        if (passError) throw passError;

        // 3. Salvar o caminho do certificado
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
```

⚠️ **ATENÇÃO**: Esta solução salva a senha em texto plano. Use apenas para desenvolvimento!

---

### Opção 3: Desabilitar Upload de Certificado Temporariamente

Se você não precisa do certificado agora, pode comentar essa funcionalidade:

#### Em `Settings.tsx`, linha 109-132:

```typescript
const handleSaveCertificate = async () => {
    // Temporariamente desabilitado
    showAlert('Upload de certificado temporariamente desabilitado. Configure a Edge Function primeiro.', 'Aviso', 'info');
    return;
    
    // ... resto do código comentado
};
```

---

## 🔍 Verificar se a Edge Function Está Ativa

1. Acesse: https://app.supabase.com
2. Vá em **Edge Functions** no menu lateral
3. Verifique se `encrypt-certificate` aparece na lista
4. Se aparecer, clique nela e veja os logs de erro

---

## 📚 Recursos Úteis

- [Documentação Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)

---

**Qual opção você prefere?**
- Opção 1: Deploy da Edge Function (mais seguro)
- Opção 2: Salvar direto no Storage (rápido, menos seguro)
- Opção 3: Desabilitar temporariamente

---

**Criado em**: 2025-12-26
**Projeto**: PDV-MASTER
