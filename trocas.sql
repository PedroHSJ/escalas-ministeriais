create table public.escala_folgas_trocas (
  id uuid primary key default gen_random_uuid(),
  escala_folga_id uuid not null,
  integrante1_id uuid not null,
  integrante2_id uuid not null,
  data1 date not null,
  data2 date not null,
  usuario_id uuid,
  created_at timestamp with time zone default now()
);

create or replace function public.trocar_atribuicoes_escala(
  p_escala_folga_id uuid,
  p_integrante1_id uuid,
  p_data1 date,
  p_integrante2_id uuid,
  p_data2 date,
  p_usuario_id uuid
)
returns void
language plpgsql
as $$
declare
  v_exists integer;
begin
  -- Troca apenas os registros de TRABALHO
  -- Passo 1: a1 (trabalho) recebe NULL
  update escala_folgas_atribuicoes
    set integrante_id = NULL
    where escala_folga_id = p_escala_folga_id and integrante_id = p_integrante1_id and data = p_data1 and tipo_atribuicao = 'trabalho';

  -- Passo 2: a2 (trabalho) recebe integrante1
  update escala_folgas_atribuicoes
    set integrante_id = p_integrante1_id
    where escala_folga_id = p_escala_folga_id and integrante_id = p_integrante2_id and data = p_data2 and tipo_atribuicao = 'trabalho';

  -- Passo 3: a1 (trabalho) recebe integrante2
  update escala_folgas_atribuicoes
    set integrante_id = p_integrante2_id
    where escala_folga_id = p_escala_folga_id and integrante_id IS NULL and data = p_data1 and tipo_atribuicao = 'trabalho';

  -- Passo 4: Garante registro de folga para integrante1 no dia que deixou de trabalhar (p_data1)
  select count(*) into v_exists from escala_folgas_atribuicoes
    where escala_folga_id = p_escala_folga_id and integrante_id = p_integrante1_id and data = p_data1 and tipo_atribuicao = 'folga';
  if v_exists = 0 then
    insert into escala_folgas_atribuicoes (
      escala_folga_id, integrante_id, data, tipo_atribuicao
    ) values (
      p_escala_folga_id, p_integrante1_id, p_data1, 'folga'
    );
  end if;

  -- Passo 5: Garante registro de folga para integrante2 no dia que deixou de trabalhar (p_data2)
  select count(*) into v_exists from escala_folgas_atribuicoes
    where escala_folga_id = p_escala_folga_id and integrante_id = p_integrante2_id and data = p_data2 and tipo_atribuicao = 'folga';
  if v_exists = 0 then
    insert into escala_folgas_atribuicoes (
      escala_folga_id, integrante_id, data, tipo_atribuicao
    ) values (
      p_escala_folga_id, p_integrante2_id, p_data2, 'folga'
    );
  end if;

  -- Salva o histórico da troca
  insert into escala_folgas_trocas (
    escala_folga_id, integrante1_id, data1, integrante2_id, data2, usuario_id
  ) values (
    p_escala_folga_id, p_integrante1_id, p_data1, p_integrante2_id, p_data2, p_usuario_id
  );
end;
$$;

alter table escala_folgas_atribuicoes alter column integrante_id drop not null;

ALTER TABLE escala_folgas_atribuicoes
  DROP CONSTRAINT escala_folgas_atribuicoes_unique;

ALTER TABLE escala_folgas_atribuicoes
  ADD CONSTRAINT escala_folgas_atribuicoes_unique UNIQUE (escala_folga_id, data, integrante_id, tipo_atribuicao);

ALTER TABLE public.escala_folgas_trocas
  ADD CONSTRAINT fk_escala_folga
    FOREIGN KEY (escala_folga_id) REFERENCES public.escalas_folgas(id),
  ADD CONSTRAINT fk_integrante1
    FOREIGN KEY (integrante1_id) REFERENCES public.integrantes(id),
  ADD CONSTRAINT fk_integrante2
    FOREIGN KEY (integrante2_id) REFERENCES public.integrantes(id),
  ADD CONSTRAINT fk_usuario
    FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.feriados_personalizados DROP COLUMN afeta_escala;