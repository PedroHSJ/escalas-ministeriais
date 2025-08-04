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
  Clock,
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { EscalaFolgaMember } from "@/types/escala-folgas";
import { TipoTurno } from "@/types/plantoes";
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

interface PlantaoMember extends EscalaFolgaMember {
  tipos_turnos_disponiveis: string[]; // IDs dos tipos de turnos disponíveis
  horas_minimas_semana: number;
  horas_maximas_semana: number;
  disponivel_fins_semana: boolean;
  prioridade: number; // 1=baixa, 2=normal, 3=alta
  horasTrabalhadasSemana?: number; // Controle temporal
  ultimoTurno?: string; // Controle temporal
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
  const { userId } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [tiposTurnos, setTiposTurnos] = useState<TipoTurno[]>([]);
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
  const [selectedTurnosForMember, setSelectedTurnosForMember] = useState<
    string[]
  >([]);

  // Estados para importação de escalas
  const [availableScales, setAvailableScales] = useState<any[]>([]);
  const [selectedScaleToImport, setSelectedScaleToImport] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [previewImportData, setPreviewImportData] = useState<any[]>([]);

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
      working?: EscalaFolgaMember[];
      onLeave?: EscalaFolgaMember[];
      assignments?: Record<string, EscalaFolgaMember[]>;
      shifts?: Array<{
        turnoNome: string;
        horaInicio: string;
        horaFim: string;
        integrante: PlantaoMember;
        especialização: string;
      }>;
    }>
  >([]);

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

    // Obter todas as especializações únicas
    const specializations = Array.from(
      new Set(
        scaleMembers
          .map((member) => member.especializacaoNome)
          .filter((name): name is string => Boolean(name))
      )
    );

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
      let consecutiveDaysOffPreta = 0;
      let consecutiveDaysOffVermelha = 0;

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

        // Determinar se é escala preta ou vermelha
        const dayOfWeek = day.date.getDay(); // 0 = domingo, 6 = sábado
        const isEscalaVermelha = dayOfWeek === 0 || dayOfWeek === 6;
        const isEscalaPreta = !isEscalaVermelha;

        const isWorking = day.working?.some((w) => w.id === member.id) || false;
        const isOnLeave = day.onLeave?.some((l) => l.id === member.id) || false;

        // Para plantões, verificar se o membro está trabalhando em algum turno
        const isWorkingShift =
          day.shifts?.some((s) => s.integrante.id === member.id) || false;

        if (isWorking || isWorkingShift) {
          // Dia de trabalho - resetar apenas o contador da escala correspondente
          if (isEscalaPreta) {
            consecutiveDaysOffPreta = 0;
          } else {
            consecutiveDaysOffVermelha = 0;
          }

          // Para plantões, incluir informação do turno
          let observacao = member.especializacaoNome;
          if (isWorkingShift && day.shifts) {
            const memberShift = day.shifts.find(
              (s) => s.integrante.id === member.id
            );
            if (memberShift) {
              observacao = `${memberShift.turnoNome} (${memberShift.horaInicio}-${memberShift.horaFim})`;
            }
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
            color: "#fecaca", // Vermelho claro para folga
          };
        }
      });
    });

    return {
      dates,
      specializations,
      matrix: calendarMatrix,
      members: scaleMembers.map((m) => m.nome),
    };
  };

  // Função para obter cores das especializações
  const getSpecializationColor = (index: number) => {
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

  const fetchTiposTurnos = async (organizationId: string) => {
    const { data, error } = await supabase
      .from("tipos_turnos")
      .select("*")
      .eq("organizacao_id", organizationId)
      .eq("ativo", true)
      .order("hora_inicio");

    if (!error && data) {
      setTiposTurnos(data);
    } else {
      // Se não houver turnos cadastrados, criar turnos padrão
      setTiposTurnos([
        {
          id: "manha",
          nome: "Manhã",
          hora_inicio: "06:00",
          hora_fim: "12:00",
          duracao_horas: 6,
          organizacao_id: organizationId,
          ativo: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "tarde",
          nome: "Tarde",
          hora_inicio: "12:00",
          hora_fim: "18:00",
          duracao_horas: 6,
          organizacao_id: organizationId,
          ativo: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "noite",
          nome: "Noite",
          hora_inicio: "18:00",
          hora_fim: "00:00",
          duracao_horas: 6,
          organizacao_id: organizationId,
          ativo: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "madrugada",
          nome: "Madrugada",
          hora_inicio: "00:00",
          hora_fim: "06:00",
          duracao_horas: 6,
          organizacao_id: organizationId,
          ativo: true,
          created_at: new Date().toISOString(),
        },
      ]);
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
          folgas_atuais,
          apenas_contabiliza_folgas,
          integrante:integrantes(
            id,
            nome
          )
        `
        )
        .eq("escala_folga_id", scaleId);

      if (error) throw error;

      const preview =
        participacoes?.map((p: any) => ({
          id: p.integrante.id,
          nome: p.integrante.nome,
          folgasAtuais: p.folgas_atuais,
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

    try {
      // Buscar participações da escala selecionada
      const { data: participacoes, error } = await supabase
        .from("escala_folgas_participacoes")
        .select(
          `
          integrante_id,
          folgas_atuais,
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

      // Processar e adicionar os integrantes à escala atual
      const importedMembers: EscalaFolgaMember[] = [];

      participacoes.forEach((participacao: any) => {
        if (participacao.integrante) {
          // Verificar se o integrante já foi adicionado
          if (!scaleMembers.find((m) => m.id === participacao.integrante.id)) {
            // Buscar especialização principal do integrante
            const especializacaoPrincipal =
              participacao.integrante.integrante_especializacoes?.[0];

            const newMember: EscalaFolgaMember = {
              id: participacao.integrante.id,
              nome: participacao.integrante.nome,
              folgasIniciais: participacao.folgas_atuais, // Usar folgas atuais como iniciais para nova escala
              folgasAtuais: participacao.folgas_atuais,
              // Inicializar contadores separados (distribuir folgas existentes igualmente)
              folgasInicaisPreta: Math.floor(participacao.folgas_atuais / 2),
              folgasAtualPreta: Math.floor(participacao.folgas_atuais / 2),
              folgasIniciaisVermelha: Math.ceil(participacao.folgas_atuais / 2),
              folgasAtualVermelha: Math.ceil(participacao.folgas_atuais / 2),
              posicaoAtual: importedMembers.length + scaleMembers.length + 1,
              ativo: true,
              especializacaoId: especializacaoPrincipal?.especializacoes?.id,
              especializacaoNome:
                especializacaoPrincipal?.especializacoes?.nome,
              apenasContabilizaFolgas:
                participacao.apenas_contabiliza_folgas || false,
              importadoDeEscala: selectedScaleToImport, // Marcar que foi importado
              tipoParticipacao: "ambas", // Por padrão, participa de ambas as escalas
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

      toast.success(
        `${importedMembers.length} integrante(s) importado(s) com sucesso!`,
        {
          description:
            "Os valores de folgas foram preservados da escala anterior.",
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
      fetchTiposTurnos(selectedOrganization.id);
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
      toast.info("Departamento selecionado automaticamente", {
        description: `${departments[0].nome} foi selecionado por ser o único disponível.`,
      });
    }
  }, [departments, selectedDepartment]);

  const addMemberToScale = (
    member: Member,
    especializacaoId?: string,
    apenasContabilizaFolgas = false,
    turnosDisponiveis: string[] = []
  ) => {
    if (scaleMembers.find((m) => m.id === member.id)) {
      toast.error("Este integrante já foi adicionado à escala");
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
      posicaoAtual: scaleMembers.length + 1,
      ativo: true,
      especializacaoId: especializacaoId,
      especializacaoNome: especialização?.nome,
      apenasContabilizaFolgas: apenasContabilizaFolgas,
      tipoParticipacao: "ambas", // Por padrão, participa de ambas as escalas
      trabalho24h: false, // Por padrão, não é trabalho de 24h
      // Propriedades específicas para plantões
      tipos_turnos_disponiveis: turnosDisponiveis,
      horas_minimas_semana: 24,
      horas_maximas_semana: 48,
      disponivel_fins_semana: true,
      prioridade: 2,
    } as any;

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
        posicaoAtual: scaleMembers.length + addedCount + 1,
        ativo: true,
        especializacaoId: selectedSpecId,
        especializacaoNome: especialização?.nome,
        apenasContabilizaFolgas: false,
        tipoParticipacao: "ambas",
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
    const especialização = specializations.find(
      (s) => s.id === especializacaoId
    );

    if (!especialização) {
      toast.error("Especialização não encontrada");
      return;
    }

    // Filtrar membros que têm esta especialização e não estão na escala
    const availableMembers = members.filter((member) => {
      // Verificar se o membro não está na escala
      const alreadyInScale = scaleMembers.find((sm) => sm.id === member.id);
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
        posicaoAtual: scaleMembers.length + addedCount + 1,
        ativo: true,
        especializacaoId: especializacaoId,
        especializacaoNome: especialização.nome,
        apenasContabilizaFolgas: false,
        tipoParticipacao: "ambas",
        trabalho24h: false,
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

  const generateSchedule = () => {
    if (scaleMembers.length < 1) {
      toast.error(
        "É necessário pelo menos 1 integrante para gerar a escala de plantões"
      );
      return;
    }

    // Estrutura para escala de plantões com turnos
    const schedule: Array<{
      date: Date;
      shifts: Array<{
        turnoNome: string;
        horaInicio: string;
        horaFim: string;
        integrante: PlantaoMember;
        especialização: string;
      }>;
    }> = [];

    // Usar turnos configurados ou turnos padrão
    const shiftsToUse =
      tiposTurnos.length > 0
        ? tiposTurnos
        : [
            {
              nome: "Manhã",
              hora_inicio: "06:00",
              hora_fim: "12:00",
              duracao_horas: 6,
            },
            {
              nome: "Tarde",
              hora_inicio: "12:00",
              hora_fim: "18:00",
              duracao_horas: 6,
            },
            {
              nome: "Noite",
              hora_inicio: "18:00",
              hora_fim: "00:00",
              duracao_horas: 6,
            },
            {
              nome: "Madrugada",
              hora_inicio: "00:00",
              hora_fim: "06:00",
              duracao_horas: 6,
            },
          ];

    // Agrupar membros por especialização
    const membersBySpecialization = new Map<string, PlantaoMember[]>();

    scaleMembers.forEach((member) => {
      const specKey = member.especializacaoNome || "Sem Especialização";
      if (!membersBySpecialization.has(specKey)) {
        membersBySpecialization.set(specKey, []);
      }
      membersBySpecialization.get(specKey)!.push({
        ...member,
        tipos_turnos_disponiveis: [], // Por enquanto vazio
        horas_minimas_semana: 24,
        horas_maximas_semana: 48,
        disponivel_fins_semana: true,
        prioridade: 2,
        horasTrabalhadasSemana: 0, // Controle de horas semanais
        ultimoTurno: "", // Controle de rotação de turnos
      } as PlantaoMember);
    });

    let currentDate = new Date(scaleGeneration.startDate);
    const endDate = new Date(scaleGeneration.endDate);

    // Controle de rotação de turnos por membro
    const memberTurnRotation = new Map<string, number>();
    scaleMembers.forEach((member) => {
      memberTurnRotation.set(member.id, 0);
    });

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
        const dayShifts: Array<{
          turnoNome: string;
          horaInicio: string;
          horaFim: string;
          integrante: PlantaoMember;
          especialização: string;
        }> = [];

        // Para cada turno do dia, atribuir um membro de cada especialização
        for (const shift of shiftsToUse) {
          for (const [
            specName,
            specMembers,
          ] of membersBySpecialization.entries()) {
            if (specMembers.length === 0) continue;

            // Filtrar membros disponíveis para este turno
            const availableMembers = specMembers.filter((member) => {
              // Verificar se não trabalhou no turno anterior para evitar dupla jornada
              const previousShift = dayShifts.find(
                (s) =>
                  s.integrante.id === member.id &&
                  isPreviousShift(s.turnoNome, shift.nome)
              );

              if (previousShift) return false;

              // Verificar limite de horas semanais (assumindo 40h/semana máximo)
              if (
                (member.horasTrabalhadasSemana || 0) + shift.duracao_horas >
                member.horas_maximas_semana
              ) {
                return false;
              }

              return true;
            });

            if (availableMembers.length === 0) {
              // Se nenhum membro disponível, usar o com menos horas trabalhadas
              const memberWithLeastHours = specMembers.reduce((prev, current) =>
                (prev.horasTrabalhadasSemana || 0) <
                (current.horasTrabalhadasSemana || 0)
                  ? prev
                  : current
              );
              availableMembers.push(memberWithLeastHours);
            }

            // Selecionar membro baseado na rotação
            const currentRotation =
              memberTurnRotation.get(availableMembers[0].id) || 0;
            const selectedMemberIndex =
              currentRotation % availableMembers.length;
            const selectedMember = availableMembers[selectedMemberIndex];

            // Atualizar rotação
            memberTurnRotation.set(selectedMember.id, currentRotation + 1);

            // Atualizar horas trabalhadas
            selectedMember.horasTrabalhadasSemana =
              (selectedMember.horasTrabalhadasSemana || 0) +
              shift.duracao_horas;
            selectedMember.ultimoTurno = shift.nome;

            dayShifts.push({
              turnoNome: shift.nome,
              horaInicio: shift.hora_inicio,
              horaFim: shift.hora_fim,
              integrante: selectedMember,
              especialização: specName,
            });
          }
        }

        schedule.push({
          date: new Date(currentDate),
          shifts: dayShifts,
        });
      }

      // Resetar horas semanais no domingo
      if (currentDate.getDay() === 0) {
        for (const [
          specName,
          specMembers,
        ] of membersBySpecialization.entries()) {
          specMembers.forEach((member) => {
            member.horasTrabalhadasSemana = 0;
          });
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    setGeneratedSchedule(schedule);
    toast.success("Escala de plantões gerada com sucesso!", {
      description: `${schedule.length} dias com turnos programados`,
    });
  };

  // Função auxiliar para verificar turnos consecutivos
  const isPreviousShift = (shiftA: string, shiftB: string): boolean => {
    const shiftOrder = ["Madrugada", "Manhã", "Tarde", "Noite"];
    const indexA = shiftOrder.indexOf(shiftA);
    const indexB = shiftOrder.indexOf(shiftB);

    return (indexA + 1) % shiftOrder.length === indexB;
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

    try {
      // Criar a escala de folgas
      const { data: newScale, error: scaleError } = await supabase
        .from("escalas_folgas")
        .insert({
          nome: scaleName,
          departamento_id: selectedDepartment,
          observacoes_template_id:
            selectedObservacaoTemplate === "none"
              ? null
              : selectedObservacaoTemplate,
        })
        .select()
        .single();

      if (scaleError) throw scaleError;

      // Salvar as participações
      const participacoes = scaleMembers.map((member) => ({
        escala_folga_id: newScale.id,
        integrante_id: member.id,
        folgas_iniciais: member.folgasIniciais,
        folgas_atuais: member.folgasAtuais,
        posicao_atual: member.posicaoAtual,
        ativo: member.ativo,
        apenas_contabiliza_folgas: member.apenasContabilizaFolgas || false,
      }));

      const { error: participacoesError } = await supabase
        .from("escala_folgas_participacoes")
        .insert(participacoes);

      if (participacoesError) throw participacoesError;

      // Salvar as atribuições geradas
      const atribuicoes: any[] = [];

      generatedSchedule.forEach((day) => {
        // Verificar se é escala de folgas ou plantões
        if (day.working && day.onLeave) {
          // Escala de folgas - lógica existente
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
        } else if (day.shifts) {
          // Escala de plantões - nova lógica
          day.shifts.forEach((shift) => {
            atribuicoes.push({
              escala_folga_id: newScale.id,
              data: day.date.toISOString().split("T")[0],
              integrante_id: shift.integrante.id,
              tipo_atribuicao: "trabalho",
              especializacao_id: shift.integrante.especializacaoId || null,
              observacao: `${shift.turnoNome} (${shift.horaInicio}-${shift.horaFim}) - ${shift.especialização}`,
            });
          });
        }
      });

      const { error: atribuicoesError } = await supabase
        .from("escala_folgas_atribuicoes")
        .insert(atribuicoes);

      if (atribuicoesError) throw atribuicoesError;

      toast.success("Escala de folgas salva com sucesso!", {
        description: `${scaleMembers.length} participantes e ${generatedSchedule.length} dias programados.`,
      });

      // Limpar formulário após salvar
      setScaleName("");
      setScaleMembers([]);
      setGeneratedSchedule([]);
    } catch (error) {
      console.error("Erro ao salvar escala de folgas:", error);
      toast.error("Erro ao salvar escala de folgas", {
        description: "Tente novamente em alguns instantes.",
      });
    } finally {
      setLoading(false);
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
          let workingMembers: any[] = [];
          let memberNames = "";

          if (daySchedule.assignments) {
            // Escala de folgas - lógica existente
            workingMembers = daySchedule.assignments[spec] || [];
            memberNames =
              workingMembers.length > 0
                ? workingMembers
                    .map((member) => member.nome.toUpperCase())
                    .join("<br>")
                : "";
          } else if (daySchedule.shifts) {
            // Escala de plantões - nova lógica
            const shiftsForSpec = daySchedule.shifts.filter(
              (shift) => shift.especialização === spec
            );
            memberNames =
              shiftsForSpec.length > 0
                ? shiftsForSpec
                    .map(
                      (shift) =>
                        `${shift.integrante.nome.toUpperCase()}<br><small>${
                          shift.turnoNome
                        } (${shift.horaInicio}-${shift.horaFim})</small>`
                    )
                    .join("<br>")
                : "";
          }

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
            <h1 className="text-3xl font-bold">Gerar de Plantões</h1>
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
              <h1 className="text-3xl font-bold">Gerar Escala de Plantões</h1>
              <p className="text-muted-foreground">
                Configure a escala de plantões. Adicione integrantes, defina
                folgas e gere a escala automaticamente.
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
                  onChange={(e) => setScaleName(e.target.value)}
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

                                    return (
                                      <SelectItem
                                        key={spec.id}
                                        value={spec.id}
                                        disabled={availableCount === 0}
                                      >
                                        {spec.nome} ({availableCount} disponível
                                        {availableCount !== 1 ? "is" : ""})
                                      </SelectItem>
                                    );
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
                                    false,
                                    selectedTurnosForMember
                                  );
                                  setSelectedMemberToAdd(null);
                                  setMemberOnlyForLeaveCount(false);
                                  setSelectedTurnosForMember([]);
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
                          <label className="text-sm font-medium">
                            Configurações para {selectedMemberToAdd.nome}
                          </label>

                          {/* Checkbox para apenas contabilizar folgas */}
                          <div className="flex items-center space-x-2 p-3rounded">
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
                          )}

                          {/* Seleção de Turnos Disponíveis */}
                          {!memberOnlyForLeaveCount &&
                            tiposTurnos.length > 0 && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Turnos Disponíveis para{" "}
                                  {selectedMemberToAdd.nome}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  {tiposTurnos.map((turno) => (
                                    <div
                                      key={turno.id}
                                      className="flex items-center space-x-2"
                                    >
                                      <Checkbox
                                        id={`turno-${turno.id}`}
                                        checked={selectedTurnosForMember.includes(
                                          turno.id
                                        )}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedTurnosForMember([
                                              ...selectedTurnosForMember,
                                              turno.id,
                                            ]);
                                          } else {
                                            setSelectedTurnosForMember(
                                              selectedTurnosForMember.filter(
                                                (id) => id !== turno.id
                                              )
                                            );
                                          }
                                        }}
                                      />
                                      <label
                                        htmlFor={`turno-${turno.id}`}
                                        className="text-sm font-medium leading-none cursor-pointer"
                                      >
                                        {turno.nome}
                                        <br />
                                        <span className="text-xs text-muted-foreground">
                                          {turno.hora_inicio} - {turno.hora_fim}
                                        </span>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                                  💡 Se nenhum turno for selecionado, o
                                  integrante estará disponível para todos os
                                  turnos.
                                </p>
                              </div>
                            )}

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
                                          memberOnlyForLeaveCount,
                                          selectedTurnosForMember
                                        );
                                        setSelectedMemberToAdd(null);
                                        setMemberOnlyForLeaveCount(false);
                                        setSelectedTurnosForMember([]);
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
                                      memberOnlyForLeaveCount,
                                      selectedTurnosForMember
                                    );
                                    setSelectedMemberToAdd(null);
                                    setMemberOnlyForLeaveCount(false);
                                    setSelectedTurnosForMember([]);
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
                                  setSelectedTurnosForMember([]);
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
                      <div className="grid grid-cols-2 gap-2">
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
                        className={`flex justify-between items-center p-3 rounded ${
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

                          <div className="flex items-center gap-4 mt-2">
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
                          </div>
                        </div>
                        <Button
                          onClick={() => removeMemberFromScale(member.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 ml-2"
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
                          Gerar Escala de Plantões
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Gera automaticamente a escala de plantões com
                          distribuição de turnos baseada nos integrantes e
                          turnos disponíveis
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
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Preview da Escala de Plantões
                      </h4>

                      {/* Mostrar apenas os primeiros 7 dias */}
                      <div className="max-h-96 overflow-y-auto border rounded-lg">
                        {generatedSchedule.slice(0, 7).map((day, index) => (
                          <div
                            key={index}
                            className={`p-4 border-b last:border-b-0 ${
                              index % 2 === 0 ? "bg-gray-50" : "bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-lg">
                                {format(day.date, "EEEE, dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </h5>
                              <Badge variant="outline">
                                {day.shifts?.length || 0} turno(s)
                              </Badge>
                            </div>

                            {day.shifts && day.shifts.length > 0 ? (
                              <div className="grid gap-3">
                                {day.shifts.map((shift, shiftIndex) => (
                                  <div
                                    key={shiftIndex}
                                    className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="text-center">
                                        <div className="font-semibold text-blue-800">
                                          {shift.turnoNome}
                                        </div>
                                        <div className="text-sm text-blue-600">
                                          {shift.horaInicio} - {shift.horaFim}
                                        </div>
                                      </div>
                                      <div className="border-l border-blue-300 pl-3">
                                        <div className="font-medium">
                                          {shift.integrante.nome}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          {shift.especialização}
                                        </div>
                                      </div>
                                    </div>
                                    <Badge
                                      variant="secondary"
                                      className="bg-blue-100 text-blue-700"
                                    >
                                      {tiposTurnos.find(
                                        (t) => t.nome === shift.turnoNome
                                      )?.duracao_horas || 6}
                                      h
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-muted-foreground">
                                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Nenhum turno programado para este dia</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {generatedSchedule.length > 7 && (
                        <p className="text-sm text-muted-foreground text-center">
                          Mostrando os primeiros 7 dias de{" "}
                          {generatedSchedule.length} dias gerados. Visualize a
                          escala completa após salvar.
                        </p>
                      )}

                      {/* Resumo da escala */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {generatedSchedule.length}
                          </div>
                          <div className="text-sm text-blue-700">
                            Dias com plantões
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {generatedSchedule.reduce(
                              (total, day) => total + (day.shifts?.length || 0),
                              0
                            )}
                          </div>
                          <div className="text-sm text-blue-700">
                            Total de turnos
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    {generatedSchedule.length > 0 && (
                      <>
                        <Button
                          onClick={saveScale}
                          disabled={
                            !scaleName.trim() ||
                            scaleMembers.length === 0 ||
                            generatedSchedule.length === 0 ||
                            loading
                          }
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
                              Só folgas
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
