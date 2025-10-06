"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  PrinterIcon,
  Users,
  Clock,
  Building2,
  Calendar as LucideCalendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  EscalaFolgaType,
  EscalaFolgaParticipacaoType,
  EscalaFolgaAtribuicaoType,
} from "@/types/escala-folgas";
import { ObservacaoTemplate } from "@/types/observacoes";
import CalendarTable from "@/components/calendar/CalendarTable";
import { NavigationButton } from "@/components/ui/navigation-button";
import FeriadoManager from "@/utils/feriados";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Field, Form, Formik } from "formik";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import * as Yup from "yup";
import { toast } from "sonner";

export default function FolgasViewPage() {
  // Estado global para pareamento das trocas (fora do Formik)
  const [swapPairs, setSwapPairs] = useState<{ from: string; to: string }[]>(
    []
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const scaleId = searchParams?.get("id");

  // Todos os hooks de estado devem ser declarados no topo, antes de qualquer condicional
  const [scale, setScale] = useState<EscalaFolgaType | null>(null);
  const [participations, setParticipations] = useState<
    EscalaFolgaParticipacaoType[]
  >([]);
  const [assignments, setAssignments] = useState<EscalaFolgaAtribuicaoType[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [swapAlsoLeaves, setSwapAlsoLeaves] = useState(true); // nova flag
  const [signatureName, setSignatureName] = useState("");
  const [signatureTitle, setSignatureTitle] = useState("");
  const [includeSignature, setIncludeSignature] = useState(false);
  const [printStartDate, setPrintStartDate] = useState("");
  const [printEndDate, setPrintEndDate] = useState("");
  const [printFullPeriod, setPrintFullPeriod] = useState(true);
  const [observacaoTemplate, setObservacaoTemplate] =
    useState<ObservacaoTemplate | null>(null);
  const [calendarData, setCalendarData] = useState<any>(null);
  const { userId } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (participations.length > 0) {
      setMembers(
        participations
          .filter((p) => p.integrante?.id && p.integrante?.nome)
          .map((p) => ({
            id: p.integrante!.id,
            name: p.integrante!.nome,
          }))
      );
    }
  }, [participations]);

  const fetchScale = async () => {
    if (!scaleId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Buscar dados da escala (sem join)
      const { data: scaleData, error: scaleError } = await supabase
        .from("escalas_folgas")
        .select(
          `
            *,
            departamentos (
              nome,
              tipo_departamento,
              organizacoes (
                nome,
                tipo
              )
            ),
            observacoes_templates (
              id,
              nome,
              descricao,
              observacoes,
              ativo,
              created_at,
              updated_at,
              organizacao_id
            )
        `
        )
        .eq("id", scaleId)
        .single();

      if (scaleError) throw scaleError;

      setScale({
        ...scaleData,
        departamento: {
          nome: scaleData.departamentos?.nome,
          tipo_departamento: scaleData.departamentos?.tipo_departamento,
          organizacao: {
            nome: scaleData.departamentos?.organizacoes?.nome,
            tipo: scaleData.departamentos?.organizacoes?.tipo,
          },
        },
      });

      // Setar o template de observações se existir (jsonb)
      if (scaleData.observacoes_templates) {
        setObservacaoTemplate({
          ...scaleData.observacoes_templates,
          observacoes: Array.isArray(
            scaleData.observacoes_templates.observacoes
          )
            ? scaleData.observacoes_templates.observacoes
            : [],
        });
      } else {
        setObservacaoTemplate(null);
      }

      // Buscar participações
      const { data: participationsData, error: participationsError } =
        await supabase
          .from("escala_folgas_participacoes")
          .select(
            `
            *,
            integrante:integrantes!integrante_id (
              id,
              nome
            )
          `
          )
          .eq("escala_folga_id", scaleId)
          .eq("ativo", true);

      if (participationsError) throw participationsError;

      setParticipations(participationsData || []);

      // Limpar cache de folgas quando dados são carregados
      leavesCache.clear();

      // Buscar atribuições
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("escala_folgas_atribuicoes")
        .select(
          `
          *,
          integrante:integrantes!integrante_id (
            id,
            nome
          ),
          especializacao:especializacoes!especializacao_id (
            id,
            nome
          )
        `
        )
        .eq("escala_folga_id", scaleId)
        .order("data", { ascending: true });

      if (assignmentsError) throw assignmentsError;

      setAssignments(assignmentsData || []);
    } catch (error) {
      console.error("Erro ao carregar escala de folgas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScale();
  }, [scaleId]);

  const groupAssignmentsByDay = () => {
    const grouped: Record<
      string,
      {
        working: EscalaFolgaAtribuicaoType[];
        onLeave: EscalaFolgaAtribuicaoType[];
      }
    > = {};

    assignments.forEach((assignment) => {
      const dateKey = format(new Date(assignment.data), "EEEE, dd/MM/yyyy", {
        locale: ptBR,
      });

      if (!grouped[dateKey]) {
        grouped[dateKey] = { working: [], onLeave: [] };
      }

      if (assignment.tipo_atribuicao === "trabalho") {
        grouped[dateKey].working.push(assignment);
      } else {
        grouped[dateKey].onLeave.push(assignment);
      }
    });

    return grouped;
  };

  // Cache para armazenar cálculos de folgas já realizados
  const leavesCache = new Map<string, { total: number; preta: number; vermelha: number }>();

  // Função para calcular folgas dinamicamente até uma data específica
  const calculateCurrentLeaves = (integranteId: string, targetDate: string) => {
    const cacheKey = `${integranteId}_${targetDate}`;
    
    // Verificar cache primeiro
    if (leavesCache.has(cacheKey)) {
      return leavesCache.get(cacheKey)!;
    }

    if (!assignments.length || !participations.length) {
      const result = { total: 0, preta: 0, vermelha: 0 };
      leavesCache.set(cacheKey, result);
      return result;
    }

    // Buscar folgas iniciais da participação
    const participacao = participations.find(p => p.integrante_id === integranteId);
    if (!participacao) {
      const result = { total: 0, preta: 0, vermelha: 0 };
      leavesCache.set(cacheKey, result);
      return result;
    }

    // Começar com folgas iniciais
    let folgasPreta = participacao.folgas_iniciais_preta || 0;
    let folgasVermelha = participacao.folgas_iniciais_vermelha || 0;

    // Para integrantes em férias/licença, usar contagem única
    if (participacao.apenas_contabiliza_folgas) {
      // Para férias/licença, somar ambas as folgas iniciais em uma contagem única
      const folgasUnicas = folgasPreta + folgasVermelha;
      
      // Contar todos os dias de folga até a data alvo
      const integranteAssignments = assignments
        .filter(a => a.integrante_id === integranteId)
        .filter(a => {
          const assignmentDate = typeof a.data === 'string' ? a.data : 
            new Date(a.data).toISOString().split('T')[0];
          return assignmentDate <= targetDate;
        })
        .sort((a, b) => {
          const dateA = typeof a.data === 'string' ? a.data : 
            new Date(a.data).toISOString().split('T')[0];
          const dateB = typeof b.data === 'string' ? b.data : 
            new Date(b.data).toISOString().split('T')[0];
          return dateA.localeCompare(dateB);
        });

      let folgasAdicionais = 0;
      integranteAssignments.forEach(assignment => {
        if (assignment.tipo_atribuicao === 'folga') {
          folgasAdicionais++;
        } else if (assignment.tipo_atribuicao === 'trabalho') {
          // Para férias/licença, reset ambas quando trabalha
          folgasAdicionais = 0;
        }
      });

      const totalFolgas = folgasUnicas + folgasAdicionais;
      const result = { total: totalFolgas, preta: totalFolgas, vermelha: totalFolgas };
      leavesCache.set(cacheKey, result);
      return result;
    }

    // Para integrantes normais, contar separadamente por escala
    const integranteAssignments = assignments
      .filter(a => a.integrante_id === integranteId)
      .filter(a => {
        const assignmentDate = typeof a.data === 'string' ? a.data : 
          new Date(a.data).toISOString().split('T')[0];
        return assignmentDate <= targetDate;
      })
      .sort((a, b) => {
        const dateA = typeof a.data === 'string' ? a.data : 
          new Date(a.data).toISOString().split('T')[0];
        const dateB = typeof b.data === 'string' ? b.data : 
          new Date(b.data).toISOString().split('T')[0];
        return dateA.localeCompare(dateB);
      });

    integranteAssignments.forEach(assignment => {
      const assignmentDate = typeof assignment.data === 'string' ? assignment.data : 
        new Date(assignment.data).toISOString().split('T')[0];
      const dateObj = new Date(assignmentDate + 'T12:00:00');
      const dayOfWeek = dateObj.getDay();
      const isEscalaPreta = dayOfWeek >= 1 && dayOfWeek <= 5; // Segunda a sexta

      if (assignment.tipo_atribuicao === 'folga') {
        // Incrementar folgas da escala correspondente
        if (isEscalaPreta) {
          folgasPreta++;
        } else {
          folgasVermelha++;
        }
      } else if (assignment.tipo_atribuicao === 'trabalho') {
        // Reset apenas da escala correspondente
        if (isEscalaPreta) {
          folgasPreta = 0;
        } else {
          folgasVermelha = 0;
        }
      }
    });

    const result = {
      total: folgasPreta + folgasVermelha,
      preta: folgasPreta,
      vermelha: folgasVermelha
    };

    leavesCache.set(cacheKey, result);
    return result;
  };

  // Função assíncrona para organizar dados no formato de calendário, incluindo feriados
  const getCalendarData = async () => {
    if (assignments.length === 0 || participations.length === 0) return null;

    const dates = Array.from(
      new Set(
        assignments.map((a) => {
          if (
            typeof a.data === "string" &&
            a.data.match(/^\d{4}-\d{2}-\d{2}$/)
          ) {
            return a.data;
          }
          const dateObj = new Date(a.data);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const dayNum = String(dateObj.getDate()).padStart(2, "0");
          return `${year}-${month}-${dayNum}`;
        })
      )
    ).sort();

    const feriadoManager = new FeriadoManager(
      selectedOrganization?.id || "",
      userId
    );

    // Preencher o mapa de escala vermelha (finais de semana e feriados)
    const escalaVermelhaMap: Record<string, boolean> = {};
    for (const date of dates) {
      const dateObj = new Date(date + "T12:00:00");
      // Aguarda a verificação do FeriadoManager
      escalaVermelhaMap[date] = await feriadoManager.isEscalaVermelha(dateObj);
    }

    const specializations = Array.from(
      new Set(
        assignments
          .filter((a) => a.especializacao?.nome)
          .map((a) => a.especializacao!.nome)
      )
    ).sort();

    // Criar mapa de membros de licença/férias
    const membersOnLeave: Record<string, boolean> = {};
    participations.forEach((p) => {
      if (p.integrante?.nome && p.apenas_contabiliza_folgas) {
        membersOnLeave[p.integrante.nome] = true;
      }
    });

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

    participations.forEach((p) => {
      if (p.integrante?.nome) {
        const memberName = p.integrante.nome;
        calendarMatrix[memberName] = {};
        
        dates.forEach((date) => {
          const isEscalaVermelha = escalaVermelhaMap[date];
          const isEscalaPreta = !isEscalaVermelha;
          const workAssignment = assignments.find(
            (a) =>
              a.integrante?.nome === memberName &&
              a.data === date &&
              a.tipo_atribuicao === "trabalho"
          );
          const leaveAssignment = assignments.find(
            (a) =>
              a.integrante?.nome === memberName &&
              a.data === date &&
              a.tipo_atribuicao === "folga"
          );
          
          if (workAssignment) {
            const especializacaoNome =
              workAssignment.especializacao?.nome || workAssignment.observacao;
            calendarMatrix[memberName][date] = {
              codigo: 0,
              especializacao: especializacaoNome,
              tipo: "trabalho",
              color: "#bbf7d0",
            };
          } else if (leaveAssignment) {
            // Usar a função calculateCurrentLeaves para obter as folgas corretas até esta data
            const folgasCalculadas = calculateCurrentLeaves(p.integrante_id, date);
            
            let codigoFolga: number;
            if (isEscalaPreta) {
              codigoFolga = folgasCalculadas.preta;
            } else {
              codigoFolga = folgasCalculadas.vermelha;
            }
            
            calendarMatrix[memberName][date] = {
              codigo: codigoFolga,
              tipo: "folga",
              color: "#fff",
              textColor: isEscalaPreta ? "#000000" : "#fff",
            };
          }
        });
      }
    });

    const sortedMembers = participations
      .map((p) => p.integrante?.nome)
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => {
        const getSpecializacao = (memberName: string) => {
          const assignment = assignments.find(
            (assign) =>
              assign.integrante?.nome === memberName &&
              assign.tipo_atribuicao === "trabalho"
          );
          return (
            assignment?.especializacao?.nome ||
            assignment?.observacao ||
            "Sem Especialização"
          );
        };
        const specA = getSpecializacao(a);
        const specB = getSpecializacao(b);
        if (specA !== specB) {
          return specA.localeCompare(specB);
        }
        return a.localeCompare(b);
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
  const getSpecializationColor = (index: number) => {
    const colors = [
      "#ddd6fe", // roxo claro
      "#bfdbfe", // azul claro
      "#bbf7d0", // verde claro
      "#fed7aa", // laranja claro
      "#fde68a", // amarelo claro
      "#f9a8d4", // rosa claro
    ];
    const color = colors[(index - 1) % colors.length] || "#e5e7eb";
    console.log(`🎨 getSpecializationColor(${index}) = ${color} (${colors[index - 1] || 'padrão'})`);
    return color;
  };

  // Função para obter a cor da especialização de um integrante
  const getMemberSpecializationColor = (memberName: string) => {
    if (!calendarData) {
      console.log(`🎨 [${memberName}] Sem dados do calendário - cor padrão: #f3f4f6`);
      return "#f3f4f6";
    }
    
    // Verificar se o membro está de licença/férias
    if (calendarData.membersOnLeave?.[memberName]) {
      console.log(`🎨 [${memberName}] Membro de licença/férias - cor cinza: #9ca3af`);
      return "#9ca3af"; // Cinza para membros de licença
    }

    console.log(`🔍 [${memberName}] Procurando especialização...`);

    // 1. Primeiro, procurar por atribuições de trabalho deste membro
    const memberWorkAssignment = assignments.find(
      (a) =>
        a.integrante?.nome === memberName && a.tipo_atribuicao === "trabalho"
    );

    console.log(`🔍 [${memberName}] Atribuição de trabalho encontrada:`, memberWorkAssignment);
    console.log(`🔍 [${memberName}] Especialização da atribuição:`, memberWorkAssignment?.especializacao?.nome);
    console.log(`🔍 [${memberName}] Observação da atribuição:`, memberWorkAssignment?.observacao);

    // 2. Se não encontrar atribuição de trabalho, procurar por qualquer atribuição deste membro
    let especializacao = "";
    if (memberWorkAssignment?.especializacao?.nome || memberWorkAssignment?.observacao) {
      especializacao = (memberWorkAssignment.especializacao?.nome || memberWorkAssignment?.observacao) || "";
      console.log(`🔍 [${memberName}] Especialização encontrada na atribuição de trabalho:`, especializacao);
    } else {
      // Procurar por qualquer atribuição deste membro (trabalho ou folga) para identificar especialização
      const anyMemberAssignment = assignments.find(
        (a) => a.integrante?.nome === memberName
      );
      
      console.log(`🔍 [${memberName}] Qualquer atribuição encontrada:`, anyMemberAssignment);
      
      if (anyMemberAssignment?.especializacao?.nome || anyMemberAssignment?.observacao) {
        especializacao = (anyMemberAssignment.especializacao?.nome || anyMemberAssignment.observacao) || "";
        console.log(`🔍 [${memberName}] Especialização encontrada em atribuição geral:`, especializacao);
      } else {
        // 3. Se não encontrar em atribuições, procurar por atribuições de trabalho de outros membros na mesma data
        // para inferir a especialização deste membro
        console.log(`🔍 [${memberName}] Procurando especialização por inferência...`);
        
        // Procurar por qualquer atribuição deste membro para obter uma data
        const anyMemberAssignment = assignments.find(
          (a) => a.integrante?.nome === memberName
        );
        
        if (anyMemberAssignment?.data) {
          // Procurar por atribuições de trabalho na mesma data para inferir especialização
          const workAssignmentsOnSameDate = assignments.filter(
            (a) => a.data === anyMemberAssignment.data && 
                   a.tipo_atribuicao === "trabalho" &&
                   a.especializacao?.nome
          );
          
          console.log(`🔍 [${memberName}] Atribuições de trabalho na mesma data:`, workAssignmentsOnSameDate);
          
          if (workAssignmentsOnSameDate.length > 0) {
            // Usar a especialização mais comum naquela data
            const specCounts: Record<string, number> = {};
            workAssignmentsOnSameDate.forEach(a => {
              const specName = a.especializacao?.nome || "";
              if (specName) {
                specCounts[specName] = (specCounts[specName] || 0) + 1;
              }
            });
            
            const mostCommonSpec = Object.entries(specCounts)
              .sort(([,a], [,b]) => b - a)[0]?.[0];
            
            if (mostCommonSpec) {
              especializacao = mostCommonSpec;
              console.log(`🔍 [${memberName}] Especialização inferida por atribuições na mesma data:`, especializacao);
            }
          }
        }
        
        if (!especializacao) {
          console.log(`⚠️ [${memberName}] Nenhuma especialização encontrada em nenhuma atribuição ou por inferência`);
        }
      }
    }

    if (especializacao) {
      console.log(`🔍 [${memberName}] Especialização final:`, especializacao);
      console.log(`🔍 [${memberName}] Especializações disponíveis:`, calendarData.specializations);
      
      const specIndex = calendarData.specializations.indexOf(especializacao);
      
      console.log(`🔍 [${memberName}] Índice da especialização:`, specIndex);
      
      if (specIndex !== -1) {
        const color = getSpecializationColor(specIndex + 1);
        console.log(`🎨 [${memberName}] Especialização "${especializacao}" (índice ${specIndex}) - cor: ${color}`);
        return color;
      } else {
        console.log(`⚠️ [${memberName}] Especialização "${especializacao}" não encontrada na lista de especializações`);
      }
    }

    console.log(`🎨 [${memberName}] Usando cor padrão: #f3f4f6`);
    return "#f3f4f6"; // cor padrão se não tiver especialização
  };

  const handlePrintClick = async () => {
    // Inicializar as datas com o período completo disponível
    const calendarData = await getCalendarData();
    if (calendarData && calendarData.dates.length > 0) {
      setPrintStartDate(calendarData.dates[0]);
      setPrintEndDate(calendarData.dates[calendarData.dates.length - 1]);
    }
    setShowPrintDialog(true);
  };

  const handlePrintConfirm = () => {
    setShowPrintDialog(false);
    printScale(
      includeSignature,
      signatureName,
      signatureTitle,
      printFullPeriod ? null : printStartDate,
      printFullPeriod ? null : printEndDate
    );
    // Reset dialog state after printing
    setIncludeSignature(false);
    setSignatureName("");
    setSignatureTitle("");
    setPrintStartDate("");
    setPrintEndDate("");
    setPrintFullPeriod(true);
  };

  const handleDialogClose = () => {
    setShowPrintDialog(false);
    // Reset dialog state when closing
    setIncludeSignature(false);
    setSignatureName("");
    setSignatureTitle("");
    setPrintStartDate("");
    setPrintEndDate("");
    setPrintFullPeriod(true);
  };

  const printScale = async (
    withSignature: boolean = false,
    signerName: string = "",
    signerTitle: string = "",
    startDate: string | null = null,
    endDate: string | null = null
  ) => {
    if (!scale) {
      toast.error("Escala não disponível para impressão");
      return;
    }

    // Criar conteúdo específico para impressão
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const calendarData = await getCalendarData();
    if (!calendarData) {
      console.error("Dados do calendário não disponíveis");
      return;
    }

    let tableContent = "";
    let headerRow = "";

    // Filtrar datas se o período específico foi selecionado
    let filteredDates = calendarData.dates;
    if (startDate && endDate) {
      filteredDates = calendarData.dates.filter((date) => {
        return date >= startDate && date <= endDate;
      });
    }

    // Obter especializações dinâmicas dos dados
    const dynamicSpecializations = Array.from(
      new Set(
        assignments
          .filter((a) => a.tipo_atribuicao === "trabalho")
          .map((a) => a.especializacao?.nome || a.observacao)
          .filter(Boolean)
      )
    ).sort();

    // Se não há especializações definidas, usar as padrão
    const specializations =
      dynamicSpecializations.length > 0
        ? dynamicSpecializations
        : ["Cassineiro", "Cozinheiro", "Copeiro", "Permanência"];

    // Criar cabeçalho da tabela
    headerRow = `
      <tr>
        <th style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5; text-align: center; font-weight: bold; width: 100px;">Data</th>
    `;

    specializations.forEach((spec) => {
      headerRow += `<th style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5; text-align: center; font-weight: bold; min-width: 140px;">${spec}</th>`;
    });
    headerRow += "</tr>";

    // BUSCANDO TROCAS
    const trocas = await supabase
      .from("escala_folgas_trocas")
      .select("*")
      .eq("escala_folga_id", scaleId);
    if (trocas.error) {
      toast.error("Erro ao buscar trocas: " + trocas.error.message);
      return;
    }

    // Cria um Map para associar trocas por data e integrante
    // trocasPorData: Map<data, Map<integranteOriginal, integranteTrocado>>
    const trocasPorData = new Map();
    if (trocas.data && trocas.data.length > 0) {
      trocas.data.forEach((troca) => {
        if (
          troca.data1 &&
          troca.integrante1_id &&
          troca.data2 &&
          troca.integrante2_id
        ) {
          // data1: integrante1 -> integrante2
          if (!trocasPorData.has(troca.data1))
            trocasPorData.set(troca.data1, new Map());
          trocasPorData
            .get(troca.data1)
            .set(troca.integrante1_id, troca.integrante2_id);
          // data2: integrante2 -> integrante1
          if (!trocasPorData.has(troca.data2))
            trocasPorData.set(troca.data2, new Map());
          trocasPorData
            .get(troca.data2)
            .set(troca.integrante2_id, troca.integrante1_id);
        }
      });
    }

    // Criar linhas da tabela organizadas por data
    const dates = filteredDates;
    dates.forEach((date) => {
      const dateObj = new Date(date + "T12:00:00"); // Adicionar horário para evitar UTC offset
      const formattedDate = format(dateObj, "dd/MM", { locale: ptBR });
      const dayOfWeek = format(dateObj, "EEE", { locale: ptBR }).toUpperCase();

      // Filtra todas as atribuições de trabalho para esta data
      const allWorkingOnDate = assignments.filter(
        (a) => a.data === date && a.tipo_atribuicao === "trabalho"
      );

      let row = `
        <tr>
          <td class="date-cell" style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold; background-color: #d3d3d3;">
            <div style="font-size: 11px;">${formattedDate}</div>
            <div style="font-size: 9px; color: #333;">${dayOfWeek}</div>
          </td>
      `;

      // Se não há especialização definida, distribuir as pessoas igualmente pelas colunas
      const hasSpecializations = allWorkingOnDate.some(
        (a) => a.especializacao?.nome || a.observacao
      );

      if (!hasSpecializations && allWorkingOnDate.length > 0) {
        const membersPerColumn = Math.ceil(
          allWorkingOnDate.length / specializations.length
        );

        specializations.forEach((spec, index) => {
          const startIndex = index * membersPerColumn;
          const endIndex = Math.min(
            startIndex + membersPerColumn,
            allWorkingOnDate.length
          );
          // Aplica trocas: para cada integrante, verifica se há troca para esta data
          const workingMembers = allWorkingOnDate
            .slice(startIndex, endIndex)
            .map((assignment) => {
              let integranteId = assignment.integrante_id;
              // Se houver troca para este integrante nesta data, substitui pelo trocado
              if (
                trocasPorData.has(date) &&
                trocasPorData.get(date).has(integranteId)
              ) {
                integranteId = trocasPorData.get(date).get(integranteId);
                // Busca o nome do integrante trocado
                const trocado = assignments.find(
                  (a) => a.integrante_id === integranteId && a.data === date
                );
                return (trocado?.integrante?.nome || "").toUpperCase();
              }
              return (assignment.integrante?.nome || "").toUpperCase();
            });

          const cellContent =
            workingMembers.length > 0 ? workingMembers.join("<br>") : "";
          const backgroundColor =
            workingMembers.length > 0 ? "#e8e8e8" : "#ffffff";

          row += `<td style="border: 1px solid #000; padding: 6px; text-align: center; background-color: ${backgroundColor}; min-height: 35px; vertical-align: middle; font-size: 10px; font-weight: bold;">
            ${cellContent}
          </td>`;
        });
      } else {
        // Lógica com especializações específicas
        specializations.forEach((spec) => {
          // Buscar membros trabalhando nesta data
          const workingMembers = assignments
            .filter((assignment) => {
              if (
                assignment.data !== date ||
                assignment.tipo_atribuicao !== "trabalho"
              ) {
                return false;
              }

              // Verificar se a especialização coincide
              const assignmentSpec =
                assignment.especializacao?.nome || assignment.observacao || "";

              // Comparação direta com a especialização
              if (!spec) return false;

              return (
                assignmentSpec === spec ||
                assignmentSpec.toLowerCase() === spec.toLowerCase() ||
                (["Permanência", "permanência", "Permanencia"].includes(spec) &&
                  assignmentSpec === "")
              );
            })
            .map((assignment) => {
              let integranteId = assignment.integrante_id;
              // Se houver troca para este integrante nesta data, substitui pelo trocado
              if (
                trocasPorData.has(date) &&
                trocasPorData.get(date).has(integranteId)
              ) {
                integranteId = trocasPorData.get(date).get(integranteId);
                // Busca o nome do integrante trocado
                const trocado = assignments.find(
                  (a) => a.integrante_id === integranteId && a.data === date
                );
                return (trocado?.integrante?.nome || "").toUpperCase();
              }
              return (assignment.integrante?.nome || "").toUpperCase();
            });

          // Se não há especializações dinâmicas e esta é uma especialização padrão,
          // distribuir pessoas sem especialização entre as colunas
          if (dynamicSpecializations.length === 0) {
            const unassignedMembers = assignments.filter((assignment) => {
              return (
                assignment.data === date &&
                assignment.tipo_atribuicao === "trabalho" &&
                !assignment.especializacao?.nome &&
                !assignment.observacao
              );
            });

            const specIndex = specializations.indexOf(spec);
            const membersPerColumn = Math.ceil(
              unassignedMembers.length / specializations.length
            );
            const startIndex = specIndex * membersPerColumn;
            const endIndex = Math.min(
              startIndex + membersPerColumn,
              unassignedMembers.length
            );
            const additionalMembers = unassignedMembers
              .slice(startIndex, endIndex)
              .map((assignment) => {
                let integranteId = assignment.integrante_id;
                if (
                  trocasPorData.has(date) &&
                  trocasPorData.get(date).has(integranteId)
                ) {
                  integranteId = trocasPorData.get(date).get(integranteId);
                  const trocado = assignments.find(
                    (a) => a.integrante_id === integranteId && a.data === date
                  );
                  return (trocado?.integrante?.nome || "").toUpperCase();
                }
                return (assignment.integrante?.nome || "").toUpperCase();
              });
            workingMembers.push(...additionalMembers);
          }

          const cellContent =
            workingMembers.length > 0 ? workingMembers.join("<br>") : "";
          const backgroundColor =
            workingMembers.length > 0 ? "#e8e8e8" : "#ffffff";

          row += `<td style="border: 1px solid #000; padding: 6px; text-align: center; background-color: ${backgroundColor}; min-height: 35px; vertical-align: middle; font-size: 10px; font-weight: bold;">
            ${cellContent}
          </td>`;
        });
      }

      row += "</tr>";
      tableContent += row;
    });

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Escala de Serviço - ${scale.nome}</title>
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
          .organizacao-name {
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
            background-color: #d3d3d3;
            font-weight: bold;
            padding: 8px;
          }
          .scale-table td {
            padding: 4px;
            min-height: 30px;
          }
          .date-cell {
            background-color: #d3d3d3 !important;
            font-weight: bold;
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
          <div class="organizacao-name">${
            scale.departamento?.organizacao?.nome
          }</div>
          <div class="scale-title">ESCALA DE SERVIÇO DO SETOR DE ${scale.departamento?.nome?.toUpperCase()} REFERENTE AO PERÍODO DE</div>
          <div class="period">${
            filteredDates.length > 0
              ? format(new Date(filteredDates[0] + "T12:00:00"), "dd", {
                  locale: ptBR,
                }) +
                " A " +
                format(
                  new Date(
                    filteredDates[filteredDates.length - 1] + "T12:00:00"
                  ),
                  "dd 'de' MMMM 'de' yyyy",
                  { locale: ptBR }
                ).toUpperCase()
              : "PERÍODO NÃO DEFINIDO"
          }</div>
        </div>

        <table class="scale-table">
          <thead>
            ${headerRow}
          </thead>
          <tbody>
            ${tableContent}
          </tbody>
        </table>

        ${
          observacaoTemplate && observacaoTemplate.observacoes?.length > 0
            ? `<div class="obs-section">
                <div class="obs-title">OBS:</div>
                ${observacaoTemplate.observacoes
                  .sort((a, b) => a.ordem - b.ordem)
                  .map(
                    (obs, idx) =>
                      `<div class="obs-item">${idx + 1}. ${obs.texto}</div>`
                  )
                  .join("")}
              </div>`
            : ""
        }

        <div class="footer">
          <div>${scale.departamento?.organizacao?.nome}</div>
          <div>${format(new Date(), "dd 'de' MMMM 'de' yyyy", {
            locale: ptBR,
          })}.</div>
        </div>

        <div class="signature-section">
          <div style="margin-top: 60px;">
          ${
            withSignature
              ? `
            <div class="signature-line"></div>
            `
              : ""
          }
            <div style="margin-top: 5px; font-weight: bold;">
              ${
                withSignature && signerName
                  ? `${signerName.toUpperCase()} <br>`
                  : ""
              }
              ${withSignature && signerTitle ? signerTitle : ``}
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

  useEffect(() => {
    (async () => {
      const data = await getCalendarData();
      setCalendarData(data);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, participations]);

  const [swapHistory, setSwapHistory] = useState<any[]>([]);

  // Buscar histórico de trocas e mostrar no card
  useEffect(() => {
    if (!scaleId) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from("escala_folgas_trocas")
        .select(
          `*,
          integrante1:integrantes!integrante1_id (nome),
          integrante2:integrantes!integrante2_id (nome)
        `
        )
        .eq("escala_folga_id", scaleId)
        .order("created_at", { ascending: false });
      if (!error && data) setSwapHistory(data);
    };
    fetch();
  }, [scaleId, showChangeDialog]);

  const groupedAssignments = groupAssignmentsByDay();

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
      </div>
    );
  }

  if (!scale) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="text-center py-12">
          <LucideCalendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-semibold mb-2">Escala não encontrada</h2>
          <p className="text-muted-foreground mb-4">
            A escala de folgas solicitada não existe ou foi removida.
          </p>
          <Link href="/folgas/list">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à Lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <NavigationButton
              href="/folgas/list"
              className="hidden md:inline-flex"
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
            </NavigationButton>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">{scale.nome}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">
                  {scale.departamento?.organizacao?.nome} -{" "}
                  {scale.departamento?.nome}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowChangeDialog(true)}
              variant="outline"
              size="sm"
            >
              <Users className="mr-2 h-4 w-4" />
              Trocar Integrantes
            </Button>
            <Button onClick={handlePrintClick} variant="outline" size="sm">
              <PrinterIcon className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Informações da Escala */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Participantes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{participations.length}</div>
              <p className="text-xs text-muted-foreground">
                Integrantes ativos na escala
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Dias Programados
              </CardTitle>
              <LucideCalendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(groupedAssignments).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Dias de trabalho agendados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Lógica da Escala
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {participations.length - 1}
              </div>
              <p className="text-xs text-muted-foreground">
                Folgas por dia (integrantes - 1)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cronograma da Escala - Formato Calendário */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LucideCalendar className="h-5 w-5" />
              Cronograma da Escala
            </CardTitle>
            <CardDescription>
              Visualização em formato de calendário com códigos por
              especialização
            </CardDescription>
          </CardHeader>
          <CardContent className="print:p-4 p-0">
            <div id="scale-print-content" className="p-4">
              {/* Cabeçalho adicional para impressão */}
              <div className="hidden print:block print:mt-2 print:mb-4">
                <div className="text-lg font-semibold">
                  {scale.departamento?.organizacao?.nome}
                </div>
                <div className="text-base">{scale.departamento?.nome}</div>
                <div className="text-base font-medium">{scale.nome}</div>
                <div className="text-sm text-gray-600 mt-2">
                  Impresso em{" "}
                  {format(new Date(), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
              </div>

              {!calendarData ? (
                <div className="text-center py-8 text-muted-foreground print:py-8">
                  <LucideCalendar className="h-12 w-12 mx-auto mb-4 opacity-50 print:h-8 print:w-8 print:mb-2" />
                  <p className="text-lg font-medium print:text-base">
                    Nenhuma atribuição cadastrada
                  </p>
                  <p className="text-sm print:text-xs">
                    Esta escala ainda não possui atribuições geradas
                  </p>
                </div>
              ) : (
                <CalendarTable
                  calendarData={calendarData}
                  getMemberSpecializationColor={getMemberSpecializationColor}
                  getSpecializationColor={getSpecializationColor}
                  showLegend={true}
                  escalaId={scaleId || ""}
                  escalaNome={scale?.nome || ""}
                  showActions={true}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Trocas */}
        <Card className="overflow-hidden mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Trocas Realizadas
            </CardTitle>
            <CardDescription>
              Veja o histórico de trocas realizadas nesta escala.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {swapHistory.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                Nenhuma troca realizada.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data da Troca</TableHead>
                    <TableHead>Quem vai trabalhar</TableHead>
                    <TableHead>No dia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {swapHistory.map((swap) => {
                    const integrante1Nome =
                      swap.integrante1?.nome ||
                      (members.find((m) => m.id === swap.integrante1_id)
                        ?.name ??
                        "-");
                    const integrante2Nome =
                      swap.integrante2?.nome ||
                      (members.find((m) => m.id === swap.integrante2_id)
                        ?.name ??
                        "-");
                    // Mostra duas linhas: uma para cada integrante após a troca
                    return [
                      <TableRow key={swap.id + "-1"}>
                        <TableCell
                          rowSpan={2}
                          style={{ verticalAlign: "middle" }}
                        >
                          {format(
                            new Date(swap.created_at),
                            "dd/MM/yyyy HH:mm"
                          )}
                        </TableCell>
                        <TableCell>{integrante2Nome}</TableCell>
                        <TableCell>
                          {format(
                            new Date(swap.data1 + "T12:00:00"),
                            "dd/MM/yyyy"
                          )}
                        </TableCell>
                      </TableRow>,
                      <TableRow key={swap.id + "-2"}>
                        {/* Data da troca omitida na segunda linha */}
                        <TableCell>{integrante1Nome}</TableCell>
                        <TableCell>
                          {format(
                            new Date(swap.data2 + "T12:00:00"),
                            "dd/MM/yyyy"
                          )}
                        </TableCell>
                      </TableRow>,
                    ];
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Impressão */}
        <Dialog open={showPrintDialog} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Configurações de Impressão</DialogTitle>
              <DialogDescription>
                Defina as opções para impressão da escala.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="printFullPeriod"
                    checked={printFullPeriod}
                    onCheckedChange={(checked) =>
                      setPrintFullPeriod(checked === true)
                    }
                  />
                  <Label htmlFor="printFullPeriod">
                    Imprimir período completo
                  </Label>
                </div>

                {!printFullPeriod && (
                  <div className="space-y-3 pl-6 border-l-2 border-gray-200">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="startDate" className="text-right">
                        Data inicial:
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={printStartDate}
                        onChange={(e) => setPrintStartDate(e.target.value)}
                        min={calendarData?.dates[0]}
                        max={calendarData?.dates[calendarData.dates.length - 1]}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="endDate" className="text-right">
                        Data final:
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={printEndDate}
                        onChange={(e) => setPrintEndDate(e.target.value)}
                        min={printStartDate || calendarData?.dates[0]}
                        max={calendarData?.dates[calendarData.dates.length - 1]}
                        className="col-span-3"
                      />
                    </div>
                    {!printFullPeriod &&
                      printStartDate &&
                      printEndDate &&
                      printStartDate > printEndDate && (
                        <p className="text-sm text-red-600 pl-4">
                          A data inicial deve ser anterior à data final
                        </p>
                      )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSignature"
                  checked={includeSignature}
                  onCheckedChange={(checked) =>
                    setIncludeSignature(checked === true)
                  }
                />
                <Label htmlFor="includeSignature">
                  Incluir espaço para assinatura personalizada
                </Label>
              </div>
              {includeSignature && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="signerName" className="text-right">
                      Nome:
                    </Label>
                    <Input
                      id="signerName"
                      placeholder="Digite o nome para assinatura"
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="signerTitle" className="text-right">
                      Título:
                    </Label>
                    <Input
                      id="signerTitle"
                      placeholder="Ex: Aprovisionador do HGuJP"
                      value={signatureTitle}
                      onChange={(e) => setSignatureTitle(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleDialogClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                onClick={handlePrintConfirm}
                disabled={
                  !printFullPeriod &&
                  (!printStartDate ||
                    !printEndDate ||
                    printStartDate > printEndDate)
                }
              >
                Imprimir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
          <DialogContent
            className="sm:max-w-1/2 max-h-[80vh] overflow-y-auto"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#a3a3a3 #f3f4f6",
            }}
          >
            <DialogHeader>
              <DialogTitle>Trocar Integrantes</DialogTitle>
              <DialogDescription>
                Selecione os integrantes para trocar de posição na escala.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Formik
                initialValues={{
                  memberIdOne: "",
                  selectedDates: [] as string[],
                  memberIdTwo: "",
                }}
                enableReinitialize={true}
                onSubmit={async (values, { setSubmitting, resetForm }) => {
                  setSubmitting(true);
                  try {
                    const allDates = Array.from(
                      new Set([
                        ...swapPairs.map((p) => p.from),
                        ...swapPairs.map((p) => p.to),
                      ])
                    );
                    const { data: atribuicoes, error: errorAtrib } =
                      await supabase
                        .from("escala_folgas_atribuicoes")
                        .select("id, integrante_id, tipo_atribuicao, data")
                        .eq("escala_folga_id", scaleId)
                        .in("data", allDates)
                        .in("integrante_id", [
                          values.memberIdOne,
                          values.memberIdTwo,
                        ]);
                    if (errorAtrib) throw errorAtrib;
                    if (
                      !atribuicoes ||
                      atribuicoes.length < swapPairs.length * 2
                    ) {
                      alert(
                        "Nem todas as datas possuem atribuição para ambos os integrantes."
                      );
                      setSubmitting(false);
                      return;
                    }
                    // Troca atômica via função RPC para cada par
                    for (const pair of swapPairs) {
                      const a1 = atribuicoes.find(
                        (a) =>
                          a.data === pair.from &&
                          a.integrante_id === values.memberIdOne
                      );
                      const a2 = atribuicoes.find(
                        (a) =>
                          a.data === pair.to &&
                          a.integrante_id === values.memberIdTwo
                      );
                      if (a1 && a2) {
                        const memberOneName =
                          members.find((m) => m.id === values.memberIdOne)
                            ?.name || values.memberIdOne;
                        const memberTwoName =
                          members.find((m) => m.id === values.memberIdTwo)
                            ?.name || values.memberIdTwo;

                        if (swapAlsoLeaves) {
                          // Troca completa (folga e trabalho)
                          const { error } = await supabase.rpc(
                            "trocar_atribuicoes_escala",
                            {
                              p_escala_folga_id: scaleId,
                              p_integrante1_id: values.memberIdOne,
                              p_data1: pair.from,
                              p_integrante2_id: values.memberIdTwo,
                              p_data2: pair.to,
                              p_usuario_id: userId,
                            }
                          );
                          if (error) {
                            toast.error(
                              "Erro ao realizar troca: " + error.message
                            );
                            setSubmitting(false);
                            return;
                          }
                        } else {
                          // Verifica se já existe troca igual
                          const { data: existing, error: checkError } =
                            await supabase
                              .from("escala_folgas_trocas")
                              .select("id")
                              .eq("escala_folga_id", scaleId)
                              .eq("integrante1_id", values.memberIdOne)
                              .eq("data1", pair.from)
                              .eq("integrante2_id", values.memberIdTwo)
                              .eq("data2", pair.to)
                              .maybeSingle();
                          if (checkError) {
                            toast.error(
                              "Já existe uma troca igual registrada."
                            );
                            setSubmitting(false);
                            return;
                          }
                          if (existing) {
                            toast.error(
                              "Esta troca já foi registrada anteriormente."
                            );
                            setSubmitting(false);
                            return;
                          }
                          // Apenas registra na tabela de trocas
                          const { error } = await supabase
                            .from("escala_folgas_trocas")
                            .insert([
                              {
                                escala_folga_id: scaleId,
                                integrante1_id: values.memberIdOne,
                                data1: pair.from,
                                integrante2_id: values.memberIdTwo,
                                data2: pair.to,
                                usuario_id: userId,
                              },
                            ]);
                          if (error) {
                            toast.error(
                              "Erro ao registrar troca: " + error.message
                            );
                            setSubmitting(false);
                            return;
                          }
                        }
                      } else {
                        toast.error(
                          `Não foi possível encontrar atribuição para as datas ${pair.from} ou ${pair.to}.`
                        );
                        setSubmitting(false);
                        return;
                      }
                    }
                    toast.success("Troca registrada com sucesso!");
                    fetchScale();
                    setShowChangeDialog(false);
                    resetForm();
                    setSwapPairs([]);
                  } catch (err) {
                    let msg = "";
                    if (err && typeof err === "object" && "message" in err) {
                      msg = (err as any).message;
                    } else {
                      msg = String(err);
                    }
                    alert("Erro ao realizar troca: " + msg);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                validationSchema={Yup.object().shape({
                  memberIdOne: Yup.string().required(
                    "O primeiro integrante é obrigatório"
                  ),
                  memberIdTwo: Yup.string().required(
                    "O segundo integrante é obrigatório"
                  ),
                  selectedDates: Yup.array()
                    .of(Yup.string().required("Data é obrigatória"))
                    .min(1, "Selecione pelo menos uma data"),
                })}
                validateOnChange={false}
              >
                {({ isSubmitting, values, setFieldValue }) => {
                  // Função para formatar datas para dd/MM/yyyy
                  const formatDate = (dateStr: string) => {
                    const d = new Date(dateStr + "T12:00:00");
                    return format(d, "dd/MM/yyyy", { locale: ptBR });
                  };
                  // Datas de trabalho do integrante 1
                  const memberOneDates: string[] = assignments
                    .filter(
                      (a) =>
                        a.integrante?.id === values.memberIdOne &&
                        a.tipo_atribuicao === "trabalho"
                    )
                    .map((a) => a.data)
                    .sort();

                  // Datas de trabalho do integrante 2
                  const memberTwoDates: string[] = assignments
                    .filter(
                      (a) =>
                        a.integrante?.id === values.memberIdTwo &&
                        a.tipo_atribuicao === "trabalho"
                    )
                    .map((a) => a.data)
                    .sort();

                  // Estado local para pareamento das trocas
                  // Limpa swapPairs se integrantes mudarem
                  useEffect(() => {
                    setSwapPairs([]);
                  }, [values.memberIdOne, values.memberIdTwo]);
                  // Função para adicionar/remover pares de troca
                  const handleSwapPair = (from: string, to: string) => {
                    setSwapPairs((prev) => {
                      const exists = prev.find((p) => p.from === from);
                      if (exists) {
                        return prev.map((p) =>
                          p.from === from ? { from, to } : p
                        );
                      } else {
                        return [...prev, { from, to }];
                      }
                    });
                  };
                  const isDatePaired = (to: string) =>
                    swapPairs.some((p) => p.to === to);
                  const getPairedDate = (from: string) => {
                    const pair = swapPairs.find((p) => p.from === from);
                    return pair ? pair.to : null;
                  };

                  return (
                    <Form className="space-y-4">
                      <Field name="memberIdOne">
                        {({ field, meta }) => (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Integrante 1
                            </label>
                            <Select
                              value={field.value}
                              onValueChange={(val) => {
                                setFieldValue("memberIdOne", val);
                                setFieldValue("selectedDates", []);
                              }}
                            >
                              <SelectTrigger
                                className={`w-full ${
                                  meta.error ? "border-red-500" : ""
                                }`}
                              >
                                <SelectValue placeholder="Selecione um integrante" />
                              </SelectTrigger>
                              <SelectContent className="w-full">
                                {members.map((member) => (
                                  <SelectItem
                                    key={member.id}
                                    value={member.id}
                                    className="capitalize hover:cursor-pointer"
                                  >
                                    {member.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {meta.touched && meta.error && (
                              <div className="text-xs text-red-500">
                                {meta.error}
                              </div>
                            )}
                          </div>
                        )}
                      </Field>
                      {/* Multi-select de datas do integrante 1 */}
                      {/* {values.memberIdOne && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            1. Selecione os dias de trabalho do Integrante 1
                            para trocar
                          </label>
                          <Calendar
                            mode="multiple"
                            locale={ptBR}
                            selected={values.selectedDates.map(
                              (date) => new Date(date + "T12:00:00")
                            )}
                            onSelect={(dates) => {
                              setFieldValue(
                                "selectedDates",
                                Array.isArray(dates)
                                  ? dates.map((d) =>
                                      d.toISOString().slice(0, 10)
                                    )
                                  : []
                              );
                              setSwapPairs([]);
                            }}
                            disabled={(date) =>
                              !memberOneDates.includes(
                                date.toISOString().slice(0, 10)
                              )
                            }
                            fromDate={
                              memberOneDates.length
                                ? new Date(memberOneDates[0] + "T12:00:00")
                                : undefined
                            }
                            toDate={
                              memberOneDates.length
                                ? new Date(
                                    memberOneDates[memberOneDates.length - 1] +
                                      "T12:00:00"
                                  )
                                : undefined
                            }
                          />
                        </div>
                      )} */}
                      <Field name="selectedDates">
                        {({ field, meta }) => (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              1. Selecione os dias de trabalho do Integrante 1
                              para trocar
                              <span className="text-red-500 ml-1">*</span>
                            </label>
                            <Calendar
                              mode="multiple"
                              locale={ptBR}
                              selected={values.selectedDates.map(
                                (date) => new Date(date + "T12:00:00")
                              )}
                              onSelect={(dates) => {
                                setFieldValue(
                                  "selectedDates",
                                  Array.isArray(dates)
                                    ? dates.map((d) =>
                                        d.toISOString().slice(0, 10)
                                      )
                                    : []
                                );
                                setSwapPairs([]);
                              }}
                              disabled={(date) =>
                                !memberOneDates.includes(
                                  date.toISOString().slice(0, 10)
                                )
                              }
                              fromDate={
                                memberOneDates.length
                                  ? new Date(memberOneDates[0] + "T12:00:00")
                                  : undefined
                              }
                              toDate={
                                memberOneDates.length
                                  ? new Date(
                                      memberOneDates[
                                        memberOneDates.length - 1
                                      ] + "T12:00:00"
                                    )
                                  : undefined
                              }
                            />
                            {meta.touched && meta.error && (
                              <div className="text-xs text-red-500">
                                {meta.error}
                              </div>
                            )}
                          </div>
                        )}
                      </Field>

                      <Field name="memberIdTwo">
                        {({ field, meta }) => (
                          <div className="space-y-2 w-full">
                            <label className="text-sm font-medium">
                              Integrante 2
                            </label>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange(field.name)}
                              disabled={
                                !values.memberIdOne ||
                                !values.selectedDates.length
                              }
                            >
                              <SelectTrigger
                                className={`w-full ${
                                  meta.error ? "border-red-500" : ""
                                }`}
                              >
                                <SelectValue placeholder="Selecione outro integrante" />
                              </SelectTrigger>
                              <SelectContent className="w-full">
                                {members
                                  .filter(
                                    (member) => member.id !== values.memberIdOne
                                  )
                                  .map((member) => (
                                    <SelectItem
                                      key={member.id}
                                      value={member.id}
                                      className="capitalize hover:cursor-pointer"
                                    >
                                      {member.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {meta.touched && meta.error && (
                              <div className="text-xs text-red-500">
                                {meta.error}
                              </div>
                            )}
                          </div>
                        )}
                      </Field>
                      {/* Seleção dos dias do integrante 2 para parear com os dias do integrante 1 */}

                      {values.memberIdOne &&
                        values.selectedDates.length > 0 &&
                        values.memberIdTwo && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              2. Para cada dia selecionado do Integrante 1,
                              escolha o dia de trabalho do Integrante 2 para
                              trocar:
                            </label>
                            <div className="flex flex-col gap-2">
                              {values.selectedDates.map((fromDate) => (
                                <div
                                  key={fromDate}
                                  className="flex items-center gap-2"
                                >
                                  <span className="text-xs min-w-[110px] font-semibold">
                                    {formatDate(fromDate)}
                                  </span>
                                  <span className="mx-1">→</span>
                                  <select
                                    className="border rounded px-2 py-1 text-xs"
                                    value={getPairedDate(fromDate) || ""}
                                    onChange={(e) =>
                                      handleSwapPair(fromDate, e.target.value)
                                    }
                                  >
                                    <option value="">
                                      Selecione o dia do Integrante 2
                                    </option>
                                    {memberTwoDates
                                      .filter(
                                        (d) =>
                                          !isDatePaired(d) ||
                                          getPairedDate(fromDate) === d
                                      )
                                      .map((d) => (
                                        <option key={d} value={d}>
                                          {formatDate(d)}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                            {/* Validação: todos os dias precisam estar pareados */}
                            {values.selectedDates.length > 0 &&
                              swapPairs.length !==
                                values.selectedDates.length && (
                                <div className="text-xs text-red-500 mt-1">
                                  Selecione um dia correspondente do Integrante
                                  2 para cada data do Integrante 1.
                                </div>
                              )}
                            {/* Visualização das trocas */}
                            <div className="mt-2">
                              <label className="text-xs font-medium">
                                Resumo das trocas:
                              </label>
                              <ul className="text-xs list-disc ml-4">
                                {swapPairs.map((pair, idx) => (
                                  <li key={idx}>
                                    Integrante 1: <b>{formatDate(pair.from)}</b>{" "}
                                    ⇄ Integrante 2: <b>{formatDate(pair.to)}</b>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="swapAlsoLeaves"
                          checked={swapAlsoLeaves}
                          onCheckedChange={(checked) =>
                            setSwapAlsoLeaves(checked === true)
                          }
                        />
                        <Label htmlFor="swapAlsoLeaves">
                          Trocar também as folgas
                        </Label>
                      </div>
                      <Button
                        type="submit"
                        disabled={
                          isSubmitting ||
                          values.selectedDates.length === 0 ||
                          swapPairs.length !== values.selectedDates.length
                        }
                      >
                        Trocar
                      </Button>
                    </Form>
                  );
                }}
              </Formik>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
