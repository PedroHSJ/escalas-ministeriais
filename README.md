# Sistema de Escalas Ministeriais

Sistema de gerenciamento de escalas para organizações religiosas e militares, desenvolvido com Next.js 15, TypeScript e Supabase.

## 🚀 Funcionalidades

- **Gestão de Integrantes**: Cadastro e gerenciamento de membros com especializações
- **Escalas Personalizáveis**: Criação de escalas de trabalho com lógica "preta e vermelha"
- **Gestão de Folgas**: Sistema inteligente de distribuição de folgas por especialização
- **Feriados Personalizados**: Importação e gestão de feriados nacionais, regionais e organizacionais
- **Relatórios**: Geração de relatórios de escalas em formato de impressão
- **Tipos de Participação**: Suporte para membros que participam apenas de escalas específicas

## 📋 Pré-requisitos

- Node.js 18+
- npm, yarn, pnpm ou bun
- Conta no Supabase

## 🔧 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/PedroHSJ/escalas-ministeriais.git
cd escalas-ministeriais
```

2. Instale as dependências:

```bash
npm install
# ou
yarn install
# ou
pnpm install
```

3. Configure as variáveis de ambiente:

```bash
cp .env.example .env.local
```

4. Configure o Supabase no arquivo `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

5. Execute o servidor de desenvolvimento:

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## 📅 Importação de Feriados Personalizados

O sistema permite importar feriados personalizados através de arquivos JSON. Aqui está o formato esperado:

### Estrutura Básica do JSON:

```json
{
  "2024": [
    {
      "data": "2024-01-20",
      "nome": "Dia da Consciência Negra Antecipado",
      "tipo": "organizacional",
      "afetaEscala": true,
      "folgasAdicionais": 1
    },
    {
      "data": "2024-06-24",
      "nome": "São João",
      "tipo": "regional",
      "afetaEscala": true,
      "folgasAdicionais": 1
    }
  ],
  "2025": [
    {
      "data": "2025-02-14",
      "nome": "Reunião Anual da Organização",
      "tipo": "organizacional",
      "afetaEscala": true,
      "folgasAdicionais": 2
    }
  ]
}
```

### Campos Obrigatórios:

| Campo           | Tipo      | Descrição                          | Exemplo                                        |
| --------------- | --------- | ---------------------------------- | ---------------------------------------------- |
| **data**        | `string`  | Data no formato YYYY-MM-DD         | `"2024-12-25"`                                 |
| **nome**        | `string`  | Nome descritivo do feriado         | `"Natal"`                                      |
| **tipo**        | `string`  | Tipo do feriado                    | `"nacional"`, `"regional"`, `"organizacional"` |
| **afetaEscala** | `boolean` | Se deve afetar a geração da escala | `true` ou `false`                              |

### Campos Opcionais:

| Campo                | Tipo     | Descrição                              | Padrão |
| -------------------- | -------- | -------------------------------------- | ------ |
| **folgasAdicionais** | `number` | Quantidade de folgas extras a conceder | `1`    |

### Exemplos de Uso:

#### Feriados Organizacionais:

```json
{
  "2024": [
    {
      "data": "2024-03-15",
      "nome": "Aniversário da Igreja",
      "tipo": "organizacional",
      "afetaEscala": true,
      "folgasAdicionais": 2
    },
    {
      "data": "2024-08-10",
      "nome": "Retiro Espiritual",
      "tipo": "organizacional",
      "afetaEscala": true,
      "folgasAdicionais": 1
    }
  ]
}
```

#### Feriados Regionais:

```json
{
  "2024": [
    {
      "data": "2024-04-23",
      "nome": "São Jorge (RJ)",
      "tipo": "regional",
      "afetaEscala": true,
      "folgasAdicionais": 1
    },
    {
      "data": "2024-06-24",
      "nome": "São João (Nordeste)",
      "tipo": "regional",
      "afetaEscala": true,
      "folgasAdicionais": 1
    }
  ]
}
```

#### Eventos que NÃO afetam a escala:

```json
{
  "2024": [
    {
      "data": "2024-05-15",
      "nome": "Dia das Mães - Evento Especial",
      "tipo": "organizacional",
      "afetaEscala": false,
      "folgasAdicionais": 0
    }
  ]
}
```

### Como Importar:

1. Criar arquivo JSON com o formato acima
2. Salvar como `.json` (ex: `feriados-2024.json`)
3. Importar através da interface:
   - Ir em "Feriados Personalizados"
   - Clicar em "Importar"
   - Selecionar o arquivo JSON

### Validações:

- ✅ **Data**: Deve estar no formato `YYYY-MM-DD`
- ✅ **Tipo**: Apenas `"nacional"`, `"regional"` ou `"organizacional"`
- ✅ **afetaEscala**: Deve ser `true` ou `false`
- ✅ **folgasAdicionais**: Deve ser um número (pode ser 0)

## 🏗️ Tecnologias Utilizadas

- **Frontend**: Next.js 15.3.2, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Testes**: Jest, Testing Library
- **Deploy**: Vercel (recomendado)

## 📝 Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # Verificação de lint
npm run test         # Execução de testes
```

## 🔗 Links Úteis

- [Documentação do Next.js](https://nextjs.org/docs)
- [Documentação do Supabase](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
