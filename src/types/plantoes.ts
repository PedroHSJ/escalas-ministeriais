// Tipos para o sistema de Escalas de Plantões/Vigilância

export interface TipoTurno {
  id: string;
  nome: string; // 'Manhã', 'Tarde', 'Noite', 'Madrugada'
  hora_inicio: string; // '06:00'
  hora_fim: string; // '12:00'
  duracao_horas: number; // 6
  organizacao_id: string;
  ativo: boolean;
  created_at: string;
}

export interface EscalaPlantao {
  id: string;
  nome: string;
  departamento_id: string;
  data_inicio: string; // YYYY-MM-DD
  data_fim: string; // YYYY-MM-DD
  dias_funcionamento: string[]; // ['monday', 'tuesday', ...]
  turnos_simultaneos: number; // quantos turnos podem acontecer ao mesmo tempo
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  // Relacionamentos
  departamento?: {
    id: string;
    nome: string;
  };
}

export interface EscalaPlantaoParticipacao {
  id: string;
  escala_plantao_id: string;
  integrante_id: string;
  tipos_turnos_disponiveis: string[]; // IDs dos tipos de turno
  horas_minimas_semana: number;
  horas_maximas_semana: number;
  disponivel_fins_semana: boolean;
  prioridade: number; // 1=baixa, 2=normal, 3=alta
  ativo: boolean;
  created_at: string;
  // Relacionamentos
  integrante?: {
    id: string;
    nome: string;
    telefone?: string;
  };
  turnos_disponiveis?: TipoTurno[];
}

export type StatusPlantao =
  | "programado"
  | "confirmado"
  | "ausencia"
  | "substituido"
  | "realizado";

export interface PlantaoProgramado {
  id: string;
  escala_plantao_id: string;
  data: string; // YYYY-MM-DD
  tipo_turno_id: string;
  integrante_id: string;
  integrante_substituto_id?: string;
  status: StatusPlantao;
  horas_trabalhadas?: number;
  observacoes?: string;
  confirmado_em?: string;
  created_at: string;
  // Relacionamentos
  tipo_turno?: TipoTurno;
  integrante?: {
    id: string;
    nome: string;
    telefone?: string;
  };
  substituto?: {
    id: string;
    nome: string;
    telefone?: string;
  };
}

export interface PlantaoAusencia {
  id: string;
  plantao_programado_id: string;
  integrante_id: string;
  motivo: string;
  data_solicitacao: string;
  urgente: boolean;
  substituicao_aprovada: boolean;
  substituto_encontrado_id?: string;
  observacoes?: string;
  created_at: string;
  // Relacionamentos
  plantao_programado?: PlantaoProgramado;
  integrante?: {
    id: string;
    nome: string;
  };
  substituto_encontrado?: {
    id: string;
    nome: string;
  };
}

// Tipos para formulários e operações
export interface NovaEscalaPlantao {
  nome: string;
  departamento_id: string;
  data_inicio: string;
  data_fim: string;
  dias_funcionamento: string[];
  turnos_simultaneos: number;
  observacoes?: string;
}

export interface NovaParticipacaoPlantao {
  integrante_id: string;
  tipos_turnos_disponiveis: string[];
  horas_minimas_semana: number;
  horas_maximas_semana: number;
  disponivel_fins_semana: boolean;
  prioridade: number;
}

export interface NovoPlantao {
  data: string;
  tipo_turno_id: string;
  integrante_id: string;
  observacoes?: string;
}

export interface RegistroAusencia {
  plantao_programado_id: string;
  motivo: string;
  urgente: boolean;
  observacoes?: string;
}

// Utilitários para cálculos
export interface ResumoHorasIntegrante {
  integrante_id: string;
  nome: string;
  horas_programadas_semana: number;
  horas_trabalhadas_semana: number;
  horas_minimas: number;
  horas_maximas: number;
  percentual_cumprimento: number;
  plantoes_pendentes: number;
}

export interface EstatisticasEscalaPlantao {
  total_plantoes: number;
  plantoes_cobertos: number;
  plantoes_descobertos: number;
  percentual_cobertura: number;
  horas_totais_programadas: number;
  horas_totais_trabalhadas: number;
  integrantes_ativos: number;
  substituicoes_necessarias: number;
}

// Opções para geração de escalas
export interface OpcoeGeracaoPlantoes {
  distribuicao_equilibrada: boolean; // distribuir horas igualmente
  respeitar_preferencias_turno: boolean;
  evitar_turnos_consecutivos: boolean;
  intervalo_minimo_horas: number; // horas mínimas entre turnos
  priorizar_disponibilidade_fins_semana: boolean;
}

// Dias da semana em português
export const DIAS_SEMANA = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
} as const;

// Turnos padrão que serão criados para cada organização
export const TURNOS_PADRAO: Omit<
  TipoTurno,
  "id" | "organizacao_id" | "created_at"
>[] = [
  {
    nome: "Manhã",
    hora_inicio: "06:00",
    hora_fim: "12:00",
    duracao_horas: 6,
    ativo: true,
  },
  {
    nome: "Tarde",
    hora_inicio: "12:00",
    hora_fim: "18:00",
    duracao_horas: 6,
    ativo: true,
  },
  {
    nome: "Noite",
    hora_inicio: "18:00",
    hora_fim: "00:00",
    duracao_horas: 6,
    ativo: true,
  },
  {
    nome: "Madrugada",
    hora_inicio: "00:00",
    hora_fim: "06:00",
    duracao_horas: 6,
    ativo: true,
  },
];
