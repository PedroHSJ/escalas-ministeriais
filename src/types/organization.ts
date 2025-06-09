export interface OrganizationType {
  id: string;
  nome: string;
  tipo: 'igreja' | 'empresa' | 'grupo' | 'outro';
  created_at: string;
  user_id: string;
}

export interface DepartmentType {
  id: string;
  nome: string;
  organizacao_id: string;
  tipo_departamento: string;
  created_at: string;
}

export interface SpecializationType {
  id: string;
  nome: string;
  tipo_especializacao_id: string;
  icone?: string;
  cor?: string;
  created_at: string;
}

export interface SpecializationCategory {
  id: string;
  nome: string;
  organizacao_id: string;
  created_at: string;
}

export interface IntegranteType {
  id: string;
  nome: string;
  departamento_id: string;
  created_at: string;
}

export interface IntegranteSpecializationType {
  id: string;
  integrante_id: string;
  especializacao_id: string;
  nivel: 'básico' | 'intermediário' | 'avançado';
  created_at: string;
}

export interface EscalaType {
  id: string;
  departamento_id: string;
  nome: string;
  created_at: string;
}

export interface EscalaParticipacaoType {
  id: string;
  escala_id: string;
  integrante_id: string;
  data: string;
  especializacao_id?: string;
  observacao?: string;
  created_at: string;
}

export interface OrganizationTemplate {
  departamentos: Array<{
    nome: string;
    tipo: string;
  }>;
  especializacoes: Record<string, string[]>;
  terminologia: {
    organizacao: string;
    departamento: string;
    especializacao: string;
    integrante: string;
  };
}

export interface WizardStep {
  step: number;
  title: string;
  description: string;
  isComplete: boolean;
}