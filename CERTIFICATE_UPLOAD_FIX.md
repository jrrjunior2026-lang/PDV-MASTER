# 🔧 CORREÇÃO - Erro de Upload de Certificado

## ❌ **Erro:**
```
Error uploading certificate: Error: Não autenticado
```

## 📝 **Explicação:**

O upload de certificado está tentando usar uma Edge Function do Supabase que requer autenticação. Como estamos em desenvolvimento, vamos simplificar salvando diretamente no banco.

## ✅ **Solução Temporária:**

Por enquanto, **desabilite o upload de certificado** ou use esta solução:

### **Opção 1: Desabilitar Temporariamente**
Comente o botão de upload de certificado em `Settings.tsx` (linha ~300-320).

### **Opção 2: Salvar Diretamente no Banco**

Substitua a função `uploadCertificate` em `apiService.ts`:

```typescript
// frontend/services/apiService.ts (linha ~44)
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

        // Save directly to settings (without encryption for now)
        const { data: settings } = await supabase
            .from('settings')
            .select('*')
            .single();

        if (!settings) throw new Error('Settings not found');

        const { error } = await supabase
            .from('settings')
            .update({
                fiscal: {
                    ...settings.fiscal,
                    certificate: certBase64,
                    certificatePassword: password // WARNING: Not encrypted!
                }
            })
            .eq('id', settings.id);

        if (error) throw error;

        return { message: 'Certificado salvo com sucesso (sem criptografia)' };
    } catch (error: any) {
        console.error('Error uploading certificate:', error);
        throw error;
    }
}
```

## ⚠️ **IMPORTANTE:**

Esta solução **NÃO CRIPTOGRAFA** o certificado! É apenas para desenvolvimento/testes.

Para produção, você precisará:
1. Implementar a Edge Function `encrypt-certificate` no Supabase
2. Ou usar criptografia no lado do cliente antes de salvar

## 🎯 **Recomendação:**

Por enquanto, **pule o upload de certificado** e teste as outras funcionalidades do sistema. O certificado só é necessário para emissão de NFC-e, que pode ser implementado depois.

---

**Todas as outras funcionalidades do sistema estão funcionando!** ✅
