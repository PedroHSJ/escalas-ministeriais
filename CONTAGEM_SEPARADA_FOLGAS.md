# ⚫🔴 Sistema de Contagem Separada de Folgas

## 🎯 Implementação Concluída

A **contagem individual de folgas para a Escala Preta e Vermelha** foi implementada com sucesso, proporcionando controle separado e preciso das folgas conforme a natureza dos dias.

## 📊 **Sistema de Contagem Implementado**

### ⚫ **Escala Preta (Dias de Semana)**

- **Dias**: Segunda, Terça, Quarta, Quinta, Sexta
- **Contador**: `folgasAtualPreta`
- **Inicialização**: `folgasInicaisPreta`
- **Lógica**: Incrementa apenas quando a folga ocorre em dias úteis

### 🔴 **Escala Vermelha (Finais de Semana)**

- **Dias**: Sábado e Domingo
- **Contador**: `folgasAtualVermelha`
- **Inicialização**: `folgasIniciaisVermelha`
- **Lógica**: Incrementa apenas quando a folga ocorre em finais de semana

## 🛠️ **Estrutura Técnica Implementada**

### **1. Interface TypeScript Atualizada**

```typescript
export interface EscalaFolgaMember {
  id: string;
  nome: string;
  folgasIniciais: number; // Contador geral (compatibilidade)
  folgasAtuais: number; // Contador geral (compatibilidade)

  // NOVOS CAMPOS - Contagem separada
  folgasInicaisPreta: number; // Folgas iniciais para dias de semana
  folgasAtualPreta: number; // Folgas atuais para dias de semana
  folgasIniciaisVermelha: number; // Folgas iniciais para finais de semana
  folgasAtualVermelha: number; // Folgas atuais para finais de semana

  posicaoAtual: number;
  ativo: boolean;
  especializacaoId?: string;
  especializacaoNome?: string;
  apenasContabilizaFolgas?: boolean;
  importadoDeEscala?: string;
}
```

### **2. Lógica de Geração Atualizada**

```typescript
// Determinar se é escala preta ou vermelha
const dayOfWeekNumber = currentDate.getDay(); // 0 = domingo, 6 = sábado
const isEscalaVermelha = dayOfWeekNumber === 0 || dayOfWeekNumber === 6;
const isEscalaPreta = !isEscalaVermelha;

// Ordenar membros considerando a escala específica
const sortedMembers = [...specMembers].sort((a, b) => {
  const folgasA = isEscalaPreta ? a.folgasAtualPreta : a.folgasAtualVermelha;
  const folgasB = isEscalaPreta ? b.folgasAtualPreta : b.folgasAtualVermelha;

  if (folgasA !== folgasB) {
    return folgasA - folgasB; // Menor número de folgas primeiro
  }
  return a.posicaoAtual - b.posicaoAtual;
});

// Incrementar contador específico da escala
if (isEscalaPreta) {
  originalMember.folgasAtualPreta += folgasIncrement;
} else {
  originalMember.folgasAtualVermelha += folgasIncrement;
}
```

## 🎯 **Regras de Funcionamento**

### **📅 Seleção de Folgas**

1. **Dia de Semana (Escala Preta)**:

   - Sistema consulta `folgasAtualPreta` de cada membro
   - Quem tem menos folgas na escala preta fica de folga
   - Incrementa apenas `folgasAtualPreta`

2. **Final de Semana (Escala Vermelha)**:
   - Sistema consulta `folgasAtualVermelha` de cada membro
   - Quem tem menos folgas na escala vermelha fica de folga
   - Incrementa apenas `folgasAtualVermelha`

### **⚖️ Balanceamento Independente**

- **Escala Preta**: João pode ter 10 folgas em dias úteis
- **Escala Vermelha**: João pode ter 2 folgas em finais de semana
- **Resultado**: João tem mais chance de trabalhar em finais de semana

## 📊 **Benefícios da Implementação**

### ✅ **Justiça na Distribuição**

- **Equilíbrio Real**: Folgas distribuídas igualmente em cada tipo de dia
- **Sem Viés**: Evita que alguém trabalhe sempre nos finais de semana
- **Transparência**: Contadores visíveis para verificação

### ✅ **Flexibilidade Operacional**

- **Configuração Inicial**: Possível definir folgas iniciais separadas
- **Importação Inteligente**: Distribui folgas existentes ao importar
- **Compatibilidade**: Mantém contador geral para relatórios antigos

### ✅ **Visualização Clara**

- **Interface Detalhada**: Mostra contadores separados
- **Relatórios**: Exibe folgas preta e vermelha individualmente
- **Debug Facilidade**: Fácil rastreamento de problemas

## 🎨 **Interface Visual Atualizada**

### **Resumo de Participantes**

```
João Silva - Posição: 1 | Folgas iniciais: 5 | Folgas finais: 12
📅 Escala Preta (dias úteis): 8 folgas | 🔴 Escala Vermelha (finais de semana): 4 folgas
Especialização: Enfermagem

Maria Santos - Posição: 2 | Folgas iniciais: 3 | Folgas finais: 10
📅 Escala Preta (dias úteis): 5 folgas | 🔴 Escala Vermelha (finais de semana): 5 folgas
Especialização: Medicina
```

### **Legenda Visual**

- ⚫ **Ícone Preto**: Representa folgas em dias úteis
- 🔴 **Ícone Vermelho**: Representa folgas em finais de semana
- 📅 **Ícone Calendário**: Indica contagem de dias úteis

## 🔄 **Compatibilidade e Migração**

### **Sistemas Existentes**

- **Contador Geral Mantido**: `folgasAtuais` continua funcionando
- **Importação Automática**: Distribui folgas existentes 50/50
- **Relatórios Antigos**: Continuam funcionando normalmente

### **Inicialização de Novos Membros**

```typescript
// Novos membros começam com contadores zerados
folgasInicaisPreta: 0,
folgasAtualPreta: 0,
folgasIniciaisVermelha: 0,
folgasAtualVermelha: 0,

// Importação distribui igualmente
folgasInicaisPreta: Math.floor(participacao.folgas_atuais / 2),
folgasIniciaisVermelha: Math.ceil(participacao.folgas_atuais / 2),
```

## 📈 **Exemplo Prático de Funcionamento**

### **Cenário**: Escala de 4 pessoas

```
Início da escala:
- João: 0 folgas pretas, 0 folgas vermelhas
- Maria: 0 folgas pretas, 0 folgas vermelhas
- Pedro: 0 folgas pretas, 0 folgas vermelhas
- Ana: 0 folgas pretas, 0 folgas vermelhas

Após uma semana completa:
Segunda (Preta): João folga → João: 1 preta, 0 vermelha
Terça (Preta): Maria folga → Maria: 1 preta, 0 vermelha
Quarta (Preta): Pedro folga → Pedro: 1 preta, 0 vermelha
Quinta (Preta): Ana folga → Ana: 1 preta, 0 vermelha
Sexta (Preta): João folga → João: 2 preta, 0 vermelha
Sábado (Vermelha): Maria folga → Maria: 1 preta, 1 vermelha
Domingo (Vermelha): Pedro folga → Pedro: 1 preta, 1 vermelha

Próxima segunda (Preta): Ana folga (tem menos folgas pretas)
```

## ✅ **Status: IMPLEMENTADO COM SUCESSO**

A **contagem individual de folgas para Escala Preta e Vermelha** está agora **100% funcional**:

- 🎯 **Contadores Separados**: Cada tipo de dia tem seu próprio contador
- ⚖️ **Distribuição Justa**: Folgas balanceadas por tipo de dia
- 📊 **Visualização Clara**: Interface mostra contadores individuais
- 🔄 **Compatibilidade**: Mantém funcionamento com sistemas antigos
- 🛠️ **Configuração Flexível**: Inicialização independente para cada escala

🎯 **Agora o sistema garante que as folgas sejam distribuídas de forma justa e independente entre dias de semana (escala preta) e finais de semana (escala vermelha)!**
