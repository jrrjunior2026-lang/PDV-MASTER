# ✅ CHECKLIST DE PRODUÇÃO - PDV Master

## 🔒 **Segurança (CRÍTICO)**

### Supabase
- [ ] Row Level Security (RLS) ativado em TODAS as tabelas
- [ ] Políticas de RLS aplicadas (`supabase_rls_policies.sql`)
- [ ] Storage bucket `assets` configurado corretamente
- [ ] Rate limiting configurado
- [ ] CORS configurado com domínio de produção
- [ ] Backup automático habilitado

### Frontend
- [ ] Variáveis de ambiente configuradas (`.env.production`)
- [ ] Chaves de API não expostas no código
- [ ] HTTPS habilitado (SSL)
- [ ] Headers de segurança configurados
- [ ] Content Security Policy (CSP) configurado

---

## 🧪 **Testes**

### Funcionalidades Core
- [ ] Login/Logout funciona
- [ ] Dashboard carrega dados
- [ ] Cadastro de produtos
- [ ] Cadastro de clientes
- [ ] Abertura de caixa
- [ ] Venda completa (todos os métodos de pagamento)
- [ ] Fechamento de caixa
- [ ] Relatórios geram corretamente
- [ ] Upload de logo funciona

### Performance
- [ ] Build sem erros
- [ ] Lighthouse score > 90
- [ ] Tempo de carregamento < 3s
- [ ] Imagens otimizadas
- [ ] Code splitting funcionando

### Compatibilidade
- [ ] Chrome/Edge (Desktop)
- [ ] Firefox (Desktop)
- [ ] Safari (Desktop)
- [ ] Chrome Mobile
- [ ] Safari Mobile

---

## 📦 **Build & Deploy**

### Preparação
- [ ] Dependências atualizadas (`npm update`)
- [ ] Testes locais passando
- [ ] Build local sem erros (`npm run build`)
- [ ] Preview local testado (`npm run preview`)

### Deploy
- [ ] Plataforma escolhida (Vercel/Netlify/etc)
- [ ] Variáveis de ambiente configuradas na plataforma
- [ ] Deploy realizado com sucesso
- [ ] URL de produção acessível
- [ ] Domínio personalizado configurado (opcional)

---

## 🗄️ **Banco de Dados**

### Supabase
- [ ] Todas as tabelas criadas
- [ ] Funções SQL (RPC) criadas
- [ ] Triggers configurados
- [ ] Índices otimizados
- [ ] Usuário admin criado
- [ ] Settings iniciais configurados

### Dados
- [ ] Backup inicial criado
- [ ] Política de retenção definida
- [ ] Monitoramento configurado

---

## 📊 **Monitoramento**

### Analytics
- [ ] Supabase Analytics ativo
- [ ] Vercel/Netlify Analytics configurado (opcional)
- [ ] Google Analytics configurado (opcional)

### Logs
- [ ] Logs de erro configurados
- [ ] Sentry ou similar configurado (opcional)
- [ ] Alertas configurados

---

## 📱 **PWA (Opcional)**

- [ ] Service Worker configurado
- [ ] Manifest.json criado
- [ ] Ícones PWA adicionados
- [ ] Instalável em dispositivos móveis
- [ ] Funciona offline (básico)

---

## 📝 **Documentação**

- [ ] README.md atualizado
- [ ] Guia de deploy criado
- [ ] Variáveis de ambiente documentadas
- [ ] Credenciais de acesso documentadas
- [ ] Procedimentos de backup documentados

---

## 🎯 **Pós-Deploy**

### Verificação Imediata
- [ ] Site acessível via HTTPS
- [ ] Login funciona
- [ ] Dados carregam corretamente
- [ ] Sem erros no console
- [ ] Sem erros 404

### Primeiras 24h
- [ ] Monitorar logs de erro
- [ ] Verificar performance
- [ ] Testar em diferentes dispositivos
- [ ] Coletar feedback inicial

### Primeira Semana
- [ ] Revisar analytics
- [ ] Otimizar queries lentas
- [ ] Ajustar cache se necessário
- [ ] Documentar problemas encontrados

---

## 🚨 **Plano de Rollback**

### Em caso de problemas críticos:
1. [ ] Reverter deploy na plataforma
2. [ ] Restaurar backup do banco (se necessário)
3. [ ] Comunicar usuários (se aplicável)
4. [ ] Investigar causa raiz
5. [ ] Corrigir e re-deploy

---

## 📞 **Contatos de Emergência**

- **Supabase Support:** https://supabase.com/support
- **Vercel Support:** https://vercel.com/support
- **Netlify Support:** https://www.netlify.com/support

---

## ✅ **Aprovação Final**

- [ ] Todos os itens críticos verificados
- [ ] Testes de aceitação passaram
- [ ] Stakeholders aprovaram
- [ ] Backup de segurança criado
- [ ] Plano de rollback documentado

---

**Data do Deploy:** ___/___/______

**Responsável:** _________________

**Versão:** _________________

---

## 🎉 **Parabéns!**

Se todos os itens acima estão marcados, seu PDV Master está pronto para produção!

**Boa sorte!** 🚀
