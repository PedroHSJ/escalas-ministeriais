"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

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
  escalaVermelhaMap?: Record<string, boolean>;
  membersOnLeave?: Record<string, boolean>;
}

interface ExportarEscalaXLSProps {
  calendarData: CalendarData;
  escalaNome: string;
}

export default function ExportarEscalaXLS({ calendarData, escalaNome }: ExportarEscalaXLSProps) {
  const [exportando, setExportando] = useState(false);

  const prepararDadosParaXLS = () => {
    const { dates, matrix, members, specializations } = calendarData;
    
    // Preparar dados para XLS
    const dadosXLS: any[][] = [];
    
    // Cabeçalho vazio
    dadosXLS.push([]);
    
    // Título da escala
    dadosXLS.push([escalaNome]);
    dadosXLS.push([]);
    
    // Cabeçalho das colunas
    const cabecalho = ["Ord", "Grad", "Nome", "TURMA"];
    
    // Agrupar datas por mês
    const meses = new Map<string, string[]>();
    dates.forEach(date => {
      const d = new Date(date + "T12:00:00");
      const mesKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
      
      if (!meses.has(mesKey)) {
        meses.set(mesKey, []);
      }
      meses.get(mesKey)!.push(date);
    });
    
    // Adicionar cabeçalhos dos meses (linha mesclada)
    const cabecalhoMeses = ["", "", "", ""]; // Primeiras 4 colunas vazias
    const cabecalhoDias = ["Ord", "Grad", "Nome", "TURMA"];
    
    meses.forEach((dates, mesKey) => {
      const mesNome = new Date(mesKey + "-01").toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
      
      // Adicionar nome do mês na linha de meses (apenas uma vez por mês)
      cabecalhoMeses.push(mesNome);
      
      // Adicionar dias do mês na linha de dias
      dates.forEach(date => {
        const d = new Date(date + "T12:00:00");
        cabecalhoDias.push(d.getDate().toString());
      });
    });
    
    dadosXLS.push(cabecalhoMeses); // Linha com meses mesclados
    dadosXLS.push(cabecalhoDias);  // Linha com dias
    
    // Dados dos membros
    members.forEach((member, index) => {
      if (!member) return;
      
      const linha = [
        index + 1,
        "SD EP", // Graduação padrão (pode ser ajustada)
        member,
        "2024" // Turma padrão (pode ser ajustada)
      ];
      
      // Adicionar dados de cada mês
      meses.forEach((dates, mesKey) => {
        dates.forEach(date => {
          const memberData = matrix[member]?.[date];
          if (memberData) {
            if (memberData.tipo === "folga") {
              linha.push(memberData.codigo.toString());
            } else {
              linha.push("0"); // Dia trabalhado
            }
          } else {
            linha.push("0");
          }
        });
      });
      
      dadosXLS.push(linha);
    });

      return { dadosXLS, meses };
};

  // Função para aplicar cores e estilos baseados nas especializações
  const aplicarCoresEStyles = (ws: XLSX.WorkSheet, dadosXLS: any[][], meses: Map<string, string[]>) => {
    const { specializations, matrix, members } = calendarData;
    
    // Cores baseadas no exemplo da imagem
    const coresEspecializacoes = [
      "#DDA0DD", // Roxo claro (como no exemplo)
      "#FFB6C1", // Rosa claro
      "#98FB98", // Verde claro
      "#87CEEB", // Azul claro
      "#F0E68C", // Amarelo claro
      "#FFA07A", // Laranja claro
    ];
    
    // Aplicar cores aos cabeçalhos dos meses (linha 3 - meses mesclados)
    let colIndex = 4; // Começar após as colunas Ord, Grad, Nome, TURMA
    
    meses.forEach((dates, mesKey) => {
      const mesIndex = Array.from(meses.keys()).indexOf(mesKey);
      const cor = coresEspecializacoes[mesIndex % coresEspecializacoes.length];
      
      // Aplicar cor ao cabeçalho do mês (célula mesclada)
      const cellRef = XLSX.utils.encode_cell({ r: 2, c: colIndex });
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = {
        fill: { fgColor: { rgb: cor.replace('#', '') } },
        font: { bold: true, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
      
      // Aplicar cor aos dias do mês (linha 4)
      dates.forEach((date, dayIndex) => {
        const dayCellRef = XLSX.utils.encode_cell({ r: 3, c: colIndex + dayIndex });
        if (!ws[dayCellRef]) ws[dayCellRef] = {};
        ws[dayCellRef].s = {
          fill: { fgColor: { rgb: cor.replace('#', '') } },
          font: { bold: true, color: { rgb: '000000' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      });
      
      colIndex += dates.length;
    });
    
    // Aplicar cores aos nomes dos integrantes e células baseadas na especialização
    dadosXLS.forEach((linha, rowIndex) => {
      if (rowIndex < 4) return; // Pular cabeçalhos
      
      const nomeIntegrante = linha[2]; // Coluna Nome
      if (nomeIntegrante && nomeIntegrante !== "Nome") {
        // Determinar cor baseada na especialização do integrante
        const especializacaoIndex = (rowIndex - 4) % specializations.length;
        const cor = coresEspecializacoes[especializacaoIndex % coresEspecializacoes.length];
        
        // Aplicar cor ao nome do integrante (coluna C)
        const nomeCellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 2 });
        if (!ws[nomeCellRef]) ws[nomeCellRef] = {};
        ws[nomeCellRef].s = {
          fill: { fgColor: { rgb: cor.replace('#', '') } },
          font: { bold: true, color: { rgb: '000000' } }
        };
        
        // Aplicar cor às células baseadas no valor e especialização
        let colIndex = 4; // Começar após as colunas Ord, Grad, Nome, TURMA
        
        meses.forEach((dates, mesKey) => {
          dates.forEach((date, dayIndex) => {
            const cellValue = linha[colIndex + dayIndex];
            const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex + dayIndex });
            if (!ws[cellRef]) ws[cellRef] = {};
            
            // Se for valor 0 (dia trabalhado), usar cor da especialização
            if (cellValue === "0") {
              ws[cellRef].s = {
                fill: { fgColor: { rgb: cor.replace('#', '') } },
                font: { bold: true, color: { rgb: '000000' } },
                alignment: { horizontal: 'center', vertical: 'center' }
              };
            } else {
              // Para folgas (valores > 0), usar fundo branco com texto preto
              ws[cellRef].s = {
                fill: { fgColor: { rgb: 'FFFFFF' } },
                font: { bold: true, color: { rgb: '000000' } },
                alignment: { horizontal: 'center', vertical: 'center' }
              };
            }
          });
          colIndex += dates.length;
        });
      }
    });
    
    // Aplicar estilos aos cabeçalhos principais
    const cabecalhoRefs = ['A1', 'A2', 'A3', 'A4'];
    cabecalhoRefs.forEach(ref => {
      if (!ws[ref]) ws[ref] = {};
      ws[ref].s = {
        font: { bold: true, size: 12 },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    });
    
    // Estilo para as colunas Ord, Grad, Nome, TURMA
    for (let row = 4; row < dadosXLS.length; row++) {
      for (let col = 0; col < 4; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellRef]) ws[cellRef] = {};
        ws[cellRef].s = {
          font: { bold: true },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
    }
  };

  const exportarXLS = async () => {
    if (!calendarData) {
      toast.error("Dados da escala não disponíveis");
      return;
    }

    setExportando(true);

    try {
      const { dadosXLS, meses } = prepararDadosParaXLS();
      
      // Criar workbook
      const wb = XLSX.utils.book_new();
      
      // Criar worksheet
      const ws = XLSX.utils.aoa_to_sheet(dadosXLS);
      
      // Ajustar largura das colunas
      const colWidths = [
        { wch: 5 },   // Ord
        { wch: 15 },  // Grad
        { wch: 25 },  // Nome
        { wch: 10 },  // TURMA
      ];
      
      // Adicionar largura para as colunas dos meses
      meses.forEach((dates, mesKey) => {
        dates.forEach(() => {
          colWidths.push({ wch: 3 });
        });
      });
      
      ws["!cols"] = colWidths;
      
      // Configurar mesclagem de células para os meses
      const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
      let colIndex = 4; // Começar após as colunas Ord, Grad, Nome, TURMA
      
      meses.forEach((dates, mesKey) => {
        // Sempre mesclar o cabeçalho do mês, mesmo que tenha apenas um dia
        merges.push({
          s: { r: 2, c: colIndex }, // Linha 3 (índice 2), coluna atual
          e: { r: 2, c: colIndex + dates.length - 1 } // Mesma linha, última coluna do mês
        });
        colIndex += dates.length;
      });
      
      ws["!merges"] = merges;
      
      // Aplicar cores e estilos
      aplicarCoresEStyles(ws, dadosXLS, meses);
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, "Escala");
      
      // Gerar arquivo
      const nomeArquivo = `${escalaNome.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, nomeArquivo);
      
      toast.success("Escala exportada com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar escala:", error);
      toast.error("Erro ao exportar escala");
    } finally {
      setExportando(false);
    }
  };

  return (
    <Button
      onClick={exportarXLS}
      disabled={exportando || !calendarData}
      variant="outline"
      size="sm"
      className="text-green-600 border-green-200 hover:bg-green-50"
    >
      <Download className="mr-2 h-4 w-4" />
      {exportando ? "Exportando..." : "Exportar XLS"}
    </Button>
  );
}
