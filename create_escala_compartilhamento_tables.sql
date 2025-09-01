-- Tabelas para compartilhamento de escalas
-- Criado para implementar funcionalidade de compartilhamento entre usuários

-- Tabela principal de compartilhamento de escalas
CREATE TABLE public.escala_folgas_compartilhamento (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  escala_folga_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  tipo_permissao text NOT NULL CHECK (tipo_permissao IN ('visualizacao', 'edicao', 'administrador')),
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL, -- quem criou o compartilhamento
  CONSTRAINT escala_folgas_compartilhamento_pkey PRIMARY KEY (id),
  CONSTRAINT escala_folgas_compartilhamento_escala_fkey FOREIGN KEY (escala_folga_id) REFERENCES public.escalas_folgas(id) ON DELETE CASCADE,
  CONSTRAINT escala_folgas_compartilhamento_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT escala_folgas_compartilhamento_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT escala_folgas_compartilhamento_unique UNIQUE (escala_folga_id, usuario_id)
);

-- Índices para melhor performance
CREATE INDEX idx_escala_folgas_compartilhamento_escala ON public.escala_folgas_compartilhamento(escala_folga_id);
CREATE INDEX idx_escala_folgas_compartilhamento_usuario ON public.escala_folgas_compartilhamento(usuario_id);
CREATE INDEX idx_escala_folgas_compartilhamento_tipo ON public.escala_folgas_compartilhamento(tipo_permissao);

-- Adicionar campo proprietario_id na tabela escalas_folgas se não existir
ALTER TABLE public.escalas_folgas 
ADD COLUMN IF NOT EXISTS proprietario_id uuid REFERENCES auth.users(id);

-- Adicionar campo compartilhada na tabela escalas_folgas se não existir
ALTER TABLE public.escalas_folgas 
ADD COLUMN IF NOT EXISTS compartilhada boolean DEFAULT false;

-- Política RLS para escalas_folgas_compartilhamento
ALTER TABLE public.escala_folgas_compartilhamento ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus compartilhamentos
CREATE POLICY "Usuários podem ver seus próprios compartilhamentos" ON public.escala_folgas_compartilhamento
  FOR SELECT USING (auth.uid() = usuario_id OR auth.uid() = created_by);

-- Política para proprietários da escala gerenciarem compartilhamentos
CREATE POLICY "Proprietários podem gerenciar compartilhamentos" ON public.escala_folgas_compartilhamento
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.escalas_folgas 
      WHERE id = escala_folga_id 
      AND proprietario_id = auth.uid()
    )
  );

-- Política para usuários com permissão de administrador
CREATE POLICY "Administradores podem gerenciar compartilhamentos" ON public.escala_folgas_compartilhamento
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.escala_folgas_compartilhamento efc
      WHERE efc.escala_folga_id = escala_folga_id 
      AND efc.usuario_id = auth.uid()
      AND efc.tipo_permissao = 'administrador'
    )
  );

-- Função para verificar permissões de uma escala
CREATE OR REPLACE FUNCTION public.verificar_permissao_escala(
  p_escala_folga_id uuid,
  p_tipo_permissao text DEFAULT 'visualizacao'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Usuário é proprietário da escala
  IF EXISTS (
    SELECT 1 FROM public.escalas_folgas 
    WHERE id = p_escala_folga_id 
    AND proprietario_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  -- Usuário tem permissão específica
  IF EXISTS (
    SELECT 1 FROM public.escala_folgas_compartilhamento
    WHERE escala_folga_id = p_escala_folga_id 
    AND usuario_id = auth.uid()
    AND (
      (p_tipo_permissao = 'visualizacao' AND tipo_permissao IN ('visualizacao', 'edicao', 'administrador')) OR
      (p_tipo_permissao = 'edicao' AND tipo_permissao IN ('edicao', 'administrador')) OR
      (p_tipo_permissao = 'administrador' AND tipo_permissao = 'administrador')
    )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Função para obter escalas compartilhadas com um usuário
CREATE OR REPLACE FUNCTION public.obter_escalas_compartilhadas()
RETURNS TABLE (
  id uuid,
  nome text,
  departamento_nome text,
  organizacao_nome text,
  tipo_permissao text,
  compartilhada_em timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ef.id,
    ef.nome,
    d.nome as departamento_nome,
    o.nome as organizacao_nome,
    efc.tipo_permissao,
    efc.created_at as compartilhada_em
  FROM public.escala_folgas_compartilhamento efc
  JOIN public.escalas_folgas ef ON ef.id = efc.escala_folga_id
  JOIN public.departamentos d ON d.id = ef.departamento_id
  JOIN public.organizacoes o ON o.id = d.organizacao_id
  WHERE efc.usuario_id = auth.uid()
  AND ef.deleted_at IS NULL
  ORDER BY efc.created_at DESC;
END;
$$;
