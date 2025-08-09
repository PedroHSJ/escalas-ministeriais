-- Tabela para feriados personalizados
CREATE TABLE public.feriados_personalizados (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organizacao_id uuid NOT NULL,
  data date NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('nacional', 'regional', 'organizacional')),
  afeta_escala boolean NOT NULL DEFAULT true,
  folgas_adicionais integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,
  CONSTRAINT feriados_personalizados_pkey PRIMARY KEY (id),
  CONSTRAINT feriados_personalizados_organizacao_fkey FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id),
  CONSTRAINT feriados_personalizados_user_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT feriados_personalizados_unique_data_org UNIQUE (organizacao_id, data)
);

-- Índices para performance
CREATE INDEX idx_feriados_personalizados_organizacao_data ON public.feriados_personalizados(organizacao_id, data);
CREATE INDEX idx_feriados_personalizados_data ON public.feriados_personalizados(data);

-- RLS (Row Level Security)
ALTER TABLE public.feriados_personalizados ENABLE ROW LEVEL SECURITY;

-- Política para que usuários só vejam feriados de suas organizações
CREATE POLICY "Users can view feriados from their organizations" ON public.feriados_personalizados
  FOR SELECT USING (
    organizacao_id IN (
      SELECT id FROM public.organizacoes WHERE user_id = auth.uid()
    )
  );

-- Política para que usuários só possam inserir feriados em suas organizações
CREATE POLICY "Users can insert feriados in their organizations" ON public.feriados_personalizados
  FOR INSERT WITH CHECK (
    organizacao_id IN (
      SELECT id FROM public.organizacoes WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Política para que usuários só possam atualizar feriados de suas organizações
CREATE POLICY "Users can update feriados from their organizations" ON public.feriados_personalizados
  FOR UPDATE USING (
    organizacao_id IN (
      SELECT id FROM public.organizacoes WHERE user_id = auth.uid()
    )
  );

-- Política para que usuários só possam deletar feriados de suas organizações
CREATE POLICY "Users can delete feriados from their organizations" ON public.feriados_personalizados
  FOR DELETE USING (
    organizacao_id IN (
      SELECT id FROM public.organizacoes WHERE user_id = auth.uid()
    )
  );
