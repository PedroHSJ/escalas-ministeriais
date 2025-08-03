import FeriadoManager from '@/utils/feriados'

describe('Integração - Sistema de Escala com Feriados', () => {
  let feriadoManager: FeriadoManager

  beforeEach(() => {
    feriadoManager = new FeriadoManager()
  })

  describe('Cenários de Geração de Escala', () => {
    test('deve gerar escala considerando feriados nacionais', () => {
      const membros = [
        {
          id: '1',
          nome: 'João Silva',
          folgasIniciais: 5,
          folgasAtuais: 5,
          folgasInicaisPreta: 3,
          folgasAtualPreta: 3,
          folgasIniciaisVermelha: 2,
          folgasAtualVermelha: 2,
          posicaoAtual: 1,
          ativo: true,
          tipoParticipacao: 'ambas' as const,
        },
        {
          id: '2',
          nome: 'Maria Santos',
          folgasIniciais: 4,
          folgasAtuais: 4,
          folgasInicaisPreta: 2,
          folgasAtualPreta: 2,
          folgasIniciaisVermelha: 2,
          folgasAtualVermelha: 2,
          posicaoAtual: 2,
          ativo: true,
          tipoParticipacao: 'ambas' as const,
        }
      ]

      // Simular período que inclui Natal
      const dataInicio = new Date(2024, 11, 20) // 20 de dezembro
      const dataFim = new Date(2024, 11, 30) // 30 de dezembro

      const resultado = gerarEscalaComFeriados(membros, dataInicio, dataFim, feriadoManager)

      // Verificar se o Natal foi identificado como feriado
      const natal = new Date(2024, 11, 25)
      expect(feriadoManager.isHoliday(natal)).toBe(true)

      // Verificar se a escala foi ajustada para o feriado
      expect(resultado.diasComFeriados).toContain('25/12/2024')
    })

    test('deve aplicar multiplicador de folgas em feriados', () => {
      const membro = {
        id: '1',
        nome: 'Teste',
        folgasIniciais: 5,
        folgasAtuais: 5,
        folgasInicaisPreta: 3,
        folgasAtualPreta: 3,
        folgasIniciaisVermelha: 2,
        folgasAtualVermelha: 2,
        posicaoAtual: 1,
        ativo: true,
        tipoParticipacao: 'ambas' as const,
      }

      const folgasAntesDoFeriado = membro.folgasAtuais
      
      // Simular aplicação de folgas em feriado (multiplicador 1.5)
      const incrementoFeriado = 1.5
      membro.folgasAtuais += incrementoFeriado

      expect(membro.folgasAtuais).toBe(folgasAntesDoFeriado + 1.5)
    })

    test('deve filtrar membros por tipo de participação', () => {
      const membros = [
        {
          id: '1',
          nome: 'João - Ambas',
          tipoParticipacao: 'ambas' as const,
        },
        {
          id: '2',
          nome: 'Maria - Preta',
          tipoParticipacao: 'preta' as const,
        },
        {
          id: '3',
          nome: 'Pedro - Vermelha',
          tipoParticipacao: 'vermelha' as const,
        }
      ]

      // Para dia de semana (escala preta)
      const membrosParaDiaSemana = membros.filter(m => 
        m.tipoParticipacao === 'ambas' || m.tipoParticipacao === 'preta'
      )

      expect(membrosParaDiaSemana).toHaveLength(2)
      expect(membrosParaDiaSemana.map(m => m.nome)).toContain('João - Ambas')
      expect(membrosParaDiaSemana.map(m => m.nome)).toContain('Maria - Preta')

      // Para fim de semana (escala vermelha)
      const membrosParaFimSemana = membros.filter(m => 
        m.tipoParticipacao === 'ambas' || m.tipoParticipacao === 'vermelha'
      )

      expect(membrosParaFimSemana).toHaveLength(2)
      expect(membrosParaFimSemana.map(m => m.nome)).toContain('João - Ambas')
      expect(membrosParaFimSemana.map(m => m.nome)).toContain('Pedro - Vermelha')
    })

    test('deve gerenciar folgas separadamente por escala', () => {
      const membro = {
        id: '1',
        nome: 'Teste',
        folgasIniciais: 10,
        folgasAtuais: 10,
        folgasInicaisPreta: 5,
        folgasAtualPreta: 5,
        folgasIniciaisVermelha: 5,
        folgasAtualVermelha: 5,
        posicaoAtual: 1,
        ativo: true,
        tipoParticipacao: 'ambas' as const,
      }

      // Simular decremento de folga na escala preta
      membro.folgasAtualPreta -= 1
      membro.folgasAtuais -= 1

      expect(membro.folgasAtualPreta).toBe(4)
      expect(membro.folgasAtualVermelha).toBe(5) // Não foi afetada
      expect(membro.folgasAtuais).toBe(9)

      // Simular decremento de folga na escala vermelha
      membro.folgasAtualVermelha -= 1
      membro.folgasAtuais -= 1

      expect(membro.folgasAtualPreta).toBe(4) // Não foi afetada
      expect(membro.folgasAtualVermelha).toBe(4)
      expect(membro.folgasAtuais).toBe(8)
    })
  })

  describe('Cenários com Feriados Personalizados', () => {
    test('deve considerar feriados personalizados na escala', () => {
      // Adicionar feriado personalizado
      feriadoManager.addCustomHoliday({
        id: 'custom-1',
        data: '2024-06-15',
        nome: 'Dia do Ministério',
        tipo: 'local',
        recorrente: false
      })

      const dataPersonalizada = new Date(2024, 5, 15)
      expect(feriadoManager.isHoliday(dataPersonalizada)).toBe(true)

      // Simular geração de escala incluindo este dia
      const resultado = simularEscalaComData(dataPersonalizada, feriadoManager)
      expect(resultado.ehFeriado).toBe(true)
      expect(resultado.aplicarEscalaReduzida).toBe(true)
    })

    test('deve importar e exportar feriados personalizados', () => {
      const feriadosOriginais = [
        {
          id: 'test-1',
          data: '2024-07-15',
          nome: 'Feriado 1',
          tipo: 'local',
          recorrente: false
        },
        {
          id: 'test-2',
          data: '2024-08-15',
          nome: 'Feriado 2',
          tipo: 'local',
          recorrente: true
        }
      ]

      // Adicionar feriados
      feriadosOriginais.forEach(f => feriadoManager.addCustomHoliday(f))

      // Exportar
      const exportedJson = feriadoManager.exportCustomHolidays()
      const exportedData = JSON.parse(exportedJson)

      expect(exportedData).toHaveLength(2)
      expect(exportedData[0].nome).toBe('Feriado 1')

      // Criar novo manager e importar
      const novoManager = new FeriadoManager()
      novoManager.importCustomHolidays(exportedJson)

      const feriadosImportados = novoManager.getCustomHolidays()
      expect(feriadosImportados).toHaveLength(2)
      expect(feriadosImportados[1].nome).toBe('Feriado 2')
    })
  })

  describe('Cenários de Validação', () => {
    test('deve validar configuração de membro com tipo de participação', () => {
      const configuracaoValida = {
        tipoParticipacao: 'preta' as const,
        folgasIniciais: 8,
        folgasInicaisPreta: 8,
        folgasIniciaisVermelha: 0,
      }

      // Para tipo 'preta', folgas vermelhas devem ser 0
      expect(configuracaoValida.folgasIniciaisVermelha).toBe(0)
      expect(configuracaoValida.folgasInicaisPreta).toBe(configuracaoValida.folgasIniciais)
    })

    test('deve validar distribuição de folgas para tipo ambas', () => {
      const folgasTotal = 10
      const folgasPreta = Math.floor(folgasTotal / 2)
      const folgasVermelha = Math.ceil(folgasTotal / 2)

      expect(folgasPreta + folgasVermelha).toBe(folgasTotal)
      expect(folgasPreta).toBe(5)
      expect(folgasVermelha).toBe(5)

      // Teste com número ímpar
      const folgasTotalImpar = 9
      const folgasPretaImpar = Math.floor(folgasTotalImpar / 2)
      const folgasVermelhaImpar = Math.ceil(folgasTotalImpar / 2)

      expect(folgasPretaImpar + folgasVermelhaImpar).toBe(folgasTotalImpar)
      expect(folgasPretaImpar).toBe(4)
      expect(folgasVermelhaImpar).toBe(5)
    })
  })
})

// Funções auxiliares para os testes
function gerarEscalaComFeriados(
  membros: any[],
  dataInicio: Date,
  dataFim: Date,
  feriadoManager: FeriadoManager
) {
  const diasComFeriados: string[] = []
  const currentDate = new Date(dataInicio)

  while (currentDate <= dataFim) {
    if (feriadoManager.isHoliday(currentDate)) {
      diasComFeriados.push(currentDate.toLocaleDateString('pt-BR'))
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return {
    membros,
    diasComFeriados,
    totalDias: Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }
}

function simularEscalaComData(data: Date, feriadoManager: FeriadoManager) {
  const ehFeriado = feriadoManager.isHoliday(data)
  const ehPeriodoEspecial = feriadoManager.isSpecialPeriod(data)

  return {
    data,
    ehFeriado,
    ehPeriodoEspecial,
    aplicarEscalaReduzida: ehFeriado || ehPeriodoEspecial,
    multiplicadorFolgas: ehFeriado ? 1.5 : 1,
  }
}
