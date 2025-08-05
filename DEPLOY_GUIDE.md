# 🚀 Guia: Deploy no Vercel Apenas para Tags (Oficial)

## 📋 **Visão Geral**

Este guia implementa a estratégia oficial do Vercel para **deploy baseado em tags/releases** em vez de commits automáticos. Seguindo a [documentação oficial do Vercel](https://vercel.com/guides/can-you-deploy-based-on-tags-releases-on-vercel), vamos configurar GitHub Actions + Vercel CLI para controle total dos deploys.

---

## ⚙️ **1. Desativar Auto-Deploy do Vercel**

### **Passo 1: Criar `vercel.json`**

Crie o arquivo `vercel.json` na raiz do projeto:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

**O que faz**: Desativa completamente os deploys automáticos do Vercel para qualquer branch ou commit.

---

## 🔧 **2. Configurar Projeto no Vercel**

### **Passo 2: Instalar e Configurar Vercel CLI**

```bash
# Instalar CLI global
npm install --global vercel@latest

# Fazer login
vercel login

# Dentro da pasta do projeto, linkar ao Vercel
vercel link
```

### **Passo 3: Obter IDs do Projeto**

Após executar `vercel link`, um arquivo `.vercel/project.json` será criado:

```bash
# Ver o conteúdo do arquivo
cat .vercel/project.json
```

Exemplo do conteúdo:
```json
{
  "orgId": "team_xxxxxxxxx",
  "projectId": "prj_xxxxxxxxx"
}
```

---

## 🔑 **3. Configurar Secrets no GitHub**

### **Passo 4: Adicionar Secrets**

No GitHub, vá em **Settings > Secrets and variables > Actions** e adicione:

1. **VERCEL_TOKEN**: 
   - Acesse: https://vercel.com/account/tokens
   - Clique **"Create Token"**
   - Escopo: **"Full Account"**
   - Copie o token gerado

2. **VERCEL_ORG_ID**: 
   - Use o valor `orgId` do arquivo `.vercel/project.json`

3. **VERCEL_PROJECT_ID**: 
   - Use o valor `projectId` do arquivo `.vercel/project.json`

---

## � **4. GitHub Actions (Método Oficial)**

### **Passo 5: Criar Workflow**

Crie `.github/workflows/deploy.yml`:

```yaml
name: Production Tag Deployment

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

on:
  push:
    # Pattern matched against refs/tags
    tags:        
      - '*' # Push events to every tag not containing /

jobs:
  Deploy-Production:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
        
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### **Variação para Tags Específicas**

Se quiser apenas tags que começam com 'v':

```yaml
on:
  push:
    tags:        
      - 'v*' # Apenas tags como v1.0.0, v2.1.0, etc.
```

---

## 🔥 **5. Deploy para Hotfixes (Opcional)**

### **Workflow para Branch de Hotfix**

Crie `.github/workflows/hotfix.yml`:

```yaml
name: Hotfix Deployment

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

on:
  push:
    branches:
      - hotfix

jobs:
  Deploy-Production:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
        
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 🎯 **6. Fluxo de Trabalho Recomendado**

### **Para Desenvolvimento**

```bash
# Trabalhe normalmente nos branches
git checkout dev
git add .
git commit -m "feat: nova funcionalidade de teste"
git push origin dev

# ❌ NÃO dispara deploy (auto-deploy desativado)
```

### **Para Produção (Release)**

```bash
# 1. Finalize o desenvolvimento
git checkout main
git merge dev

# 2. Atualize a versão
npm version patch  # 1.0.0 -> 1.0.1
# ou npm version minor   # 1.0.0 -> 1.1.0  
# ou npm version major   # 1.0.0 -> 2.0.0

# 3. A versão já cria uma tag automaticamente, mas você pode criar manual:
git tag -a v1.0.1 -m "Release v1.0.1 - Correções e melhorias"

# 4. Envie tudo
git push origin main
git push origin v1.0.1

# ✅ GitHub Actions dispara deploy automaticamente
```

### **Para Hotfixes**

```bash
# 1. Crie branch de hotfix
git checkout -b hotfix
git add .
git commit -m "fix: correção crítica"

# 2. Push do hotfix
git push origin hotfix

# ✅ Deploy automático do hotfix para produção
```

---

## 📊 **7. Vantagens desta Abordagem**

### ✅ **Método Oficial**
- Baseado na documentação oficial do Vercel
- Suporte garantido e estabilidade
- Melhores práticas da comunidade

### ✅ **Controle Total**
- Deploy apenas em tags/releases
- Hotfixes rápidos quando necessário
- Preview deployments ainda funcionam

### ✅ **Rastreabilidade**
- Cada deploy vinculado a uma versão
- Release notes automáticas no GitHub
- Rollback fácil para qualquer tag

---

## 🔄 **8. Comandos Úteis**

### **Verificar Status**

```bash
# Listar tags
git tag

# Ver detalhes de uma tag
git show v1.0.0

# Ver deployments no Vercel
vercel ls

# Ver logs de um deployment
vercel logs [deployment-url]
```

### **Deploy Manual (Emergência)**

```bash
# Checkout na tag
git checkout v1.0.0

# Deploy manual
vercel --prod

# Voltar para main
git checkout main
```

### **Rollback**

```bash
# Via Vercel CLI
vercel rollback [deployment-url]

# Ou criar nova tag apontando para commit anterior
git tag -a v1.0.2 [hash-do-commit-anterior]
git push origin v1.0.2
```

---

## 🆘 **9. Solução de Problemas**

### **Deploy não dispara**

```bash
# 1. Verificar se tag foi enviada
git ls-remote --tags origin

# 2. Verificar GitHub Actions
# - Acesse Actions tab no GitHub
# - Veja se workflow executou

# 3. Verificar secrets
# - GitHub Settings > Secrets and variables > Actions
# - Confirme VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
```

### **Erro de autenticação**

```bash
# 1. Gerar novo token no Vercel
# https://vercel.com/account/tokens

# 2. Re-linkar projeto
vercel link --confirm

# 3. Verificar .vercel/project.json
cat .vercel/project.json
```

### **Build falha**

```bash
# 1. Testar build local
npm run build

# 2. Verificar logs no GitHub Actions
# Actions > [workflow-name] > [job] > logs

# 3. Testar Vercel CLI local
vercel build --prod
```

---

## ✅ **10. Verificação Final**

### **Checklist de Configuração**

- [ ] ✅ `vercel.json` criado com `deploymentEnabled: false`
- [ ] ✅ `vercel link` executado e `.vercel/project.json` criado
- [ ] ✅ Secrets configurados no GitHub (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- [ ] ✅ Workflow `.github/workflows/deploy.yml` criado
- [ ] ✅ Teste: push de uma tag deve disparar deploy

### **Teste Inicial**

```bash
# Criar tag de teste
git tag -a v1.0.0-test -m "Teste do sistema de deploy"
git push origin v1.0.0-test

# Verificar no GitHub Actions se o workflow executou
# Verificar no Vercel se o deploy foi criado
```

---

## 📞 **Suporte**

- **Documentação Oficial**: https://vercel.com/guides/can-you-deploy-based-on-tags-releases-on-vercel
- **Vercel CLI Docs**: https://vercel.com/cli
- **GitHub Actions**: https://docs.github.com/en/actions

---

*Este guia implementa a estratégia oficial do Vercel para deploy baseado em tags, garantindo máximo controle e estabilidade em produção.*

---

## 🎯 **4. Fluxo de Trabalho Recomendado**

### **Para Desenvolvimento**

```bash
# Trabalhe normalmente nos branches
git checkout dev
git add .
git commit -m "feat: nova funcionalidade"
git push origin dev

# ❌ NÃO dispara deploy (auto-deploy desativado)
```

### **Para Produção (Release)**

```bash
# 1. Finalize o desenvolvimento
git checkout main
git merge dev

# 2. Atualize a versão
npm version patch  # 1.0.0 -> 1.0.1
# ou npm version minor   # 1.0.0 -> 1.1.0  
# ou npm version major   # 1.0.0 -> 2.0.0

# 3. A versão já cria uma tag automaticamente, mas você pode criar manual:
git tag -a v1.0.1 -m "Release v1.0.1 - Correções e melhorias"

# 4. Envie tudo
git push origin main
git push origin v1.0.1

# ✅ GitHub Actions dispara deploy automaticamente
```

### **Para Hotfixes**

```bash
# 1. Crie branch de hotfix
git checkout -b hotfix
git add .
git commit -m "fix: correção crítica"

# 2. Push do hotfix
git push origin hotfix

# ✅ Deploy automático do hotfix para produção
```

---

## 📊 **5. Vantagens desta Abordagem**

### ✅ **Método Oficial**
- Baseado na documentação oficial do Vercel
- Suporte garantido e estabilidade
- Melhores práticas da comunidade

### ✅ **Controle Total**
- Deploy apenas em tags/releases
- Hotfixes rápidos quando necessário
- Preview deployments ainda funcionam

### ✅ **Rastreabilidade**
- Cada deploy vinculado a uma versão
- Release notes automáticas no GitHub
- Rollback fácil para qualquer tag

---

## 🔄 **6. Comandos Úteis**

### **Verificar Status**

```bash
# Listar tags
git tag

# Ver detalhes de uma tag
git show v1.0.0

# Ver deployments no Vercel
vercel ls

# Ver logs de um deployment
vercel logs [deployment-url]
```

### **Deploy Manual (Emergência)**

```bash
# Checkout na tag
git checkout v1.0.0

# Deploy manual
vercel --prod

# Voltar para main
git checkout main
```

### **Rollback**

```bash
# Via Vercel CLI
vercel rollback [deployment-url]

# Ou criar nova tag apontando para commit anterior
git tag -a v1.0.2 [hash-do-commit-anterior]
git push origin v1.0.2
```

---

## 🆘 **7. Solução de Problemas**

### **Deploy não dispara**

```bash
# 1. Verificar se tag foi enviada
git ls-remote --tags origin

# 2. Verificar GitHub Actions
# - Acesse Actions tab no GitHub
# - Veja se workflow executou

# 3. Verificar secrets
# - GitHub Settings > Secrets and variables > Actions
# - Confirme VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
```

### **Erro de autenticação**

```bash
# 1. Gerar novo token no Vercel
# https://vercel.com/account/tokens

# 2. Re-linkar projeto
vercel link --confirm

# 3. Verificar .vercel/project.json
cat .vercel/project.json
```

### **Build falha**

```bash
# 1. Testar build local
npm run build

# 2. Verificar logs no GitHub Actions
# Actions > [workflow-name] > [job] > logs

# 3. Testar Vercel CLI local
vercel build --prod
```

---

## ✅ **8. Verificação Final**

### **Checklist de Configuração**

- [ ] ✅ `vercel.json` criado com `deploymentEnabled: false`
- [ ] ✅ `vercel link` executado e `.vercel/project.json` criado
- [ ] ✅ Secrets configurados no GitHub (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- [ ] ✅ Workflow `.github/workflows/deploy.yml` criado
- [ ] ✅ Teste: push de uma tag deve disparar deploy

### **Teste Inicial**

```bash
# Criar tag de teste
git tag -a v1.0.0-test -m "Teste do sistema de deploy"
git push origin v1.0.0-test

# Verificar no GitHub Actions se o workflow executou
# Verificar no Vercel se o deploy foi criado
```

---

## 📞 **Suporte**

- **Documentação Oficial**: https://vercel.com/guides/can-you-deploy-based-on-tags-releases-on-vercel
- **Vercel CLI Docs**: https://vercel.com/cli
- **GitHub Actions**: https://docs.github.com/en/actions

---

*Este guia implementa a estratégia oficial do Vercel para deploy baseado em tags, garantindo máximo controle e estabilidade em produção.*
