-- Adicionar coluna de especialização na tabela de atribuições de folgas
ALTER TABLE public.escala_folgas_atribuicoes 
ADD COLUMN especializacao_id uuid REFERENCES public.especializacoes(id);

-- Adicionar índice para melhor performance
CREATE INDEX idx_escala_folgas_atribuicoes_especializacao 
ON public.escala_folgas_atribuicoes(especializacao_id);
