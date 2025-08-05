"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Calendar } from "lucide-react";

interface PlantaoShift {
  turnoNome: string;
  horaInicio: string;
  horaFim: string;
  integrante: {
    id: string;
    nome: string;
  };
  especialização: string;
}

interface PlantaoDay {
  date: Date;
  shifts?: PlantaoShift[];
}

interface PlantaoPreviewProps {
  schedule: PlantaoDay[];
  isNursingMode?: boolean;
  maxDaysToShow?: number;
  compact?: boolean; // Nova prop para modo compacto
}

export default function PlantaoPreview({
  schedule,
  isNursingMode = false,
  maxDaysToShow = 7,
  compact = false,
}: PlantaoPreviewProps) {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum plantão programado</p>
        <p className="text-sm">Gere a escala para visualizar os plantões</p>
      </div>
    );
  }

  const displaySchedule = schedule.slice(0, maxDaysToShow);
  const totalDays = schedule.length;
  const totalShifts = schedule.reduce((total, day) => total + (day.shifts?.length || 0), 0);

  // Contar turnos por tipo
  const shiftTypeCounts = schedule.reduce((counts, day) => {
    day.shifts?.forEach(shift => {
      counts[shift.turnoNome] = (counts[shift.turnoNome] || 0) + 1;
    });
    return counts;
  }, {} as Record<string, number>);

  // Obter cores para turnos
  const getShiftColor = (turnoNome: string) => {
    const colors = {
      'Manhã': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Manhã 12h': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Tarde': 'bg-orange-100 text-orange-800 border-orange-300', 
      'Noite': 'bg-blue-100 text-blue-800 border-blue-300',
      'Noite 12h': 'bg-blue-100 text-blue-800 border-blue-300',
      'Madrugada': 'bg-purple-100 text-purple-800 border-purple-300',
      'Plantão 24h': 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[turnoNome as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Modo compacto - apenas estatísticas essenciais
  if (compact) {
    return (
      <div className="space-y-3">
        {/* Resumo Ultra Compacto */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{totalDays}</div>
            <div className="text-xs text-blue-700">Dias</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{totalShifts}</div>
            <div className="text-xs text-blue-700">Turnos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {isNursingMode ? '12-24h' : '6h'}
            </div>
            <div className="text-xs text-blue-700">Duração</div>
          </div>
        </div>

        {/* Turnos Hoje/Próximos */}
        {displaySchedule.length > 0 && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <h6 className="text-xs font-medium mb-2 text-gray-600">
              Próximos Plantões:
            </h6>
            <div className="space-y-1">
              {displaySchedule.slice(0, 3).map((day, dayIndex) => (
                <div key={dayIndex} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    {format(day.date, "dd/MM", { locale: ptBR })}
                  </span>
                  <div className="flex gap-1">
                    {day.shifts?.slice(0, 2).map((shift, shiftIndex) => (
                      <Badge
                        key={shiftIndex}
                        variant="outline"
                        className={`${getShiftColor(shift.turnoNome)} text-xs px-1 py-0`}
                      >
                        {shift.turnoNome.substring(0, 1)}
                      </Badge>
                    ))}
                    {(day.shifts?.length || 0) > 2 && (
                      <span className="text-xs text-gray-500">+{(day.shifts?.length || 0) - 2}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicador de Modo */}
        {isNursingMode && (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            <span className="text-xs text-green-800">Enfermagem</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo Executivo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalDays}</div>
          <div className="text-xs text-blue-700">Dias</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalShifts}</div>
          <div className="text-xs text-blue-700">Plantões</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {Object.keys(shiftTypeCounts).length}
          </div>
          <div className="text-xs text-blue-700">Tipos Turno</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {isNursingMode ? '12-24h' : '6h'}
          </div>
          <div className="text-xs text-blue-700">Duração</div>
        </div>
      </div>

      {/* Distribuição de Turnos */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Distribuição de Turnos
        </h5>
        <div className="flex flex-wrap gap-2">
          {Object.entries(shiftTypeCounts).map(([turno, count]) => (
            <Badge
              key={turno}
              variant="outline"
              className={`${getShiftColor(turno)} text-xs`}
            >
              {turno}: {count}x
            </Badge>
          ))}
        </div>
      </div>

      {/* Preview dos Dias */}
      <div className="space-y-2">
        <h5 className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Próximos {maxDaysToShow} Dias
        </h5>
        
        <div className="max-h-80 overflow-y-auto space-y-2">
          {displaySchedule.map((day, dayIndex) => (
            <div
              key={dayIndex}
              className={`p-3 rounded-lg border ${
                dayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              {/* Cabeçalho do Dia */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">
                    {format(day.date, "EEEE, dd/MM", { locale: ptBR })}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {day.shifts?.length || 0} turno{(day.shifts?.length || 0) !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(day.date, "yyyy")}
                </div>
              </div>

              {/* Turnos do Dia */}
              {day.shifts && day.shifts.length > 0 ? (
                <div className="grid gap-2">
                  {day.shifts.map((shift, shiftIndex) => (
                    <div
                      key={shiftIndex}
                      className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 shadow-sm"
                    >
                      {/* Info do Turno */}
                      <div className="flex items-center gap-3 flex-1">
                        <Badge
                          variant="outline"
                          className={`${getShiftColor(shift.turnoNome)} text-xs font-medium`}
                        >
                          {shift.turnoNome}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {shift.horaInicio} - {shift.horaFim}
                        </div>
                      </div>

                      {/* Info do Integrante */}
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <div className="text-xs">
                          <div className="font-medium">{shift.integrante.nome}</div>
                          {shift.especialização && (
                            <div className="text-muted-foreground">
                              {shift.especialização}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Clock className="h-6 w-6 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">Nenhum plantão programado</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Indicador de mais dias */}
        {totalDays > maxDaysToShow && (
          <div className="text-center p-2 bg-gray-100 rounded text-xs text-muted-foreground">
            + {totalDays - maxDaysToShow} dias adicionais após salvar
          </div>
        )}
      </div>

      {/* Modo Específico Info */}
      {isNursingMode && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            <span className="text-xs font-medium text-green-800">
              Modo Enfermagem - Regras Aplicadas
            </span>
          </div>
          <div className="text-xs text-green-700">
            Intervalos de 11h-36h • Máx. 60h semanais • Máx. 2 noites consecutivas
          </div>
        </div>
      )}
    </div>
  );
}
