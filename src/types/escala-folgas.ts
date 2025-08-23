export interface EscalaFolgaType {
  id: string;
  departamento_id: string;
  nome: string;
  observacoes_template_id?: string | null;
  created_at: string;
  deleted_at?: string | null; // Campo para soft delete
  departamento?: {
    nome: string;
    tipo_departamento: string;
    organizacao?: {
      nome: string;
      tipo: string;
    };
  };
  _count?: {
    participacoes: number;
  };
}

export interface EscalaFolgaParticipacaoType {
  id: string;
  escala_folga_id: string;
  integrante_id: string;
  folgas_iniciais_preta: number; // Folgas iniciais para escala preta (segunda a sexta)
  folgas_iniciais_vermelha: number; // Folgas iniciais para escala vermelha (fins de semana e feriados)
  ativo: boolean;
  apenas_contabiliza_folgas?: boolean; // Para integrantes de férias/licença
  tipo_participacao?: TipoParticipacaoEscala; // Tipo de participação na escala
  created_at: string;
  integrante?: {
    id: string;
    nome: string;
  };
}

export interface EscalaFolgaAtribuicaoType {
  id: string;
  escala_folga_id: string;
  data: string;
  integrante_id: string;
  tipo_atribuicao: "trabalho" | "folga";
  observacao?: string;
  created_at: string;
  integrante?: {
    id: string;
    nome: string;
  };
  especializacao?: {
    id: string;
    nome: string;
  };
}

export type TipoParticipacaoEscala = "ambas" | "preta" | "vermelha";

export interface EscalaFolgaMember {
  id: string;
  nome: string;
  folgasIniciais: number;
  folgasAtuais: number;
  // Novos campos para contagem separada de escalas preta e vermelha
  folgasInicaisPreta: number; // Folgas iniciais para dias de semana (escala preta)
  folgasAtualPreta: number; // Folgas atuais para dias de semana (escala preta)
  folgasIniciaisVermelha: number; // Folgas iniciais para finais de semana (escala vermelha)
  folgasAtualVermelha: number; // Folgas atuais para finais de semana (escala vermelha)
  ativo: boolean;
  especializacaoId?: string;
  especializacaoNome?: string;
  apenasContabilizaFolgas?: boolean; // Para integrantes de férias/licença que só contabilizam folgas
  importadoDeEscala?: string; // ID da escala de onde foi importado (opcional)
  tipoParticipacao: TipoParticipacaoEscala; // Define se participa da escala preta, vermelha ou ambas
  trabalho24h?: boolean; // Se verdadeiro, não pode ser escalado no dia seguinte
  excecaoTrabalho24h?: boolean; // Marcação temporária para trabalho forçado após 24h
  doisDiasConsecutivosVermelha?: boolean; // Se verdadeiro, irá trabalhar dois dias consecutivos de escala vermelha
  // Contadores de dias consecutivos de folga (preservados durante importação)
  consecutiveDaysOffPreta?: number; // Dias consecutivos de folga na escala preta
  consecutiveDaysOffVermelha?: number; // Dias consecutivos de folga na escala vermelha
}

export interface EscalaFolgaAssignment {
  id: string;
  memberId: string;
  memberName: string;
  date: Date;
  tipoAtribuicao: "trabalho" | "folga";
  especializacaoId?: string;
  especializacaoNome?: string;
  observacao?: string;
}
