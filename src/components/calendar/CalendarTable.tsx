"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalendarData {
  dates: string[];
  specializations: string[];
  matrix: Record<
    string,
    Record<
      string,
      {
        codigo: number;
        especializacao?: string;
        tipo: "trabalho" | "folga";
        color: string;
      }
    >
  >;
  members: (string | undefined)[];
}

interface CalendarTableProps {
  calendarData: CalendarData;
  getMemberSpecializationColor?: (memberName: string) => string;
  getSpecializationColor?: (index: number) => string;
  showLegend?: boolean;
}

export default function CalendarTable({
  calendarData,
  getMemberSpecializationColor = () => "#f3f4f6",
  getSpecializationColor,
  showLegend = true,
}: CalendarTableProps) {
  // Função padrão para cores das especializações
  const defaultGetSpecializationColor = (index: number) => {
    const colors = [
      "#e3f2fd", // Azul claro
      "#e8f5e8", // Verde claro
      "#fff8e1", // Amarelo claro
      "#fce4ec", // Rosa claro
      "#f3e5f5", // Roxo claro
      "#fff3e0", // Laranja claro
    ];
    return colors[(index - 1) % colors.length] || "#e5e7eb";
  };

  const getSpecColor = getSpecializationColor || defaultGetSpecializationColor;

  if (!calendarData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhuma atribuição cadastrada</p>
        <p className="text-sm">
          Esta escala ainda não possui atribuições geradas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legenda das Especializações */}
      {showLegend && calendarData.specializations.length > 0 && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium mb-2 text-sm">Legenda:</h4>

          {/* Legenda da Escala Preta e Vermelha */}
          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-1">
              <strong>Escala Preta e Vermelha:</strong>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-4 h-4 rounded border bg-black flex-shrink-0"></div>
                <span className="text-xs whitespace-nowrap">
                  Dias de Semana (Preta)
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-4 h-4 rounded border bg-red-600 flex-shrink-0"></div>
                <span className="text-xs whitespace-nowrap">
                  Finais de Semana (Vermelha)
                </span>
              </div>
            </div>
          </div>

          {/* Legenda dos Códigos */}
          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-1">
              <strong>Códigos:</strong>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-4 h-4 rounded border text-xs flex items-center justify-center font-bold bg-green-200 flex-shrink-0">
                  0
                </div>
                <span className="text-xs whitespace-nowrap">
                  Dia Trabalhado
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-4 h-4 rounded border text-xs flex items-center justify-center font-bold bg-red-200 flex-shrink-0">
                  1+
                </div>
                <span className="text-xs whitespace-nowrap">
                  Dias de Folga (consecutivos)
                </span>
              </div>
            </div>
          </div>

          {/* Legenda das Especializações */}
          {calendarData.specializations.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-1">
                <strong>Especializações:</strong>
              </div>
              <div className="flex flex-wrap gap-2">
                {calendarData.specializations.map((spec, index) => (
                  <div
                    key={spec}
                    className="flex items-center gap-1.5 flex-shrink-0"
                  >
                    <div
                      className="w-4 h-4 rounded border text-xs flex items-center justify-center font-bold flex-shrink-0"
                      style={{
                        backgroundColor: getSpecColor(index + 1),
                      }}
                    ></div>
                    <span className="text-xs whitespace-nowrap">{spec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabela Calendário */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 min-w-max">
          <thead>
            <tr>
              <th className="border border-gray-300 p-1.5 bg-gray-100 font-bold text-xs sticky left-0 z-20 min-w-[100px] max-w-[140px]">
                <div className="truncate">Nome</div>
              </th>
              {calendarData.dates.map((date, index) => {
                // Escala Preta e Vermelha: PRETA = dias de semana, VERMELHA = finais de semana
                const dateObj = new Date(date);
                const dayOfWeek = dateObj.getDay(); // 0 = domingo, 6 = sábado
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Domingo ou Sábado
                const bgColor = isWeekend ? "bg-red-600" : "bg-black"; // Vermelho para finais de semana, Preto para dias úteis
                const textColor = "text-white";

                return (
                  <th
                    key={date}
                    className={`border border-gray-300 p-1 ${bgColor} ${textColor} text-xs min-w-[30px] max-w-[35px]`}
                  >
                    <div className="font-bold text-xs">
                      {format(new Date(date), "dd")}
                    </div>
                    <div className="text-[9px] leading-tight">
                      {format(new Date(date), "EEE", {
                        locale: ptBR,
                      })
                        .toUpperCase()
                        .substring(0, 3)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {calendarData.members.map((memberName) => (
              <tr key={memberName}>
                <td
                  className="border border-gray-300 p-1.5 font-medium sticky left-0 z-10 text-xs min-w-[100px] max-w-[140px]"
                  style={{
                    backgroundColor: getMemberSpecializationColor(memberName!),
                  }}
                >
                  <div className="truncate" title={memberName}>
                    {memberName}
                  </div>
                </td>
                {calendarData.dates.map((date) => {
                  const cellData = calendarData.matrix[memberName!]?.[date];
                  return (
                    <td
                      key={date}
                      className="border border-gray-300 p-0.5 text-center min-w-[30px] max-w-[35px]"
                      style={{
                        backgroundColor: cellData?.color || "#f3f4f6",
                      }}
                    >
                      <div className="w-4 h-4 rounded text-xs font-bold flex items-center justify-center mx-auto">
                        {cellData?.codigo || 0}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
