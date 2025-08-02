-- Tabela para armazenar templates de observações reutilizáveis
CREATE TABLE public.observacoes_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organizacao_id uuid NOT NULL,
  nome text NOT NULL, -- nome do template, ex: "Observações Padrão Cozinha"
  descricao text, -- descrição do template
  observacoes jsonb NOT NULL, -- array de observações: [{"texto": "...", "ordem": 1}, ...]
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT observacoes_templates_pkey PRIMARY KEY (id),
  CONSTRAINT observacoes_templates_organizacao_fkey FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id)
);

-- Adicionar campo para observações na tabela escalas_folgas
ALTER TABLE public.escalas_folgas 
ADD COLUMN observacoes_template_id uuid,
ADD CONSTRAINT escalas_folgas_observacoes_template_fkey 
FOREIGN KEY (observacoes_template_id) REFERENCES public.observacoes_templates(id);

-- Índices para performance
CREATE INDEX idx_observacoes_templates_organizacao ON public.observacoes_templates(organizacao_id);
CREATE INDEX idx_observacoes_templates_ativo ON public.observacoes_templates(ativo);

-- Template padrão para exemplo
INSERT INTO public.observacoes_templates (organizacao_id, nome, descricao, observacoes) 
SELECT 
  o.id,
  'Observações Padrão - Cozinha',
  'Template padrão para escalas da cozinha',
  '[
    {"texto": "O militar que estiver na copa das panelas é o responsável pelo lixo da cozinha", "ordem": 1},
    {"texto": "O horário de chegada dos militares ao RANCHO é às 6:45 horas", "ordem": 2},
    {"texto": "O militar que estiver entrando de serviço chegará obrigatoriamente às 06:00 horas pronto", "ordem": 3},
    {"texto": "A troca de serviço poderá ser autorizada por um graduado", "ordem": 4}
  ]'::jsonb
FROM public.organizacoes o
LIMIT 1; -- Inserir apenas para a primeira organização como exemplo
