# 🔧 Release Notes - Sistema de Escalas Ministeriais v1.0.1

**Data de Lançamento**: 10 de Agosto de 2025  
**Versão**: 1.0.1  
**Tipo**: Patch (Correções e Melhorias Menores)

---

## 🐛 **Correções de Bugs**

- **Calendário**: Corrigido problema onde feriados personalizados não apareciam corretamente na visualização mensal
- **Folgas**: Corrigido cálculo incorreto de folgas acumuladas quando um membro era removido e readicionado à escala
- **Interface**: Corrigido overflow de texto em nomes longos na tabela de integrantes
- **Impressão**: Corrigido problema de quebra de página nos relatórios PDF

## ⚡ **Melhorias**

- **Performance**: Otimizada a renderização do calendário para escalas com muitos integrantes (redução de 40% no tempo de carregamento)
- **UX**: Adicionado loading spinner durante salvamento de escalas
- **Tooltips**: Melhorada a responsividade dos tooltips em dispositivos móveis
- **Validação**: Adicionadas mensagens de erro mais claras para campos obrigatórios

## 🎨 **Melhorias Visuais**

- **Badges**: Melhorado contraste das badges de ambiente (development/preview/production)
- **Cores**: Ajustado esquema de cores para melhor acessibilidade (WCAG 2.1 AA)
- **Responsividade**: Melhorada exibição em telas menores (smartphones)

---

## 🔧 **Alterações Técnicas**

- **Dependências**: Atualizada versão do React Hook Form para correção de vulnerabilidades
- **Build**: Otimizada configuração do Webpack para reduzir tamanho do bundle
- **Types**: Melhorados tipos TypeScript para maior precisão de tipagem

---

## 📈 **Próxima Versão (v1.1.0)**

Estamos trabalhando em:
- **Sistema de Notificações**: Email e SMS automáticos
- **Exportação**: Excel e CSV para relatórios
- **API**: Endpoints para integrações externas

---

**Sistema de Escalas Ministeriais v1.0.1**  
*"Aperfeiçoando a experiência do usuário"*

---

*Esta versão corrige issues reportados pela comunidade e melhora a estabilidade geral do sistema.*
