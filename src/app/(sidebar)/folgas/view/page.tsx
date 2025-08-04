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
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Calendar,
  PrinterIcon,
  Users,
  Clock,
  Building2,
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

export default function FolgasViewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scaleId = searchParams.get("id");

  const [scale, setScale] = useState<EscalaFolgaType | null>(null);
  const [participations, setParticipations] = useState<
    EscalaFolgaParticipacaoType[]
  >([]);
  const [assignments, setAssignments] = useState<EscalaFolgaAtribuicaoType[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signatureTitle, setSignatureTitle] = useState("");
  const [includeSignature, setIncludeSignature] = useState(false);
  const [printStartDate, setPrintStartDate] = useState("");
  const [printEndDate, setPrintEndDate] = useState("");
  const [printFullPeriod, setPrintFullPeriod] = useState(true);
  const [observacaoTemplate, setObservacaoTemplate] =
    useState<ObservacaoTemplate | null>(null);

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
          .eq("ativo", true)
          .order("posicao_atual", { ascending: true });

      if (participationsError) throw participationsError;

      setParticipations(participationsData || []);

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

  // Nova função para organizar dados no formato de calendário
  const getCalendarData = () => {
    if (assignments.length === 0 || participations.length === 0) return null;

    // Obter todas as datas únicas - garantir formato consistente
    const dates = Array.from(
      new Set(
        assignments.map((a) => {
          // Se a data já é uma string no formato YYYY-MM-DD, usar diretamente
          if (
            typeof a.data === "string" &&
            a.data.match(/^\d{4}-\d{2}-\d{2}$/)
          ) {
            return a.data;
          }
          // Caso contrário, converter para o formato correto
          const dateObj = new Date(a.data);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const dayNum = String(dateObj.getDate()).padStart(2, "0");
          return `${year}-${month}-${dayNum}`;
        })
      )
    ).sort();

    // Obter todas as especializações únicas
    const specializations = Array.from(
      new Set(
        assignments
          .filter((a) => a.especializacao?.nome)
          .map((a) => a.especializacao!.nome)
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
    participations.forEach((p) => {
      if (p.integrante?.nome) {
        const memberName = p.integrante.nome;
        const tipoParticipacao = p.tipo_participacao;
        calendarMatrix[memberName] = {};

        // Contadores separados para cada tipo de escala
        let consecutiveDaysOffPreta = 0;
        let consecutiveDaysOffVermelha = 0;

        dates.forEach((date) => {
          // Determinar se é escala preta ou vermelha
          const dateObj = new Date(date);
          const dayOfWeek = dateObj.getDay(); // 0 = domingo, 6 = sábado
          const isEscalaVermelha = dayOfWeek === 0 || dayOfWeek === 6;
          const isEscalaPreta = !isEscalaVermelha;

          // Buscar atribuição de trabalho para este membro nesta data
          const workAssignment = assignments.find(
            (a) =>
              a.integrante?.nome === memberName &&
              a.data === date &&
              a.tipo_atribuicao === "trabalho"
          );

          // Buscar atribuição de folga para este membro nesta data
          const leaveAssignment = assignments.find(
            (a) =>
              a.integrante?.nome === memberName &&
              a.data === date &&
              a.tipo_atribuicao === "folga"
          );

          if (workAssignment) {
            // Dia de trabalho - resetar apenas o contador da escala correspondente
            if (isEscalaPreta) {
              consecutiveDaysOffPreta = 0;
            } else {
              consecutiveDaysOffVermelha = 0;
            }

            const especializacaoNome =
              workAssignment.especializacao?.nome || workAssignment.observacao;

            calendarMatrix[memberName][date] = {
              codigo: 0,
              especializacao: especializacaoNome,
              tipo: "trabalho",
              color: "#bbf7d0", // verde claro para trabalho
            };
          } else if (leaveAssignment) {
            // Dia de folga - incrementar contador da escala correspondente
            let codigoFolga: number;

            if (isEscalaPreta) {
              consecutiveDaysOffPreta++;
              codigoFolga = consecutiveDaysOffPreta;
            } else {
              consecutiveDaysOffVermelha++;
              codigoFolga = consecutiveDaysOffVermelha;
            }

            calendarMatrix[memberName][date] = {
              codigo: codigoFolga,
              tipo: "folga",
              color: "#fecaca", // vermelho claro para todas as folgas
              textColor: isEscalaPreta ? "#000000" : "#991b1b", // texto preto para escala preta, vermelho escuro para escala vermelha
            };
          }
          // Se não há nem trabalho nem folga, não adiciona entrada para este dia
        });
      }
    });

    return {
      dates,
      specializations,
      matrix: calendarMatrix,
      members: participations.map((p) => p.integrante?.nome).filter(Boolean),
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
    return colors[(index - 1) % colors.length] || "#e5e7eb";
  };

  // Função para obter a cor da especialização de um integrante
  const getMemberSpecializationColor = (memberName: string) => {
    if (!calendarData) return "#f3f4f6";

    // Procurar a primeira atribuição de trabalho deste membro para identificar sua especialização
    const memberWorkAssignment = assignments.find(
      (a) =>
        a.integrante?.nome === memberName && a.tipo_atribuicao === "trabalho"
    );

    if (
      memberWorkAssignment?.especializacao?.nome ||
      memberWorkAssignment?.observacao
    ) {
      const especializacao =
        memberWorkAssignment.especializacao?.nome ||
        memberWorkAssignment.observacao;
      const specIndex = calendarData.specializations.indexOf(
        especializacao || ""
      );
      if (specIndex !== -1) {
        return getSpecializationColor(specIndex + 1);
      }
    }

    return "#f3f4f6"; // cor padrão se não tiver especialização
  };

  const handlePrintClick = () => {
    // Inicializar as datas com o período completo disponível
    const calendarData = getCalendarData();
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

  const printScale = (
    withSignature: boolean = false,
    signerName: string = "",
    signerTitle: string = "",
    startDate: string | null = null,
    endDate: string | null = null
  ) => {
    if (!scale) {
      console.error("Escala não disponível para impressão");
      return;
    }

    // Criar conteúdo específico para impressão
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const calendarData = getCalendarData();
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

    console.log("Especializações encontradas:", dynamicSpecializations);
    console.log("Especializações que serão usadas:", specializations);

    // Criar cabeçalho da tabela
    headerRow = `
      <tr>
        <th style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5; text-align: center; font-weight: bold; width: 100px;">Data</th>
    `;

    specializations.forEach((spec) => {
      headerRow += `<th style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5; text-align: center; font-weight: bold; min-width: 140px;">${spec}</th>`;
    });
    headerRow += "</tr>";

    // Criar linhas da tabela organizadas por data
    const dates = filteredDates;
    dates.forEach((date) => {
      const dateObj = new Date(date);
      const formattedDate = format(dateObj, "dd/MM", { locale: ptBR });
      const dayOfWeek = format(dateObj, "EEE", { locale: ptBR }).toUpperCase();

      // Debug: verificar todas as atribuições para esta data
      const allWorkingOnDate = assignments.filter(
        (a) => a.data === date && a.tipo_atribuicao === "trabalho"
      );

      console.log(
        `Data ${formattedDate}:`,
        allWorkingOnDate.map((a) => ({
          nome: a.integrante?.nome,
          especialização: a.especializacao?.nome,
          observacao: a.observacao,
        }))
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
        // Distribuir pessoas sem especialização pelas colunas
        const membersPerColumn = Math.ceil(
          allWorkingOnDate.length / specializations.length
        );

        specializations.forEach((spec, index) => {
          const startIndex = index * membersPerColumn;
          const endIndex = Math.min(
            startIndex + membersPerColumn,
            allWorkingOnDate.length
          );
          const workingMembers = allWorkingOnDate.slice(startIndex, endIndex);

          const memberNames = workingMembers.map((assignment) => {
            const nome = assignment.integrante?.nome || "";
            return nome.toUpperCase();
          });

          const cellContent =
            memberNames.length > 0 ? memberNames.join("<br>") : "";
          const backgroundColor =
            memberNames.length > 0 ? "#e8e8e8" : "#ffffff";

          row += `<td style="border: 1px solid #000; padding: 6px; text-align: center; background-color: ${backgroundColor}; min-height: 35px; vertical-align: middle; font-size: 10px; font-weight: bold;">
            ${cellContent}
          </td>`;
        });
      } else {
        // Lógica com especializações específicas
        specializations.forEach((spec) => {
          // Buscar membros trabalhando nesta data
          const workingMembers = assignments.filter((assignment) => {
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
              // Se a especialização for igual a "Permanência" ou similar, incluir pessoas sem especialização
              (["Permanência", "permanência", "Permanencia"].includes(spec) &&
                assignmentSpec === "")
            );
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

            // Distribuir membros sem especialização entre as colunas
            const specIndex = specializations.indexOf(spec);
            const membersPerColumn = Math.ceil(
              unassignedMembers.length / specializations.length
            );
            const startIndex = specIndex * membersPerColumn;
            const endIndex = Math.min(
              startIndex + membersPerColumn,
              unassignedMembers.length
            );
            const additionalMembers = unassignedMembers.slice(
              startIndex,
              endIndex
            );

            workingMembers.push(...additionalMembers);
          }

          const memberNames = workingMembers.map((assignment) => {
            const nome = assignment.integrante?.nome || "";
            return nome.toUpperCase();
          });

          const cellContent =
            memberNames.length > 0 ? memberNames.join("<br>") : "";
          const backgroundColor =
            memberNames.length > 0 ? "#e8e8e8" : "#ffffff";

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
              ? format(new Date(filteredDates[0]), "dd", {
                  locale: ptBR,
                }) +
                " A " +
                format(
                  new Date(filteredDates[filteredDates.length - 1]),
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
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
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

  const groupedAssignments = groupAssignmentsByDay();
  const calendarData = getCalendarData();

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
          <Button onClick={handlePrintClick} variant="outline" size="sm">
            <PrinterIcon className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
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
              <Calendar className="h-4 w-4 text-muted-foreground" />
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
              <Calendar className="h-5 w-5" />
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
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 print:h-8 print:w-8 print:mb-2" />
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
                />
              )}
            </div>
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
      </div>
    </Suspense>
  );
}
