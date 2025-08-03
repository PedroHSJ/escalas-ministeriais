// Script para testar diferenças nos dados entre criação e view

// Simular dados como na criação (generatedSchedule)
const generatedScheduleExample = [
  {
    date: new Date("2024-12-01"),
    working: [
      { id: 1, nome: "João" },
      { id: 2, nome: "Maria" },
    ],
    onLeave: [{ id: 3, nome: "Pedro" }],
  },
  {
    date: new Date("2024-12-02"),
    working: [
      { id: 3, nome: "Pedro" },
      { id: 1, nome: "João" },
    ],
    onLeave: [{ id: 2, nome: "Maria" }],
  },
  {
    date: new Date("2024-12-03"),
    working: [
      { id: 2, nome: "Maria" },
      { id: 3, nome: "Pedro" },
    ],
    onLeave: [{ id: 1, nome: "João" }],
  },
];

const scaleMembers = [
  { id: 1, nome: "João" },
  { id: 2, nome: "Maria" },
  { id: 3, nome: "Pedro" },
];

// Simular dados como no banco (assignments após save)
const assignmentsExample = [];
generatedScheduleExample.forEach((day) => {
  const dateStr = day.date.toISOString().split("T")[0];

  day.working.forEach((member) => {
    assignmentsExample.push({
      data: dateStr,
      integrante: { nome: member.nome },
      tipo_atribuicao: "trabalho",
    });
  });

  day.onLeave.forEach((member) => {
    assignmentsExample.push({
      data: dateStr,
      integrante: { nome: member.nome },
      tipo_atribuicao: "folga",
    });
  });
});

console.log("=== DADOS SIMULADOS ===");
console.log(
  "Generated Schedule:",
  JSON.stringify(generatedScheduleExample, null, 2)
);
console.log(
  "Assignments (como no banco):",
  JSON.stringify(assignmentsExample, null, 2)
);

// Função da tela de criação
function getCalendarDataFromGenerated() {
  const dates = generatedScheduleExample
    .map((day) => {
      const year = day.date.getFullYear();
      const month = String(day.date.getMonth() + 1).padStart(2, "0");
      const dayNum = String(day.date.getDate()).padStart(2, "0");
      return `${year}-${month}-${dayNum}`;
    })
    .sort();

  const calendarMatrix = {};

  scaleMembers.forEach((member) => {
    calendarMatrix[member.nome] = {};
    let consecutiveDaysOff = 0;

    dates.forEach((dateStr) => {
      const day = generatedScheduleExample.find((d) => {
        const year = d.date.getFullYear();
        const month = String(d.date.getMonth() + 1).padStart(2, "0");
        const dayNum = String(d.date.getDate()).padStart(2, "0");
        const generatedDateStr = `${year}-${month}-${dayNum}`;
        return generatedDateStr === dateStr;
      });

      if (!day) return;

      const isWorking = day.working.some((w) => w.id === member.id);
      const isOnLeave = day.onLeave.some((l) => l.id === member.id);

      if (isWorking) {
        consecutiveDaysOff = 0;
        calendarMatrix[member.nome][dateStr] = {
          codigo: 0,
          tipo: "trabalho",
        };
      } else if (isOnLeave) {
        consecutiveDaysOff++;
        calendarMatrix[member.nome][dateStr] = {
          codigo: consecutiveDaysOff,
          tipo: "folga",
        };
      }
    });
  });

  return { dates, matrix: calendarMatrix };
}

// Função da tela de view (problemática)
function getCalendarDataFromView() {
  const dates = Array.from(
    new Set(assignmentsExample.map((a) => a.data))
  ).sort();
  const calendarMatrix = {};

  scaleMembers.forEach((member) => {
    calendarMatrix[member.nome] = {};

    const memberWorkDays = new Set();
    assignmentsExample.forEach((assignment) => {
      if (
        assignment.integrante?.nome === member.nome &&
        assignment.tipo_atribuicao === "trabalho"
      ) {
        memberWorkDays.add(assignment.data);
      }
    });

    let consecutiveDaysOff = 0;
    dates.forEach((date) => {
      const isWorkDay = memberWorkDays.has(date);

      if (isWorkDay) {
        consecutiveDaysOff = 0;
        calendarMatrix[member.nome][date] = {
          codigo: 0,
          tipo: "trabalho",
        };
      } else {
        consecutiveDaysOff++;
        calendarMatrix[member.nome][date] = {
          codigo: consecutiveDaysOff,
          tipo: "folga",
        };
      }
    });
  });

  return { dates, matrix: calendarMatrix };
}

// Função corrigida para a tela de view
function getCalendarDataFromViewFixed() {
  const dates = Array.from(
    new Set(assignmentsExample.map((a) => a.data))
  ).sort();
  const calendarMatrix = {};

  scaleMembers.forEach((member) => {
    calendarMatrix[member.nome] = {};
    let consecutiveDaysOff = 0;

    dates.forEach((date) => {
      const workAssignment = assignmentsExample.find(
        (a) =>
          a.data === date &&
          a.integrante?.nome === member.nome &&
          a.tipo_atribuicao === "trabalho"
      );

      const leaveAssignment = assignmentsExample.find(
        (a) =>
          a.data === date &&
          a.integrante?.nome === member.nome &&
          a.tipo_atribuicao === "folga"
      );

      if (workAssignment) {
        consecutiveDaysOff = 0;
        calendarMatrix[member.nome][date] = {
          codigo: 0,
          tipo: "trabalho",
        };
      } else if (leaveAssignment) {
        consecutiveDaysOff++;
        calendarMatrix[member.nome][date] = {
          codigo: consecutiveDaysOff,
          tipo: "folga",
        };
      }
      // Se não há nem trabalho nem folga, não adiciona entrada (membro não participa deste dia)
    });
  });

  return { dates, matrix: calendarMatrix };
}

console.log("\n=== COMPARAÇÃO DE RESULTADOS ===");

const createResult = getCalendarDataFromGenerated();
console.log("CRIAÇÃO (correto):", JSON.stringify(createResult.matrix, null, 2));

const viewResult = getCalendarDataFromView();
console.log("VIEW (problemático):", JSON.stringify(viewResult.matrix, null, 2));

const viewFixedResult = getCalendarDataFromViewFixed();
console.log("VIEW CORRIGIDO:", JSON.stringify(viewFixedResult.matrix, null, 2));

console.log("\n=== ANÁLISE ===");
console.log("Diferenças encontradas:");
scaleMembers.forEach((member) => {
  console.log(`\n${member.nome}:`);
  createResult.dates.forEach((date) => {
    const create = createResult.matrix[member.nome][date];
    const view = viewResult.matrix[member.nome][date];
    const viewFixed = viewFixedResult.matrix[member.nome][date];

    if (!create && !view && !viewFixed) return;

    console.log(
      `  ${date}: create=${create?.codigo} view=${view?.codigo} fixed=${viewFixed?.codigo}`
    );

    if (create?.codigo !== view?.codigo) {
      console.log(
        `    ⚠️  DIFERENÇA: create=${create?.codigo} vs view=${view?.codigo}`
      );
    }

    if (create?.codigo === viewFixed?.codigo) {
      console.log(`    ✅ CORRIGIDO`);
    }
  });
});
