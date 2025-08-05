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
  max_plantoes_noturnos_consecutivos: number; // Máximo de plantões noturnos seguidos
  intervalo_minimo_horas: number; // Intervalo mínimo entre plantões (padrão 11h)
  pode_trabalhar_24h: boolean; // Se pode fazer plantões de 24h
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

// Turnos específicos para Enfermagem (12h)
export const ENFERMAGEM_TURNOS_PADRAO: Omit<
  TipoTurno,
  "id" | "organizacao_id" | "created_at"
>[] = [
  {
    nome: "Manhã 12h",
    hora_inicio: "07:00",
    hora_fim: "19:00",
    duracao_horas: 12,
    ativo: true,
  },
  {
    nome: "Noite 12h",
    hora_inicio: "19:00",
    hora_fim: "07:00",
    duracao_horas: 12,
    ativo: true,
  },
  {
    nome: "Plantão 24h",
    hora_inicio: "07:00",
    hora_fim: "07:00",
    duracao_horas: 24,
    ativo: true,
  },
];

// Regras específicas para profissionais de enfermagem
export interface NursingRules {
  minWeeklyHours: 30; // CLT: 30h semanais
  normalWeeklyHours: 36; // Padrão: 36h semanais
  maxWeeklyHours: 60; // Máximo legal: 60h com extras
  maxDailyHours: 12; // Máximo por dia: 12h
  maxConsecutiveHours: 24; // Máximo consecutivo: 24h
  minRestBetweenShifts: 11; // Mínimo entre plantões: 11h (CLT Art. 66)
  minRestAfter24h: 36; // Descanso após 24h: 36h
  maxConsecutiveNightShifts: 2; // Máximo 2 noites seguidas
  maxOvertimeHoursPerDay: 2; // Máximo 2h extras por dia
  weeklyRestHours: 24; // Descanso semanal: 24h consecutivas
}

export const NURSING_RULES: NursingRules = {
  minWeeklyHours: 30,
  normalWeeklyHours: 36,
  maxWeeklyHours: 60,
  maxDailyHours: 12,
  maxConsecutiveHours: 24,
  minRestBetweenShifts: 11,
  minRestAfter24h: 36,
  maxConsecutiveNightShifts: 2,
  maxOvertimeHoursPerDay: 2,
  weeklyRestHours: 24,
};

// Funções de validação para enfermagem
export interface ShiftValidation {
  isValid: boolean;
  reason?: string;
  warning?: string;
}

export interface LastShiftInfo {
  date: Date;
  endTime: Date;
  duration: number;
  isNightShift: boolean;
}
