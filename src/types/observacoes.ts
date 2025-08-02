export interface ObservacaoItem {
  texto: string;
  ordem: number;
}

export interface ObservacaoTemplate {
  id: string;
  organizacao_id: string;
  nome: string;
  descricao?: string;
  observacoes: ObservacaoItem[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
  organizacao?: {
    nome: string;
  };
}

export interface CreateObservacaoTemplate {
  organizacao_id: string;
  nome: string;
  descricao?: string;
  observacoes: ObservacaoItem[];
  ativo?: boolean;
}

export interface UpdateObservacaoTemplate {
  nome?: string;
  descricao?: string;
  observacoes?: ObservacaoItem[];
  ativo?: boolean;
}
