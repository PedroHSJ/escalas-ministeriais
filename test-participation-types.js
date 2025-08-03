// Script para testar a nova lógica de tipos de participação

// Simular dados de teste
const scaleMembers = [
  {
    id: 1,
    nome: "João",
    especializacaoNome: "Cozinheiro",
    tipoParticipacao: "preta", // Só participa da escala preta (dias de semana)
    apenasContabilizaFolgas: false,
  },
  {
    id: 2,
    nome: "Maria",
    especializacaoNome: "Cozinheiro",
    tipoParticipacao: "vermelha", // Só participa da escala vermelha (finais de semana)
    apenasContabilizaFolgas: false,
  },
  {
    id: 3,
    nome: "Pedro",
    especializacaoNome: "Cozinheiro",
    tipoParticipacao: "ambas", // Participa de ambas as escalas
    apenasContabilizaFolgas: false,
  },
];

// Simular dias da semana e fim de semana
const testDates = [
  {
    date: "2024-12-02",
    dayOfWeek: 1,
    isWeekend: false,
    description: "Segunda-feira (Escala Preta)",
  },
  {
    date: "2024-12-03",
    dayOfWeek: 2,
    isWeekend: false,
    description: "Terça-feira (Escala Preta)",
  },
  {
    date: "2024-12-07",
    dayOfWeek: 6,
    isWeekend: true,
    description: "Sábado (Escala Vermelha)",
  },
  {
    date: "2024-12-08",
    dayOfWeek: 0,
    isWeekend: true,
    description: "Domingo (Escala Vermelha)",
  },
];

console.log("=== TESTE DA LÓGICA DE TIPOS DE PARTICIPAÇÃO ===\n");

function testParticipationLogic() {
  console.log("Membros configurados:");
  scaleMembers.forEach((member) => {
    console.log(
      `- ${member.nome}: ${member.tipoParticipacao} (${member.especializacaoNome})`
    );
  });

  console.log("\n=== RESULTADOS POR DATA ===\n");

  testDates.forEach((testDate) => {
    console.log(`📅 ${testDate.description} (${testDate.date})`);

    const isEscalaVermelha = testDate.isWeekend;
    const isEscalaPreta = !isEscalaVermelha;

    console.log(`   Tipo de escala: ${isEscalaPreta ? "PRETA" : "VERMELHA"}`);

    scaleMembers.forEach((member) => {
      // Verificar se o membro pode trabalhar nesta escala
      const canWork =
        member.tipoParticipacao === "ambas" ||
        (isEscalaPreta && member.tipoParticipacao === "preta") ||
        (isEscalaVermelha && member.tipoParticipacao === "vermelha");

      // Verificar se deve ficar de folga por tipo de participação
      const shouldBeOnLeaveByParticipationType =
        (isEscalaPreta && member.tipoParticipacao === "vermelha") ||
        (isEscalaVermelha && member.tipoParticipacao === "preta");

      let status = "";
      if (canWork) {
        status = "✅ DISPONÍVEL PARA TRABALHAR";
      } else if (shouldBeOnLeaveByParticipationType) {
        status = "🔴 FOLGA (Não participa desta escala)";
      } else {
        status = "❓ INDEFINIDO";
      }

      console.log(`   ${member.nome}: ${status}`);
    });

    console.log("");
  });
}

function testScheduleGeneration() {
  console.log("=== SIMULAÇÃO DE GERAÇÃO DE ESCALA ===\n");

  testDates.forEach((testDate) => {
    console.log(`📅 ${testDate.description}`);

    const isEscalaVermelha = testDate.isWeekend;
    const isEscalaPreta = !isEscalaVermelha;

    // Separar membros por disponibilidade
    const availableMembers = scaleMembers.filter((member) => {
      if (isEscalaPreta && member.tipoParticipacao === "vermelha") return false;
      if (isEscalaVermelha && member.tipoParticipacao === "preta") return false;
      return !member.apenasContabilizaFolgas;
    });

    const membersOnLeaveByParticipation = scaleMembers.filter((member) => {
      if (isEscalaPreta && member.tipoParticipacao === "vermelha") return true;
      if (isEscalaVermelha && member.tipoParticipacao === "preta") return true;
      return false;
    });

    console.log(
      `   Disponíveis para trabalhar: ${
        availableMembers.map((m) => m.nome).join(", ") || "Nenhum"
      }`
    );
    console.log(
      `   De folga por tipo de participação: ${
        membersOnLeaveByParticipation.map((m) => m.nome).join(", ") || "Nenhum"
      }`
    );

    // Simular lógica de escalação (1 trabalha, resto folga)
    if (availableMembers.length > 0) {
      const working = [availableMembers[0]]; // Simplificado: primeiro disponível trabalha
      const onLeaveByRotation = availableMembers.slice(1);
      const allOnLeave = [
        ...onLeaveByRotation,
        ...membersOnLeaveByParticipation,
      ];

      console.log(
        `   🔧 TRABALHANDO: ${working.map((m) => m.nome).join(", ")}`
      );
      console.log(
        `   😴 DE FOLGA: ${allOnLeave.map((m) => m.nome).join(", ")}`
      );
    } else {
      console.log(`   ⚠️  NENHUM MEMBRO DISPONÍVEL PARA TRABALHAR!`);
      console.log(
        `   😴 TODOS DE FOLGA: ${membersOnLeaveByParticipation
          .map((m) => m.nome)
          .join(", ")}`
      );
    }

    console.log("");
  });
}

// Executar testes
testParticipationLogic();
testScheduleGeneration();

console.log("=== VALIDAÇÃO FINAL ===");
console.log("✅ João (só preta): Trabalha segunda/terça, folga sábado/domingo");
console.log(
  "✅ Maria (só vermelha): Folga segunda/terça, trabalha sábado/domingo"
);
console.log("✅ Pedro (ambas): Pode trabalhar em qualquer dia");
console.log("\n🎯 A lógica está correta se:");
console.log("   - João nunca aparece trabalhando no fim de semana");
console.log("   - Maria nunca aparece trabalhando em dias de semana");
console.log("   - Pedro pode trabalhar em qualquer dia");
console.log('   - Quando não podem trabalhar, aparecem como "de folga"');
