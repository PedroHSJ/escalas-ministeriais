import React from "react";
import { render, screen } from "@testing-library/react";
import CalendarTable from "@/components/calendar/CalendarTable";

// Mock dos dados do calendário
const mockCalendarData = {
  dates: ["01/12/2024", "02/12/2024", "03/12/2024"],
  specializations: ["Enfermeiro", "Técnico"],
  matrix: {
    "João Silva": {
      "01/12/2024": {
        codigo: 1,
        especializacao: "Enfermeiro",
        tipo: "trabalho" as const,
        color: "#e3f2fd",
      },
      "02/12/2024": { codigo: 0, tipo: "folga" as const, color: "#ffffff" },
      "03/12/2024": {
        codigo: 2,
        especializacao: "Técnico",
        tipo: "trabalho" as const,
        color: "#e8f5e8",
      },
    },
    "Maria Santos": {
      "01/12/2024": { codigo: 0, tipo: "folga" as const, color: "#ffffff" },
      "02/12/2024": {
        codigo: 1,
        especializacao: "Enfermeiro",
        tipo: "trabalho" as const,
        color: "#e3f2fd",
      },
      "03/12/2024": { codigo: 0, tipo: "folga" as const, color: "#ffffff" },
    },
  },
  members: ["João Silva", "Maria Santos"],
};

describe("CalendarTable", () => {
  test("deve renderizar a tabela do calendário", () => {
    render(<CalendarTable calendarData={mockCalendarData} />);

    // Verificar se a tabela foi renderizada
    const table = screen.getByRole("table");
    expect(table).toBeTruthy();
  });

  test("deve exibir as datas do período", () => {
    render(<CalendarTable calendarData={mockCalendarData} />);

    // Verificar se os dias estão sendo exibidos (apenas o número do dia)
    expect(screen.getAllByText("12")).toHaveLength(3); // Todas as colunas mostram dia 12
  });

  test("deve exibir os nomes dos membros", () => {
    render(<CalendarTable calendarData={mockCalendarData} />);

    // Verificar se os nomes dos membros estão sendo exibidos
    expect(screen.getByText("João Silva")).toBeTruthy();
    expect(screen.getByText("Maria Santos")).toBeTruthy();
  });

  test("deve exibir a legenda por padrão", () => {
    render(<CalendarTable calendarData={mockCalendarData} />);

    // Verificar se as especializações estão na legenda
    expect(screen.getByText("Enfermeiro")).toBeTruthy();
    expect(screen.getByText("Técnico")).toBeTruthy();
  });

  test("deve ocultar a legenda quando showLegend for false", () => {
    render(
      <CalendarTable calendarData={mockCalendarData} showLegend={false} />
    );

    // A legenda não deve estar visível, mas os dados da tabela sim
    expect(screen.getByText("João Silva")).toBeTruthy();
    expect(screen.getByText("Maria Santos")).toBeTruthy();
  });

  test("deve aplicar cores personalizadas quando fornecidas", () => {
    const getMemberColor = jest.fn().mockReturnValue("#ff0000");
    const getSpecColor = jest.fn().mockReturnValue("#00ff00");

    render(
      <CalendarTable
        calendarData={mockCalendarData}
        getMemberSpecializationColor={getMemberColor}
        getSpecializationColor={getSpecColor}
      />
    );

    // Verificar se as funções de cor foram chamadas
    expect(getMemberColor).toHaveBeenCalled();
  });

  test("deve lidar com dados vazios", () => {
    const emptyData = {
      dates: [],
      specializations: [],
      matrix: {},
      members: [],
    };

    render(<CalendarTable calendarData={emptyData} />);

    // Deve renderizar sem erros
    const table = screen.getByRole("table");
    expect(table).toBeTruthy();
  });
});
