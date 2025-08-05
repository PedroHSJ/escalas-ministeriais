# 📝 Template e Guia para Release Notes

## Como Escrever Release Notes

### 1. **Estrutura Base**

```markdown
# 🎉 Release Notes - Sistema de Escalas Ministeriais v[X.Y.Z]

**Data de Lançamento**: [DD de Mês de AAAA]  
**Versão**: [X.Y.Z]  
**Branch**: [branch-origem] → [branch-destino]  

---

## 🚀 **Resumo da Versão**

[Breve descrição do que esta versão traz de novo]

---

## ✨ **Novas Funcionalidades**

### 🔧 **[Categoria]**
- **[Feature 1]**: Descrição detalhada
- **[Feature 2]**: Descrição detalhada

---

## 🐛 **Correções de Bugs**

- **[Bug 1]**: Descrição do problema e solução
- **[Bug 2]**: Descrição do problema e solução

---

## ⚡ **Melhorias**

- **[Melhoria 1]**: Descrição da otimização
- **[Melhoria 2]**: Descrição da otimização

---

## 🔧 **Alterações Técnicas**

- **[Alteração 1]**: Descrição técnica
- **[Alteração 2]**: Descrição técnica

---

## ⚠️ **Breaking Changes (se houver)**

- **[Mudança 1]**: Impacto e migração necessária
- **[Mudança 2]**: Impacto e migração necessária

---

## 📈 **Próximas Versões**

- **[Feature futura 1]**: Previsão
- **[Feature futura 2]**: Previsão

---

**Sistema de Escalas Ministeriais v[X.Y.Z]**  
*"[Slogan da versão]"*
```

### 2. **Categorias de Ícones**

| Categoria | Ícone | Uso |
|-----------|-------|-----|
| Novas Funcionalidades | ✨ | Recursos completamente novos |
| Correções | 🐛 | Bugs corrigidos |
| Melhorias | ⚡ | Otimizações e refinamentos |
| Segurança | 🔒 | Correções de segurança |
| Documentação | 📚 | Atualizações de docs |
| Testes | 🧪 | Novos testes ou cobertura |
| Interface | 🎨 | Mudanças visuais |
| API | 🔌 | Mudanças na API |
| Performance | 🚀 | Melhorias de performance |
| Dependências | 📦 | Atualizações de libs |

### 3. **Versionamento Semântico**

- **MAJOR (X.0.0)**: Breaking changes, mudanças incompatíveis
- **MINOR (1.Y.0)**: Novas funcionalidades compatíveis
- **PATCH (1.0.Z)**: Correções de bugs compatíveis

### 4. **Processo de Criação**

#### **Para Patch (1.0.1, 1.0.2, etc.)**
```markdown
# 🔧 Release Notes - Sistema de Escalas Ministeriais v1.0.1

**Data de Lançamento**: [Data]  
**Versão**: 1.0.1  
**Tipo**: Patch (Correções)

## 🐛 **Correções de Bugs**

- **[Bug específico]**: Descrição da correção
- **[Outro bug]**: Descrição da correção

## ⚡ **Melhorias**

- **[Pequena melhoria]**: Descrição
```

#### **Para Minor (1.1.0, 1.2.0, etc.)**
```markdown
# ✨ Release Notes - Sistema de Escalas Ministeriais v1.1.0

**Data de Lançamento**: [Data]  
**Versão**: 1.1.0  
**Tipo**: Minor (Novas Funcionalidades)

## ✨ **Novas Funcionalidades**

### 📱 **[Categoria da Feature]**
- **[Nova funcionalidade]**: Descrição completa
- **[Outra funcionalidade]**: Descrição completa

## 🐛 **Correções de Bugs**

- Lista de bugs corrigidos

## ⚡ **Melhorias**

- Lista de melhorias
```

#### **Para Major (2.0.0, 3.0.0, etc.)**
```markdown
# 🚀 Release Notes - Sistema de Escalas Ministeriais v2.0.0

**Data de Lançamento**: [Data]  
**Versão**: 2.0.0  
**Tipo**: Major (Breaking Changes)

## 🚀 **Principais Mudanças**

### [Título da grande mudança]
Descrição detalhada da mudança significativa

## ⚠️ **Breaking Changes**

### **[Mudança 1]**
- **O que mudou**: Descrição
- **Impacto**: Quem é afetado
- **Migração**: Como atualizar

## ✨ **Novas Funcionalidades**

[Lista das novas funcionalidades]
```

### 5. **Comandos para Gerar Release Notes**

#### **Método Automático (Recomendado)**
```powershell
# 1. Para patch (bug fixes)
npm version patch

# 2. Para minor (new features)
npm version minor

# 3. Para major (breaking changes)
npm version major

# 4. Push com tags
git push origin master --follow-tags
```

#### **Método Manual**
```powershell
# 1. Criar arquivo de release notes
# RELEASE_NOTES_v[versão].md

# 2. Atualizar package.json manualmente
# "version": "1.0.1"

# 3. Commit e tag
git add .
git commit -m "chore: release v1.0.1"
git tag v1.0.1

# 4. Push
git push origin master --follow-tags
```

### 6. **Checklist para Release Notes**

- [ ] Data de lançamento correta
- [ ] Número da versão atualizado
- [ ] Categorização correta das mudanças
- [ ] Descrições claras e objetivas
- [ ] Breaking changes bem documentados
- [ ] Links para issues/PRs quando relevante
- [ ] Instruções de migração (se necessário)
- [ ] Créditos aos contribuidores
- [ ] Preview das próximas versões

### 7. **Exemplos de Boas Descrições**

#### ✅ **Bom**
```markdown
- **Sistema de Notificações**: Implementado sistema completo de notificações 
  por email e SMS. Usuários podem configurar lembretes para plantões, 
  mudanças de escala e feriados personalizados.
```

#### ❌ **Ruim**
```markdown
- **Notificações**: Adicionado notificações
```

### 8. **Automação com Scripts**

Você pode criar um script para automatizar a criação:

```javascript
// scripts/create-release-notes.js
const fs = require('fs');
const { version } = require('../package.json');

const template = `# 🎉 Release Notes - Sistema de Escalas Ministeriais v${version}

**Data de Lançamento**: ${new Date().toLocaleDateString('pt-BR')}  
**Versão**: ${version}  

## ✨ **Novas Funcionalidades**

- [ ] Adicionar funcionalidades aqui

## 🐛 **Correções de Bugs**

- [ ] Adicionar correções aqui

## ⚡ **Melhorias**

- [ ] Adicionar melhorias aqui
`;

fs.writeFileSync(`RELEASE_NOTES_v${version}.md`, template);
console.log(`Release notes template criado para v${version}`);
```

Executar com:
```powershell
node scripts/create-release-notes.js
```

---

## 📋 **Resumo do Processo**

1. **Desenvolver** as funcionalidades
2. **Testar** tudo completamente  
3. **Documentar** as mudanças
4. **Criar** release notes seguindo o template
5. **Versionar** com `npm version [patch|minor|major]`
6. **Fazer** push com `--follow-tags`
7. **Verificar** deploy automático no Vercel

Este processo garante releases organizadas e bem documentadas! 🎯
