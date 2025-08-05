import {
  NURSING_RULES,
  ShiftValidation,
  LastShiftInfo,
  TipoTurno,
  PlantaoProgramado,
} from "@/types/plantoes";
import { addHours, differenceInHours, parseISO, format } from "date-fns";

/**
 * Valida se um enfermeiro pode trabalhar em um turno específico
 */
export function validateNursingShift(
  memberSchedule: PlantaoProgramado[],
  newShift: {
    date: string;
    turno: TipoTurno;
    horasSemanais: number;
  }
): ShiftValidation {
  // 1. Verificar limite de horas semanais
  if (
    newShift.horasSemanais + newShift.turno.duracao_horas >
    NURSING_RULES.maxWeeklyHours
  ) {
    return {
      isValid: false,
      reason: `Excederia o limite de ${
        NURSING_RULES.maxWeeklyHours
      }h semanais. Atual: ${newShift.horasSemanais}h + ${
        newShift.turno.duracao_horas
      }h = ${newShift.horasSemanais + newShift.turno.duracao_horas}h`,
    };
  }

  // 2. Verificar limite de horas consecutivas - MÁXIMO 24H
  if (newShift.turno.duracao_horas > NURSING_RULES.maxConsecutiveHours) {
    return {
      isValid: false,
      reason: `Turno excede ${NURSING_RULES.maxConsecutiveHours}h consecutivas permitidas (Lei 7.498/86)`,
    };
  }

  // 2.1. Verificar se não criará mais de 24h consecutivas com plantão anterior
  const lastShift = getLastShiftInfo(memberSchedule);
  if (lastShift) {
    // Verificar se os turnos são consecutivos (mesmo dia ou dias seguidos)
    const newShiftDate = parseISO(`${newShift.date}T${newShift.turno.hora_inicio}:00`);
    const timeDiffHours = differenceInHours(newShiftDate, lastShift.date);
    
    // Se é dentro de 48h (potencialmente consecutivo)
    if (Math.abs(timeDiffHours) <= 48) {
      const restHours = differenceInHours(newShiftDate, lastShift.endTime);
      
      // Se não há intervalo ou intervalo muito pequeno, pode ser consecutivo
      if (restHours >= 0 && restHours < 8) {
        const totalConsecutiveHours = lastShift.duration + newShift.turno.duracao_horas;
        
        if (totalConsecutiveHours > NURSING_RULES.maxConsecutiveHours) {
          return {
            isValid: false,
            reason: `Plantão criaria ${totalConsecutiveHours}h consecutivas (${lastShift.duration}h + ${newShift.turno.duracao_horas}h). Máximo permitido: ${NURSING_RULES.maxConsecutiveHours}h`,
          };
        }
      }
    }
  }

  // 3. Verificar intervalo mínimo entre plantões
  if (lastShift) {
    const restValidation = validateRestInterval(
      lastShift,
      newShift.date,
      newShift.turno
    );
    if (!restValidation.isValid) {
      return restValidation;
    }
  }

  // 4. Verificar limite de plantões noturnos consecutivos
  const nightShiftValidation = validateConsecutiveNightShifts(
    memberSchedule,
    newShift.date,
    newShift.turno
  );
  if (!nightShiftValidation.isValid) {
    return nightShiftValidation;
  }

  // 5. Avisos para situações que não impedem, mas alertam
  const warnings: string[] = [];

  // Aviso se está próximo do limite semanal
  if (
    newShift.horasSemanais + newShift.turno.duracao_horas >
    NURSING_RULES.normalWeeklyHours
  ) {
    warnings.push(
      `Atenção: Ultrapassará ${NURSING_RULES.normalWeeklyHours}h semanais recomendadas`
    );
  }

  // Aviso para plantão de 24h
  if (newShift.turno.duracao_horas === 24) {
    warnings.push("Plantão de 24h requer 36h de descanso posterior");
  }

  return {
    isValid: true,
    warning: warnings.length > 0 ? warnings.join(". ") : undefined,
  };
}

/**
 * Obtém informações do último plantão trabalhado
 */
function getLastShiftInfo(
  memberSchedule: PlantaoProgramado[]
): LastShiftInfo | null {
  if (memberSchedule.length === 0) return null;

  const sortedSchedule = memberSchedule
    .filter((p) => p.status === "realizado" || p.status === "confirmado")
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  if (sortedSchedule.length === 0) return null;

  const lastShift = sortedSchedule[0];
  const startDate = parseISO(
    `${lastShift.data}T${lastShift.tipo_turno?.hora_inicio}:00`
  );
  const endDate = addHours(
    startDate,
    lastShift.tipo_turno?.duracao_horas || 12
  );

  return {
    date: startDate,
    endTime: endDate,
    duration: lastShift.tipo_turno?.duracao_horas || 12,
    isNightShift: isNightShift(lastShift.tipo_turno?.nome || ""),
  };
}

/**
 * Valida o intervalo de descanso entre plantões
 */
function validateRestInterval(
  lastShift: LastShiftInfo,
  newShiftDate: string,
  newTurno: TipoTurno
): ShiftValidation {
  const newShiftStart = parseISO(`${newShiftDate}T${newTurno.hora_inicio}:00`);
  const restHours = differenceInHours(newShiftStart, lastShift.endTime);

  // Intervalo mínimo padrão (CLT Art. 66)
  let minRestRequired: number = NURSING_RULES.minRestBetweenShifts;

  // Se o plantão anterior foi de 24h, exige 36h de descanso
  if (lastShift.duration >= 24) {
    minRestRequired = NURSING_RULES.minRestAfter24h;
  }

  if (restHours < minRestRequired) {
    return {
      isValid: false,
      reason: `Intervalo insuficiente entre plantões. Mínimo: ${minRestRequired}h, atual: ${restHours}h. Último plantão terminou em ${format(
        lastShift.endTime,
        "dd/MM/yyyy HH:mm"
      )}`,
    };
  }

  return { isValid: true };
}

/**
 * Valida se pode trabalhar mais um plantão noturno consecutivo
 */
function validateConsecutiveNightShifts(
  memberSchedule: PlantaoProgramado[],
  newShiftDate: string,
  newTurno: TipoTurno
): ShiftValidation {
  if (!isNightShift(newTurno.nome)) {
    return { isValid: true }; // Não é plantão noturno
  }

  // Contar plantões noturnos consecutivos recentes
  const recentShifts = memberSchedule
    .filter((p) => new Date(p.data) < new Date(newShiftDate))
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, NURSING_RULES.maxConsecutiveNightShifts);

  const consecutiveNights = recentShifts.filter((shift) =>
    isNightShift(shift.tipo_turno?.nome || "")
  ).length;

  if (consecutiveNights >= NURSING_RULES.maxConsecutiveNightShifts) {
    return {
      isValid: false,
      reason: `Máximo de ${NURSING_RULES.maxConsecutiveNightShifts} plantões noturnos consecutivos atingido`,
    };
  }

  return { isValid: true };
}

/**
 * Determina se um turno é noturno
 */
function isNightShift(turnoNome: string): boolean {
  const nightKeywords = ["noite", "madrugada", "noturno"];
  return nightKeywords.some((keyword) =>
    turnoNome.toLowerCase().includes(keyword)
  );
}

/**
 * Calcula horas trabalhadas na semana
 */
export function calculateWeeklyHours(
  memberSchedule: PlantaoProgramado[],
  weekStart: Date
): number {
  const weekEnd = addHours(weekStart, 7 * 24);

  return memberSchedule
    .filter((shift) => {
      const shiftDate = new Date(shift.data);
      return shiftDate >= weekStart && shiftDate < weekEnd;
    })
    .reduce(
      (total, shift) => total + (shift.tipo_turno?.duracao_horas || 0),
      0
    );
}

/**
 * Gera relatório de adequação às regras de enfermagem
 */
export function generateNursingComplianceReport(
  memberSchedule: PlantaoProgramado[],
  weekStart: Date
): {
  weeklyHours: number;
  isCompliant: boolean;
  violations: string[];
  warnings: string[];
} {
  const weeklyHours = calculateWeeklyHours(memberSchedule, weekStart);
  const violations: string[] = [];
  const warnings: string[] = [];

  // Verificar limites de horas
  if (weeklyHours > NURSING_RULES.maxWeeklyHours) {
    violations.push(
      `Excede ${NURSING_RULES.maxWeeklyHours}h semanais (atual: ${weeklyHours}h)`
    );
  }

  if (weeklyHours < NURSING_RULES.minWeeklyHours) {
    warnings.push(
      `Abaixo de ${NURSING_RULES.minWeeklyHours}h semanais mínimas (atual: ${weeklyHours}h)`
    );
  }

  // Verificar plantões consecutivos
  const consecutiveNights = getConsecutiveNightShifts(memberSchedule);
  if (consecutiveNights > NURSING_RULES.maxConsecutiveNightShifts) {
    violations.push(
      `${consecutiveNights} plantões noturnos consecutivos (máximo: ${NURSING_RULES.maxConsecutiveNightShifts})`
    );
  }

  return {
    weeklyHours,
    isCompliant: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Conta plantões noturnos consecutivos
 */
function getConsecutiveNightShifts(
  memberSchedule: PlantaoProgramado[]
): number {
  const sorted = memberSchedule.sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  let consecutive = 0;
  for (const shift of sorted) {
    if (isNightShift(shift.tipo_turno?.nome || "")) {
      consecutive++;
    } else {
      break;
    }
  }

  return consecutive;
}
