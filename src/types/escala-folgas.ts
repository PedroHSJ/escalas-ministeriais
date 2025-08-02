export interface EscalaFolgaType {
  id: string;
  departamento_id: string;
  nome: string;
  created_at: string;
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
  folgas_iniciais: number;
  folgas_atuais: number;
  posicao_atual: number;
  ativo: boolean;
  apenas_contabiliza_folgas?: boolean; // Para integrantes de férias/licença
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

export interface EscalaFolgaMember {
  id: string;
  nome: string;
  folgasIniciais: number;
  folgasAtuais: number;
  posicaoAtual: number;
  ativo: boolean;
  especializacaoId?: string;
  especializacaoNome?: string;
  apenasContabilizaFolgas?: boolean; // Para integrantes de férias/licença que só contabilizam folgas
  importadoDeEscala?: string; // ID da escala de onde foi importado (opcional)
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
