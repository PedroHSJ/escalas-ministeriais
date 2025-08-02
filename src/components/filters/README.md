# FilterBar Component

Componente padronizado para filtros em páginas de listagem.

## Características

- ✅ **Responsivo**: Grid adaptável para mobile e desktop
- ✅ **Tamanhos fixos**: Selects com largura consistente (`w-full`)
- ✅ **Funcionalidade completa**: Busca, filtro por organização e departamento
- ✅ **Estados de loading**: Desabilita campos durante carregamento
- ✅ **Flexível**: Pode ocultar filtro de departamento quando necessário

## Uso Básico

```tsx
import FilterBar from "@/components/filters/FilterBar";

// No seu componente
<FilterBar
  searchTerm={searchTerm}
  setSearchTerm={setSearchTerm}
  selectedOrganization={selectedOrganization}
  setSelectedOrganization={setSelectedOrganization}
  selectedDepartment={selectedDepartment}
  setSelectedDepartment={setSelectedDepartment}
  organizations={organizations}
  departments={departments}
  searchPlaceholder="Nome, departamento, especialização..."
  showDepartmentFilter={true}
  onClearFilters={clearFilters}
  loading={loading}
/>;
```

## Props

| Prop                      | Tipo                       | Obrigatório | Descrição                              |
| ------------------------- | -------------------------- | ----------- | -------------------------------------- |
| `searchTerm`              | `string`                   | ✅          | Valor atual do termo de busca          |
| `setSearchTerm`           | `(value: string) => void`  | ✅          | Função para atualizar termo de busca   |
| `selectedOrganization`    | `string \| undefined`      | ✅          | ID da organização selecionada          |
| `setSelectedOrganization` | `(value?: string) => void` | ✅          | Função para atualizar organização      |
| `selectedDepartment`      | `string \| undefined`      | ✅          | ID do departamento selecionado         |
| `setSelectedDepartment`   | `(value?: string) => void` | ✅          | Função para atualizar departamento     |
| `organizations`           | `Organization[]`           | ✅          | Array de organizações                  |
| `departments`             | `Department[]`             | ✅          | Array de departamentos                 |
| `searchPlaceholder`       | `string`                   | ❌          | Placeholder do campo de busca          |
| `showDepartmentFilter`    | `boolean`                  | ❌          | Se deve mostrar filtro de departamento |
| `onClearFilters`          | `() => void`               | ✅          | Função para limpar todos os filtros    |
| `loading`                 | `boolean`                  | ❌          | Se está em estado de carregamento      |

## Tipos Necessários

```tsx
interface Organization {
  id: string;
  nome: string;
  tipo: string;
}

interface Department {
  id: string;
  nome: string;
  organizacao_id: string;
  tipo_departamento: string;
}
```

## Implementação Completa

### 1. States necessários

```tsx
const [searchTerm, setSearchTerm] = useState("");
const [selectedOrganization, setSelectedOrganization] = useState<
  string | undefined
>();
const [selectedDepartment, setSelectedDepartment] = useState<
  string | undefined
>();
const [organizations, setOrganizations] = useState<Organization[]>([]);
const [departments, setDepartments] = useState<Department[]>([]);
const [loading, setLoading] = useState(false);
```

### 2. Função para limpar filtros

```tsx
const clearFilters = () => {
  setSearchTerm("");
  setSelectedOrganization(undefined);
  setSelectedDepartment(undefined);
};
```

### 3. useEffect para buscar departamentos quando organização muda

```tsx
useEffect(() => {
  if (selectedOrganization) {
    fetchDepartments(selectedOrganization);
    setSelectedDepartment(undefined); // Limpa departamento ao trocar organização
  } else {
    fetchDepartments(); // Busca todos os departamentos
  }
}, [selectedOrganization]);
```

### 4. Função para buscar departamentos

```tsx
const fetchDepartments = async (organizationId?: string) => {
  let query = supabase.from("departamentos").select("*").order("nome");

  if (organizationId) {
    query = query.eq("organizacao_id", organizationId);
  }

  const { data, error } = await query;

  if (!error && data) {
    setDepartments(data);
  }
};
```

## Exemplos de Uso

### Página sem filtro de departamento (ex: organizações)

```tsx
<FilterBar
  searchPlaceholder="Nome da organização, tipo..."
  showDepartmentFilter={false}
  // outras props...
/>
```

### Página com todos os filtros (ex: membros)

```tsx
<FilterBar
  searchPlaceholder="Nome, departamento, especialização..."
  showDepartmentFilter={true}
  // outras props...
/>
```

## Layout Responsivo

- **Desktop (md+)**: 4 colunas em grid
- **Mobile**: 1 coluna empilhada
- **Larguras fixas**: Todos os selects usam `w-full` para consistência
