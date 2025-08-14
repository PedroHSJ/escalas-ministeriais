"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import FeriadoManager from "@/utils/feriados";
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
        textColor?: string;
      }
    >
  >;
  members: (string | undefined)[];
  escalaVermelhaMap?: Record<string, boolean>; // Mapa de datas para escala vermelha
}

interface CalendarTableProps {
  calendarData: CalendarData;
  getMemberSpecializationColor?: (memberName: string) => string;
  getSpecializationColor?: (index: number) => string;
  showLegend?: boolean;
  feriadoManager?: FeriadoManager;
}

export default function CalendarTable({
  calendarData,
  getMemberSpecializationColor = () => "#f3f4f6",
  getSpecializationColor,
  feriadoManager,
  showLegend = true,
}: CalendarTableProps) {
  const { userId } = useAuth();
  const { selectedOrganization } = useOrganization();
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
  console.log(calendarData);
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

  // Verifica se há mais de um mês nas datas
  const uniqueMonths = Array.from(
    new Set(
      calendarData.dates.map((date) => {
        const d = new Date(date + "T12:00:00");
        return d.getMonth() + '-' + d.getFullYear();
      })
    )
  );
  const showMonth = uniqueMonths.length > 1;

  return (
    <div className="space-y-4 max-w-full">
      {/* Legenda das Especializações */}
      {showLegend && calendarData.specializations.length > 0 && (
        <div className="bg-secondary p-3 rounded-lg">
          <h4 className="font-medium mb-2 text-sm">Legenda:</h4>

          {/* Legenda da Escala Preta e Vermelha */}
          <div className="mb-3">
            <div className="text-xs text-primary mb-1">
              <strong>Escala Preta e Vermelha:</strong>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-4 h-4 rounded border bg-black flex-shrink-0"></div>
                <span className="text-xs whitespace-nowrap">
                  Dias de semana (Preta)
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-4 h-4 rounded border bg-red-600 flex-shrink-0"></div>
                <span className="text-xs whitespace-nowrap">
                  Finais de semana e feriados (Vermelha)
                </span>
              </div>
            </div>
          </div>

          {/* Legenda dos Códigos */}
          <div className="mb-3">
            <div className="text-xs text-primary mb-1">
              <strong>Códigos:</strong>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-4 h-4 rounded border text-xs flex items-center justify-center font-bold bg-green-200 flex-shrink-0 text-black">
                  0
                </div>
                <span className="text-xs whitespace-nowrap">
                  Dia Trabalhado
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-4 h-4 rounded border text-xs flex items-center justify-center font-bold bg-red-200 text-black flex-shrink-0">
                  1+
                </div>
                <span className="text-xs whitespace-nowrap">
                  Folgas em Dias Úteis
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-4 h-4 rounded border text-xs flex items-center justify-center font-bold bg-red-200 text-red-700 flex-shrink-0">
                  1+
                </div>
                <span className="text-xs whitespace-nowrap">
                  Folgas em Finais de Semana e feriados
                </span>
              </div>
            </div>
          </div>

          {/* Legenda das Especializações */}
          {calendarData.specializations.length > 0 && (
            <div>
              <div className="text-xs text-primary mb-1">
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
      <div className="border rounded-lg overflow-x-auto max-w-full">
        <table className="w-full border-collapse border rounded-3xl">
          <thead>
            <tr>
              <th className="border border-gray-300 p-1.5 bg-secondary font-bold text-xs sticky left-0 z-20 min-w-[100px] max-w-[140px]">
                <div className="truncate">Nome</div>
              </th>
              {calendarData.dates.map((date) => {
                const isEscalaVermelha = calendarData.escalaVermelhaMap?.[date];
                const bgColor = isEscalaVermelha ? "bg-red-600" : "bg-black";
                const textColor = "text-white";
                const createSafeDate = (dateStr: string) => {
                  if (
                    dateStr.includes("T") ||
                    !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)
                  ) {
                    return new Date(dateStr);
                  }
                  return new Date(dateStr + "T12:00:00");
                };
                const safeDate = createSafeDate(date);
                return (
                  <th
                    key={date}
                    className={`border border-gray-300 p-1 ${bgColor} ${textColor} text-xs min-w-[30px] max-w-[35px]`}
                  >
                    <div className="font-bold text-xs">
                      {format(safeDate, "dd")}
                      {showMonth && (
                        <span
                          style={{
                            fontSize: 9,
                            display: "block",
                            lineHeight: 1,
                          }}
                        >
                          {format(safeDate, "MM")}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] leading-tight">
                      {format(safeDate, "EEE", {
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
                  <div className="truncate text-black" title={memberName}>
                    {memberName}
                  </div>
                </td>
                {calendarData.dates.map((date) => {
                  const cellData = calendarData.matrix[memberName!]?.[date];
                  const isEscalaVermelha =
                    calendarData.escalaVermelhaMap?.[date];
                  let textColor = cellData?.textColor;
                  if (cellData && cellData.codigo > 0) {
                    textColor = isEscalaVermelha ? "#fff" : "#000";
                  }
                  return (
                    <td
                      key={date}
                      className="border border-gray-300 p-0.5 text-center min-w-[30px] max-w-[35px]"
                      style={{
                        backgroundColor: cellData?.color || "#f3f4f6",
                      }}
                    >
                      <div
                        className={`w-4 h-4 rounded text-xs font-bold flex items-center justify-center mx-auto ${
                          cellData?.codigo == 0
                            ? "text-black"
                            : isEscalaVermelha
                            ? "text-red-700"
                            : "text-black"
                        }`}
                        // style={{
                        //   color: textColor || "inherit",
                        // }}
                      >
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
