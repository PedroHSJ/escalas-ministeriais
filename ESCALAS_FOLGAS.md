# Sistema de Escalas de Folgas

## Visão Geral

O sistema de escalas de folgas implementa a lógica da "escala preta e vermelha", onde o número de pessoas que ficam de folga por dia é sempre igual ao número total de pessoas menos 1.

## Como Funciona

### Lógica da Escala

- **Fórmula**: Folgas por dia = Total de pessoas - 1
- **Exemplo**: Se temos 5 pessoas, 4 ficam de folga e 1 trabalha por dia
- **Rotação**: O sistema rotaciona automaticamente baseado no número de folgas acumuladas

### Funcionalidades

#### 1. Criação de Escala de Folgas

- Selecione organização e departamento
- Adicione integrantes à escala
- Configure o número de folgas iniciais de cada pessoa
- Defina período (data início e fim)
- Escolha dias de trabalho da semana
- Gere a escala automaticamente

#### 2. Visualização de Escalas

- Lista todas as escalas de folgas criadas
- Filtros por organização e departamento
- Visualização detalhada de cada escala
- Função de impressão

#### 3. Algoritmo de Distribuição

O sistema usa um algoritmo que:

1. Ordena pessoas por número de folgas (menor primeiro)
2. As pessoas com menos folgas ficam de folga
3. Atualiza contador de folgas automaticamente
4. Garante rotação justa entre todos

## Estrutura do Banco de Dados

### Tabelas Criadas

1. **escalas_folgas**: Informações básicas da escala
2. **escala_folgas_participacoes**: Participantes e suas folgas
3. **escala_folgas_atribuicoes**: Atribuições diárias (trabalho/folga)

## Como Usar

### Passo 1: Criar Nova Escala

1. Acesse "Escalas > Escalas de Folgas"
2. Clique em "Nova Escala de Folgas"
3. Selecione organização e departamento
4. Dê um nome à escala

### Passo 2: Adicionar Participantes

1. Clique em "Adicionar" ao lado de cada integrante
2. Configure as folgas iniciais (importante para balanceamento)
3. O sistema mostra a lógica: quantas pessoas ficam de folga/trabalham

### Passo 3: Configurar Período

1. Defina data de início e fim
2. Marque os dias da semana que são dias de trabalho
3. Clique em "Gerar Escala"

### Passo 4: Revisar e Salvar

1. Revise o preview da escala gerada
2. Veja quem trabalha e quem fica de folga cada dia
3. Clique em "Salvar Escala"

## Navegação

- **Lista**: `/folgas/list` - Ver todas as escalas de folgas
- **Criar**: `/folgas/create` - Criar nova escala de folgas
- **Visualizar**: `/folgas/view?id={id}` - Ver detalhes de uma escala

## Recursos Adicionais

- **Impressão**: Todas as escalas podem ser impressas
- **Filtros**: Busca por nome, organização ou departamento
- **Responsivo**: Interface adaptada para mobile e desktop
- **Automático**: Geração automática baseada na lógica configurada
