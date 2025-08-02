// Utilitários para geração automática de plantões com algoritmos de otimização

import {
  EscalaPlantao,
  EscalaPlantaoParticipacao,
  TipoTurno,
  PlantaoProgramado,
  NovoPlantao,
  OpcoeGeracaoPlantoes,
  DIAS_SEMANA,
} from "@/types/plantoes";

interface IntegranteDisponibilidade {
  id: string;
  nome: string;
  tipos_turnos_disponiveis: string[];
  horas_minimas_semana: number;
  horas_maximas_semana: number;
  disponivel_fins_semana: boolean;
  prioridade: number;
  horas_trabalhadas_periodo: number;
  ultimo_plantao_data?: string;
  turnos_consecutivos: number;
}

interface ResultadoGeracao {
  plantoes: NovoPlantao[];
  estatisticas: {
    total_plantoes: number;
    plantoes_gerados: number;
    cobertura_percentual: number;
    distribuicao_horas: { [integranteId: string]: number };
    conflitos: string[];
    sugestoes: string[];
  };
}

export class GeradorPlantoes {
  private escala: EscalaPlantao;
  private participacoes: EscalaPlantaoParticipacao[];
  private tiposTurnos: TipoTurno[];
  private opcoes: OpcoeGeracaoPlantoes;

  constructor(
    escala: EscalaPlantao,
    participacoes: EscalaPlantaoParticipacao[],
    tiposTurnos: TipoTurno[],
    opcoes: OpcoeGeracaoPlantoes
  ) {
    this.escala = escala;
    this.participacoes = participacoes;
    this.tiposTurnos = tiposTurnos;
    this.opcoes = opcoes;
  }

  async gerar(): Promise<ResultadoGeracao> {
    const plantoes: NovoPlantao[] = [];
    const conflitos: string[] = [];
    const sugestoes: string[] = [];
    const distribuicaoHoras: { [integranteId: string]: number } = {};

    // Inicializar contadores
    this.participacoes.forEach((part) => {
      distribuicaoHoras[part.integrante_id] = 0;
    });

    // Gerar lista de datas que precisam de cobertura
    const datasCobertura = this.gerarDatasCobertura();
    let totalPlantoesNecessarios = 0;

    // Para cada data, gerar plantões para cada turno configurado
    for (const data of datasCobertura) {
      const dayOfWeek = this.getDayOfWeek(data);

      // Verificar se o dia está nos dias de funcionamento
      if (!this.escala.dias_funcionamento.includes(dayOfWeek)) {
        continue;
      }

      // Para cada turno ativo
      for (const turno of this.tiposTurnos) {
        // Criar plantões simultâneos se configurado
        for (let i = 0; i < this.escala.turnos_simultaneos; i++) {
          totalPlantoesNecessarios++;

          // Encontrar melhor integrante para este plantão
          const integranteEscolhido = this.escolherMelhorIntegrante(
            data,
            turno,
            plantoes,
            distribuicaoHoras
          );

          if (integranteEscolhido) {
            const novoPlantao: NovoPlantao = {
              data: data,
              tipo_turno_id: turno.id,
              integrante_id: integranteEscolhido.id,
              observacoes: i > 0 ? `Turno simultâneo ${i + 1}` : undefined,
            };

            plantoes.push(novoPlantao);
            distribuicaoHoras[integranteEscolhido.id] += turno.duracao_horas;
          } else {
            conflitos.push(
              `Nenhum integrante disponível para ${
                turno.nome
              } em ${this.formatDate(data)}`
            );
          }
        }
      }
    }

    // Verificar distribuição de horas e gerar sugestões
    this.analisarDistribuicao(distribuicaoHoras, sugestoes);

    const plantoesGerados = plantoes.length;
    const coberturaPercentual =
      totalPlantoesNecessarios > 0
        ? (plantoesGerados / totalPlantoesNecessarios) * 100
        : 0;

    return {
      plantoes,
      estatisticas: {
        total_plantoes: totalPlantoesNecessarios,
        plantoes_gerados: plantoesGerados,
        cobertura_percentual: coberturaPercentual,
        distribuicao_horas: distribuicaoHoras,
        conflitos,
        sugestoes,
      },
    };
  }

  private gerarDatasCobertura(): string[] {
    const datas: string[] = [];
    const dataInicio = new Date(this.escala.data_inicio);
    const dataFim = new Date(this.escala.data_fim);

    const currentDate = new Date(dataInicio);
    while (currentDate <= dataFim) {
      datas.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return datas;
  }

  private getDayOfWeek(data: string): string {
    const date = new Date(data);
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return days[date.getDay()];
  }

  private escolherMelhorIntegrante(
    data: string,
    turno: TipoTurno,
    plantoesExistentes: NovoPlantao[],
    distribuicaoHoras: { [integranteId: string]: number }
  ): IntegranteDisponibilidade | null {
    // Criar lista de candidatos elegíveis
    const candidatos = this.participacoes
      .filter((part) =>
        this.isIntegranteElegivel(
          part,
          data,
          turno,
          plantoesExistentes,
          distribuicaoHoras
        )
      )
      .map((part) =>
        this.criarIntegranteDisponibilidade(
          part,
          data,
          turno,
          plantoesExistentes,
          distribuicaoHoras
        )
      );

    if (candidatos.length === 0) {
      return null;
    }

    // Aplicar algoritmo de seleção baseado nas opções
    return this.aplicarAlgoritmoSelecao(candidatos, data, turno);
  }

  private isIntegranteElegivel(
    participacao: EscalaPlantaoParticipacao,
    data: string,
    turno: TipoTurno,
    plantoesExistentes: NovoPlantao[],
    distribuicaoHoras: { [integranteId: string]: number }
  ): boolean {
    // 1. Verificar se o integrante pode fazer este turno
    if (!participacao.tipos_turnos_disponiveis.includes(turno.id)) {
      return false;
    }

    // 2. Verificar disponibilidade em fins de semana
    const dayOfWeek = this.getDayOfWeek(data);
    if (
      (dayOfWeek === "saturday" || dayOfWeek === "sunday") &&
      !participacao.disponivel_fins_semana
    ) {
      return false;
    }

    // 3. Verificar se não excede horas máximas
    const horasAtuais = distribuicaoHoras[participacao.integrante_id] || 0;
    if (horasAtuais + turno.duracao_horas > participacao.horas_maximas_semana) {
      return false;
    }

    // 4. Verificar conflitos na mesma data
    const temPlantaoNaData = plantoesExistentes.some(
      (p) => p.data === data && p.integrante_id === participacao.integrante_id
    );
    if (temPlantaoNaData) {
      return false;
    }

    // 5. Verificar intervalo mínimo entre turnos (se configurado)
    if (this.opcoes.evitar_turnos_consecutivos) {
      if (
        this.temTurnoConsecutivo(
          participacao.integrante_id,
          data,
          plantoesExistentes
        )
      ) {
        return false;
      }
    }

    return true;
  }

  private criarIntegranteDisponibilidade(
    participacao: EscalaPlantaoParticipacao,
    data: string,
    turno: TipoTurno,
    plantoesExistentes: NovoPlantao[],
    distribuicaoHoras: { [integranteId: string]: number }
  ): IntegranteDisponibilidade {
    const horasAtuais = distribuicaoHoras[participacao.integrante_id] || 0;
    const ultimoPlantao = this.getUltimoPlantao(
      participacao.integrante_id,
      plantoesExistentes
    );

    return {
      id: participacao.integrante_id,
      nome: participacao.integrante?.nome || "",
      tipos_turnos_disponiveis: participacao.tipos_turnos_disponiveis,
      horas_minimas_semana: participacao.horas_minimas_semana,
      horas_maximas_semana: participacao.horas_maximas_semana,
      disponivel_fins_semana: participacao.disponivel_fins_semana,
      prioridade: participacao.prioridade,
      horas_trabalhadas_periodo: horasAtuais,
      ultimo_plantao_data: ultimoPlantao?.data,
      turnos_consecutivos: this.contarTurnosConsecutivos(
        participacao.integrante_id,
        data,
        plantoesExistentes
      ),
    };
  }

  private aplicarAlgoritmoSelecao(
    candidatos: IntegranteDisponibilidade[],
    data: string,
    turno: TipoTurno
  ): IntegranteDisponibilidade {
    // Sistema de pontuação para escolher o melhor candidato
    const candidatosComPontuacao = candidatos.map((candidato) => {
      let pontuacao = 0;

      // 1. Prioridade definida pelo usuário (peso: 30%)
      pontuacao += candidato.prioridade * 30;

      // 2. Distribuição equilibrada de horas (peso: 40%)
      if (this.opcoes.distribuicao_equilibrada) {
        const horasMinimas = candidato.horas_minimas_semana;
        const horasMaximas = candidato.horas_maximas_semana;
        const horasAtuais = candidato.horas_trabalhadas_periodo;

        // Priorizar quem tem menos horas trabalhadas (inversamente proporcional)
        const percentualHoras =
          horasMaximas > 0 ? horasAtuais / horasMaximas : 0;
        pontuacao += (1 - percentualHoras) * 40;

        // Bonus para quem está abaixo do mínimo
        if (horasAtuais < horasMinimas) {
          pontuacao += 20;
        }
      }

      // 3. Respeitar preferências de turno (peso: 20%)
      if (this.opcoes.respeitar_preferencias_turno) {
        // Se o integrante tem poucos turnos disponíveis, dar prioridade
        const turnosDisponiveis = candidato.tipos_turnos_disponiveis.length;
        if (turnosDisponiveis <= 2) {
          pontuacao += 20;
        }
      }

      // 4. Evitar turnos consecutivos (peso: 10%)
      if (this.opcoes.evitar_turnos_consecutivos) {
        pontuacao += (5 - candidato.turnos_consecutivos) * 2;
      }

      // 5. Disponibilidade em fins de semana (bonus)
      const dayOfWeek = this.getDayOfWeek(data);
      if (
        (dayOfWeek === "saturday" || dayOfWeek === "sunday") &&
        this.opcoes.priorizar_disponibilidade_fins_semana
      ) {
        if (candidato.disponivel_fins_semana) {
          pontuacao += 15;
        }
      }

      return { candidato, pontuacao };
    });

    // Ordenar por pontuação (maior primeiro) e escolher o melhor
    candidatosComPontuacao.sort((a, b) => b.pontuacao - a.pontuacao);

    return candidatosComPontuacao[0].candidato;
  }

  private temTurnoConsecutivo(
    integranteId: string,
    data: string,
    plantoesExistentes: NovoPlantao[]
  ): boolean {
    const dataAtual = new Date(data);
    const dataAnterior = new Date(dataAtual);
    dataAnterior.setDate(dataAtual.getDate() - 1);
    const dataPosterior = new Date(dataAtual);
    dataPosterior.setDate(dataAtual.getDate() + 1);

    const dataAnteriorStr = dataAnterior.toISOString().split("T")[0];
    const dataPosteriorStr = dataPosterior.toISOString().split("T")[0];

    return plantoesExistentes.some(
      (p) =>
        p.integrante_id === integranteId &&
        (p.data === dataAnteriorStr || p.data === dataPosteriorStr)
    );
  }

  private getUltimoPlantao(
    integranteId: string,
    plantoesExistentes: NovoPlantao[]
  ): NovoPlantao | undefined {
    const plantoesIntegrante = plantoesExistentes
      .filter((p) => p.integrante_id === integranteId)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return plantoesIntegrante[0];
  }

  private contarTurnosConsecutivos(
    integranteId: string,
    data: string,
    plantoesExistentes: NovoPlantao[]
  ): number {
    let consecutivos = 0;
    const dataAtual = new Date(data);

    // Contar dias consecutivos anteriores
    let dataVerificacao = new Date(dataAtual);
    dataVerificacao.setDate(dataAtual.getDate() - 1);

    while (true) {
      const dataStr = dataVerificacao.toISOString().split("T")[0];
      const temPlantao = plantoesExistentes.some(
        (p) => p.integrante_id === integranteId && p.data === dataStr
      );

      if (temPlantao) {
        consecutivos++;
        dataVerificacao.setDate(dataVerificacao.getDate() - 1);
      } else {
        break;
      }
    }

    return consecutivos;
  }

  private analisarDistribuicao(
    distribuicaoHoras: { [integranteId: string]: number },
    sugestoes: string[]
  ): void {
    const participacoesMap = new Map(
      this.participacoes.map((p) => [p.integrante_id, p])
    );

    Object.entries(distribuicaoHoras).forEach(([integranteId, horas]) => {
      const participacao = participacoesMap.get(integranteId);
      if (!participacao) return;

      const nome = participacao.integrante?.nome || "Integrante";

      if (horas < participacao.horas_minimas_semana) {
        sugestoes.push(
          `${nome} está com ${horas}h (mínimo: ${participacao.horas_minimas_semana}h). Considere adicionar mais plantões.`
        );
      }

      if (horas > participacao.horas_maximas_semana * 0.9) {
        sugestoes.push(
          `${nome} está próximo do limite máximo (${horas}h de ${participacao.horas_maximas_semana}h).`
        );
      }
    });

    // Analisar equilibrio geral
    const horasValues = Object.values(distribuicaoHoras);
    if (horasValues.length > 1) {
      const media = horasValues.reduce((a, b) => a + b, 0) / horasValues.length;
      const desvioPadrao = Math.sqrt(
        horasValues.reduce((sq, h) => sq + Math.pow(h - media, 2), 0) /
          horasValues.length
      );

      if (desvioPadrao > media * 0.3) {
        sugestoes.push(
          "A distribuição de horas está desequilibrada. Considere ajustar manualmente alguns plantões."
        );
      }
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  }
}

// Função auxiliar para usar o gerador
export async function gerarPlantoesAutomaticos(
  escala: EscalaPlantao,
  participacoes: EscalaPlantaoParticipacao[],
  tiposTurnos: TipoTurno[],
  opcoes: OpcoeGeracaoPlantoes = {
    distribuicao_equilibrada: true,
    respeitar_preferencias_turno: true,
    evitar_turnos_consecutivos: true,
    intervalo_minimo_horas: 8,
    priorizar_disponibilidade_fins_semana: true,
  }
): Promise<ResultadoGeracao> {
  const gerador = new GeradorPlantoes(
    escala,
    participacoes,
    tiposTurnos,
    opcoes
  );
  return await gerador.gerar();
}

// Função para encontrar substitutos automaticamente
export function encontrarSubstitutos(
  plantaoOriginal: PlantaoProgramado,
  participacoes: EscalaPlantaoParticipacao[],
  plantoesExistentes: PlantaoProgramado[],
  tiposTurnos: TipoTurno[]
): EscalaPlantaoParticipacao[] {
  const turno = tiposTurnos.find((t) => t.id === plantaoOriginal.tipo_turno_id);
  if (!turno) return [];

  return participacoes
    .filter((part) => {
      // Não pode ser o próprio integrante
      if (part.integrante_id === plantaoOriginal.integrante_id) return false;

      // Deve estar disponível para este turno
      if (!part.tipos_turnos_disponiveis.includes(turno.id)) return false;

      // Verificar disponibilidade em fins de semana
      const dayOfWeek = new Date(plantaoOriginal.data).getDay();
      if ((dayOfWeek === 0 || dayOfWeek === 6) && !part.disponivel_fins_semana)
        return false;

      // Não deve ter conflito na mesma data
      const temConflito = plantoesExistentes.some(
        (p) =>
          p.data === plantaoOriginal.data &&
          p.integrante_id === part.integrante_id &&
          p.id !== plantaoOriginal.id
      );
      if (temConflito) return false;

      return true;
    })
    .sort((a, b) => b.prioridade - a.prioridade); // Ordenar por prioridade
}
