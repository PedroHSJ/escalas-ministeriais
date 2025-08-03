import {
  EscalaFolgaMember,
  TipoParticipacaoEscala,
} from "@/types/escala-folgas";

describe("Types - escala-folgas", () => {
  describe("TipoParticipacaoEscala", () => {
    test("deve aceitar valores válidos", () => {
      const tiposValidos: TipoParticipacaoEscala[] = [
        "ambas",
        "preta",
        "vermelha",
      ];

      tiposValidos.forEach((tipo) => {
        expect(["ambas", "preta", "vermelha"]).toContain(tipo);
      });
    });
  });

  describe("EscalaFolgaMember", () => {
    test("deve criar um membro válido com todos os campos obrigatórios", () => {
      const membro: EscalaFolgaMember = {
        id: "1",
        nome: "João Silva",
        folgasIniciais: 5,
        folgasAtuais: 5,
        folgasInicaisPreta: 3,
        folgasAtualPreta: 3,
        folgasIniciaisVermelha: 2,
        folgasAtualVermelha: 2,
        posicaoAtual: 1,
        ativo: true,
        tipoParticipacao: "ambas",
      };

      expect(membro.id).toBe("1");
      expect(membro.nome).toBe("João Silva");
      expect(membro.folgasIniciais).toBe(5);
      expect(membro.folgasAtuais).toBe(5);
      expect(membro.tipoParticipacao).toBe("ambas");
    });

    test("deve aceitar campos opcionais", () => {
      const membroComOpcionais: EscalaFolgaMember = {
        id: "2",
        nome: "Maria Santos",
        folgasIniciais: 4,
        folgasAtuais: 3,
        folgasInicaisPreta: 2,
        folgasAtualPreta: 2,
        folgasIniciaisVermelha: 2,
        folgasAtualVermelha: 1,
        posicaoAtual: 2,
        ativo: true,
        tipoParticipacao: "preta",
        especializacaoId: "esp-1",
        especializacaoNome: "Especialização Teste",
        apenasContabilizaFolgas: false,
        importadoDeEscala: "escala-123",
      };

      expect(membroComOpcionais.especializacaoId).toBe("esp-1");
      expect(membroComOpcionais.especializacaoNome).toBe(
        "Especialização Teste"
      );
      expect(membroComOpcionais.apenasContabilizaFolgas).toBe(false);
      expect(membroComOpcionais.importadoDeEscala).toBe("escala-123");
    });

    test("deve permitir diferentes tipos de participação", () => {
      const membroAmbas: EscalaFolgaMember = {
        id: "1",
        nome: "João",
        folgasIniciais: 6,
        folgasAtuais: 6,
        folgasInicaisPreta: 3,
        folgasAtualPreta: 3,
        folgasIniciaisVermelha: 3,
        folgasAtualVermelha: 3,
        posicaoAtual: 1,
        ativo: true,
        tipoParticipacao: "ambas",
      };

      const membroPreta: EscalaFolgaMember = {
        id: "2",
        nome: "Maria",
        folgasIniciais: 5,
        folgasAtuais: 5,
        folgasInicaisPreta: 5,
        folgasAtualPreta: 5,
        folgasIniciaisVermelha: 0,
        folgasAtualVermelha: 0,
        posicaoAtual: 2,
        ativo: true,
        tipoParticipacao: "preta",
      };

      const membroVermelha: EscalaFolgaMember = {
        id: "3",
        nome: "Pedro",
        folgasIniciais: 4,
        folgasAtuais: 4,
        folgasInicaisPreta: 0,
        folgasAtualPreta: 0,
        folgasIniciaisVermelha: 4,
        folgasAtualVermelha: 4,
        posicaoAtual: 3,
        ativo: true,
        tipoParticipacao: "vermelha",
      };

      expect(membroAmbas.tipoParticipacao).toBe("ambas");
      expect(membroPreta.tipoParticipacao).toBe("preta");
      expect(membroVermelha.tipoParticipacao).toBe("vermelha");
    });

    test("deve permitir membros inativos", () => {
      const membroInativo: EscalaFolgaMember = {
        id: "4",
        nome: "Ana",
        folgasIniciais: 0,
        folgasAtuais: 0,
        folgasInicaisPreta: 0,
        folgasAtualPreta: 0,
        folgasIniciaisVermelha: 0,
        folgasAtualVermelha: 0,
        posicaoAtual: 4,
        ativo: false,
        tipoParticipacao: "ambas",
      };

      expect(membroInativo.ativo).toBe(false);
    });

    test("deve permitir membros que apenas contabilizam folgas", () => {
      const membroApenasContabiliza: EscalaFolgaMember = {
        id: "5",
        nome: "Carlos",
        folgasIniciais: 10,
        folgasAtuais: 8,
        folgasInicaisPreta: 5,
        folgasAtualPreta: 4,
        folgasIniciaisVermelha: 5,
        folgasAtualVermelha: 4,
        posicaoAtual: 5,
        ativo: true,
        tipoParticipacao: "ambas",
        apenasContabilizaFolgas: true,
      };

      expect(membroApenasContabiliza.apenasContabilizaFolgas).toBe(true);
    });

    test("deve validar consistência de folgas por escala", () => {
      const membro: EscalaFolgaMember = {
        id: "6",
        nome: "Teste",
        folgasIniciais: 10,
        folgasAtuais: 8,
        folgasInicaisPreta: 5,
        folgasAtualPreta: 4,
        folgasIniciaisVermelha: 5,
        folgasAtualVermelha: 4,
        posicaoAtual: 1,
        ativo: true,
        tipoParticipacao: "ambas",
      };

      // Verifica se as folgas específicas somam as folgas totais
      expect(membro.folgasInicaisPreta + membro.folgasIniciaisVermelha).toBe(
        membro.folgasIniciais
      );
      expect(membro.folgasAtualPreta + membro.folgasAtualVermelha).toBe(
        membro.folgasAtuais
      );
    });
  });

  describe("Validações de Negócio", () => {
    test("deve validar membro que participa apenas da escala preta", () => {
      const membroPreta: EscalaFolgaMember = {
        id: "7",
        nome: "Membro Preta",
        folgasIniciais: 8,
        folgasAtuais: 6,
        folgasInicaisPreta: 8,
        folgasAtualPreta: 6,
        folgasIniciaisVermelha: 0,
        folgasAtualVermelha: 0,
        posicaoAtual: 1,
        ativo: true,
        tipoParticipacao: "preta",
      };

      // Para membro que participa apenas da escala preta
      expect(membroPreta.folgasIniciaisVermelha).toBe(0);
      expect(membroPreta.folgasAtualVermelha).toBe(0);
      expect(membroPreta.folgasInicaisPreta).toBeGreaterThan(0);
    });

    test("deve validar membro que participa apenas da escala vermelha", () => {
      const membroVermelha: EscalaFolgaMember = {
        id: "8",
        nome: "Membro Vermelha",
        folgasIniciais: 6,
        folgasAtuais: 4,
        folgasInicaisPreta: 0,
        folgasAtualPreta: 0,
        folgasIniciaisVermelha: 6,
        folgasAtualVermelha: 4,
        posicaoAtual: 1,
        ativo: true,
        tipoParticipacao: "vermelha",
      };

      // Para membro que participa apenas da escala vermelha
      expect(membroVermelha.folgasInicaisPreta).toBe(0);
      expect(membroVermelha.folgasAtualPreta).toBe(0);
      expect(membroVermelha.folgasIniciaisVermelha).toBeGreaterThan(0);
    });

    test("deve validar membro que participa de ambas as escalas", () => {
      const membroAmbas: EscalaFolgaMember = {
        id: "9",
        nome: "Membro Ambas",
        folgasIniciais: 10,
        folgasAtuais: 8,
        folgasInicaisPreta: 5,
        folgasAtualPreta: 4,
        folgasIniciaisVermelha: 5,
        folgasAtualVermelha: 4,
        posicaoAtual: 1,
        ativo: true,
        tipoParticipacao: "ambas",
      };

      // Para membro que participa de ambas as escalas
      expect(membroAmbas.folgasInicaisPreta).toBeGreaterThan(0);
      expect(membroAmbas.folgasIniciaisVermelha).toBeGreaterThan(0);
      expect(
        membroAmbas.folgasInicaisPreta + membroAmbas.folgasIniciaisVermelha
      ).toBe(membroAmbas.folgasIniciais);
    });
  });
});
