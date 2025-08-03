-- Adicionar campo para soft delete nas escalas de folgas
ALTER TABLE public.escalas_folgas 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Adicionar índice para melhor performance nas consultas
CREATE INDEX idx_escalas_folgas_deleted_at ON public.escalas_folgas(deleted_at);

-- Comentário explicativo
COMMENT ON COLUMN public.escalas_folgas.deleted_at IS 'Timestamp de quando a escala foi excluída (soft delete). NULL = ativo, valor = excluído';
