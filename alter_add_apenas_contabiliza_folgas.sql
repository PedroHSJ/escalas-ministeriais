-- Adicionar campo para integrantes que apenas contabilizam folgas (férias/licença)
ALTER TABLE public.escala_folgas_participacoes 
ADD COLUMN apenas_contabiliza_folgas boolean DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN public.escala_folgas_participacoes.apenas_contabiliza_folgas IS 'Indica se o integrante está de férias/licença e apenas contabiliza folgas sem participar da rotação de trabalho';
