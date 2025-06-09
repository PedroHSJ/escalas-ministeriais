-- Tabela genérica para organizações
CREATE TABLE public.organizacoes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  tipo text NOT NULL, -- 'igreja', 'empresa', 'grupo', 'outro'
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT organizacoes_pkey PRIMARY KEY (id),
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Tabela para departamentos/setores/ministérios
CREATE TABLE public.departamentos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  organizacao_id uuid NOT NULL,
  tipo_departamento text NOT NULL, -- 'louvor', 'infantil', 'vendas', 'ti', etc.
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT departamentos_pkey PRIMARY KEY (id),
  CONSTRAINT departamentos_organizacao_id_fkey FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id),
  CONSTRAINT departamentos_unique_nome_org UNIQUE (nome, organizacao_id)
);

-- Tabela para tipos de especialização configuráveis
CREATE TABLE public.tipos_especializacao (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nome text NOT NULL, -- 'Instrumentos', 'Habilidades', 'Certificações', etc.
  organizacao_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tipos_especializacao_pkey PRIMARY KEY (id),
  CONSTRAINT tipos_especializacao_organizacao_fkey FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id)
);

-- Tabela para especializações específicas
CREATE TABLE public.especializacoes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nome text NOT NULL, -- 'Violão', 'React', 'Liderança', etc.
  tipo_especializacao_id uuid NOT NULL,
  icone text, -- opcional, para UI
  cor text, -- opcional, para UI
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT especializacoes_pkey PRIMARY KEY (id),
  CONSTRAINT especializacoes_tipo_fkey FOREIGN KEY (tipo_especializacao_id) REFERENCES public.tipos_especializacao(id)
);

-- Tabela atualizada de integrantes
CREATE TABLE public.integrantes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  departamento_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT integrantes_pkey PRIMARY KEY (id),
  CONSTRAINT integrantes_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id)
);

-- Tabela para relacionar integrantes com suas especializações
CREATE TABLE public.integrante_especializacoes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  integrante_id uuid NOT NULL,
  especializacao_id uuid NOT NULL,
  nivel text DEFAULT 'básico', -- 'básico', 'intermediário', 'avançado'
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT integrante_especializacoes_pkey PRIMARY KEY (id),
  CONSTRAINT integrante_especializacoes_integrante_fkey FOREIGN KEY (integrante_id) REFERENCES public.integrantes(id),
  CONSTRAINT integrante_especializacoes_especializacao_fkey FOREIGN KEY (especializacao_id) REFERENCES public.especializacoes(id),
  CONSTRAINT integrante_especializacoes_unique UNIQUE (integrante_id, especializacao_id)
);

-- Tabela atualizada de escalas
CREATE TABLE public.escalas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  departamento_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT escalas_pkey PRIMARY KEY (id),
  CONSTRAINT escalas_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id)
);

-- Tabela atualizada de participações (mais genérica)
CREATE TABLE public.escala_participacoes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  escala_id uuid NOT NULL,
  integrante_id uuid NOT NULL,
  data date NOT NULL,
  especializacao_id uuid, -- opcional, especialização usada nesta participação
  observacao text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT escala_participacoes_pkey PRIMARY KEY (id),
  CONSTRAINT escala_participacoes_escala_id_fkey FOREIGN KEY (escala_id) REFERENCES public.escalas(id),
  CONSTRAINT escala_participacoes_integrante_id_fkey FOREIGN KEY (integrante_id) REFERENCES public.integrantes(id),
  CONSTRAINT escala_participacoes_especializacao_fkey FOREIGN KEY (especializacao_id) REFERENCES public.especializacoes(id)
);