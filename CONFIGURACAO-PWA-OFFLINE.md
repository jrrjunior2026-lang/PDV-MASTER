# 🚀 Configuração PWA - Frontend Offline/Online

## ✅ O que foi implementado

### 1. **Progressive Web App (PWA)**
- ✅ Service Worker configurado com Workbox
- ✅ Manifest.json para instalação como app
- ✅ Cache strategies para recursos estáticos
- ✅ Cache de API para uso offline

### 2. **Sistema de Cache Offline**
- ✅ IndexedDB para armazenar requisições/respostas
- ✅ Cache automático de requisições GET
- ✅ Enfileiramento de requisições POST quando offline
- ✅ Limpeza automática de cache expirado

### 3. **Sincronização Automática**
- ✅ SyncService melhorado para sincronizar com Supabase
- ✅ Sincronização automática quando volta online
- ✅ Fila de sincronização com retry automático
- ✅ Status de sincronização em tempo real

### 4. **Indicador Visual**
- ✅ Componente OnlineStatus mostrando status online/offline
- ✅ Contador de itens pendentes de sincronização
- ✅ Notificações visuais de mudança de status

## 📋 Como Funciona

### **Modo Online**
1. Requisições são feitas normalmente para o Supabase
2. Respostas são armazenadas no cache (IndexedDB)
3. Dados são sincronizados em tempo real

### **Modo Offline**
1. Requisições GET usam cache local (IndexedDB)
2. Requisições POST são enfileiradas para sincronização
3. Sistema continua funcionando com dados em cache
4. Quando volta online, sincroniza automaticamente

## 🔧 Configuração

### **Backend no Supabase**
O sistema detecta automaticamente o Supabase através de:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

### **URL da API**
Se você quiser usar uma URL específica:
```env
VITE_API_URL=https://sua-url.com/api
```

## 📱 Instalação como App

### **Desktop (Chrome/Edge)**
1. Acesse o site
2. Clique no ícone de instalação na barra de endereços
3. Ou vá em Menu > Instalar aplicativo

### **Mobile (Android)**
1. Acesse o site no Chrome
2. Menu > Adicionar à tela inicial
3. O app será instalado como PWA

### **Mobile (iOS)**
1. Acesse o site no Safari
2. Compartilhar > Adicionar à Tela de Início
3. O app será instalado como PWA

## 🎯 Funcionalidades Offline

### **Disponível Offline:**
- ✅ Visualizar produtos (do cache)
- ✅ Visualizar clientes (do cache)
- ✅ Visualizar vendas anteriores (do cache)
- ✅ Criar novas vendas (enfileiradas)
- ✅ Adicionar produtos (enfileirados)
- ✅ Adicionar clientes (enfileirados)

### **Sincronização Automática:**
- ✅ Quando volta online, sincroniza automaticamente
- ✅ Mostra status de sincronização
- ✅ Retry automático em caso de erro
- ✅ Log de sincronização para auditoria

## 🔍 Verificar Status

### **No Console do Navegador:**
```javascript
// Ver status de sincronização
SyncService.getSyncStatus()

// Ver fila de sincronização
SyncService.getSyncQueue()

// Forçar sincronização
SyncService.forceSync()
```

### **Indicador Visual:**
- 🟢 Verde: Online e sincronizado
- 🟡 Amarelo: Online com itens pendentes
- 🔴 Vermelho: Offline

## 🛠️ Troubleshooting

### **Service Worker não registra:**
- Verifique se está usando HTTPS (ou localhost)
- Verifique se o arquivo sw.js existe no build

### **Cache não funciona:**
- Limpe o cache do navegador
- Verifique se IndexedDB está habilitado
- Verifique o console para erros

### **Sincronização não funciona:**
- Verifique se VITE_SUPABASE_URL está configurado
- Verifique se está online
- Verifique os logs no console

## 📝 Próximos Passos

1. ✅ Testar em modo offline
2. ✅ Verificar sincronização automática
3. ✅ Testar instalação como PWA
4. ✅ Verificar cache de recursos

---

**Nota:** O sistema funciona completamente offline após o primeiro carregamento online. Todos os recursos são cacheados automaticamente.

