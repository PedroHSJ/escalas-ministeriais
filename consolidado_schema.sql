-- SCHEMA CONSOLIDADO (DDL FINAL)
-- Gerado automaticamente a partir dos arquivos do projeto

-- ORGANIZAÇÕES
CREATE TABLE public.organizacoes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  tipo text NOT NULL, -- 'igreja', 'empresa', 'grupo', 'outro'
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT organizacoes_pkey PRIMARY KEY (id),
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- DEPARTAMENTOS
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

-- TIPOS DE ESPECIALIZAÇÃO
CREATE TABLE public.tipos_especializacao (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nome text NOT NULL, -- 'Instrumentos', 'Habilidades', 'Certificações', etc.
  organizacao_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tipos_especializacao_pkey PRIMARY KEY (id),
  CONSTRAINT tipos_especializacao_organizacao_fkey FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id)
);

-- ESPECIALIZAÇÕES
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

-- INTEGRANTES
CREATE TABLE public.integrantes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  departamento_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT integrantes_pkey PRIMARY KEY (id),
  CONSTRAINT integrantes_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id)
);

-- INTEGRANTE_ESPECIALIZACOES
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

-- ESCALAS
CREATE TABLE public.escalas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  departamento_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT escalas_pkey PRIMARY KEY (id),
  CONSTRAINT escalas_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id)
);

-- ESCALA_PARTICIPACOES
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

-- ESCALAS_FOLGAS
CREATE TABLE public.escalas_folgas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  departamento_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  observacoes_template_id uuid,
  deleted_at timestamp with time zone DEFAULT NULL,
  CONSTRAINT escalas_folgas_pkey PRIMARY KEY (id),
  CONSTRAINT escalas_folgas_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id),
  CONSTRAINT escalas_folgas_observacoes_template_fkey FOREIGN KEY (observacoes_template_id) REFERENCES public.observacoes_templates(id)
);
CREATE INDEX idx_escalas_folgas_deleted_at ON public.escalas_folgas(deleted_at);

-- ESCALA_FOLGAS_PARTICIPACOES
CREATE TABLE public.escala_folgas_participacoes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  escala_folga_id uuid NOT NULL,
  integrante_id uuid NOT NULL,
  folgas_iniciais integer NOT NULL DEFAULT 0, -- número de folgas que a pessoa tinha no início da escala
  folgas_atuais integer NOT NULL DEFAULT 0, -- número de folgas atuais da pessoa
  ativo boolean NOT NULL DEFAULT true, -- se está ativo na escala
  apenas_contabiliza_folgas boolean DEFAULT false, -- férias/licença
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT escala_folgas_participacoes_pkey PRIMARY KEY (id),
  CONSTRAINT escala_folgas_participacoes_escala_fkey FOREIGN KEY (escala_folga_id) REFERENCES public.escalas_folgas(id),
  CONSTRAINT escala_folgas_participacoes_integrante_fkey FOREIGN KEY (integrante_id) REFERENCES public.integrantes(id),
  CONSTRAINT escala_folgas_participacoes_unique UNIQUE (escala_folga_id, integrante_id)
);

-- ESCALA_FOLGAS_ATRIBUICOES
CREATE TABLE public.escala_folgas_atribuicoes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  escala_folga_id uuid NOT NULL,
  data date NOT NULL,
  integrante_id uuid,
  tipo_atribuicao text NOT NULL, -- 'trabalho', 'folga'
  observacao text,
  especializacao_id uuid REFERENCES public.especializacoes(id),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT escala_folgas_atribuicoes_pkey PRIMARY KEY (id),
  CONSTRAINT escala_folgas_atribuicoes_escala_fkey FOREIGN KEY (escala_folga_id) REFERENCES public.escalas_folgas(id),
  CONSTRAINT escala_folgas_atribuicoes_integrante_fkey FOREIGN KEY (integrante_id) REFERENCES public.integrantes(id),
  CONSTRAINT escala_folgas_atribuicoes_unique UNIQUE (escala_folga_id, data, integrante_id, tipo_atribuicao)
);
CREATE INDEX idx_escala_folgas_atribuicoes_especializacao ON public.escala_folgas_atribuicoes(especializacao_id);

-- ESCALA_FOLGAS_TROCAS
CREATE TABLE public.escala_folgas_trocas (
  id uuid primary key default gen_random_uuid(),
  escala_folga_id uuid not null,
  integrante1_id uuid not null,
  integrante2_id uuid not null,
  data1 date not null,
  data2 date not null,
  usuario_id uuid,
  created_at timestamp with time zone default now(),
  CONSTRAINT fk_escala_folga FOREIGN KEY (escala_folga_id) REFERENCES public.escalas_folgas(id),
  CONSTRAINT fk_integrante1 FOREIGN KEY (integrante1_id) REFERENCES public.integrantes(id),
  CONSTRAINT fk_integrante2 FOREIGN KEY (integrante2_id) REFERENCES public.integrantes(id),
  CONSTRAINT fk_usuario FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- TABELA DE TEMPLATES DE OBSERVAÇÕES
CREATE TABLE public.observacoes_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organizacao_id uuid NOT NULL,
  nome text NOT NULL, -- nome do template
  descricao text,
  observacoes jsonb NOT NULL, -- array de observações
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT observacoes_templates_pkey PRIMARY KEY (id),
  CONSTRAINT observacoes_templates_organizacao_fkey FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id)
);
CREATE INDEX idx_observacoes_templates_organizacao ON public.observacoes_templates(organizacao_id);
CREATE INDEX idx_observacoes_templates_ativo ON public.observacoes_templates(ativo);

-- FERIADOS PERSONALIZADOS
CREATE TABLE public.feriados_personalizados (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organizacao_id uuid NOT NULL,
  data date NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('nacional', 'regional', 'organizacional')),
  folgas_adicionais integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,
  CONSTRAINT feriados_personalizados_pkey PRIMARY KEY (id),
  CONSTRAINT feriados_personalizados_organizacao_fkey FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id),
  CONSTRAINT feriados_personalizados_user_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT feriados_personalizados_unique_data_org UNIQUE (organizacao_id, data)
);
CREATE INDEX idx_feriados_personalizados_organizacao_data ON public.feriados_personalizados(organizacao_id, data);
CREATE INDEX idx_feriados_personalizados_data ON public.feriados_personalizados(data);

-- ESCALAS DE PLANTÕES
CREATE TABLE public.tipos_turnos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nome text NOT NULL, -- 'Manhã', 'Tarde', 'Noite', 'Madrugada'
  hora_inicio time NOT NULL, -- ex: '06:00'
  hora_fim time NOT NULL, -- ex: '12:00'
  duracao_horas integer NOT NULL, -- 6 horas
  organizacao_id uuid NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tipos_turnos_pkey PRIMARY KEY (id),
  CONSTRAINT tipos_turnos_organizacao_fkey FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id)
);

CREATE TABLE public.escalas_plantoes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  departamento_id uuid NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  dias_funcionamento text[] NOT NULL DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  turnos_simultaneos integer DEFAULT 1,
  observacoes text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT escalas_plantoes_pkey PRIMARY KEY (id),
  CONSTRAINT escalas_plantoes_departamento_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id)
);

CREATE TABLE public.escala_plantoes_participacoes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  escala_plantao_id uuid NOT NULL,
  integrante_id uuid NOT NULL,
  tipos_turnos_disponiveis uuid[] NOT NULL DEFAULT '{}',
  horas_minimas_semana integer DEFAULT 0,
  horas_maximas_semana integer DEFAULT 40,
  disponivel_fins_semana boolean DEFAULT true,
  prioridade integer DEFAULT 1,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT escala_plantoes_participacoes_pkey PRIMARY KEY (id),
  CONSTRAINT escala_plantoes_participacoes_escala_fkey FOREIGN KEY (escala_plantao_id) REFERENCES public.escalas_plantoes(id),
  CONSTRAINT escala_plantoes_participacoes_integrante_fkey FOREIGN KEY (integrante_id) REFERENCES public.integrantes(id),
  CONSTRAINT escala_plantoes_participacoes_unique UNIQUE (escala_plantao_id, integrante_id)
);

CREATE TABLE public.plantoes_programados (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  escala_plantao_id uuid NOT NULL,
  data date NOT NULL,
  tipo_turno_id uuid NOT NULL,
  integrante_id uuid NOT NULL,
  integrante_substituto_id uuid,
  status text DEFAULT 'programado',
  horas_trabalhadas numeric(4,2),
  observacoes text,
  confirmado_em timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plantoes_programados_pkey PRIMARY KEY (id),
  CONSTRAINT plantoes_programados_escala_fkey FOREIGN KEY (escala_plantao_id) REFERENCES public.escalas_plantoes(id),
  CONSTRAINT plantoes_programados_turno_fkey FOREIGN KEY (tipo_turno_id) REFERENCES public.tipos_turnos(id),
  CONSTRAINT plantoes_programados_integrante_fkey FOREIGN KEY (integrante_id) REFERENCES public.integrantes(id),
  CONSTRAINT plantoes_programados_substituto_fkey FOREIGN KEY (integrante_substituto_id) REFERENCES public.integrantes(id)
);
CREATE INDEX idx_plantoes_programados_data ON public.plantoes_programados(data);
CREATE INDEX idx_plantoes_programados_integrante ON public.plantoes_programados(integrante_id);
CREATE INDEX idx_plantoes_programados_status ON public.plantoes_programados(status);

CREATE TABLE public.plantoes_ausencias (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  plantao_programado_id uuid NOT NULL,
  integrante_id uuid NOT NULL,
  motivo text NOT NULL,
  data_solicitacao timestamp with time zone DEFAULT now(),
  urgente boolean DEFAULT false,
  substituicao_aprovada boolean DEFAULT false,
  substituto_encontrado_id uuid,
  observacoes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plantoes_ausencias_pkey PRIMARY KEY (id),
  CONSTRAINT plantoes_ausencias_plantao_fkey FOREIGN KEY (plantao_programado_id) REFERENCES public.plantoes_programados(id),
  CONSTRAINT plantoes_ausencias_integrante_fkey FOREIGN KEY (integrante_id) REFERENCES public.integrantes(id),
  CONSTRAINT plantoes_ausencias_substituto_fkey FOREIGN KEY (substituto_encontrado_id) REFERENCES public.integrantes(id)
);

-- FUNÇÃO DE TROCA DE ATRIBUIÇÕES
CREATE OR REPLACE FUNCTION public.trocar_atribuicoes_escala(
  p_escala_folga_id uuid,
  p_integrante1_id uuid,
  p_data1 date,
  p_integrante2_id uuid,
  p_data2 date,
  p_usuario_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_exists integer;
BEGIN
  -- Troca apenas os registros de TRABALHO
  -- Passo 1: a1 (trabalho) recebe NULL
  UPDATE escala_folgas_atribuicoes
    SET integrante_id = NULL
    WHERE escala_folga_id = p_escala_folga_id AND integrante_id = p_integrante1_id AND data = p_data1 AND tipo_atribuicao = 'trabalho';

  -- Passo 2: a2 (trabalho) recebe integrante1
  UPDATE escala_folgas_atribuicoes
    SET integrante_id = p_integrante1_id
    WHERE escala_folga_id = p_escala_folga_id AND integrante_id = p_integrante2_id AND data = p_data2 AND tipo_atribuicao = 'trabalho';

  -- Passo 3: a1 (trabalho) recebe integrante2
  UPDATE escala_folgas_atribuicoes
    SET integrante_id = p_integrante2_id
    WHERE escala_folga_id = p_escala_folga_id AND integrante_id IS NULL AND data = p_data1 AND tipo_atribuicao = 'trabalho';

  -- Passo 4: Garante registro de folga para integrante1 no dia que deixou de trabalhar (p_data1)
  SELECT count(*) INTO v_exists FROM escala_folgas_atribuicoes
    WHERE escala_folga_id = p_escala_folga_id AND integrante_id = p_integrante1_id AND data = p_data1 AND tipo_atribuicao = 'folga';
  IF v_exists = 0 THEN
    INSERT INTO escala_folgas_atribuicoes (
      escala_folga_id, integrante_id, data, tipo_atribuicao
    ) VALUES (
      p_escala_folga_id, p_integrante1_id, p_data1, 'folga'
    );
  END IF;

  -- Passo 5: Garante registro de folga para integrante2 no dia que deixou de trabalhar (p_data2)
  SELECT count(*) INTO v_exists FROM escala_folgas_atribuicoes
    WHERE escala_folga_id = p_escala_folga_id AND integrante_id = p_integrante2_id AND data = p_data2 AND tipo_atribuicao = 'folga';
  IF v_exists = 0 THEN
    INSERT INTO escala_folgas_atribuicoes (
      escala_folga_id, integrante_id, data, tipo_atribuicao
    ) VALUES (
      p_escala_folga_id, p_integrante2_id, p_data2, 'folga'
    );
  END IF;

  -- Salva o histórico da troca
  INSERT INTO escala_folgas_trocas (
    escala_folga_id, integrante1_id, data1, integrante2_id, data2, usuario_id
  ) VALUES (
    p_escala_folga_id, p_integrante1_id, p_data1, p_integrante2_id, p_data2, p_usuario_id
  );
END;
$$;
