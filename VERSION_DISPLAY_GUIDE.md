# 📱 Como Exibir a Versão na Interface

## 🎯 **Sistema Implementado**

Criamos um sistema completo para exibir informações de versão da aplicação, incluindo:

- ✅ **Versão do package.json**
- ✅ **Tag Git (quando disponível)**
- ✅ **Commit hash**
- ✅ **Data do build**
- ✅ **Ambiente (dev/preview/production)**
- ✅ **URL do Vercel**

---

## 🔧 **Arquivos Criados**

### **1. Hook `useVersion.ts`**
```typescript
// src/hooks/useVersion.ts
// Hook que obtém informações de versão
```

### **2. Componente `VersionDisplay.tsx`**
```typescript
// src/components/ui/version-display.tsx
// Componente visual para mostrar a versão
```

### **3. Script `generate-version.js`**
```javascript
// scripts/generate-version.js
// Gera arquivo version.json durante o build
```

---

## 🎨 **Formas de Uso**

### **1. Badge Simples (Já implementado no header)**

```tsx
import { VersionDisplay } from '@/components/ui/version-display';

// No header (já adicionado)
<VersionDisplay variant="badge" showDetails={true} />
```

### **2. Texto Simples**

```tsx
// Para footer ou rodapé
<VersionDisplay variant="text" showDetails={false} />
```

### **3. Botão com Detalhes**

```tsx
// Para página About ou Settings
<VersionDisplay variant="button" showDetails={true} />
```

### **4. Uso Personalizado**

```tsx
import { useVersion } from '@/hooks/useVersion';

function CustomVersionComponent() {
  const version = useVersion();
  
  return (
    <div>
      <p>Sistema v{version.version}</p>
      {version.gitTag && (
        <p>Tag: {version.gitTag}</p>
      )}
      <p>Ambiente: {version.environment}</p>
    </div>
  );
}
```

---

## 📍 **Onde Colocar**

### **1. Header (✅ Já implementado)**
- Badge clicável no canto superior direito
- Mostra popover com detalhes completos

### **2. Sidebar**
```tsx
// No final da sidebar
<div className="mt-auto p-4 border-t">
  <VersionDisplay variant="text" showDetails={false} />
</div>
```

### **3. Footer**
```tsx
// Em uma página ou layout
<footer className="mt-8 border-t pt-4">
  <div className="flex justify-between items-center">
    <p>© 2025 Sistema de Escalas</p>
    <VersionDisplay variant="text" showDetails={true} />
  </div>
</footer>
```

### **4. Modal About/Sobre**
```tsx
// Página dedicada de informações
<div className="space-y-4">
  <h2>Sobre o Sistema</h2>
  <VersionDisplay variant="button" showDetails={true} />
</div>
```

---

## 🔄 **Como Funciona no Deploy**

### **Durante o Build no Vercel:**

1. **Script Pre-build**: Executa `generate-version.js` antes do build
2. **Coleta Informações**: Obtém dados do Git, Vercel, package.json
3. **Gera version.json**: Salva em `/public/version.json`
4. **Build da App**: Next.js inclui o arquivo no bundle
5. **Runtime**: Hook carrega as informações e exibe na UI

### **Variáveis Disponíveis no Vercel:**

```javascript
// Automaticamente disponíveis durante o build
process.env.VERCEL_GIT_COMMIT_REF    // Tag ou branch (v1.0.0)
process.env.VERCEL_GIT_COMMIT_SHA    // Hash do commit
process.env.VERCEL_URL               // URL do deployment
process.env.VERCEL_ENV               // production/preview
```

---

## 📊 **Exemplo de Dados Exibidos**

### **Em Produção (com tag):**
```json
{
  "version": "1.0.0",
  "gitTag": "v1.0.0", 
  "gitCommit": "abc1234",
  "environment": "production",
  "buildDate": "2025-08-05T10:30:00Z",
  "vercelUrl": "escalas-ministeriais.vercel.app"
}
```

### **Em Desenvolvimento:**
```json
{
  "version": "1.0.0",
  "environment": "development", 
  "buildDate": "2025-08-05T10:30:00Z"
}
```

---

## 🎯 **Benefícios**

### ✅ **Para Desenvolvimento**
- Identifica rapidamente qual versão está rodando
- Debug mais fácil entre builds
- Rastreamento de issues por versão

### ✅ **Para Usuários**
- Transparência sobre atualizações
- Facilita reports de bugs
- Confiança na estabilidade

### ✅ **Para Deploy**
- Validação de que a tag correta foi deployada
- Histórico visual de releases
- Rollback fácil se necessário

---

## 🛠️ **Customização**

### **Alterar Aparência:**

```tsx
// Cores personalizadas por ambiente
const getEnvironmentStyle = () => {
  switch (version.environment) {
    case 'production': 
      return 'bg-green-100 text-green-800 border-green-200';
    case 'preview': 
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default: 
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};
```

### **Adicionar Mais Informações:**

```typescript
// No script generate-version.js, adicione:
const versionInfo = {
  // ... campos existentes
  deployId: process.env.VERCEL_DEPLOYMENT_ID,
  buildDuration: process.env.BUILD_DURATION,
  lastCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE
};
```

---

## 🔍 **Debugging**

### **Se a versão não aparecer:**

1. **Verificar build**: `npm run version:generate`
2. **Verificar arquivo**: `/public/version.json` existe?
3. **Verificar console**: Erros no hook `useVersion`?
4. **Verificar deploy**: Variáveis do Vercel disponíveis?

### **Testar localmente:**

```bash
# Gerar arquivo de versão
npm run version:generate

# Verificar conteúdo
cat public/version.json

# Rodar aplicação
npm run dev
```

---

Agora você tem um sistema completo para exibir versão na interface! 🎉 

A versão aparecerá automaticamente no header e será atualizada a cada deploy com tag.
