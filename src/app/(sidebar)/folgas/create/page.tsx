"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import FeriadoManager from "@/utils/feriados";
import FeriadosPersonalizados from "@/components/feriados/FeriadosPersonalizados";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Building2,
  Plus,
  X,
  Save,
  CalendarIcon,
  AlertCircle,
  Calculator,
  PrinterIcon,
  ArrowLeft,
  Download,
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { EscalaFolgaMember } from "@/types/escala-folgas";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { ObservacaoTemplate } from "@/types/observacoes";
import Link from "next/link";
import CalendarTable from "@/components/calendar/CalendarTable";
import { NavigationButton } from "@/components/ui/navigation-button";

interface Organization {
  id: string;
  nome: string;
  tipo: string;
}

interface Department {
  id: string;
  nome: string;
  organizacao_id: string;
  tipo_departamento: string;
}

interface Member {
  id: string;
  nome: string;
  departamento_id: string;
  especializacoes?: {
    id: string;
    nome: string;
    nivel: string;
  }[];
}

interface Specialization {
  id: string;
  nome: string;
}

interface ScaleGeneration {
  startDate: Date;
  endDate: Date;
  workingDays: string[];
}

const DAYS_OF_WEEK = [
  { key: "sunday", label: "Domingo" },
  { key: "monday", label: "Segunda-feira" },
  { key: "tuesday", label: "Terça-feira" },
  { key: "wednesday", label: "Quarta-feira" },
  { key: "thursday", label: "Quinta-feira" },
  { key: "friday", label: "Sexta-feira" },
  { key: "saturday", label: "Sábado" },
];

export default function FolgasCreatePage() {
  // Estado para erro no input de nome
  const [nameInputError, setNameInputError] = useState(false);
  const { userId } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [observacaoTemplates, setObservacaoTemplates] = useState<
    ObservacaoTemplate[]
  >([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedObservacaoTemplate, setSelectedObservacaoTemplate] =
    useState("none");
  const [scaleName, setScaleName] = useState("");
  const [scaleMembers, setScaleMembers] = useState<EscalaFolgaMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState<Member | null>(
    null
  );
  const [memberOnlyForLeaveCount, setMemberOnlyForLeaveCount] = useState(false);

  // Estados para importação de escalas
  const [availableScales, setAvailableScales] = useState<any[]>([]);
  const [selectedScaleToImport, setSelectedScaleToImport] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [previewImportData, setPreviewImportData] = useState<any[]>([]);

  // Função utilitária para desempate aleatório
  function pickRandom<T>(arr: T[]): T {
    const idx = Math.floor(Math.random() * arr.length);
    console.log(
      "[RANDOM] Desempate aleatório chamado. Candidatos:",
      arr.map((x: any) => x.nome || x.id).join(", "),
      "| Escolhido:",
      arr[idx]
    );
    return arr[idx];
  }

  // Configurações de geração
  const [scaleGeneration, setScaleGeneration] = useState<ScaleGeneration>({
    startDate: new Date(),
    endDate: addDays(new Date(), 30),
    workingDays: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
  });

  const [generatedSchedule, setGeneratedSchedule] = useState<
    Array<{
      date: Date;
      working: EscalaFolgaMember[];
      onLeave: EscalaFolgaMember[];
      assignments: Record<string, EscalaFolgaMember[]>;
    }>
  >([]);

  // Estado para armazenar informações de feriados pré-processadas
  const [holidayInfo, setHolidayInfo] = useState<
    Record<string, { isHoliday: boolean; isSpecialPeriod: boolean; info: any }>
  >({});

  // Função para converter escala gerada para formato do CalendarTable
  const getCalendarDataFromGenerated = () => {
    if (generatedSchedule.length === 0) return null;

    // Obter todas as datas únicas - usar formato consistente
    const dates = generatedSchedule
      .map((day) => {
        // Garante que a data seja formatada consistentemente
        const year = day.date.getFullYear();
        const month = String(day.date.getMonth() + 1).padStart(2, "0");
        const dayNum = String(day.date.getDate()).padStart(2, "0");
        return `${year}-${month}-${dayNum}`;
      })
      .sort();

    // Mapear se cada data é escala vermelha (sábado, domingo ou feriado)
    const escalaVermelhaMap: Record<string, boolean> = {};
    dates.forEach((dateStr) => {
      // Buscar o objeto holidayInfo já preenchido pelo FeriadoManager
      const holiday = holidayInfo[dateStr];
      let isVermelha = false;
      if (holiday) {
        // Se for feriado ou período especial, considerar vermelha
        isVermelha = holiday.isHoliday || holiday.isSpecialPeriod;
      }
      // Se não for feriado, considerar sábado ou domingo
      if (!isVermelha) {
        const [year, month, day] = dateStr.split("-").map(Number);
        const jsDate = new Date(year, month - 1, day);
        const dayOfWeek = jsDate.getDay();
        isVermelha = dayOfWeek === 0 || dayOfWeek === 6;
      }
      escalaVermelhaMap[dateStr] = isVermelha;
    });

    // Obter todas as especializações únicas
    const specializations = Array.from(
      new Set(
        scaleMembers
          .map((member) => member.especializacaoNome)
          .filter((name): name is string => Boolean(name))
      )
    ).sort();

    // Criar matriz de dados: integrante x data
    const calendarMatrix: Record<
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
    > = {};

    // Inicializar matriz para cada membro
    scaleMembers.forEach((member) => {
      calendarMatrix[member.nome] = {};

      // Contadores separados para cada tipo de escala
      // IMPORTANTE: As folgas iniciais representam o estado no último dia da escala correspondente antes do início do período
      let consecutiveDaysOffPreta = member.folgasInicaisPreta || 0;
      let consecutiveDaysOffVermelha = member.folgasIniciaisVermelha || 0;

      dates.forEach((dateStr) => {
        const day = generatedSchedule.find((d) => {
          // Usar formato consistente para comparação
          const year = d.date.getFullYear();
          const month = String(d.date.getMonth() + 1).padStart(2, "0");
          const dayNum = String(d.date.getDate()).padStart(2, "0");
          const generatedDateStr = `${year}-${month}-${dayNum}`;
          return generatedDateStr === dateStr;
        });

        if (!day) return;

        // Determinar se é escala preta ou vermelha (considerando feriados e períodos especiais)
        const isEscalaVermelha = escalaVermelhaMap[dateStr];
        const isEscalaPreta = !isEscalaVermelha;

        const isWorking = day.working.some((w) => w.id === member.id);
        const isOnLeave = day.onLeave.some((l) => l.id === member.id);

        if (isWorking) {
          // Dia de trabalho - resetar apenas o contador da escala correspondente
          if (isEscalaPreta) {
            consecutiveDaysOffPreta = 0;
          } else {
            consecutiveDaysOffVermelha = 0;
          }

          calendarMatrix[member.nome][dateStr] = {
            codigo: 0, // 0 para trabalhando
            especializacao: member.especializacaoNome,
            tipo: "trabalho",
            color: "#bbf7d0", // Verde claro para trabalho
          };
        } else if (isOnLeave) {
          // Dia de folga - incrementar contador da escala correspondente
          let codigoFolga: number;

          if (isEscalaPreta) {
            consecutiveDaysOffPreta++;
            codigoFolga = consecutiveDaysOffPreta;
          } else {
            consecutiveDaysOffVermelha++;
            codigoFolga = consecutiveDaysOffVermelha;
          }

          calendarMatrix[member.nome][dateStr] = {
            codigo: codigoFolga,
            especializacao: member.especializacaoNome,
            tipo: "folga",
            color: "#fff", // 
            textColor: isEscalaPreta ? "#000000" : "#fff", // texto preto para escala preta, branco para escala vermelha
          };
        }
      });
    });

    // Ordenar membros por especialização e depois alfabeticamente
    const sortedMembers = scaleMembers
      .map((m) => m.nome)
      .sort((a, b) => {
        // Encontrar especialização de cada membro
        const getSpecializacao = (memberName: string) => {
          const member = scaleMembers.find((m) => m.nome === memberName);
          return member?.especializacaoNome || "Sem Especialização";
        };

        const specA = getSpecializacao(a);
        const specB = getSpecializacao(b);

        // Primeiro ordenar por especialização
        if (specA !== specB) {
          return specA.localeCompare(specB);
        }
        // Depois ordenar alfabeticamente dentro da mesma especialização
        return a.localeCompare(b);
      });

    // Criar mapa de membros de licença/férias
    const membersOnLeave: Record<string, boolean> = {};
    scaleMembers.forEach((member) => {
      if (member.apenasContabilizaFolgas) {
        membersOnLeave[member.nome] = true;
      }
    });

    return {
      dates,
      specializations,
      matrix: calendarMatrix,
      members: sortedMembers,
      escalaVermelhaMap,
      membersOnLeave,
    };
  };

  // Função para obter cores das especializações
  // const getSpecializationColor = (index: number) => {
  //   const colors = [
  //     "#e3f2fd", // Azul claro
  //     "#e8f5e8", // Verde claro
  //     "#fff8e1", // Amarelo claro
  //     "#fce4ec", // Rosa claro
  //     "#f3e5f5", // Roxo claro
  //     "#fff3e0", // Laranja claro
  //   ];
  //   return colors[(index - 1) % colors.length] || "#e5e7eb";
  // };
  const getSpecializationColor = (index: number) => {
    const colors = [
      "#ddd6fe", // roxo claro
      "#bfdbfe", // azul claro
      "#bbf7d0", // verde claro
      "#fed7aa", // laranja claro
      "#fde68a", // amarelo claro
      "#f9a8d4", // rosa claro
    ];
    return colors[(index - 1) % colors.length] || "#e5e7eb";
  };

  // Função para obter a cor da especialização de um integrante
  const getMemberSpecializationColor = (memberName: string) => {
    const member = scaleMembers.find((m) => m.nome === memberName);
    if (member?.especializacaoNome) {
      const calendarData = getCalendarDataFromGenerated();
      if (calendarData) {
        const specIndex = calendarData.specializations.indexOf(
          member.especializacaoNome
        );
        if (specIndex !== -1) {
          return getSpecializationColor(specIndex + 1);
        }
      }
    }
    return "#f3f4f6"; // cor padrão se não tiver especialização
  };

  const fetchObservacaoTemplates = async (organizationId: string) => {
    const { data, error } = await supabase
      .from("observacoes_templates")
      .select("*")
      .eq("organizacao_id", organizationId)
      .eq("ativo", true)
      .order("nome");

    if (!error && data) {
      setObservacaoTemplates(data);
    }
  };

  const fetchDepartments = async (organizationId: string) => {
    const { data, error } = await supabase
      .from("departamentos")
      .select("*")
      .eq("organizacao_id", organizationId);

    if (!error && data) {
      setDepartments(data);
    }
  };

  const fetchMembers = async (departmentId: string) => {
    const { data, error } = await supabase
      .from("integrantes")
      .select(
        `
        *,
        integrante_especializacoes (
          especializacoes (
            id,
            nome
          ),
          nivel
        )
      `
      )
      .eq("departamento_id", departmentId)
      .order("nome");

    if (!error && data) {
      const membersWithSpecializations = data.map((member) => ({
        ...member,
        especializacoes:
          member.integrante_especializacoes?.map((ie: any) => ({
            id: ie.especializacoes.id,
            nome: ie.especializacoes.nome,
            nivel: ie.nivel,
          })) || [],
      }));
      setMembers(membersWithSpecializations);
    }
  };

  const fetchSpecializations = async (organizationId: string) => {
    const { data, error } = await supabase
      .from("especializacoes")
      .select(
        `
        id,
        nome,
        tipos_especializacao!inner (
          organizacao_id
        )
      `
      )
      .eq("tipos_especializacao.organizacao_id", organizationId);

    if (!error && data) {
      setSpecializations(data);
    }
  };

  // Função para gerar prévia dos dados de importação
  const generateImportPreview = async (scaleId: string) => {
    if (!scaleId) {
      setPreviewImportData([]);
      return;
    }

    try {
      const { data: participacoes, error } = await supabase
        .from("escala_folgas_participacoes")
        .select(
          `
          integrante_id,
          apenas_contabiliza_folgas,
          integrante:integrantes(
            id,
            nome
          )
        `
        )
        .eq("escala_folga_id", scaleId);

      if (error) throw error;

      // Para obter as folgas atuais, precisamos consultar a tabela de atribuições
      // Por enquanto, vamos definir como 0 e calcular posteriormente se necessário
      const preview =
        participacoes?.map((p: any) => ({
          id: p.integrante.id,
          nome: p.integrante.nome,
          folgasAtuais: 0, // Será calculado posteriormente baseado nas atribuições
          apenasContabilizaFolgas: p.apenas_contabiliza_folgas,
          jaAdicionado: scaleMembers.some((m) => m.id === p.integrante.id),
        })) || [];

      setPreviewImportData(preview);
    } catch (error) {
      console.error("Erro ao gerar prévia:", error);
      setPreviewImportData([]);
    }
  };

  // Função para buscar escalas disponíveis para importação
  const fetchAvailableScales = async (departmentId: string) => {
    const { data, error } = await supabase
      .from("escalas_folgas")
      .select(
        `
        id,
        nome,
        created_at,
        departamento_id
      `
      )
      .eq("departamento_id", departmentId)
      .is("deleted_at", null) // Filtrar apenas escalas não excluídas
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAvailableScales(data);
    }
  };

  // Função para importar dados de folgas de uma escala anterior
  const importScaleData = async () => {
    if (!selectedScaleToImport) {
      toast.error("Selecione uma escala para importar");
      return;
    }

    // Função helper para criar datas corretamente (evita problemas de fuso horário)
    const createDateFromString = (dateString: string): Date => {
      const dateParts = dateString.split("-");
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Mês em JavaScript é 0-indexed
      const day = parseInt(dateParts[2]);
      return new Date(year, month, day);
    };

    try {
      // Buscar participações da escala selecionada
      const { data: participacoes, error } = await supabase
        .from("escala_folgas_participacoes")
        .select(
          `
          integrante_id,
          apenas_contabiliza_folgas,
          integrante:integrantes(
            id,
            nome,
            integrante_especializacoes(
              especializacoes(
                id,
                nome
              ),
              nivel
            )
          )
        `
        )
        .eq("escala_folga_id", selectedScaleToImport);

      if (error) throw error;

      if (!participacoes || participacoes.length === 0) {
        toast.error("Nenhum dado encontrado na escala selecionada");
        return;
      }

      // Buscar atribuições da escala anterior para calcular folgas consecutivas
      const { data: atribuicoes, error: atribuicoesError } = await supabase
        .from("escala_folgas_atribuicoes")
        .select("*")
        .eq("escala_folga_id", selectedScaleToImport)
        .order("data", { ascending: true });

      if (atribuicoesError) throw atribuicoesError;

      // Calcular folgas consecutivas de cada escala para cada membro
      const memberLastDayStats = new Map<
        string,
        {
          folgasPreta: number;
          folgasVermelha: number;
        }
      >();

      if (atribuicoes && atribuicoes.length > 0) {
        // Encontrar a última data de cada tipo de escala
        const ultimaDataPreta = Math.max(
          ...atribuicoes
            .filter((a) => {
              const dayOfWeek = createDateFromString(a.data).getDay();
              return dayOfWeek >= 1 && dayOfWeek <= 5; // Segunda a sexta (escala preta)
            })
            .map((a) => createDateFromString(a.data).getTime())
        );

        const ultimaDataVermelha = Math.max(
          ...atribuicoes
            .filter((a) => {
              const dayOfWeek = createDateFromString(a.data).getDay();
              return dayOfWeek === 0 || dayOfWeek === 6; // Sábado e domingo (escala vermelha)
            })
            .map((a) => createDateFromString(a.data).getTime())
        );

        // Agrupar atribuições por integrante
        const atribuicoesPorIntegrante = new Map<string, any[]>();
        atribuicoes.forEach((atrib) => {
          if (!atribuicoesPorIntegrante.has(atrib.integrante_id)) {
            atribuicoesPorIntegrante.set(atrib.integrante_id, []);
          }
          atribuicoesPorIntegrante.get(atrib.integrante_id)!.push(atrib);
        });

        // Para cada integrante, calcular folgas consecutivas após o último trabalho de cada escala
        atribuicoesPorIntegrante.forEach((atribs, integranteId) => {
          let folgasPreta = 0;
          let folgasVermelha = 0;

          // Ordenar por data
          atribs.sort(
            (a, b) =>
              createDateFromString(a.data).getTime() -
              createDateFromString(b.data).getTime()
          );

          // Filtrar atribuições por tipo de escala
          const atribsPreta = atribs.filter((a) => {
            const dayOfWeek = createDateFromString(a.data).getDay();
            return dayOfWeek >= 1 && dayOfWeek <= 5; // Segunda a sexta
          });

          const atribsVermelha = atribs.filter((a) => {
            const dayOfWeek = createDateFromString(a.data).getDay();
            return dayOfWeek === 0 || dayOfWeek === 6; // Sábado e domingo
          });

          // Contar folgas consecutivas da escala preta após o último trabalho
          if (atribsPreta.length > 0) {
            // Encontrar o último trabalho na escala preta
            let ultimoTrabalhoIndex = -1;
            for (let i = atribsPreta.length - 1; i >= 0; i--) {
              if (atribsPreta[i].tipo_atribuicao === "trabalho") {
                ultimoTrabalhoIndex = i;
                break;
              }
            }

            // Contar folgas após o último trabalho
            if (ultimoTrabalhoIndex >= 0) {
              for (
                let i = ultimoTrabalhoIndex + 1;
                i < atribsPreta.length;
                i++
              ) {
                if (atribsPreta[i].tipo_atribuicao === "folga") {
                  folgasPreta++;
                }
              }
            } else {
              // Se não há trabalho, contar todas as folgas
              folgasPreta = atribsPreta.filter(
                (a) => a.tipo_atribuicao === "folga"
              ).length;
            }
          }

          // Contar folgas consecutivas da escala vermelha após o último trabalho
          if (atribsVermelha.length > 0) {
            // Encontrar o último trabalho na escala vermelha
            let ultimoTrabalhoIndex = -1;
            for (let i = atribsVermelha.length - 1; i >= 0; i--) {
              if (atribsVermelha[i].tipo_atribuicao === "trabalho") {
                ultimoTrabalhoIndex = i;
                break;
              }
            }

            // Contar folgas após o último trabalho
            if (ultimoTrabalhoIndex >= 0) {
              for (
                let i = ultimoTrabalhoIndex + 1;
                i < atribsVermelha.length;
                i++
              ) {
                if (atribsVermelha[i].tipo_atribuicao === "folga") {
                  folgasVermelha++;
                }
              }
            } else {
              // Se não há trabalho, contar todas as folgas
              folgasVermelha = atribsVermelha.filter(
                (a) => a.tipo_atribuicao === "folga"
              ).length;
            }
          }

          memberLastDayStats.set(integranteId, {
            folgasPreta,
            folgasVermelha,
          });
        });
      }

      // Processar e adicionar os integrantes à escala atual
      const importedMembers: EscalaFolgaMember[] = [];

      participacoes.forEach((participacao: any) => {
        if (participacao.integrante) {
          // Verificar se o integrante já foi adicionado
          if (!scaleMembers.find((m) => m.id === participacao.integrante.id)) {
            // Buscar especialização principal do integrante
            const especializacaoPrincipal =
              participacao.integrante.integrante_especializacoes?.[0];

            // Obter folgas do último dia de cada escala
            const stats = memberLastDayStats.get(
              participacao.integrante.id
            ) || {
              folgasPreta: 0,
              folgasVermelha: 0,
            };

            const newMember: EscalaFolgaMember = {
              id: participacao.integrante.id,
              nome: participacao.integrante.nome,
              // Usar folgas consecutivas calculadas como folgas iniciais
              folgasIniciais: stats.folgasPreta + stats.folgasVermelha,
              folgasAtuais: stats.folgasPreta + stats.folgasVermelha,
              // Folgas iniciais separadas por escala (das folgas consecutivas)
              folgasInicaisPreta: stats.folgasPreta,
              folgasAtualPreta: stats.folgasPreta,
              folgasIniciaisVermelha: stats.folgasVermelha,
              folgasAtualVermelha: stats.folgasVermelha,
              ativo: true,
              especializacaoId: especializacaoPrincipal?.especializacoes?.id,
              especializacaoNome:
                especializacaoPrincipal?.especializacoes?.nome,
              apenasContabilizaFolgas:
                participacao.apenas_contabiliza_folgas || false,
              importadoDeEscala: selectedScaleToImport, // Marcar que foi importado
              tipoParticipacao: "ambas", // Por padrão, participa de ambas as escalas
              // Usar as folgas consecutivas calculadas nos contadores também
              consecutiveDaysOffPreta: stats.folgasPreta,
              consecutiveDaysOffVermelha: stats.folgasVermelha,
            };

            importedMembers.push(newMember);
          }
        }
      });

      if (importedMembers.length === 0) {
        toast.error(
          "Todos os integrantes da escala selecionada já foram adicionados"
        );
        return;
      }

      // Adicionar os membros importados ao estado atual
      setScaleMembers((prev) => [...prev, ...importedMembers]);
      setGeneratedSchedule([]);
      setShowImportDialog(false);
      setSelectedScaleToImport("");
      setPreviewImportData([]);

      // Contar quantos são apenas para contabilizar folgas
      const membersOnLeaveCount = importedMembers.filter(
        (m) => m.apenasContabilizaFolgas
      ).length;
      const activeMembersCount = importedMembers.length - membersOnLeaveCount;

      let description =
        "As folgas foram importadas baseadas nas folgas consecutivas de cada escala (preta/vermelha).";
      if (membersOnLeaveCount > 0) {
        description += ` Incluindo ${membersOnLeaveCount} integrante(s) em férias/licença.`;
      }

      toast.success(
        `${importedMembers.length} integrante(s) importado(s) com sucesso!`,
        {
          description: description,
        }
      );
    } catch (error) {
      console.error("Erro ao importar dados da escala:", error);
      toast.error("Erro ao importar dados da escala", {
        description: "Tente novamente em alguns instantes.",
      });
    }
  };

  useEffect(() => {
    if (selectedOrganization) {
      fetchDepartments(selectedOrganization.id);
      fetchSpecializations(selectedOrganization.id);
      fetchObservacaoTemplates(selectedOrganization.id);
      setSelectedDepartment("");
      setSelectedObservacaoTemplate("none");
      setDepartments([]);
      setMembers([]);
      setScaleMembers([]);
      setGeneratedSchedule([]);
      setSelectedMemberToAdd(null);
    }
  }, [selectedOrganization]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchMembers(selectedDepartment);
      fetchAvailableScales(selectedDepartment); // Buscar escalas disponíveis para importação
      setScaleMembers([]);
      setGeneratedSchedule([]);
      setSelectedMemberToAdd(null);
      setAvailableScales([]);
      setSelectedScaleToImport("");
    }
  }, [selectedDepartment]);

  // Effect para seleção automática de departamento quando há apenas um
  useEffect(() => {
    if (departments.length === 1 && !selectedDepartment) {
      setSelectedDepartment(departments[0].id);
      // toast.info("Departamento selecionado automaticamente", {
      //   description: `${departments[0].nome} foi selecionado por ser o único disponível.`,
      // });
    }
  }, [departments, selectedDepartment]);

  const addMemberToScale = (
    member: Member,
    especializacaoId?: string,
    apenasContabilizaFolgas = false
  ) => {
    // Permitir adicionar o mesmo integrante mais de uma vez, desde que seja para especializações diferentes
    if (
      scaleMembers.find(
        (m) => m.id === member.id && m.especializacaoId === especializacaoId
      )
    ) {
      toast.error("Este integrante já foi adicionado à escala com essa especialização");
      return;
    }

    const especialização = especializacaoId
      ? specializations.find((s) => s.id === especializacaoId)
      : null;

    const newMember: EscalaFolgaMember = {
      id: member.id,
      nome: member.nome,
      folgasIniciais: 0,
      folgasAtuais: 0,
      // Inicializar contadores separados para escala preta e vermelha
      folgasInicaisPreta: 0,
      folgasAtualPreta: 0,
      folgasIniciaisVermelha: 0,
      folgasAtualVermelha: 0,
      ativo: true,
      especializacaoId: especializacaoId,
      especializacaoNome: especialização?.nome,
      apenasContabilizaFolgas: apenasContabilizaFolgas,
      tipoParticipacao: "ambas", // Por padrão, participa de ambas as escalas
      trabalho24h: false, // Por padrão, não é trabalho de 24h
      doisDiasConsecutivosVermelha: false, // Por padrão, não trabalhará dois dias consecutivos de escala vermelha
      // Inicializar contadores consecutivos zerados para novos membros
      consecutiveDaysOffPreta: 0,
      consecutiveDaysOffVermelha: 0,
    };

    setScaleMembers([...scaleMembers, newMember]);
    // Limpar a escala gerada quando adicionar/remover membros
    setGeneratedSchedule([]);

    const statusMsg = apenasContabilizaFolgas
      ? " (apenas contabiliza folgas - férias/licença)"
      : "";

    toast.success(
      `${member.nome} adicionado à escala${
        especialização ? ` como ${especialização.nome}` : ""
      }${statusMsg}`
    );
  };

  const removeMemberFromScale = (memberId: string) => {
    setScaleMembers(scaleMembers.filter((m) => m.id !== memberId));
    setGeneratedSchedule([]);
    toast.success("Integrante removido da escala");
  };

  const addAllMembersToScale = () => {
    const availableMembers = members.filter(
      (member) => !scaleMembers.find((sm) => sm.id === member.id)
    );

    if (availableMembers.length === 0) {
      toast.info("Todos os integrantes já foram adicionados à escala");
      return;
    }

    let addedCount = 0;

    availableMembers.forEach((member) => {
      // Verificar especializações disponíveis para o membro
      const availableSpecs =
        member.especializacoes && member.especializacoes.length > 0
          ? member.especializacoes
              .map((e) => specializations.find((s) => s.id === e.id))
              .filter(Boolean)
          : specializations;

      // Se há apenas uma especialização, usar ela; se há várias, usar a primeira; se não há nenhuma, usar undefined
      const selectedSpecId =
        availableSpecs.length === 1
          ? availableSpecs[0]!.id
          : availableSpecs.length > 1
          ? availableSpecs[0]!.id // Usar a primeira especialização
          : undefined;

      const especialização = selectedSpecId
        ? specializations.find((s) => s.id === selectedSpecId)
        : null;

      const newMember: EscalaFolgaMember = {
        id: member.id,
        nome: member.nome,
        folgasIniciais: 0,
        folgasAtuais: 0,
        folgasInicaisPreta: 0,
        folgasAtualPreta: 0,
        folgasIniciaisVermelha: 0,
        folgasAtualVermelha: 0,
        ativo: true,
        especializacaoId: selectedSpecId,
        especializacaoNome: especialização?.nome,
        apenasContabilizaFolgas: false,
        tipoParticipacao: "ambas",
        // Inicializar contadores consecutivos zerados para novos membros
        consecutiveDaysOffPreta: 0,
        consecutiveDaysOffVermelha: 0,
      };

      scaleMembers.push(newMember);
      addedCount++;
    });

    setScaleMembers([...scaleMembers]);
    setGeneratedSchedule([]);

    toast.success(
      `${addedCount} integrante${addedCount !== 1 ? "s" : ""} adicionado${
        addedCount !== 1 ? "s" : ""
      } à escala`,
      {
        description:
          "Você pode ajustar as especializações e configurações individualmente se necessário",
      }
    );
  };

  const addMembersBySpecialization = (especializacaoId: string) => {
    const especialização = specializations

    .find(
      (s) => s.id === especializacaoId
    );

    if (!especialização) {
      toast.error("Especialização não encontrada");
      return;
    }

    // Filtrar membros que têm esta especialização e não estão na escala com ela
    const availableMembers = members.filter((member) => {
      // Verificar se o membro já está na escala com essa especialização
      const alreadyInScale = scaleMembers.find(
        (sm) => sm.id === member.id && sm.especializacaoId === especializacaoId
      );
      if (alreadyInScale) return false;

      // Verificar se o membro tem a especialização desejada
      const hasSpecialization = member.especializacoes?.some(
        (e) => e.id === especializacaoId
      );
      return hasSpecialization;
    });

    if (availableMembers.length === 0) {
      toast.info(
        `Nenhum integrante disponível com a especialização "${especialização.nome}"`
      );
      return;
    }

    let addedCount = 0;
    const newMembers: EscalaFolgaMember[] = [];

    availableMembers.forEach((member) => {
      const newMember: EscalaFolgaMember = {
        id: member.id,
        nome: member.nome,
        folgasIniciais: 0,
        folgasAtuais: 0,
        folgasInicaisPreta: 0,
        folgasAtualPreta: 0,
        folgasIniciaisVermelha: 0,
        folgasAtualVermelha: 0,
        ativo: true,
        especializacaoId: especializacaoId,
        especializacaoNome: especialização.nome,
        apenasContabilizaFolgas: false,
        tipoParticipacao: "ambas",
        trabalho24h: false,
        doisDiasConsecutivosVermelha: false,
        // Inicializar contadores consecutivos zerados para novos membros
        consecutiveDaysOffPreta: 0,
        consecutiveDaysOffVermelha: 0,
      };

      newMembers.push(newMember);
      addedCount++;
    });

    setScaleMembers([...scaleMembers, ...newMembers]);
    setGeneratedSchedule([]);

    toast.success(
      `${addedCount} integrante${
        addedCount !== 1 ? "s" : ""
      } com especialização "${especialização.nome}" adicionado${
        addedCount !== 1 ? "s" : ""
      } à escala`
    );
  };

  const toggleAllDoisDiasConsecutivosVermelha = () => {
    const activeMembers = scaleMembers.filter(
      (m) => !m.apenasContabilizaFolgas
    );
    const allMarked = activeMembers.every(
      (m) => m.doisDiasConsecutivosVermelha
    );

    setScaleMembers(
      scaleMembers.map((m) => {
        if (!m.apenasContabilizaFolgas) {
          return {
            ...m,
            doisDiasConsecutivosVermelha: !allMarked,
          };
        }
        return m;
      })
    );
    setGeneratedSchedule([]); // Limpar escala quando alterar configuração de dois dias consecutivos
  };

  const removeAllMembersFromScale = () => {
    if (scaleMembers.length === 0) {
      toast.info("Não há integrantes na escala para remover");
      return;
    }

    const count = scaleMembers.length;
    setScaleMembers([]);
    setGeneratedSchedule([]);

    toast.success(
      `${count} integrante${count !== 1 ? "s" : ""} removido${
        count !== 1 ? "s" : ""
      } da escala`
    );
  };

  const updateMemberFolgas = (memberId: string, folgasIniciais: number) => {
    setScaleMembers(
      scaleMembers.map((m) => {
        if (m.id === memberId) {
          // Distribuir folgas baseado no tipo de participação
          let folgasInicaisPreta = 0;
          let folgasIniciaisVermelha = 0;

          if (m.tipoParticipacao === "ambas") {
            folgasInicaisPreta = Math.floor(folgasIniciais / 2);
            folgasIniciaisVermelha = Math.ceil(folgasIniciais / 2);
          } else if (m.tipoParticipacao === "preta") {
            folgasInicaisPreta = folgasIniciais;
            folgasIniciaisVermelha = 0;
          } else if (m.tipoParticipacao === "vermelha") {
            folgasInicaisPreta = 0;
            folgasIniciaisVermelha = folgasIniciais;
          }

          return {
            ...m,
            folgasIniciais,
            folgasAtuais: folgasIniciais,
            folgasInicaisPreta,
            folgasAtualPreta: folgasInicaisPreta,
            folgasIniciaisVermelha,
            folgasAtualVermelha: folgasIniciaisVermelha,
          };
        }
        return m;
      })
    );
    setGeneratedSchedule([]); // Limpar escala quando alterar folgas iniciais
  };

  // Nova função para atualizar folgas separadas por escala
  const updateMemberFolgasSeparadas = (
    memberId: string,
    folgasInicaisPreta: number,
    folgasIniciaisVermelha: number
  ) => {
    setScaleMembers(
      scaleMembers.map((m) => {
        if (m.id === memberId) {
          const folgasIniciais = folgasInicaisPreta + folgasIniciaisVermelha;

          return {
            ...m,
            folgasIniciais,
            folgasAtuais: folgasIniciais,
            folgasInicaisPreta,
            folgasAtualPreta: folgasInicaisPreta,
            folgasIniciaisVermelha,
            folgasAtualVermelha: folgasIniciaisVermelha,
          };
        }
        return m;
      })
    );
    setGeneratedSchedule([]); // Limpar escala quando alterar folgas iniciais
  };

  const updateMemberTipoParticipacao = (
    memberId: string,
    tipoParticipacao: "ambas" | "preta" | "vermelha"
  ) => {
    setScaleMembers(
      scaleMembers.map((m) => {
        if (m.id === memberId) {
          // Redistribuir folgas baseado no novo tipo de participação
          let folgasInicaisPreta = 0;
          let folgasIniciaisVermelha = 0;

          if (tipoParticipacao === "ambas") {
            folgasInicaisPreta = Math.floor(m.folgasIniciais / 2);
            folgasIniciaisVermelha = Math.ceil(m.folgasIniciais / 2);
          } else if (tipoParticipacao === "preta") {
            folgasInicaisPreta = m.folgasIniciais;
            folgasIniciaisVermelha = 0;
          } else if (tipoParticipacao === "vermelha") {
            folgasInicaisPreta = 0;
            folgasIniciaisVermelha = m.folgasIniciais;
          }

          return {
            ...m,
            tipoParticipacao,
            folgasInicaisPreta,
            folgasAtualPreta: folgasInicaisPreta,
            folgasIniciaisVermelha,
            folgasAtualVermelha: folgasIniciaisVermelha,
          };
        }
        return m;
      })
    );
    setGeneratedSchedule([]); // Limpar escala quando alterar tipo de participação
  };

  const updateMemberTrabalho24h = (memberId: string, trabalho24h: boolean) => {
    setScaleMembers(
      scaleMembers.map((m) => {
        if (m.id === memberId) {
          return {
            ...m,
            trabalho24h,
          };
        }
        return m;
      })
    );
    setGeneratedSchedule([]); // Limpar escala quando alterar configuração de 24h
  };

  const updateMemberDoisDiasConsecutivosVermelha = (
    memberId: string,
    doisDiasConsecutivosVermelha: boolean
  ) => {
    setScaleMembers(
      scaleMembers.map((m) => {
        if (m.id === memberId) {
          return {
            ...m,
            doisDiasConsecutivosVermelha,
          };
        }
        return m;
      })
    );
    setGeneratedSchedule([]); // Limpar escala quando alterar configuração de dois dias consecutivos
  };

  const updateMemberFeriasLicenca = (
    memberId: string,
    apenasContabilizaFolgas: boolean
  ) => {
    setScaleMembers(
      scaleMembers.map((m) => {
        if (m.id === memberId) {
          return {
            ...m,
            apenasContabilizaFolgas,
          };
        }
        return m;
      })
    );
    setGeneratedSchedule([]); // Limpar escala quando alterar status de férias/licença
  };

  const toggleAllTrabalho24h = () => {
    const activeMembers = scaleMembers.filter(
      (m) => !m.apenasContabilizaFolgas
    );
    const allMarked = activeMembers.every((m) => m.trabalho24h);

    setScaleMembers(
      scaleMembers.map((m) => {
        if (!m.apenasContabilizaFolgas) {
          return {
            ...m,
            trabalho24h: !allMarked,
          };
        }
        return m;
      })
    );
    setGeneratedSchedule([]); // Limpar escala quando alterar configuração de 24h
  };

  const toggleWorkingDay = (day: string) => {
    const newWorkingDays = scaleGeneration.workingDays.includes(day)
      ? scaleGeneration.workingDays.filter((d) => d !== day)
      : [...scaleGeneration.workingDays, day];

    setScaleGeneration({ ...scaleGeneration, workingDays: newWorkingDays });
    setGeneratedSchedule([]);
  };

  const generateSchedule = async () => {
    try {
      console.log("🚀 Iniciando geração de escala...");
      console.log("📊 Membros na escala:", scaleMembers.length);
      
      if (scaleMembers.length < 2) {
        toast.error("É necessário pelo menos 2 integrantes para gerar a escala");
        return;
      }

      const schedule: Array<{
        date: Date;
        working: EscalaFolgaMember[];
        onLeave: EscalaFolgaMember[];
        assignments: Record<string, EscalaFolgaMember[]>; // Por especialização
      }> = [];

      // Arrays para capturar logs importantes para o toast
      const importantLogs: string[] = [];
      const excludedFromConsecutiveRed: string[] = [];
      const noEligibleForConsecutiveRed: string[] = [];

      // Separar membros ativos (que trabalham) dos que apenas contabilizam folgas
      const activeMembersOnly = scaleMembers.filter(
        (member) => !member.apenasContabilizaFolgas
      );
      const membersOnlyForLeaveCount = scaleMembers.filter(
        (member) => member.apenasContabilizaFolgas
      );
      
      console.log("👥 Membros ativos:", activeMembersOnly.length);
      console.log("🏖️ Membros apenas folgas:", membersOnlyForLeaveCount.length);

    // Agrupar membros ATIVOS por especialização
    const membersBySpecialization = new Map<string, EscalaFolgaMember[]>();

    activeMembersOnly.forEach((member) => {
      const specKey = member.especializacaoNome || "Sem Especialização";
      if (!membersBySpecialization.has(specKey)) {
        membersBySpecialization.set(specKey, []);
      }
      // Criar uma cópia profunda e inicializar contadores separados para escala preta e vermelha
      membersBySpecialization.get(specKey)!.push({
        ...member,
        folgasAtuais: member.folgasIniciais,
        // Inicializar contadores separados de escalas preta e vermelha
        // IMPORTANTE: As folgas iniciais representam o estado no último dia da escala correspondente antes do início do período
        folgasInicaisPreta: member.folgasInicaisPreta || 0,
        folgasAtualPreta: member.folgasInicaisPreta || 0,
        folgasIniciaisVermelha: member.folgasIniciaisVermelha || 0,
        folgasAtualVermelha: member.folgasIniciaisVermelha || 0,
      });
    });

    // Validar que cada especialização tem pelo menos 2 pessoas ATIVAS para rotação
    console.log("🔍 Validando especializações...");
    for (const [specName, members] of membersBySpecialization.entries()) {
      console.log(`🏷️ Especialização "${specName}": ${members.length} membros`);
      if (members.length < 2) {
        console.log(`❌ Falha na validação: "${specName}" tem apenas ${members.length} membro(s)`);
        toast.error(
          `A especialização "${specName}" precisa de pelo menos 2 pessoas ATIVAS (não em férias/licença) para gerar a escala de folgas`
        );
        return;
      }
    }
    console.log("✅ Todas as especializações válidas!");

    // Criar cópia dos membros que só contabilizam folgas para atualizar suas folgas
    const membersOnlyForLeaveCountCopy = membersOnlyForLeaveCount.map(
      (member) => ({
        ...member,
        folgasAtuais: member.folgasIniciais,
        // Inicializar contadores separados para escala preta e vermelha
        // IMPORTANTE: As folgas iniciais representam o estado no último dia da escala correspondente antes do início do período
        folgasInicaisPreta: member.folgasInicaisPreta || 0,
        folgasAtualPreta: member.folgasInicaisPreta || 0,
        folgasIniciaisVermelha: member.folgasIniciaisVermelha || 0,
        folgasAtualVermelha: member.folgasIniciaisVermelha || 0,
      })
    );

    let currentDate = new Date(scaleGeneration.startDate);
    const endDate = new Date(scaleGeneration.endDate);

    // Criar instância do gerenciador de feriados
    const feriadoManager = new FeriadoManager(
      selectedOrganization?.id || "",
      userId
    );

    // Pré-processar informações de feriados para todas as datas do período
    const holidayInfoMap: Record<
      string,
      { isHoliday: boolean; isSpecialPeriod: boolean; info: any }
    > = {};
    let processDate = new Date(scaleGeneration.startDate);
    while (processDate <= endDate) {
      const dateKey = processDate.toISOString().split("T")[0];
      const isHoliday = await feriadoManager.isHoliday(processDate);
      const isSpecialPeriod = feriadoManager.isSpecialPeriod(processDate);
      const info = await feriadoManager.getHolidayInfo(processDate);

      holidayInfoMap[dateKey] = {
        isHoliday,
        isSpecialPeriod,
        info,
      };

      processDate = addDays(processDate, 1);
    }

    // Armazenar no estado para uso na renderização
    setHolidayInfo(holidayInfoMap);

    let consecutiveRedMemberBySpec: Record<string, any> = {};
    let consecutiveRedDayCountBySpec: Record<string, number> = {};

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dayKey = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ][dayOfWeek];

      if (scaleGeneration.workingDays.includes(dayKey)) {
        const dayWorking: EscalaFolgaMember[] = [];
        const dayOnLeave: EscalaFolgaMember[] = [];
        const assignments: Record<string, EscalaFolgaMember[]> = {};

        // Obter informações de feriados pré-processadas
        const dateKey = currentDate.toISOString().split("T")[0];
        const dayHolidayInfo = holidayInfoMap[dateKey] || {
          isHoliday: false,
          isSpecialPeriod: false,
          info: null,
        };
        const { isHoliday, isSpecialPeriod } = dayHolidayInfo;

        // Calcular incremento de folgas uma única vez
        const folgasIncrement = isHoliday || isSpecialPeriod ? 1 : 1;

        // Determinar se é escala vermelha (finais de semana + feriados)
        const isEscalaVermelha = await feriadoManager.isEscalaVermelha(
          currentDate
        );
        console.log(
          `DATA: ${
            currentDate.toISOString().split("T")[0]
          } É ESCALA VERMELHA? ${isEscalaVermelha}`
        );
        const isEscalaPreta = !isEscalaVermelha;

        // 🔍 PRÉ-PROCESSAR INFORMAÇÕES GLOBAIS DO DIA (antes de processar especializações)
        const previousDay = new Date(currentDate);
        previousDay.setDate(previousDay.getDate() - 1);
        const previousDayEntry = schedule.find(
          (entry) => entry.date.toDateString() == previousDay.toDateString()
        );

        // 🔍 VARIÁVEIS GLOBAIS para todo o dia (compartilhadas entre especializações)
        const membersWhoWorkedYesterday = new Set<string>();
        const membersWho24hYesterday = new Set<string>();
        const membersWhoWorked2ConsecutiveRed = new Set<string>();
        
        // 🔍 BLOQUEIO PARA DOIS DIAS CONSECUTIVOS NA VERMELHA
        const membersBlockedForConsecutiveRed = new Set<string>();
        
        // Verificar se há membros que devem ser bloqueados para dois dias consecutivos na vermelha
        if (isEscalaVermelha) {
          const tomorrow = new Date(currentDate);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const isTomorrowVermelha = await feriadoManager.isEscalaVermelha(tomorrow);
          
          if (isTomorrowVermelha) {
            // Se hoje e amanhã são vermelha, verificar se há membros que trabalharam ontem na preta
            // e que devem ser bloqueados para manter continuidade
            if (previousDayEntry) {
              const previousDayWasPreta = !(await feriadoManager.isEscalaVermelha(previousDay));
              
              if (previousDayWasPreta) {
                // Verificar se há membros que trabalharam ontem na preta e que têm a flag doisDiasConsecutivosVermelha
                previousDayEntry.working.forEach((member) => {
                  if (member.doisDiasConsecutivosVermelha) {
                    membersBlockedForConsecutiveRed.add(member.id);
                    console.log(
                      `🚫 BLOQUEADO: ${member.nome} não pode trabalhar hoje na vermelha (trabalhou ontem na preta com doisDiasConsecutivosVermelha)`
                    );
                  }
                });
              }
            }
          }
        }
        
        if (previousDayEntry) {
          const previousDayWasEscalaVermelha =
            await feriadoManager.isEscalaVermelha(previousDay);
          const previousDayWasEscalaPreta = !previousDayWasEscalaVermelha;

          // 🔍 LOG: Mostrar que tipo de escala foi ontem
          const previousEscalaType = previousDayWasEscalaVermelha
            ? "VERMELHA"
            : "PRETA";
          console.log(`📋 ONTEM foi escala ${previousEscalaType}`);

          // 🔍 PROCURAR EM TODAS AS ESPECIALIZAÇÕES (não apenas na atual)
          previousDayEntry.working.forEach((member) => {
            // Se trabalhou 24h, não pode trabalhar hoje
            if (member.trabalho24h) {
              membersWho24hYesterday.add(member.id);
            }

            // Se trabalhou na mesma escala ontem, priorizar quem não trabalhou
            if (
              (isEscalaPreta && previousDayWasEscalaPreta) ||
              (isEscalaVermelha && previousDayWasEscalaVermelha)
            ) {
              membersWhoWorkedYesterday.add(member.id);
              // 🔍 LOG: Mostrar quem trabalhou na mesma escala ontem
              console.log(
                `🔄 ${member.nome} trabalhou ontem na escala ${previousEscalaType} (mesma de hoje)`
              );
            } else {
              // 🔍 LOG: Mostrar quem trabalhou em escala diferente ontem
              console.log(
                `🔀 ${member.nome} trabalhou ontem na escala ${previousEscalaType} (diferente de hoje)`
              );
            }
          });

          // 🔍 VERIFICAR dois dias consecutivos na vermelha (para escala preta)
          if (isEscalaPreta) {
            const twoDaysAgoDate = new Date(currentDate);
            twoDaysAgoDate.setDate(twoDaysAgoDate.getDate() - 2);
            const twoDaysAgoIsRed = await feriadoManager.isEscalaVermelha(twoDaysAgoDate);
            
            if (previousDayWasEscalaVermelha && twoDaysAgoIsRed) {
              const twoDaysAgoEntry = schedule.find(
                (entry) => entry.date.toDateString() === twoDaysAgoDate.toDateString()
              );
              
              if (twoDaysAgoEntry) {
                const twoDaysAgoWorkers = new Set(twoDaysAgoEntry.working.map((w) => w.id));
                
                previousDayEntry.working.forEach((member) => {
                  if (
                    member.doisDiasConsecutivosVermelha &&
                    twoDaysAgoWorkers.has(member.id)
                  ) {
                    membersWhoWorked2ConsecutiveRed.add(member.id);
                    console.log(
                      `⚫ ${member.nome} trabalhou dois dias consecutivos na vermelha - NÃO pode trabalhar hoje na preta`
                    );
                  }
                });
              }
            }
          }
        }

        // Para cada especialização, aplicar a lógica de folgas independentemente
        for (const [
          specName,
          specMembers,
        ] of membersBySpecialization.entries()) {
          // 🔍 PROCESSAR CADA ESPECIALIZAÇÃO INDEPENDENTEMENTE
          console.log(`\n🔧 PROCESSANDO ESPECIALIZAÇÃO: ${specName}`);
          
          // Separar membros que podem participar da escala atual e os que são automaticamente folga
          const availableMembers: any[] = [];
          const automaticLeaveMembers: any[] = [];

          specMembers.forEach((member) => {
            if (isEscalaPreta && member.tipoParticipacao === "vermelha") {
              automaticLeaveMembers.push(member); // Membro só participa da escala vermelha, fica automaticamente de folga em dia de semana
            } else if (
              isEscalaVermelha &&
              member.tipoParticipacao === "preta"
            ) {
              automaticLeaveMembers.push(member); // Membro só participa da escala preta, fica automaticamente de folga no fim de semana
            } else {
              availableMembers.push(member); // Membro pode participar desta escala
            }
          });

          // Adicionar membros de folga automática baseados no tipo de participação
          dayOnLeave.push(...automaticLeaveMembers);

          // Atualizar folgas dos membros de folga automática
          automaticLeaveMembers.forEach((member) => {
            const originalMember = membersBySpecialization
              .get(specName)!
              .find((m) => m.id === member.id);
            if (originalMember) {
              // Incrementar contador geral (compatibilidade)
              originalMember.folgasAtuais += folgasIncrement;

              // Incrementar contador específico da escala (preta ou vermelha)
              if (isEscalaPreta) {
                originalMember.folgasAtualPreta += folgasIncrement;
              } else {
                originalMember.folgasAtualVermelha += folgasIncrement;
              }
            }
          });

          // Verificar se há membros suficientes para esta escala
          if (availableMembers.length === 0) {
            // Pular esta especialização neste dia se não há membros disponíveis
            console.log(
              `🚫 Sem membros disponíveis para ${specName} em ${
                currentDate.toISOString().split("T")[0]
              }`
            );
            continue;
          }

          const numberOfPeople = availableMembers.length;

          // REGRA: Apenas 1 pessoa por especialização deve trabalhar por dia
          // Isso garante que duas pessoas com a mesma especialização não sejam escaladas juntas
          const numberOfWorking = 1; // Sempre 1 pessoa trabalhando por especialização
          const numberOfOnLeave = numberOfPeople - numberOfWorking; // O resto fica de folga
          
          // 🔍 LOG: Mostrar informações específicas da especialização
          if (previousDayEntry) {
            const previousDayWasEscalaVermelha =
              await feriadoManager.isEscalaVermelha(previousDay);
            const previousDayWasEscalaPreta = !previousDayWasEscalaVermelha;

            // 🔍 PROCURAR APENAS NA ESPECIALIZAÇÃO ATUAL para logs específicos
            const previousDayWorkingInThisSpec = previousDayEntry.working.filter(member => {
              // Verificar se o membro trabalhou ontem na mesma especialização
              const workedInThisSpec = previousDayEntry.assignments[specName]?.some(m => m.id === member.id);
              return workedInThisSpec;
            });

            previousDayWorkingInThisSpec.forEach((member) => {
              // 🔍 LOG: Mostrar quem trabalhou ontem na mesma especialização
              if (
                (isEscalaPreta && previousDayWasEscalaPreta) ||
                (isEscalaVermelha && previousDayWasEscalaVermelha)
              ) {
                console.log(
                  `🔄 ${member.nome} trabalhou ontem na escala ${previousDayWasEscalaVermelha ? "VERMELHA" : "PRETA"} (mesma de hoje) - Especialização: ${specName}`
                );
              } else {
                console.log(
                  `🔀 ${member.nome} trabalhou ontem na escala ${previousDayWasEscalaVermelha ? "VERMELHA" : "PRETA"} (diferente de hoje) - Especialização: ${specName}`
                );
              }
            });
          }

          // Ordenar membros considerando:
          // 1. Priorizar quem NÃO trabalhou ontem na mesma escala
          // 2. Depois ordenar por folgas da escala específica (preta ou vermelha)
          const sortedMembers = [...availableMembers].sort((a, b) => {
            const aWorkedYesterday = membersWhoWorkedYesterday.has(a.id);
            const bWorkedYesterday = membersWhoWorkedYesterday.has(b.id);

            // Priorizar quem NÃO trabalhou ontem
            if (aWorkedYesterday !== bWorkedYesterday) {
              return aWorkedYesterday ? 1 : -1;
            }

            // Se ambos trabalharam ou ambos não trabalharam, ordenar por folgas
            const folgasA = isEscalaPreta
              ? a.folgasAtualPreta
              : a.folgasAtualVermelha;
            const folgasB = isEscalaPreta
              ? b.folgasAtualPreta
              : b.folgasAtualVermelha;

            if (folgasA !== folgasB) {
              return folgasB - folgasA;
            }
            // Desempate: pelo index real do array + 1
            const idxA = availableMembers.indexOf(a) + 1;
            const idxB = availableMembers.indexOf(b) + 1;
            return idxA - idxB;
          });

          // 🔍 LOG: Mostrar informações dos membros para verificação da regra
          const dateStr = currentDate.toLocaleDateString("pt-BR");
          const escalaType = isEscalaPreta ? "PRETA" : "VERMELHA";

          console.log(
            `\n📅 Data: ${dateStr} - Escala ${escalaType} - Especialização: ${specName}`
          );
          console.log("👥 Membros disponíveis (ordenados por folgas):");

          sortedMembers.forEach((member, index) => {
            const folgas = isEscalaPreta
              ? member.folgasAtualPreta
              : member.folgasAtualVermelha;
            const workedYesterday = membersWhoWorkedYesterday.has(member.id)
              ? "⚠️ Trabalhou ontem"
              : "✅ Não trabalhou ontem";

            // 🔍 LOG DETALHADO: Mostrar folgas em ambas as escalas para entender melhor
            const folgasPreta = member.folgasAtualPreta;
            const folgasVermelha = member.folgasAtualVermelha;
            const worked24h = membersWho24hYesterday.has(member.id)
              ? " (24h ontem)"
              : "";

            console.log(
              `   ${index + 1}. ${
                member.nome
              } - ${folgas} folgas ${escalaType.toLowerCase()} (Preta: ${folgasPreta}, Vermelha: ${folgasVermelha}) - ${workedYesterday}${worked24h}`
            );
          });

          // 🔍 VERIFICAR se amanhã e depois de amanhã são vermelha (para escala preta)
          if (isEscalaPreta) {
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const afterTomorrow = new Date(currentDate);
            afterTomorrow.setDate(afterTomorrow.getDate() + 2);
            const isTomorrowVermelha = await feriadoManager.isEscalaVermelha(
              tomorrow
            );
            const isAfterTomorrowVermelha =
              await feriadoManager.isEscalaVermelha(afterTomorrow);
            
            // 🔍 BLOQUEAR membros que trabalharam dois dias consecutivos na vermelha no dia anterior
            // Eles não podem trabalhar hoje na preta (dia de descanso obrigatório)
            if (previousDayEntry) {
              const previousDayWasVermelha = await feriadoManager.isEscalaVermelha(previousDay);
              const twoDaysAgo = new Date(currentDate);
              twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
              const twoDaysAgoWasVermelha = await feriadoManager.isEscalaVermelha(twoDaysAgo);
              
              if (previousDayWasVermelha && twoDaysAgoWasVermelha) {
                // Verificar se há membros que trabalharam os dois dias anteriores na vermelha
                const twoDaysAgoEntry = schedule.find(
                  (entry) => entry.date.toDateString() === twoDaysAgo.toDateString()
                );
                
                if (twoDaysAgoEntry) {
                  const twoDaysAgoWorkers = new Set(twoDaysAgoEntry.working.map((w) => w.id));
                  
                  previousDayEntry.working.forEach((member) => {
                    if (
                      member.doisDiasConsecutivosVermelha &&
                      twoDaysAgoWorkers.has(member.id)
                    ) {
                      membersWhoWorked2ConsecutiveRed.add(member.id);
                      console.log(
                        `🚫 BLOQUEADO: ${member.nome} não pode trabalhar hoje na preta (trabalhou dois dias consecutivos na vermelha)`
                      );
                    }
                  });
                }
              }
            }
            
            // 🔍 BLOQUEAR membros que vão trabalhar dois dias consecutivos na vermelha amanhã
            // Eles não podem trabalhar hoje na preta (preparação para dois dias consecutivos)
            if (isTomorrowVermelha && isAfterTomorrowVermelha) {
              // Se amanhã e depois de amanhã são vermelha, bloquear membros elegíveis para dois dias consecutivos
              const candidatos = availableMembers.filter(
                (m) => m.doisDiasConsecutivosVermelha
              );
              if (candidatos.length > 0) {
                const maxFolgas = Math.max(
                  ...candidatos.map((m) => m.folgasAtualVermelha)
                );
                const escolhidos = candidatos.filter(
                  (m) => m.folgasAtualVermelha === maxFolgas
                );
                // Todos os escolhidos não podem trabalhar hoje na preta
                escolhidos.forEach((m) => {
                  membersWhoWorked2ConsecutiveRed.add(m.id);
                  console.log(
                    `🚫 BLOQUEADO: ${m.nome} não pode trabalhar hoje na preta (será escalado para dois dias consecutivos na vermelha)`
                  );
                });
              }
            }
          }


          let canWorkMembers: any[] = [];
          const must24hLeaveMembers: any[] = [];
          const mustConsecutiveRedLeaveMembers: any[] = [];

          sortedMembers.forEach((member) => {
            // Impedir 3 dias seguidos para quem tem doisDiasConsecutivosVermelha
            let workedPreviousDay = false;
            let workedTwoDaysAgo = false;
            let workedLastTwoRed = false;
            let blockAfterTwoRed = false;
            // Só aplica restrições se já houver pelo menos dois dias anteriores na escala
            const isFirstDay = schedule.length === 0;
            const isSecondDay = schedule.length === 1;
            if (
              member.doisDiasConsecutivosVermelha &&
              !isFirstDay &&
              !isSecondDay
            ) {
              // Verifica se trabalhou ontem
              if (
                previousDayEntry &&
                previousDayEntry.working.some((m) => m.id === member.id)
              ) {
                workedPreviousDay = true;
              }
              // Verifica se trabalhou anteontem
              const twoDaysAgo = new Date(currentDate);
              twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
              const twoDaysAgoEntry = schedule.find(
                (entry) =>
                  entry.date.toDateString() === twoDaysAgo.toDateString()
              );
              if (
                twoDaysAgoEntry &&
                twoDaysAgoEntry.working.some((m) => m.id === member.id)
              ) {
                workedTwoDaysAgo = true;
              }
              // Checagem robusta: se os dois dias anteriores foram vermelha e o membro trabalhou ambos, bloquear na preta
              if (isEscalaPreta) {
                const yest = new Date(currentDate);
                yest.setDate(yest.getDate() - 1);
                const twoBack = new Date(currentDate);
                twoBack.setDate(twoBack.getDate() - 2);
                const yestKey = yest.toISOString().split("T")[0];
                const twoBackKey = twoBack.toISOString().split("T")[0];
                const yestIsRed =
                  holidayInfo[yestKey]?.isHoliday ||
                  [0, 6].includes(yest.getDay());
                const twoBackIsRed =
                  holidayInfo[twoBackKey]?.isHoliday ||
                  [0, 6].includes(twoBack.getDay());
                const yestEntry = schedule.find(
                  (entry) => entry.date.toDateString() === yest.toDateString()
                );
                const twoBackEntry = schedule.find(
                  (entry) =>
                    entry.date.toDateString() === twoBack.toDateString()
                );
                if (
                  yestIsRed &&
                  twoBackIsRed &&
                  yestEntry &&
                  twoBackEntry &&
                  yestEntry.working.some((m) => m.id === member.id) &&
                  twoBackEntry.working.some((m) => m.id === member.id)
                ) {
                  blockAfterTwoRed = true;
                }
              }
            }
            if (membersWho24hYesterday.has(member.id)) {
              must24hLeaveMembers.push(member);
            } else if (
              membersWhoWorked2ConsecutiveRed.has(member.id) &&
              !isFirstDay &&
              !isSecondDay
            ) {
              // Membro trabalhou dois dias consecutivos na vermelha - BLOQUEIO OBRIGATÓRIO na preta
              mustConsecutiveRedLeaveMembers.push(member);
              console.log(
                `🚫 APLICANDO BLOQUEIO: ${member.nome} não pode trabalhar na preta (dois dias consecutivos na vermelha)`
              );
            } else if (
              member.doisDiasConsecutivosVermelha &&
              workedPreviousDay &&
              workedTwoDaysAgo &&
              !isFirstDay &&
              !isSecondDay
            ) {
              // Impede 3 dias seguidos
              mustConsecutiveRedLeaveMembers.push(member);
            } else if (blockAfterTwoRed && !isFirstDay && !isSecondDay) {
              // Impede trabalhar na preta imediatamente após dois dias consecutivos na vermelha
              mustConsecutiveRedLeaveMembers.push(member);
            } else {
              canWorkMembers.push(member);
            }
          });
          console.log("canWorkMembers", canWorkMembers);
          if (canWorkMembers.length === 0) {
            console.warn(
              `⚠️ [${dateStr} - ${specName}] NENHUM membro elegível para trabalhar!`
            );
            console.warn("Motivos:");
            if (must24hLeaveMembers.length > 0) {
              console.warn(
                "- Trabalharam 24h ontem:",
                must24hLeaveMembers.map((m) => m.nome || m.id)
              );
            }
            if (mustConsecutiveRedLeaveMembers.length > 0) {
              console.warn(
                "- Bloqueados por dois dias consecutivos na vermelha:",
                mustConsecutiveRedLeaveMembers.map((m) => m.nome || m.id)
              );
            }
            if (sortedMembers.length > 0) {
              const outros = sortedMembers.filter(
                (m) =>
                  !must24hLeaveMembers.includes(m) &&
                  !mustConsecutiveRedLeaveMembers.includes(m)
              );
              if (outros.length > 0) {
                console.warn(
                  "- Outros membros não elegíveis por regras específicas:",
                  outros.map((m) => m.nome || m.id)
                );
              }
            } else {
              console.warn(
                "- Não há membros disponíveis para esta especialização."
              );
            }
          }
          // Se é escala preta, manter a ordenação original por folgas (já ordenado em sortedMembers)
          // A ordenação já foi feita considerando quem não trabalhou ontem + folgas, não precisa reordenar
          if (isEscalaPreta) {
            // Manter a ordenação original de sortedMembers que já considera:
            // 1. Priorizar quem NÃO trabalhou ontem na mesma escala
            // 2. Depois ordenar por folgas da escala específica (preta)
            // 3. Desempate pelo index original
            
            // Apenas verificar se há algum problema na ordenação
            console.log("🔍 Verificando ordenação para escala preta:");
            canWorkMembers.forEach((member, index) => {
              console.log(`   ${index + 1}. ${member.nome} - ${member.folgasAtualPreta} folgas preta`);
            });
          }

          // 🔍 LÓGICA ESPECIAL: Dois dias consecutivos na escala vermelha (ESPECÍFICA PARA ESTA ESPECIALIZAÇÃO)
          let priorityWorkingMembers: any[] = [];

          if (isEscalaVermelha) {
            // Bloco de dois dias consecutivos: se hoje e amanhã forem vermelha, escalar o mesmo integrante (com a flag) para ambos os dias
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const isTomorrowVermelha = await feriadoManager.isEscalaVermelha(
              tomorrow
            );
            console.log(
              `🔴 [DOIS DIAS CONSECUTIVOS] Hoje: ${
                currentDate.toISOString().split("T")[0]
              }, Amanhã: ${
                tomorrow.toISOString().split("T")[0]
              }, Ambos vermelhos? ${isTomorrowVermelha} - Especialização: ${specName}`
            );
            
            if (isTomorrowVermelha) {
              let candidatos = canWorkMembers.filter(
                (member) =>
                  member.doisDiasConsecutivosVermelha &&
                  !membersWho24hYesterday.has(member.id)
              );
              console.log(
                `🔎 Candidatos para dois dias consecutivos na vermelha (${specName}):`,
                candidatos.map(
                  (m) => `${m.nome} (${m.folgasAtualVermelha} folgas vermelha)`
                )
              );
              if (candidatos.length > 0) {
                let maxFolgas = Math.max(
                  ...candidatos.map((m) => m.folgasAtualVermelha)
                );
                let empatados = candidatos.filter(
                  (m) => m.folgasAtualVermelha === maxFolgas
                );
                console.log(
                  `🟢 Maior número de folgas vermelha: ${maxFolgas}. Empatados:`,
                  empatados.map((m) => m.nome)
                );
                
                // 🔍 PRIORIDADE: Em caso de empate, quem NÃO trabalhou ontem tem prioridade
                let escolhidoFinal;
                if (empatados.length > 1) {
                  // Separar quem trabalhou ontem e quem não trabalhou
                  const naoTrabalhouOntem = empatados.filter(m => !membersWhoWorkedYesterday.has(m.id));
                  const trabalhouOntem = empatados.filter(m => membersWhoWorkedYesterday.has(m.id));
                  
                  if (naoTrabalhouOntem.length > 0) {
                    // Priorizar quem NÃO trabalhou ontem
                    escolhidoFinal = pickRandom(naoTrabalhouOntem);
                    console.log(
                      `🎯 PRIORIDADE: ${escolhidoFinal.nome} escolhido por NÃO ter trabalhado ontem (entre ${naoTrabalhouOntem.map(m => m.nome).join(', ')})`
                    );
                  } else {
                    // Se todos trabalharam ontem, escolher aleatoriamente
                    escolhidoFinal = pickRandom(trabalhouOntem);
                    console.log(
                      `🎲 ALEATÓRIO: ${escolhidoFinal.nome} escolhido aleatoriamente (todos trabalharam ontem)`
                    );
                  }
                } else {
                  escolhidoFinal = empatados[0];
                }
                console.log(
                  `✅ Escolhido para dois dias consecutivos (${specName}): ${escolhidoFinal.nome}`
                );
                priorityWorkingMembers = [escolhidoFinal];
              } else {
                console.log(
                  `⚠️ Nenhum candidato elegível para dois dias consecutivos na vermelha (${specName}).`
                );
              }
            } else {
              // Se não é bloco de dois dias, verificar continuidade da mesma especialização
              if (previousDayEntry && previousDayEntry.assignments[specName]) {
                const previousDayWasRed = await feriadoManager.isEscalaVermelha(
                  previousDay
                );
                console.log(
                  `🔍 Verificando continuidade para ${specName} - Ontem foi vermelha? ${previousDayWasRed}`
                );
                
                if (previousDayWasRed && previousDayEntry.assignments[specName].length > 0) {
                  const prevMember = previousDayEntry.assignments[specName][0];
                  if (prevMember.doisDiasConsecutivosVermelha) {
                    // 🔍 VERIFICAR se o membro ainda está disponível nesta especialização
                    const foundMember = availableMembers.find(m => m.id === prevMember.id);
                    if (foundMember) {
                      console.log(
                        `🔁 Mantendo continuidade: ${prevMember.nome} (doisDiasConsecutivosVermelha) - Especialização: ${specName}`
                      );
                      priorityWorkingMembers = [foundMember];
                    } else {
                      console.log(
                        `⚠️ AVISO: ${prevMember.nome} não está mais disponível em ${specName}. Continuidade cancelada.`
                      );
                      priorityWorkingMembers = [];
                    }
                  }
                }
              }
            }
          }

          // GARANTIR que sempre tenha pelo menos 1 pessoa trabalhando
          // Se todos os membros disponíveis têm restrições, forçar o trabalho do menos "descansado"
          let finalCanWorkMembers = canWorkMembers;
          let finalMust24hLeaveMembers = must24hLeaveMembers;
          let finalMustConsecutiveRedLeaveMembers =
            mustConsecutiveRedLeaveMembers;
          let forcedWorkAfter24h = false;

          if (
            canWorkMembers.length === 0 &&
            (must24hLeaveMembers.length > 0 ||
              mustConsecutiveRedLeaveMembers.length > 0)
          ) {
            // Situação crítica: todos têm alguma restrição
            // Priorizar quem trabalhou 24h sobre quem trabalhou dois dias consecutivos vermelha
            // (24h é restrição mais forte que dois dias consecutivos)

            const allRestrictedMembers = [
              ...must24hLeaveMembers,
              ...mustConsecutiveRedLeaveMembers,
            ];

            // Escolher o que tem mais folgas para trabalhar (mais descansado)
            // 🔍 PRIORIDADE: Em caso de empate, quem NÃO trabalhou ontem tem prioridade
            const maxFolgas = Math.max(
              ...allRestrictedMembers.map(m => 
                isEscalaPreta ? m.folgasAtualPreta : m.folgasAtualVermelha
              )
            );
            
            const membrosComMaxFolgas = allRestrictedMembers.filter(m => 
              (isEscalaPreta ? m.folgasAtualPreta : m.folgasAtualVermelha) === maxFolgas
            );
            
            let mostRestedMember;
            if (membrosComMaxFolgas.length > 1) {
              // Separar quem trabalhou ontem e quem não trabalhou
              const naoTrabalhouOntem = membrosComMaxFolgas.filter(m => !membersWhoWorkedYesterday.has(m.id));
              const trabalhouOntem = membrosComMaxFolgas.filter(m => membersWhoWorkedYesterday.has(m.id));
              
              if (naoTrabalhouOntem.length > 0) {
                // Priorizar quem NÃO trabalhou ontem
                mostRestedMember = pickRandom(naoTrabalhouOntem);
                console.log(
                  `🎯 PRIORIDADE CRÍTICA: ${mostRestedMember.nome} escolhido por NÃO ter trabalhado ontem (entre ${naoTrabalhouOntem.map(m => m.nome).join(', ')})`
                );
              } else {
                // Se todos trabalharam ontem, escolher aleatoriamente
                mostRestedMember = pickRandom(trabalhouOntem);
                console.log(
                  `🎲 ALEATÓRIO CRÍTICO: ${mostRestedMember.nome} escolhido aleatoriamente (todos trabalharam ontem)`
                );
              }
            } else {
              mostRestedMember = membrosComMaxFolgas[0];
            }

            // 🔍 LOG: Situação crítica - todos têm restrições
            console.log(`⚠️ SITUAÇÃO CRÍTICA: Todos têm restrições!`);
            console.log(
              `💪 FORÇADO A TRABALHAR: ${mostRestedMember.nome} (${
                isEscalaPreta
                  ? mostRestedMember.folgasAtualPreta
                  : mostRestedMember.folgasAtualVermelha
              } folgas ${escalaType.toLowerCase()})`
            );

            finalCanWorkMembers = [mostRestedMember];

            // Remover o membro selecionado das listas de restrição
            if (must24hLeaveMembers.find((m) => m.id === mostRestedMember.id)) {
              finalMust24hLeaveMembers = must24hLeaveMembers.filter(
                (m) => m.id !== mostRestedMember.id
              );
            } else {
              finalMustConsecutiveRedLeaveMembers =
                mustConsecutiveRedLeaveMembers.filter(
                  (m) => m.id !== mostRestedMember.id
                );
            }

            forcedWorkAfter24h = true;

            // Marcar o membro como trabalhando em situação excepcional
            mostRestedMember.excecaoTrabalho24h = true;
          }

          // Calcular quantas pessoas devem ficar de folga (excluindo as obrigatórias por 24h)
          const maxPossibleOnLeave = Math.max(
            0,
            finalCanWorkMembers.length - 1
          );
          const targetOnLeave = Math.min(numberOfOnLeave, maxPossibleOnLeave);

          // Aplicar prioridade para membros de dois dias consecutivos na escala vermelha
          let canWorkOnLeave: any[] = [];
          let canWorkWorking: any[] = [];

          if (priorityWorkingMembers.length > 0 && isEscalaVermelha) {
            // Para membros marcados para dois dias consecutivos na escala vermelha
            // 🔍 VERIFICAR se o membro prioritário realmente pertence a esta especialização
            const selectedMember = priorityWorkingMembers[0];
            const memberBelongsToThisSpec = availableMembers.some(m => m.id === selectedMember.id);
            
            if (memberBelongsToThisSpec) {
              canWorkWorking = [selectedMember];

              console.log(
                `🔴 DOIS DIAS CONSECUTIVOS VERMELHA (${specName}): ${selectedMember.nome} (${selectedMember.folgasAtualVermelha} folgas vermelha)`
              );

              // Todos os outros ficam de folga
              const remainingMembers = finalCanWorkMembers.filter(
                (member) => member.id !== selectedMember.id
              );
              canWorkOnLeave = remainingMembers;
            } else {
              // Se o membro não pertence a esta especialização, usar lógica normal
              console.log(
                `⚠️ AVISO: Membro prioritário ${selectedMember.nome} não pertence à especialização ${specName}. Usando lógica normal.`
              );
              priorityWorkingMembers = []; // Limpar para usar lógica normal
            }
          }
          
          if (priorityWorkingMembers.length === 0) {
            // Lógica normal: selecionar apenas 1 pessoa para trabalhar
            if (finalCanWorkMembers.length > 0) {
              // 🔍 DESEMPATE INTELIGENTE: Em caso de empate no número de folgas
              const maxFolgas = Math.max(
                ...finalCanWorkMembers.map(m => 
                  isEscalaPreta ? m.folgasAtualPreta : m.folgasAtualVermelha
                )
              );
              
              const membrosComMaxFolgas = finalCanWorkMembers.filter(m => 
                (isEscalaPreta ? m.folgasAtualPreta : m.folgasAtualVermelha) === maxFolgas
              );
              
              let selectedMember;
              if (membrosComMaxFolgas.length > 1) {
                // Separar quem trabalhou ontem e quem não trabalhou
                const naoTrabalhouOntem = membrosComMaxFolgas.filter(m => !membersWhoWorkedYesterday.has(m.id));
                const trabalhouOntem = membrosComMaxFolgas.filter(m => membersWhoWorkedYesterday.has(m.id));
                
                if (naoTrabalhouOntem.length > 0) {
                  // Priorizar quem NÃO trabalhou ontem
                  selectedMember = pickRandom(naoTrabalhouOntem);
                  console.log(
                    `🎯 PRIORIDADE NORMAL (${specName}): ${selectedMember.nome} escolhido por NÃO ter trabalhado ontem (entre ${naoTrabalhouOntem.map(m => m.nome).join(', ')})`
                  );
                } else {
                  // Se todos trabalharam ontem, escolher aleatoriamente
                  selectedMember = pickRandom(trabalhouOntem);
                  console.log(
                    `🎲 ALEATÓRIO NORMAL (${specName}): ${selectedMember.nome} escolhido aleatoriamente (todos trabalharam ontem)`
                  );
                }
              } else {
                selectedMember = membrosComMaxFolgas[0];
              }
              
              canWorkWorking = [selectedMember];
              canWorkOnLeave = finalCanWorkMembers.filter(m => m.id !== selectedMember.id);

              const folgas = isEscalaPreta
                ? selectedMember.folgasAtualPreta
                : selectedMember.folgasAtualVermelha;
              console.log(
                `🎯 ESCALADO PARA TRABALHAR (${specName}): ${selectedMember.nome} (${folgas} folgas ${escalaType.toLowerCase()})`
              );

              if (canWorkOnLeave.length > 0) {
                console.log(`😴 De folga em ${specName}:`);
                canWorkOnLeave.forEach((member) => {
                  const folgasMember = isEscalaPreta
                    ? member.folgasAtualPreta
                    : member.folgasAtualVermelha;
                  console.log(
                    `   - ${member.nome} (${folgasMember} folgas ${escalaType.toLowerCase()})`
                  );
                });
              }
            }
          }

          // Garantir que exatamente 1 pessoa trabalhe por especialização
          if (canWorkWorking.length === 0 && finalCanWorkMembers.length > 0) {
            // Se nenhuma pessoa foi selecionada para trabalhar, aplicar lógica de desempate
            const maxFolgas = Math.max(
              ...finalCanWorkMembers.map(m => 
                isEscalaPreta ? m.folgasAtualPreta : m.folgasAtualVermelha
              )
            );
            
            const membrosComMaxFolgas = finalCanWorkMembers.filter(m => 
              (isEscalaPreta ? m.folgasAtualPreta : m.folgasAtualVermelha) === maxFolgas
            );
            
            let selectedMember;
            if (membrosComMaxFolgas.length > 1) {
              // Separar quem trabalhou ontem e quem não trabalhou
              const naoTrabalhouOntem = membrosComMaxFolgas.filter(m => !membersWhoWorkedYesterday.has(m.id));
              const trabalhouOntem = membrosComMaxFolgas.filter(m => membersWhoWorkedYesterday.has(m.id));
              
              if (naoTrabalhouOntem.length > 0) {
                // Priorizar quem NÃO trabalhou ontem
                selectedMember = pickRandom(naoTrabalhouOntem);
                console.log(
                  `🎯 FALLBACK PRIORIDADE (${specName}): ${selectedMember.nome} escolhido por NÃO ter trabalhado ontem (entre ${naoTrabalhouOntem.map(m => m.nome).join(', ')})`
                );
              } else {
                // Se todos trabalharam ontem, escolher aleatoriamente
                selectedMember = pickRandom(trabalhouOntem);
                console.log(
                  `🎲 FALLBACK ALEATÓRIO (${specName}): ${selectedMember.nome} escolhido aleatoriamente (todos trabalharam ontem)`
                );
              }
            } else {
              selectedMember = membrosComMaxFolgas[0];
              console.log(`⚠️ FALLBACK: Único candidato em ${specName}, escalando ${selectedMember.nome}`);
            }
            
            canWorkWorking = [selectedMember];
            canWorkOnLeave = finalCanWorkMembers.filter(m => m.id !== selectedMember.id);
          } else if (canWorkWorking.length > 1) {
            // Se mais de 1 pessoa foi selecionada, manter apenas a primeira
            canWorkOnLeave.push(...canWorkWorking.slice(1));
            canWorkWorking = [canWorkWorking[0]];
            
            console.log(`⚠️ AJUSTE: Mais de 1 pessoa selecionada em ${specName}, mantendo apenas ${canWorkWorking[0].nome}`);
          }

          // Combinar folgas: membros normais + membros com restrições (24h + dois dias consecutivos vermelha)
          // Garantir que membros bloqueados por regra estejam SEMPRE em dayOnLeave (sem duplicidade)
          const allBlockedIds = new Set([
            ...finalMust24hLeaveMembers.map((m) => m.id),
            ...finalMustConsecutiveRedLeaveMembers.map((m) => m.id),
          ]);
          // Remove duplicatas
          const specOnLeave = [
            ...canWorkOnLeave.filter((m) => !allBlockedIds.has(m.id)),
            ...finalMust24hLeaveMembers,
            ...finalMustConsecutiveRedLeaveMembers,
          ];
          const specWorking = canWorkWorking;

          // Adicionar aos arrays do dia
          dayWorking.push(...specWorking);
          // Garante que dayOnLeave não tenha duplicatas
          specOnLeave.forEach((m) => {
            if (!dayOnLeave.some((x) => x.id === m.id)) {
              dayOnLeave.push(m);
            }
          });

          // Criar atribuições por especialização
          assignments[specName] = specWorking;

          // Atualizar folgas dos que ficaram de folga nesta especialização
          // Em feriados, aplicar multiplicador de folgas (vale mais)
          // Atualizar folgas dos que ficaram de folga nesta especialização
          // (garante que membros bloqueados também tenham folga incrementada)
          specOnLeave.forEach((member) => {
            const originalMember = membersBySpecialization
              .get(specName)!
              .find((m) => m.id === member.id);
            if (originalMember) {
              // Incrementar contador geral (compatibilidade)
              originalMember.folgasAtuais += folgasIncrement;

              // Incrementar contador específico da escala (preta ou vermelha)
              if (isEscalaPreta) {
                originalMember.folgasAtualPreta += folgasIncrement;
              } else {
                originalMember.folgasAtualVermelha += folgasIncrement;
              }

              // 🔍 LOG: Mostrar atualização de folgas para quem ficou de folga
              console.log(
                `📈 ${
                  member.nome
                } ganhou ${folgasIncrement} folga(s) ${escalaType.toLowerCase()} (Total agora: ${
                  isEscalaPreta
                    ? originalMember.folgasAtualPreta
                    : originalMember.folgasAtualVermelha
                })`
              );
            }
          });

          // 🔍 LOG: IMPORTANTE - Quem trabalhou DEVE zerar as folgas da escala correspondente
          console.log(
            `🔧 ZERANDO FOLGAS para ${specWorking.length} membro(s) que trabalhou(ram):`
          );
          specWorking.forEach((member) => {
            console.log(`🔧 Processando reset de folgas para: ${member.nome}`);
            
            // 🔍 VERIFICAR se o membro está na especialização correta
            if (!membersBySpecialization.has(specName)) {
              console.error(`❌ ERRO: Especialização "${specName}" não encontrada no mapa!`);
              return;
            }
            
            const originalMember = membersBySpecialization
              .get(specName)!
              .find((m) => m.id === member.id);
            if (originalMember) {
              console.log(
                `🔧 Membro encontrado no mapa! Folgas ANTES do reset: Preta=${originalMember.folgasAtualPreta}, Vermelha=${originalMember.folgasAtualVermelha}`
              );

              // ZERAR as folgas da escala que trabalhou
              if (isEscalaPreta) {
                console.log(
                  `🔄 ${member.nome} trabalhou na escala PRETA - ZERANDO folgas preta (era ${originalMember.folgasAtualPreta})`
                );
                originalMember.folgasAtualPreta = 0;
              } else {
                console.log(
                  `🔄 ${member.nome} trabalhou na escala VERMELHA - ZERANDO folgas vermelha (era ${originalMember.folgasAtualVermelha})`
                );
                originalMember.folgasAtualVermelha = 0;
              }

              // Também zerar contador geral se for compatibilidade
              originalMember.folgasAtuais =
                originalMember.folgasAtualPreta +
                originalMember.folgasAtualVermelha;
              console.log(
                `📊 ${member.nome} - Folgas DEPOIS do reset: Preta=${originalMember.folgasAtualPreta}, Vermelha=${originalMember.folgasAtualVermelha}, Total=${originalMember.folgasAtuais}`
              );
              console.log(`✅ Reset completado para ${member.nome}`);
            } else {
              console.log(
                `❌ ERRO: Membro ${member.nome} NÃO foi encontrado no mapa de especializações!`
              );
              
              // 🔍 DEBUG: Mostrar informações sobre o membro e a especialização
              console.log(`🔍 DEBUG - Membro: ${member.nome} (ID: ${member.id})`);
              console.log(`🔍 DEBUG - Especialização procurada: ${specName}`);
              console.log(`🔍 DEBUG - Especializações disponíveis no mapa:`);
              for (const [spec, members] of membersBySpecialization.entries()) {
                console.log(`   - ${spec}: ${members.length} membros`);
                const foundInSpec = members.find(m => m.id === member.id);
                if (foundInSpec) {
                  console.log(`     ✅ ${member.nome} encontrado em ${spec}!`);
                }
              }
            }
          });
        }

        // Adicionar membros que apenas contabilizam folgas (sempre de folga)
        dayOnLeave.push(...membersOnlyForLeaveCountCopy);

        // Atualizar folgas dos membros que apenas contabilizam
        // Em feriados, aplicar o mesmo multiplicador
        membersOnlyForLeaveCountCopy.forEach((member) => {
          // Verificar se o membro participa desta escala
          const shouldCountForThisScale =
            member.tipoParticipacao === "ambas" ||
            (isEscalaPreta && member.tipoParticipacao === "preta") ||
            (isEscalaVermelha && member.tipoParticipacao === "vermelha");

          if (shouldCountForThisScale) {
            // Incrementar contador geral (compatibilidade)
            member.folgasAtuais += folgasIncrement;

            // Incrementar contador específico da escala (preta ou vermelha)
            if (isEscalaPreta) {
              member.folgasAtualPreta += folgasIncrement;
            } else {
              member.folgasAtualVermelha += folgasIncrement;
            }
          }
        });

        schedule.push({
          date: new Date(currentDate),
          working: dayWorking,
          onLeave: dayOnLeave,
          assignments,
        });
      }

      currentDate = addDays(currentDate, 1);
    }

    // Atualizar o estado com os valores finais de folgas (membros ativos + membros só de folga)
    const updatedScaleMembers = scaleMembers.map((member) => {
      if (member.apenasContabilizaFolgas) {
        // Para membros que só contabilizam folgas
        const updatedMember = membersOnlyForLeaveCountCopy.find(
          (m) => m.id === member.id
        );
        return updatedMember
          ? {
              ...member,
              folgasAtuais: updatedMember.folgasAtuais,
              folgasAtualPreta: updatedMember.folgasAtualPreta,
              folgasAtualVermelha: updatedMember.folgasAtualVermelha,
            }
          : member;
      } else {
        // Para membros ativos
        for (const [
          specName,
          specMembers,
        ] of membersBySpecialization.entries()) {
          const updatedMember = specMembers.find((m) => m.id === member.id);
          if (updatedMember) {
            return {
              ...member,
              folgasAtuais: updatedMember.folgasAtuais,
              folgasAtualPreta: updatedMember.folgasAtualPreta,
              folgasAtualVermelha: updatedMember.folgasAtualVermelha,
            };
          }
        }
        return member;
      }
    });
    setScaleMembers(updatedScaleMembers);

    console.log("📅 Escala gerada com sucesso! Total de dias:", schedule.length);
    setGeneratedSchedule(schedule);

    // Preparar informações adicionais para o toast
    let additionalInfo = `${schedule.length} dias de trabalho programados. Regras aplicadas: apenas 1 pessoa por especialização trabalha por dia. Quem trabalha 2 dias consecutivos na vermelha descansa na segunda-feira.`;

    // Adicionar logs importantes sobre exclusões e avisos
    // const allLogs = [...excludedFromConsecutiveRed, ...noEligibleForConsecutiveRed];
    // if (allLogs.length > 0) {
    //   additionalInfo += `\n\nInformações importantes:\n${allLogs.join('\n')}`;
    // }

      console.log("🎉 Finalizando geração da escala...");
      toast.success("Escala gerada com sucesso!", {
        description: additionalInfo,
      });
    } catch (error) {
      console.error("💥 Erro durante geração da escala:", error);
      toast.error("Erro ao gerar escala", {
        description: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  };

  const saveScale = async () => {
    if (!selectedDepartment || !scaleName.trim() || scaleMembers.length === 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (generatedSchedule.length === 0) {
      toast.error("Gere a escala antes de salvar");
      return;
    }

    setLoading(true);

    // Variáveis para armazenar IDs e dados para rollback
    let createdScaleId: string | null = null;
    let createdParticipacoesIds: string[] = [];
    let createdAtribuicoesIds: string[] = [];

    try {
      // ETAPA 1: Criar a escala de folgas
      const { data: newScale, error: scaleError } = await supabase
        .from("escalas_folgas")
        .insert({
          nome: scaleName,
          departamento_id: selectedDepartment,
          observacoes_template_id:
            selectedObservacaoTemplate === "none"
              ? null
              : selectedObservacaoTemplate,
          // NOVAS COLUNAS DE COMPARTILHAMENTO
          proprietario_id: userId, // ID do usuário que está criando
          compartilhada: false, // Por padrão, não compartilhada
        })
        .select()
        .single();

      if (scaleError) throw scaleError;
      
      createdScaleId = newScale.id;
      console.log("✅ Escala criada com sucesso:", createdScaleId);

      // ETAPA 2: Salvar as participações
      const participacoes = scaleMembers.map((member) => ({
        escala_folga_id: newScale.id,
        integrante_id: member.id,
        folgas_iniciais_preta: member.folgasInicaisPreta || 0,
        folgas_iniciais_vermelha: member.folgasIniciaisVermelha || 0,
        ativo: member.ativo,
        apenas_contabiliza_folgas: member.apenasContabilizaFolgas || false,
        tipo_participacao: member.tipoParticipacao || 'ambas'
      }));

      const { data: participacoesData, error: participacoesError } = await supabase
        .from("escala_folgas_participacoes")
        .insert(participacoes)
        .select("id");

      if (participacoesError) throw participacoesError;
      
      createdParticipacoesIds = participacoesData.map(p => p.id);
      console.log("✅ Participações criadas com sucesso:", createdParticipacoesIds.length);

      // ETAPA 3: Salvar as atribuições geradas
      const atribuicoes: any[] = [];

      generatedSchedule.forEach((day) => {
        // Adicionar os que trabalham com suas especializações
        day.working.forEach((member) => {
          atribuicoes.push({
            escala_folga_id: newScale.id,
            data: day.date.toISOString().split("T")[0],
            integrante_id: member.id,
            tipo_atribuicao: "trabalho",
            especializacao_id: member.especializacaoId || null,
            observacao: member.especializacaoNome || null,
          });
        });

        // Adicionar os que ficam de folga
        day.onLeave.forEach((member) => {
          atribuicoes.push({
            escala_folga_id: newScale.id,
            data: day.date.toISOString().split("T")[0],
            integrante_id: member.id,
            tipo_atribuicao: "folga",
            especializacao_id: null,
            observacao: null,
          });
        });
      });

      const { data: atribuicoesData, error: atribuicoesError } = await supabase
        .from("escala_folgas_atribuicoes")
        .insert(atribuicoes)
        .select("id");

      if (atribuicoesError) throw atribuicoesError;
      
      createdAtribuicoesIds = atribuicoesData.map(a => a.id);
      console.log("✅ Atribuições criadas com sucesso:", createdAtribuicoesIds.length);

      // Todas as operações foram bem-sucedidas
      toast.success("Escala de folgas salva com sucesso!", {
        description: `${scaleMembers.length} participantes e ${generatedSchedule.length} dias programados.`,
      });

      // Limpar formulário após salvar
      setScaleName("");
      setScaleMembers([]);
      setGeneratedSchedule([]);

    } catch (error) {
      console.error("❌ Erro ao salvar escala de folgas:", error);
      
      // IMPLEMENTAR ROLLBACK MANUAL
      await performRollback(
        createdScaleId,
        createdParticipacoesIds,
        createdAtribuicoesIds,
        error
      );
      
      toast.error("Erro ao salvar escala de folgas", {
        description: "As operações foram revertidas. Tente novamente em alguns instantes.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para realizar rollback manual
  const performRollback = async (
    scaleId: string | null,
    participacoesIds: string[],
    atribuicoesIds: string[],
    originalError: any
  ) => {
    console.log("🔄 Iniciando rollback...");
    
    try {
      // ROLLBACK ETAPA 3: Remover atribuições (se foram criadas)
      if (atribuicoesIds.length > 0) {
        const { error: deleteAtribuicoesError } = await supabase
          .from("escala_folgas_atribuicoes")
          .delete()
          .in("id", atribuicoesIds);
        
        if (deleteAtribuicoesError) {
          console.error("❌ Erro ao reverter atribuições:", deleteAtribuicoesError);
        } else {
          console.log("✅ Atribuições removidas no rollback");
        }
      }

      // ROLLBACK ETAPA 2: Remover participações (se foram criadas)
      if (participacoesIds.length > 0) {
        const { error: deleteParticipacoesError } = await supabase
          .from("escala_folgas_participacoes")
          .delete()
          .in("id", participacoesIds);
        
        if (deleteParticipacoesError) {
          console.error("❌ Erro ao reverter participações:", deleteParticipacoesError);
        } else {
          console.log("✅ Participações removidas no rollback");
        }
      }

      // ROLLBACK ETAPA 1: Remover escala (se foi criada)
      if (scaleId) {
        const { error: deleteScaleError } = await supabase
          .from("escalas_folgas")
          .delete()
          .eq("id", scaleId);
        
        if (deleteScaleError) {
          console.error("❌ Erro ao reverter escala:", deleteScaleError);
        } else {
          console.log("✅ Escala removida no rollback");
        }
      }

      console.log("🔄 Rollback concluído");
      
    } catch (rollbackError) {
      console.error("❌ ERRO CRÍTICO durante rollback:", rollbackError);
      console.error("❌ Erro original:", originalError);
      
      // Em caso de falha no rollback, notificar o usuário sobre possível inconsistência
      toast.error("Erro crítico durante rollback", {
        description: "Entre em contato com o suporte. Alguns dados podem ter sido salvos incorretamente.",
      });
    }
  };

  const getObservacoesHtml = () => {
    if (!selectedObservacaoTemplate || selectedObservacaoTemplate === "none") {
      // Observações padrão se nenhum template for selecionado
      //   return `
      //     <div class="obs-item">1. O militar que estiver na copa das panelas é o responsável pelo lixo da cozinha;</div>
      //     <div class="obs-item">2. O horário de chegada dos militares ao <strong>RANCHO</strong> é às 6:45 horas;</div>
      //     <div class="obs-item">3. O militar que estiver <strong>entrando de serviço</strong> chegará obrigatoriamente às 06:00 horas pronto;</div>
      //     <div class="obs-item">4. A troca de serviço poderá ser autorizada por um <strong>graduado</strong>;</div>
      //   `;
      return;
    }

    const template = observacaoTemplates.find(
      (t) => t.id === selectedObservacaoTemplate
    );
    if (!template) return "";

    return template.observacoes
      .sort((a, b) => a.ordem - b.ordem)
      .map(
        (obs, index) =>
          `<div class="obs-item">${index + 1}. ${obs.texto};</div>`
      )
      .join("");
  };

  const printScale = () => {
    if (generatedSchedule.length === 0) {
      toast.error("Gere a escala antes de imprimir");
      return;
    }

    // Criar conteúdo específico para impressão
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Organizar dados da escala gerada
    let tableContent = "";
    let headerRow = "";

    if (generatedSchedule.length > 0) {
      // Criar cabeçalho da tabela
      headerRow = `
        <tr>
          <th style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5; text-align: center; font-weight: bold; width: 120px;">Data</th>
      `;

      // Adicionar colunas de especialização
      const availableSpecializations =
        specializations.length > 0
          ? specializations.map((s) => s.nome)
          : ["Plantão", "Cozinheiro", "Copeiro", "Permanência"];

      availableSpecializations.forEach((spec) => {
        headerRow += `<th style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5; text-align: center; font-weight: bold; min-width: 120px;">${spec}</th>`;
      });
      headerRow += "</tr>";

      // Criar linhas da tabela organizadas por data
      generatedSchedule.forEach((daySchedule) => {
        const formattedDate = format(new Date(daySchedule.date), "dd/MM\nEEE", {
          locale: ptBR,
        });
        const [dayMonth, dayOfWeek] = formattedDate.split("\n");

        let row = `
          <tr>
            <td style="border: 1px solid #000; padding: 8px; text-align: center; background-color: #f9f9f9; font-weight: bold;">
              <div>${dayMonth}</div>
              <div style="font-size: 10px;">${dayOfWeek.toUpperCase()}</div>
            </td>
        `;

        // Para cada especialização, encontrar quem está trabalhando
        availableSpecializations.forEach((spec) => {
          const workingMembers = daySchedule.assignments[spec] || [];

          const memberNames =
            workingMembers.length > 0
              ? workingMembers
                  .map((member) => member.nome.toUpperCase())
                  .join("<br>")
              : "";

          const backgroundColor =
            workingMembers.length > 0 ? "#e8e8e8" : "#ffffff";

          row += `<td style="border: 1px solid #000; padding: 8px; text-align: center; background-color: ${backgroundColor}; min-height: 40px; vertical-align: middle;">
            ${memberNames}
          </td>`;
        });

        row += "</tr>";
        tableContent += row;
      });
    }

    // Calcular período da escala
    const startDate = scaleGeneration.startDate;
    const endDate = scaleGeneration.endDate;

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Escala de Serviço - ${scaleName || "Nova Escala"}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .hospital-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          .scale-title {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 3px;
            text-transform: uppercase;
          }
          .period {
            font-size: 11px;
            margin-bottom: 5px;
          }
          .scale-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .scale-table th,
          .scale-table td {
            border: 1px solid #000;
            text-align: center;
            vertical-align: middle;
            font-size: 10px;
          }
          .scale-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            padding: 8px;
          }
          .scale-table td {
            padding: 6px;
            min-height: 35px;
          }
          .obs-section {
            margin-top: 20px;
            font-size: 10px;
          }
          .obs-title {
            font-weight: bold;
            margin-bottom: 8px;
          }
          .obs-item {
            margin-bottom: 3px;
            text-align: justify;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
          }
          .signature-section {
            margin-top: 40px;
            text-align: center;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            width: 300px;
            margin: 0 auto 5px auto;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital-name">${
            selectedOrganization
              ? selectedOrganization?.nome || "HOSPITAL"
              : "HOSPITAL"
          }</div>
          <div class="scale-title">ESCALA DE SERVIÇO DO SETOR DE ${
            selectedDepartment
              ? departments
                  .find((d) => d.id === selectedDepartment)
                  ?.nome?.toUpperCase() || "DEPARTAMENTO"
              : "DEPARTAMENTO"
          }</div>
          <div class="period">REFERENTE AO PERÍODO DE ${format(
            startDate,
            "dd",
            { locale: ptBR }
          )} A ${format(endDate, "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    }).toUpperCase()}</div>
        </div>

        <table class="scale-table">
          <thead>
            ${headerRow}
          </thead>
          <tbody>
            ${tableContent}
          </tbody>
        </table>

        <div class="obs-section">
          <div class="obs-title">OBS:</div>
          ${getObservacoesHtml()}
        </div>

        <div class="footer">
          <div>Hospital em João Pessoa-PB, ${format(
            new Date(),
            "dd 'de' MMMM 'de' yyyy",
            { locale: ptBR }
          )}.</div>
        </div>

        <div class="signature-section">
          <div style="margin-top: 60px;">
            <div class="signature-line"></div>
            <div style="margin-top: 5px; font-weight: bold;">
              RESPONSÁVEL PELA ESCALA - 1º Ten<br>
              Aprovisionador do ${selectedOrganization?.nome || "Hospital"}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Aguardar o carregamento e imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  const numberOfPeople = scaleMembers.length;
  const numberOfOnLeave = numberOfPeople > 0 ? numberOfPeople - 1 : 0;
  const numberOfWorking = numberOfPeople > 0 ? 1 : 0;

  if (!selectedOrganization) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Gerar Escala Preta e Vermelha
            </h1>
            <p className="text-muted-foreground">
              Selecione uma organização para continuar
            </p>
          </div>
        </div>
        <Card className="p-12">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhuma organização selecionada
            </h3>
            <p className="text-muted-foreground mb-4">
              Selecione uma organização no menu superior para começar a criar
              escalas
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div>
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NavigationButton href="/folgas/list" variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </NavigationButton>
            <div>
              <h1 className="text-3xl font-bold">
                Gerar Escala Preta e Vermelha
              </h1>
              <p className="text-muted-foreground">
                Configure a escala de folgas para o setor selecionado, adicione
                integrantes e gere a escala automaticamente.
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-2 cursor-help text-blue-600 hover:text-blue-800 font-medium">
                        ℹ️ Regras de Feriados
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <div className="space-y-2">
                        <p className="font-semibold text-blue-700">
                          Regras de Feriados na Escala Preta e Vermelha:
                        </p>
                        <ul className="text-xs space-y-1">
                          <li>
                            • Feriados nacionais aparecem destacados em vermelho
                            🎄
                          </li>
                          <li>
                            • Em feriados, mais pessoas ficam de folga (escala
                            reduzida)
                          </li>
                          <li>
                            • Períodos especiais (Natal/Ano Novo) têm regras
                            diferenciadas ⭐
                          </li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:grid-cols-5">
          {/* Configuração da Escala */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Configurar Escala
              </CardTitle>
              <CardDescription>
                Informações básicas e integrantes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Escala</label>
                <Input
                  placeholder="Ex: Escala de Folgas Janeiro 2024"
                  value={scaleName}
                  onChange={(e) => {
                    setScaleName(e.target.value);
                    if (nameInputError && e.target.value.trim()) {
                      setNameInputError(false);
                    }
                  }}
                  className={
                    nameInputError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }
                />
              </div>

              {/* Banner da Organização Selecionada */}
              {selectedOrganization && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Organização: {selectedOrganization.nome}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Departamento</label>
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                  disabled={!selectedOrganization}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.nome} ({dept.tipo_departamento})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seleção de Template de Observações */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Observações</label>
                <Select
                  value={selectedObservacaoTemplate}
                  onValueChange={setSelectedObservacaoTemplate}
                  disabled={!selectedOrganization}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {observacaoTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col">
                          <span>{template.nome}</span>
                          <span className="text-xs text-muted-foreground">
                            {template.observacoes.length} observações
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lógica da Escala */}
              {scaleMembers.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      Lógica da Escala por Especialização
                    </span>
                  </div>
                  <div className="text-sm text-blue-700 space-y-2">
                    <div className="mb-3 p-2 bg-blue-100 rounded text-blue-800">
                      <p className="font-medium text-xs">
                        Sistema Preta e Vermelha:
                      </p>
                      <p className="text-xs">
                        • Folgas iniciais = crédito/débito de folgas antes da
                        escala
                        <br />
                        • Pessoa com menos folgas acumuladas fica de folga
                        <br />• Rotação independente por especialização
                      </p>
                    </div>
                    {(() => {
                      // Agrupar por especialização para mostrar a lógica
                      const membersBySpec = new Map<
                        string,
                        EscalaFolgaMember[]
                      >();
                      scaleMembers.forEach((member) => {
                        const specKey =
                          member.especializacaoNome || "Sem Especialização";
                        if (!membersBySpec.has(specKey)) {
                          membersBySpec.set(specKey, []);
                        }
                        membersBySpec.get(specKey)!.push(member);
                      });

                      const activeMembersCount = scaleMembers.filter(
                        (m) => !m.apenasContabilizaFolgas
                      ).length;
                      const membersOnlyForLeaveCount = scaleMembers.filter(
                        (m) => m.apenasContabilizaFolgas
                      ).length;

                      return (
                        <div className="space-y-3">
                          {/* Resumo geral */}
                          <div className="border-l-2 border-green-300 pl-3 bg-green-50 p-2 rounded">
                            <p className="font-medium text-green-800">
                              Resumo Geral:
                            </p>
                            <p className="text-green-700">
                              • Total de integrantes: {scaleMembers.length}
                            </p>
                            <p className="text-green-700">
                              • Ativos (rotação): {activeMembersCount}
                            </p>
                            <p className="text-green-700">
                              • Apenas folgas (férias/licença):{" "}
                              {membersOnlyForLeaveCount}
                            </p>
                          </div>

                          {/* Por especialização */}
                          {Array.from(membersBySpec.entries()).map(
                            ([specName, members]) => {
                              const activeMembers = members.filter(
                                (m) => !m.apenasContabilizaFolgas
                              );
                              const onlyLeaveMembers = members.filter(
                                (m) => m.apenasContabilizaFolgas
                              );

                              return (
                                <div
                                  key={specName}
                                  className="border-l-2 border-blue-300 pl-3"
                                >
                                  <p className="font-medium">{specName}:</p>
                                  <p>• Total de pessoas: {members.length}</p>
                                  <p>
                                    • Ativos para rotação:{" "}
                                    {activeMembers.length}
                                  </p>
                                  {onlyLeaveMembers.length > 0 && (
                                    <p className="text-yellow-700">
                                      • Apenas folgas: {onlyLeaveMembers.length}
                                    </p>
                                  )}
                                  {activeMembers.length > 0 && (
                                    <>
                                      <p>• Trabalham por dia: 1</p>
                                      <p>
                                        • Folgas por dia:{" "}
                                        {activeMembers.length - 1}
                                      </p>
                                    </>
                                  )}
                                  {activeMembers.length < 2 &&
                                    activeMembers.length > 0 && (
                                      <p className="text-red-600 font-medium">
                                        ⚠️ Necessário pelo menos 2 pessoas
                                        ATIVAS para rotação
                                      </p>
                                    )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Adicionar Integrantes */}
              {selectedDepartment && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Adicionar Integrante</h4>
                    <div className="flex gap-2">
                      {/* Botão Adicionar Todos */}
                      {members.filter(
                        (member) =>
                          !scaleMembers.find((sm) => sm.id === member.id)
                      ).length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={addAllMembersToScale}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Adicionar Todos (
                                {
                                  members.filter(
                                    (member) =>
                                      !scaleMembers.find(
                                        (sm) => sm.id === member.id
                                      )
                                  ).length
                                }
                                )
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Adicionar todos os integrantes disponíveis do
                                departamento à escala
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Botão Adicionar por Especialização */}
                      {specializations.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Select
                                onValueChange={(value) =>
                                  addMembersBySpecialization(value)
                                }
                              >
                                <SelectTrigger className="w-auto text-purple-600 border-purple-200 hover:bg-purple-50">
                                  <Users className="h-4 w-4 mr-2" />
                                  <SelectValue placeholder="Adicionar por Especialização" />
                                </SelectTrigger>
                                <SelectContent>
                                  {specializations.map((spec) => {
                                    const availableCount = members.filter(
                                      (member) => {
                                        const alreadyInScale =
                                          scaleMembers.find(
                                            (sm) => sm.id === member.id
                                          );
                                        const hasSpecialization =
                                          member.especializacoes?.some(
                                            (e) => e.id === spec.id
                                          );
                                        return (
                                          !alreadyInScale && hasSpecialization
                                        );
                                      }
                                    ).length;

                                    return availableCount > 0 ? (
                                      <SelectItem
                                        key={spec.id}
                                        value={spec.id}
                                        disabled={availableCount === 0}
                                      >
                                        {spec.nome} ({availableCount} disponível
                                        {availableCount !== 1 ? "is" : ""})
                                      </SelectItem>
                                    ) : null;
                                  })}
                                </SelectContent>
                              </Select>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Adicionar todos os integrantes disponíveis de
                                uma especialização específica
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Botão Importar de Escala Anterior */}
                      {availableScales.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowImportDialog(true)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Importar de Escala Anterior
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Importar integrantes e folgas de uma escala já
                                criada
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum integrante encontrado neste departamento.
                    </p>
                  ) : members.filter(
                      (member) =>
                        !scaleMembers.find((sm) => sm.id === member.id)
                    ).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Todos os integrantes já foram adicionados à escala.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Selecionar Integrante
                        </label>
                        <Select
                          onValueChange={(memberId) => {
                            const member = members.find(
                              (m) => m.id === memberId
                            );
                            if (
                              member &&
                              !scaleMembers.find((sm) => sm.id === member.id)
                            ) {
                              setSelectedMemberToAdd(member);

                              // Verificar se há apenas uma especialização disponível
                              const availableSpecs =
                                member.especializacoes &&
                                member.especializacoes.length > 0
                                  ? member.especializacoes
                                      .map((e) =>
                                        specializations.find(
                                          (s) => s.id === e.id
                                        )
                                      )
                                      .filter(Boolean)
                                  : specializations;

                              // Se há apenas uma especialização disponível, adicionar automaticamente
                              if (availableSpecs.length === 1) {
                                setTimeout(() => {
                                  addMemberToScale(
                                    member,
                                    availableSpecs[0]!.id,
                                    false
                                  );
                                  setSelectedMemberToAdd(null);
                                  setMemberOnlyForLeaveCount(false);
                                }, 100);
                              }
                            }
                          }}
                          value={selectedMemberToAdd?.id || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha um integrante" />
                          </SelectTrigger>
                          <SelectContent>
                            {members
                              .filter(
                                (member) =>
                                  !scaleMembers.find(
                                    (sm) => sm.id === member.id
                                  )
                              )
                              .map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  <div className="flex flex-col">
                                    <span>{member.nome}</span>
                                    {member.especializacoes &&
                                      member.especializacoes.length > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                          {member.especializacoes
                                            .map((e) => e.nome)
                                            .join(", ")}
                                        </span>
                                      )}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Select de Especialização - Aparece após selecionar integrante */}
                      {selectedMemberToAdd && (
                        <div className="space-y-2">
                          {/* <label className="text-sm font-medium">
                            Configurações para {selectedMemberToAdd.nome}
                          </label> */}

                          {/* Checkbox para apenas contabilizar folgas */}
                          {/* <div className="flex items-center space-x-2 p-3rounded">
                            <Checkbox
                              id="apenasContabilizaFolgas"
                              checked={memberOnlyForLeaveCount}
                              onCheckedChange={(checked) =>
                                setMemberOnlyForLeaveCount(checked === true)
                              }
                            />
                            <label
                              htmlFor="apenasContabilizaFolgas"
                              className="text-sm font-medium cursor-pointer"
                            >
                              Apenas contabilizar folgas (férias/licença)
                            </label>
                          </div>
                          {memberOnlyForLeaveCount && (
                            <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                              ℹ️ Este integrante não participará da rotação de
                              trabalho, apenas acumulará folgas todos os dias
                              (ideal para quem está de férias ou licença).
                            </p>
                          )} */}

                          <div className="space-y-2">
                            {!memberOnlyForLeaveCount && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Selecionar Especialização
                                </label>
                                {(() => {
                                  const availableSpecs =
                                    selectedMemberToAdd.especializacoes &&
                                    selectedMemberToAdd.especializacoes.length >
                                      0
                                      ? selectedMemberToAdd.especializacoes
                                          .map((e) =>
                                            specializations.find(
                                              (s) => s.id === e.id
                                            )
                                          )
                                          .filter(Boolean)
                                      : specializations;

                                  // Se há apenas uma especialização, mostrar info e adicionar automaticamente
                                  if (availableSpecs.length === 1) {
                                    return (
                                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                        <div className="flex items-center gap-2">
                                          <div className="text-sm font-medium text-green-800">
                                            ✓ Especialização selecionada
                                            automaticamente:{" "}
                                            {availableSpecs[0]!.nome}
                                          </div>
                                        </div>
                                        <p className="text-xs text-green-700 mt-1">
                                          Como há apenas uma especialização
                                          disponível, ela foi selecionada
                                          automaticamente.
                                        </p>
                                      </div>
                                    );
                                  }

                                  // Se há múltiplas especializações, mostrar o select normal
                                  return (
                                    <Select
                                      onValueChange={(especializacaoId) => {
                                        addMemberToScale(
                                          selectedMemberToAdd,
                                          especializacaoId === "none"
                                            ? undefined
                                            : especializacaoId,
                                          memberOnlyForLeaveCount
                                        );
                                        setSelectedMemberToAdd(null);
                                        setMemberOnlyForLeaveCount(false);
                                      }}
                                      value=""
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Escolha uma especialização" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">
                                          <span className="text-muted-foreground">
                                            Sem especialização
                                          </span>
                                        </SelectItem>
                                        {availableSpecs.map((spec) => (
                                          <SelectItem
                                            key={spec!.id}
                                            value={spec!.id}
                                          >
                                            {spec!.nome}
                                            {selectedMemberToAdd.especializacoes?.find(
                                              (e) => e.id === spec!.id
                                            ) && (
                                              <span className="text-xs text-blue-600 ml-2">
                                                (Cadastrada)
                                              </span>
                                            )}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  );
                                })()}
                              </div>
                            )}

                            <div className="flex gap-2">
                              {memberOnlyForLeaveCount && (
                                <Button
                                  onClick={() => {
                                    addMemberToScale(
                                      selectedMemberToAdd,
                                      undefined,
                                      memberOnlyForLeaveCount
                                    );
                                    setSelectedMemberToAdd(null);
                                    setMemberOnlyForLeaveCount(false);
                                  }}
                                  size="sm"
                                  className="flex-1"
                                >
                                  Adicionar (Apenas Folgas)
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedMemberToAdd(null);
                                  setMemberOnlyForLeaveCount(false);
                                }}
                                className={
                                  memberOnlyForLeaveCount ? "flex-1" : "w-full"
                                }
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Configurações de Período */}
              {scaleMembers.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Período da Escala</h4>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Data Início
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(scaleGeneration.startDate, "dd/MM/yyyy")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={scaleGeneration.startDate}
                              onSelect={(date) =>
                                date &&
                                setScaleGeneration({
                                  ...scaleGeneration,
                                  startDate: date,
                                })
                              }
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Data Fim</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(scaleGeneration.endDate, "dd/MM/yyyy")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={scaleGeneration.endDate}
                              onSelect={(date) =>
                                date &&
                                setScaleGeneration({
                                  ...scaleGeneration,
                                  endDate: date,
                                })
                              }
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        Dias de Trabalho
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help text-blue-600 hover:text-blue-800">
                                ℹ️
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Selecione os dias da semana em que a escala deve
                                ser gerada
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <div
                            key={day.key}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={day.key}
                              checked={scaleGeneration.workingDays.includes(
                                day.key
                              )}
                              onCheckedChange={() => toggleWorkingDay(day.key)}
                            />
                            <label
                              htmlFor={day.key}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {day.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Integrantes da Escala */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Integrantes da Escala</CardTitle>
                  <CardDescription>
                    {scaleMembers.length} integrante
                    {scaleMembers.length !== 1 ? "s" : ""} adicionado
                    {scaleMembers.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
                {scaleMembers.length > 0 && (
                  <div className="flex gap-2">
                    {/* Botão Marcar Todos como Trabalho 24h */}
                    {scaleMembers.filter((m) => !m.apenasContabilizaFolgas)
                      .length > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={toggleAllTrabalho24h}
                              className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                              <div className="h-4 w-4 mr-2 rounded bg-orange-600 text-white text-xs flex items-center justify-center font-bold">
                                24
                              </div>
                              {scaleMembers
                                .filter((m) => !m.apenasContabilizaFolgas)
                                .every((m) => m.trabalho24h)
                                ? "Desmarcar"
                                : "Marcar"}{" "}
                              Todos 24h
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {scaleMembers
                                .filter((m) => !m.apenasContabilizaFolgas)
                                .every((m) => m.trabalho24h)
                                ? "Desmarcar todos os integrantes como trabalho de 24h"
                                : "Marcar todos os integrantes ativos como trabalho de 24h"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Botão Marcar Todos como Dois Dias Consecutivos Escala Vermelha */}
                    {scaleMembers.filter((m) => !m.apenasContabilizaFolgas)
                      .length > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={toggleAllDoisDiasConsecutivosVermelha}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <div className="h-4 w-4 mr-2 rounded bg-red-600 text-white text-xs flex items-center justify-center font-bold">
                                2D
                              </div>
                              {scaleMembers
                                .filter((m) => !m.apenasContabilizaFolgas)
                                .every((m) => m.doisDiasConsecutivosVermelha)
                                ? "Desmarcar"
                                : "Marcar"}{" "}
                              Todos 2 Dias Vermelha
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {scaleMembers
                                .filter((m) => !m.apenasContabilizaFolgas)
                                .every((m) => m.doisDiasConsecutivosVermelha)
                                ? "Desmarcar todos os integrantes para trabalho de dois dias consecutivos na escala vermelha"
                                : "Marcar todos os integrantes ativos para trabalharem dois dias consecutivos na escala vermelha (sábado e domingo)"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={removeAllMembersFromScale}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remover Todos
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remover todos os integrantes da escala</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {scaleMembers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    Nenhum integrante adicionado
                  </p>
                  <p className="text-sm">
                    Selecione um departamento e adicione integrantes à escala
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Lista de Integrantes */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Integrantes Participantes</h4>
                    {scaleMembers.map((member) => (
                      <div
                        key={member.id}
                        className={`flex justify-between items-center p-3 rounded-2xl ${
                          member.apenasContabilizaFolgas ? "" : "bg-muted/50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.nome}</span>
                            {member.especializacaoNome && (
                              <Badge variant="outline">
                                {member.especializacaoNome}
                              </Badge>
                            )}
                            {member.apenasContabilizaFolgas && (
                              <Badge
                                variant="destructive"
                                className="bg-yellow-600"
                              >
                                Apenas Folgas
                              </Badge>
                            )}
                            {member.importadoDeEscala && (
                              <Badge
                                variant="secondary"
                                className="bg-blue-100 text-blue-700 border-blue-300"
                              >
                                Importado
                              </Badge>
                            )}
                            {member.trabalho24h && (
                              <Badge
                                variant="secondary"
                                className="bg-orange-100 text-orange-700 border-orange-300"
                              >
                                24h
                              </Badge>
                            )}
                            {member.doisDiasConsecutivosVermelha && (
                              <Badge
                                variant="secondary"
                                className="bg-red-100 text-red-700 border-red-300"
                              >
                                2D Vermelha
                              </Badge>
                            )}
                          </div>
                          {member.apenasContabilizaFolgas && (
                            <p className="text-xs text-yellow-700 mt-1">
                              🏖️ Este integrante está de férias/licença e apenas
                              contabiliza folgas
                            </p>
                          )}
                          {member.importadoDeEscala && (
                            <p className="text-xs text-blue-700 mt-1">
                              📥 Dados importados de escala anterior (folgas
                              preservadas)
                            </p>
                          )}

                          {/* Explicação sobre folgas iniciais 
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2 mb-2">
                            <p className="text-xs text-blue-800">
                              <strong>💡 Como funcionam as folgas iniciais:</strong>
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              As folgas iniciais representam o estado do integrante no <strong>ÚLTIMO DIA</strong> da escala correspondente (preta ou vermelha) <strong>ANTES</strong> do início da escala. 
                              Por exemplo: se a escala começa no dia 22 (preta) e você digita "4 folgas pretas", significa que ele tinha 4 folgas no último dia de preta antes do dia 22.
                            </p>
                          </div>
                          */}

                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <label className="text-sm cursor-help">
                                      Folgas Preta:
                                    </label>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Folgas da escala preta (dias de semana - segunda a sexta)
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      ⚠️ Representa as folgas que o integrante tinha no último dia de preta antes do início da escala
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Input
                                type="number"
                                min="0"
                                value={member.folgasInicaisPreta}
                                onChange={(e) =>
                                  updateMemberFolgasSeparadas(
                                    member.id,
                                    parseInt(e.target.value) || 0,
                                    member.folgasIniciaisVermelha
                                  )
                                }
                                className="w-16 h-8"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <label className="text-sm cursor-help">
                                      Folgas Vermelha:
                                    </label>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Folgas da escala vermelha (finais de semana - sábado e domingo)
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      ⚠️ Representa as folgas que o integrante tinha no último dia de vermelha antes do início da escala
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Input
                                type="number"
                                min="0"
                                value={member.folgasIniciaisVermelha}
                                onChange={(e) =>
                                  updateMemberFolgasSeparadas(
                                    member.id,
                                    member.folgasInicaisPreta,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-16 h-8"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <label className="text-sm cursor-help">
                                      Participa da escala:
                                    </label>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Escolha se participa apenas da escala
                                      preta (dias úteis), vermelha (finais de
                                      semana) ou ambas
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Select
                                value={member.tipoParticipacao}
                                onValueChange={(
                                  value: "ambas" | "preta" | "vermelha"
                                ) =>
                                  updateMemberTipoParticipacao(member.id, value)
                                }
                              >
                                <SelectTrigger className="w-32 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ambas">
                                    <div className="flex items-center gap-2">
                                      <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-black rounded"></div>
                                        <div className="w-2 h-2 bg-red-500 rounded"></div>
                                      </div>
                                      Ambas
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="preta">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-black rounded"></div>
                                      Preta (dias úteis)
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="vermelha">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                                      Vermelha (finais de semana)
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Checkbox
                                      id={`doisDiasVermelha-${member.id}`}
                                      checked={
                                        member.doisDiasConsecutivosVermelha ||
                                        false
                                      }
                                      onCheckedChange={(checked) =>
                                        updateMemberDoisDiasConsecutivosVermelha(
                                          member.id,
                                          checked === true
                                        )
                                      }
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Se marcado, este integrante irá trabalhar
                                      dois dias consecutivos da escala vermelha
                                      (sábado e domingo)
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <label
                                htmlFor={`doisDiasVermelha-${member.id}`}
                                className="text-sm cursor-pointer"
                              >
                                2 Dias Consecutivos Vermelha
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Checkbox
                                      id={`trabalho24h-${member.id}`}
                                      checked={member.trabalho24h || false}
                                      onCheckedChange={(checked) =>
                                        updateMemberTrabalho24h(
                                          member.id,
                                          checked === true
                                        )
                                      }
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Se marcado, este integrante não poderá ser
                                      escalado no dia seguinte quando trabalhar
                                      (ideal para plantões de 24h)
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <label
                                htmlFor={`trabalho24h-${member.id}`}
                                className="text-sm cursor-pointer"
                              >
                                Trabalho 24h
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Checkbox
                                      id={`ferias-${member.id}`}
                                      checked={
                                        member.apenasContabilizaFolgas || false
                                      }
                                      onCheckedChange={(checked) =>
                                        updateMemberFeriasLicenca(
                                          member.id,
                                          checked === true
                                        )
                                      }
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Se marcado, este integrante apenas
                                      contabilizará folgas (não será escalado
                                      para trabalhar - ideal para
                                      férias/licença)
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <label
                                htmlFor={`ferias-${member.id}`}
                                className="text-sm cursor-pointer"
                              >
                                Férias/Licença
                              </label>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => removeMemberFromScale(member.id)}
                          variant="outline"
                          size="sm"
                          className="ml-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={generateSchedule}
                          className="w-full"
                          disabled={scaleMembers.length < 2}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Gerar Escala
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Gera automaticamente a escala de folgas baseada nas
                          configurações e folgas dos integrantes
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {generatedSchedule.length > 0 && (
                    <Button
                      onClick={() => {
                        setGeneratedSchedule([]);
                        toast.success(
                          "Escala limpa. Você pode fazer ajustes e gerar novamente."
                        );
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar Escala e Editar
                    </Button>
                  )}

                  {/* Preview da Escala Gerada */}
                  {generatedSchedule.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Preview da Escala Gerada</h4>
                      <CalendarTable
                        calendarData={getCalendarDataFromGenerated()!}
                        getMemberSpecializationColor={
                          getMemberSpecializationColor
                        }
                        getSpecializationColor={getSpecializationColor}
                        showLegend={true}
                      />
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    {generatedSchedule.length > 0 && (
                      <>
                        <Button
                          onClick={() => {
                            if (!scaleName.trim()) {
                              toast.error("O nome da escala é obrigatório.");
                              setNameInputError(true);
                              return;
                            }
                            if (
                              scaleMembers.length === 0 ||
                              generatedSchedule.length === 0 ||
                              loading
                            ) {
                              return;
                            }
                            saveScale();
                          }}
                          size="sm"
                        >
                          {loading ? (
                            "Salvando..."
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Salvar Escala
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feriados Personalizados */}
        <FeriadosPersonalizados
          feriadoManager={new FeriadoManager(selectedOrganization?.id, userId)}
          onFeriadoChange={() => {
            // Se há escala gerada, sugerir regeneração
            if (generatedSchedule.length > 0) {
              toast.info("Feriados alterados", {
                description:
                  "Considere regenerar a escala para aplicar as mudanças",
              });
            }
          }}
        />

        {/* Layout Otimizado para Impressão - Invisível na tela */}
        {generatedSchedule.length > 0 && (
          <div id="scale-print-preview" className="hidden">
            <div className="print-header">
              <div className="print-title">
                {scaleName || "Escala de Folgas"}
              </div>
              <div className="print-subtitle">
                {selectedOrganization?.nome} -{" "}
                {departments.find((d) => d.id === selectedDepartment)?.nome}
              </div>
              <div className="print-info">
                Período: {format(scaleGeneration.startDate, "dd/MM/yyyy")} a{" "}
                {format(scaleGeneration.endDate, "dd/MM/yyyy")} | Gerado em:{" "}
                {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
              </div>
            </div>

            {/* Resumo da Escala */}
            <div className="print-summary">
              <div className="print-summary-title">Resumo da Escala</div>
              <div className="print-summary-grid">
                <div>
                  <strong>Total de Participantes:</strong> {scaleMembers.length}
                  <br />
                  <strong>Folgas por dia:</strong> {numberOfOnLeave}
                  <br />
                  <strong>Trabalhando por dia:</strong> {numberOfWorking}
                </div>
                <div>
                  <strong>Dias programados:</strong> {generatedSchedule.length}
                  <br />
                  <strong>Período:</strong>{" "}
                  {format(scaleGeneration.startDate, "dd/MM")} a{" "}
                  {format(scaleGeneration.endDate, "dd/MM")}
                </div>
              </div>
            </div>

            {/* Tabela Principal - Formato similar à imagem */}
            <table className="print-table">
              <thead>
                <tr>
                  <th className="print-date">Data</th>
                  {/* Cabeçalhos dinâmicos das especializações */}
                  {Array.from(
                    new Set(
                      scaleMembers
                        .map((m) => m.especializacaoNome)
                        .filter(Boolean)
                    )
                  ).map((spec) => (
                    <th key={spec}>{spec}</th>
                  ))}
                  {scaleMembers.some((m) => !m.especializacaoNome) && (
                    <th>Sem Especialização</th>
                  )}
                  <th>De Folga</th>
                </tr>
              </thead>
              <tbody>
                {generatedSchedule.map((day, index) => {
                  const dateKey = day.date.toISOString().split("T")[0];
                  const dayHolidayInfo = holidayInfo[dateKey] || {
                    isHoliday: false,
                    isSpecialPeriod: false,
                    info: null,
                  };
                  const {
                    isHoliday,
                    isSpecialPeriod,
                    info: holidayInfoData,
                  } = dayHolidayInfo;

                  return (
                    <tr
                      key={index}
                      className={
                        isHoliday || isSpecialPeriod
                          ? "bg-red-50 border-red-200"
                          : ""
                      }
                    >
                      <td className="print-date">
                        <strong className={isHoliday ? "text-red-600" : ""}>
                          {format(day.date, "dd/MM", { locale: ptBR })}
                        </strong>
                        <br />
                        <small className={isHoliday ? "text-red-500" : ""}>
                          {format(day.date, "EEE", {
                            locale: ptBR,
                          }).toUpperCase()}
                        </small>
                        {isHoliday && holidayInfoData && (
                          <>
                            <br />
                            <small className="text-red-500 font-medium">
                              🎄 {holidayInfoData.nome}
                            </small>
                          </>
                        )}
                        {isSpecialPeriod && !isHoliday && (
                          <>
                            <br />
                            <small className="text-orange-500 font-medium">
                              ⭐ Período Especial
                            </small>
                          </>
                        )}
                      </td>
                      {/* Células dinâmicas para cada especialização */}
                      {Array.from(
                        new Set(
                          scaleMembers
                            .map((m) => m.especializacaoNome)
                            .filter(Boolean)
                        )
                      ).map((spec) => (
                        <td key={spec} className="print-working">
                          <div className="print-members">
                            {(day.assignments[spec!] || []).map(
                              (member, idx) => (
                                <div key={member.id}>
                                  {member.nome}
                                  {member.trabalho24h && (
                                    <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded ml-1">
                                      24h
                                    </span>
                                  )}
                                  {member.excecaoTrabalho24h && (
                                    <span className="text-xs bg-red-100 text-red-800 px-1 rounded ml-1">
                                      ⚠️ Exceção
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </td>
                      ))}
                      {scaleMembers.some((m) => !m.especializacaoNome) && (
                        <td className="print-working">
                          <div className="print-members">
                            {(day.assignments["Sem Especialização"] || []).map(
                              (member, idx) => (
                                <div key={member.id}>
                                  {member.nome}
                                  {member.trabalho24h && (
                                    <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded ml-1">
                                      24h
                                    </span>
                                  )}
                                  {member.excecaoTrabalho24h && (
                                    <span className="text-xs bg-red-100 text-red-800 px-1 rounded ml-1">
                                      ⚠️ Exceção
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </td>
                      )}
                      <td className="print-leave">
                        <div className="print-members">
                          {day.onLeave.map((member, idx) => {
                            // Verificar se está de folga por trabalho 24h do dia anterior
                            const previousDay = new Date(day.date);
                            previousDay.setDate(previousDay.getDate() - 1);
                            const previousDayEntry = generatedSchedule.find(
                              (entry) =>
                                entry.date.toDateString() ===
                                previousDay.toDateString()
                            );

                            const was24hYesterday =
                              previousDayEntry?.working.some(
                                (workingMember) =>
                                  workingMember.id === member.id &&
                                  workingMember.trabalho24h
                              );

                            return (
                              <div key={member.id}>
                                {member.nome}
                                {was24hYesterday && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded ml-1">
                                    Pós-24h
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Lista de Participantes com Folgas */}
            <div className="print-summary" style={{ marginTop: "20px" }}>
              <div className="print-summary-title">Participantes e Folgas</div>
              <div className="print-summary-grid">
                {scaleMembers.map((member, index) => (
                  <div key={member.id} style={{ marginBottom: "5px" }}>
                    <strong>{member.nome}</strong> | Folgas iniciais:{" "}
                    {member.folgasIniciais} | Folgas finais:{" "}
                    {member.folgasAtuais}
                    <br />
                    <small style={{ color: "#666" }}>
                      📅 Escala Preta (dias úteis):{" "}
                      {member.folgasAtualPreta || 0} folgas |{" "}
                      <span style={{ color: "#DC2626" }}>
                        🔴 Escala Vermelha (finais de semana):{" "}
                        {member.folgasAtualVermelha || 0} folgas
                      </span>
                      {member.tipoParticipacao !== "ambas" && (
                        <span
                          style={{ fontWeight: "bold", marginLeft: "10px" }}
                        >
                          | Participa apenas da escala{" "}
                          {member.tipoParticipacao === "preta"
                            ? "PRETA (dias úteis)"
                            : "VERMELHA (finais de semana)"}
                        </span>
                      )}
                    </small>
                    {member.especializacaoNome && (
                      <span>
                        <br />
                        <small>
                          Especialização: {member.especializacaoNome}
                        </small>
                      </span>
                    )}
                    {member.trabalho24h && (
                      <span>
                        <br />
                        <small style={{ color: "#D97706", fontWeight: "bold" }}>
                          ⏰ Trabalho de 24 horas (não pode trabalhar no dia
                          seguinte)
                        </small>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Observações */}
            <div style={{ marginTop: "30px", fontSize: "11px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
                OBS:
              </div>
              <div style={{ marginBottom: "5px" }}>
                1. O integrante que estiver de folga é responsável pela
                cobertura em caso de ausência;
              </div>
              <div style={{ marginBottom: "5px" }}>
                2. Verificar disponibilidade antes de assumir o serviço;
              </div>
              <div style={{ marginBottom: "5px" }}>
                3. Em caso de dúvidas, consultar a coordenação;
              </div>
              <div style={{ marginBottom: "5px" }}>
                4. A troca de serviço poderá ser autorizada pela coordenação.
              </div>
              <div
                style={{
                  marginTop: "15px",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                Legenda:
              </div>
              <div style={{ marginBottom: "5px" }}>
                •{" "}
                <span
                  style={{
                    backgroundColor: "#FEF3C7",
                    padding: "2px 4px",
                    borderRadius: "3px",
                  }}
                >
                  24h
                </span>{" "}
                = Trabalho de 24 horas
              </div>
              <div style={{ marginBottom: "5px" }}>
                •{" "}
                <span
                  style={{
                    backgroundColor: "#DBEAFE",
                    padding: "2px 4px",
                    borderRadius: "3px",
                  }}
                >
                  Pós-24h
                </span>{" "}
                = Folga obrigatória após trabalho de 24h
              </div>
              <div style={{ marginBottom: "5px" }}>
                •{" "}
                <span
                  style={{
                    backgroundColor: "#FEE2E2",
                    padding: "2px 4px",
                    borderRadius: "3px",
                  }}
                >
                  ⚠️ Exceção
                </span>{" "}
                = Trabalho forçado após 24h (situação crítica - todos
                trabalharam 24h no dia anterior)
              </div>
            </div>

            {/* Assinatura */}
            <div
              style={{
                marginTop: "40px",
                textAlign: "center",
                fontSize: "12px",
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                {selectedOrganization?.nome} em{" "}
                {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                .
              </div>
              <div
                style={{
                  marginTop: "40px",
                  borderTop: "1px solid #000",
                  width: "300px",
                  margin: "0 auto",
                  paddingTop: "5px",
                }}
              >
                Coordenação -{" "}
                {departments.find((d) => d.id === selectedDepartment)?.nome}
              </div>
            </div>
          </div>
        )}

        {/* Dialog para Importação de Escalas */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Importar Dados de Escala Anterior
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-blue-600 hover:text-blue-800">
                        ℹ️
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <div className="space-y-2">
                        <p className="font-semibold">
                          Como funciona a importação:
                        </p>
                        <ul className="text-xs space-y-1">
                          <li>
                            • Os integrantes da escala selecionada serão
                            adicionados automaticamente
                          </li>
                          <li>
                            • As folgas atuais serão usadas como folgas iniciais
                            na nova escala
                          </li>
                          <li>
                            • Especialização e configurações são preservadas
                          </li>
                          <li>
                            • Integrantes já adicionados não serão duplicados
                          </li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DialogTitle>
              <DialogDescription>
                Selecione uma escala anterior para importar os dados de folgas
                dos integrantes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Escala para Importar
                </label>
                <Select
                  value={selectedScaleToImport}
                  onValueChange={(value) => {
                    setSelectedScaleToImport(value);
                    generateImportPreview(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma escala anterior" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableScales.map((scale) => (
                      <SelectItem key={scale.id} value={scale.id}>
                        <div className="flex flex-col">
                          <span>{scale.nome}</span>
                          <span className="text-xs text-muted-foreground">
                            Criada em:{" "}
                            {format(
                              new Date(scale.created_at),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR }
                            )}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {previewImportData.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Prévia dos Dados a Importar (
                    {previewImportData.filter((p) => !p.jaAdicionado).length}{" "}
                    novos integrantes)
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                    {previewImportData.map((item) => (
                      <div
                        key={item.id}
                        className={`flex justify-between items-center py-1 px-2 rounded text-sm ${
                          item.jaAdicionado
                            ? "bg-gray-200 text-gray-500"
                            : "bg-white"
                        }`}
                      >
                        <span
                          className={item.jaAdicionado ? "line-through" : ""}
                        >
                          {item.nome}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                            {item.folgasAtuais} folgas
                          </span>
                          {item.apenasContabilizaFolgas && (
                            <Badge variant="secondary" className="text-xs">
                              Férias/Licença
                            </Badge>
                          )}
                          {item.jaAdicionado && (
                            <Badge variant="outline" className="text-xs">
                              Já adicionado
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportDialog(false);
                  setSelectedScaleToImport("");
                  setPreviewImportData([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={importScaleData}
                disabled={
                  !selectedScaleToImport ||
                  previewImportData.filter((p) => !p.jaAdicionado).length === 0
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Importar{" "}
                {previewImportData.filter((p) => !p.jaAdicionado).length}{" "}
                Integrante(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
