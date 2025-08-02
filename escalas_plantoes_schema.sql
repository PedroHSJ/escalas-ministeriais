-- Schema para Escalas de Plantões/Vigilância
-- Sistema 24h com turnos e controle de horas

-- Tabela para tipos de turnos
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

-- Tabela principal para escalas de plantões
CREATE TABLE public.escalas_plantoes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  departamento_id uuid NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  dias_funcionamento text[] NOT NULL DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], -- dias da semana que funciona
  turnos_simultaneos integer DEFAULT 1, -- quantos turnos podem acontecer ao mesmo tempo
  observacoes text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT escalas_plantoes_pkey PRIMARY KEY (id),
  CONSTRAINT escalas_plantoes_departamento_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id)
);

-- Tabela para participações na escala de plantões
CREATE TABLE public.escala_plantoes_participacoes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  escala_plantao_id uuid NOT NULL,
  integrante_id uuid NOT NULL,
  tipos_turnos_disponiveis uuid[] NOT NULL DEFAULT '{}', -- quais turnos a pessoa pode fazer
  horas_minimas_semana integer DEFAULT 0, -- mínimo de horas por semana
  horas_maximas_semana integer DEFAULT 40, -- máximo de horas por semana
  disponivel_fins_semana boolean DEFAULT true,
  prioridade integer DEFAULT 1, -- 1=baixa, 2=normal, 3=alta (para substituições)
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT escala_plantoes_participacoes_pkey PRIMARY KEY (id),
  CONSTRAINT escala_plantoes_participacoes_escala_fkey FOREIGN KEY (escala_plantao_id) REFERENCES public.escalas_plantoes(id),
  CONSTRAINT escala_plantoes_participacoes_integrante_fkey FOREIGN KEY (integrante_id) REFERENCES public.integrantes(id),
  CONSTRAINT escala_plantoes_participacoes_unique UNIQUE (escala_plantao_id, integrante_id)
);

-- Tabela para os plantões programados
CREATE TABLE public.plantoes_programados (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  escala_plantao_id uuid NOT NULL,
  data date NOT NULL,
  tipo_turno_id uuid NOT NULL,
  integrante_id uuid NOT NULL,
  integrante_substituto_id uuid, -- caso tenha substituto
  status text DEFAULT 'programado', -- 'programado', 'confirmado', 'ausencia', 'substituido', 'realizado'
  horas_trabalhadas numeric(4,2), -- horas efetivamente trabalhadas
  observacoes text,
  confirmado_em timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plantoes_programados_pkey PRIMARY KEY (id),
  CONSTRAINT plantoes_programados_escala_fkey FOREIGN KEY (escala_plantao_id) REFERENCES public.escalas_plantoes(id),
  CONSTRAINT plantoes_programados_turno_fkey FOREIGN KEY (tipo_turno_id) REFERENCES public.tipos_turnos(id),
  CONSTRAINT plantoes_programados_integrante_fkey FOREIGN KEY (integrante_id) REFERENCES public.integrantes(id),
  CONSTRAINT plantoes_programados_substituto_fkey FOREIGN KEY (integrante_substituto_id) REFERENCES public.integrantes(id)
);

-- Tabela para registro de ausências e solicitações de substituição
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

-- Índices para performance
CREATE INDEX idx_plantoes_programados_data ON public.plantoes_programados(data);
CREATE INDEX idx_plantoes_programados_integrante ON public.plantoes_programados(integrante_id);
CREATE INDEX idx_plantoes_programados_status ON public.plantoes_programados(status);

-- Inserir tipos de turnos padrão (serão criados quando uma organização for selecionada)
COMMENT ON TABLE public.tipos_turnos IS 'Define os tipos de turnos disponíveis (manhã, tarde, noite, madrugada)';
COMMENT ON TABLE public.escalas_plantoes IS 'Escalas de plantões/vigilância com sistema 24h';
COMMENT ON TABLE public.plantoes_programados IS 'Plantões individuais programados com controle de horas';
COMMENT ON TABLE public.plantoes_ausencias IS 'Registro de ausências e solicitações de substituição';
