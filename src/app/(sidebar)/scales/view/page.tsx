"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, PrinterIcon, Edit, ArrowLeft, Users, Building2, Clock } from "lucide-react";
import moment from "moment";
import "moment/locale/pt-br";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { NavigationButton } from "@/components/ui/navigation-button";

// Configurar locale do moment
moment.locale('pt-br');

interface Scale {
  id: string;
  nome: string;
  departamento_id: string;
  created_at: string;
  departamento?: {
    nome: string;
    tipo_departamento: string;
    organizacao?: {
      nome: string;
      tipo: string;
    };
  };
}

interface Participation {
  id: string;
  data: string;
  observacao?: string;
  integrantes?: {
    id: string;
    nome: string;
  };
  especializacoes?: {
    id: string;
    nome: string;
  };
}

const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scaleId = searchParams?.get("id");
  
  const [scale, setScale] = useState<Scale | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScale = async () => {
    if (!scaleId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      // Buscar dados da escala
      const { data: scaleData, error: scaleError } = await supabase
        .from('escalas')
        .select(`
          *,
          departamentos (
            nome,
            tipo_departamento,
            organizacoes (
              nome,
              tipo
            )
          )
        `)
        .eq('id', scaleId)
        .single();

      if (scaleError) throw scaleError;

      setScale({
        ...scaleData,
        departamento: {
          nome: scaleData.departamentos?.nome,
          tipo_departamento: scaleData.departamentos?.tipo_departamento,
          organizacao: {
            nome: scaleData.departamentos?.organizacoes?.nome,
            tipo: scaleData.departamentos?.organizacoes?.tipo
          }
        }
      });

      // Buscar participações
      const { data: participationsData, error: participationsError } = await supabase
        .from('escala_participacoes')
        .select(`
          *,
          integrantes (
            id,
            nome
          ),
          especializacoes (
            id,
            nome
          )
        `)
        .eq('escala_id', scaleId)
        .order('data', { ascending: true });

      if (participationsError) throw participationsError;

      setParticipations(participationsData || []);
      
    } catch (error) {
      console.error("Erro ao carregar escala:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScale();
  }, [scaleId]);



  const groupParticipationsByDay = () => {
    const grouped: Record<string, Participation[]> = {};
    
    participations.forEach(participation => {
      const date = moment(participation.data);
      const dayOfWeek = date.day();
      const dayName = DAYS_OF_WEEK[dayOfWeek];
      const dateKey = `${dayName} - ${date.format('DD/MM/YYYY')}`;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(participation);
    });

    return grouped;
  };

  const getInitials = (name: string) => {
    console.log("Gerando iniciais para:", name);
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handlePrint = () => {
    if (participations.length === 0) {
      toast.error('Não há participações para imprimir');
      return;
    }

    if (!scale) {
      toast.error('Dados da escala não disponíveis');
      return;
    }

    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Não foi possível abrir a janela de impressão');
      return;
    }

    // Organizar participações por data
    const sortedParticipations = participations.sort((a, b) => 
      new Date(a.data).getTime() - new Date(b.data).getTime()
    );
    
    // Criar cabeçalhos da tabela
    const headerRow = `
      <tr>
        <th style="width: 100px;">Data</th>
        <th style="width: 120px;">Dia da Semana</th>
        <th style="width: 200px;">Integrante</th>
        <th style="width: 150px;">Especialização</th>
      </tr>
    `;

    // Criar linhas da tabela
    const tableContent = sortedParticipations.map((participation, index) => {
      const date = moment(participation.data);
      const dayOfWeek = DAYS_OF_WEEK[date.day()];
      
      return `
        <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
          <td style="text-align: center;">${date.format('DD/MM/YYYY')}</td>
          <td style="text-align: center;">${dayOfWeek}</td>
          <td>${participation.integrantes?.nome || 'Nome não disponível'}</td>
          <td style="text-align: center;">${participation.especializacoes?.nome || 'Sem especialização'}</td>
        </tr>
      `;
    }).join('');

    // Calcular período da escala
    const startDate = sortedParticipations[0]?.data ? moment(sortedParticipations[0].data) : moment();
    const endDate = sortedParticipations[sortedParticipations.length - 1]?.data ? 
      moment(sortedParticipations[sortedParticipations.length - 1].data) : moment();

    const organizationName = scale.departamento?.organizacao?.nome || "ORGANIZAÇÃO";
    const departmentName = scale.departamento?.nome || "DEPARTAMENTO";

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
          .organization-name {
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
            text-align: left;
            vertical-align: middle;
            font-size: 10px;
            padding: 8px;
          }
          .scale-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
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
          <div class="organization-name">${organizationName}</div>
          <div class="scale-title">ESCALA DE SERVIÇO - ${departmentName.toUpperCase()}</div>
          <div class="scale-title">${scale.nome.toUpperCase()}</div>
          <div class="period">PERÍODO: ${startDate.format('DD/MM/YYYY')} a ${endDate.format('DD/MM/YYYY')}</div>
        </div>

        <table class="scale-table">
          <thead>
            ${headerRow}
          </thead>
          <tbody>
            ${tableContent}
          </tbody>
        </table>

        <div class="footer">
          <div>${organizationName}, ${moment().format('DD [de] MMMM [de] YYYY')}.</div>
        </div>

        <div class="signature-section">
          <div style="margin-top: 60px;">
            <div class="signature-line"></div>
            <div style="margin-top: 5px; font-weight: bold;">
              RESPONSÁVEL PELA ESCALA<br>
              ${organizationName}
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
      printWindow.print();
      printWindow.close();
    };
    
    toast.success('Preparando impressão...');
  };

  if (!scaleId) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold">Escala não encontrada</h1>
          <p className="text-muted-foreground mb-4">ID da escala não foi fornecido.</p>
          <NavigationButton
            href="/scales/list"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar à Lista
          </NavigationButton>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <Suspense fallback={
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div>
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
        </div>
      }>
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando detalhes da escala...</p>
          </div>
        </div>
      </Suspense>
    );
  }

  if (!scale) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold">Escala não encontrada</h1>
          <p className="text-muted-foreground mb-4">A escala solicitada não existe ou foi removida.</p>
          <NavigationButton
            href="/scales/list"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar à Lista
          </NavigationButton>
        </div>
      </div>
    );
  }

  const groupedParticipations = groupParticipationsByDay();

  return (
    <Suspense fallback={
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
      </div>
    }>
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NavigationButton
            href="/scales/list"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar à Lista
          </NavigationButton>
            <div>
              <h1 className="text-3xl font-bold">{scale.nome}</h1>
              <p className="text-muted-foreground">
                Detalhes e participações da escala
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline">
              <PrinterIcon className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Informações da Escala */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organização</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scale.departamento?.organizacao?.nome}</div>
              <p className="text-xs text-muted-foreground capitalize">
                {scale.departamento?.organizacao?.tipo}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departamento</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scale.departamento?.nome}</div>
              <p className="text-xs text-muted-foreground capitalize">
                {scale.departamento?.tipo_departamento}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Participações</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{participations.length}</div>
              <p className="text-xs text-muted-foreground">
                Criada em {moment(scale.created_at).format("DD/MM/YYYY")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo da Escala */}
        <Card className="print:shadow-none print:border-none" id="print-scale">
          <CardHeader className="print:text-center print:border-b print:pb-4">
            <CardTitle className="print:text-xl">{scale.nome}</CardTitle>
            <CardDescription className="print:hidden">
              Visualização detalhada de todas as participações organizadas por data
            </CardDescription>
            {/* Cabeçalho adicional para impressão */}
            <div className="hidden print:block print:mt-2">
              <div className="text-lg font-semibold">{scale.departamento?.organizacao?.nome}</div>
              <div className="text-base">{scale.departamento?.nome}</div>
              <div className="text-sm text-gray-600 mt-2">
                Impresso em {moment().format("DD/MM/YYYY [às] HH:mm")}
              </div>
            </div>
          </CardHeader>
          <CardContent className="print:p-4">
            <div>
              {participations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground print:py-8">
                  <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50 print:h-8 print:w-8 print:mb-2" />
                  <p className="text-lg font-medium print:text-base">Nenhuma participação cadastrada</p>
                  <p className="text-sm print:text-xs">Esta escala ainda não possui participações</p>
                </div>
              ) : (
                <div className="space-y-6 print:space-y-4">
                  {/* Tabela única com todas as participações */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg print:text-base">
                      Participações da Escala ({participations.length} total)
                    </h4>
                    
                    <div className="border rounded-lg overflow-hidden print:border-gray-300">
                      <Table className="print:border-collapse print:w-full">
                        <TableHeader>
                          <TableRow className="print:border-b print:border-gray-300">
                            <TableHead className="print:border print:border-gray-300 print:bg-gray-50 print:p-2 print:font-semibold w-24">
                              Data
                            </TableHead>
                            <TableHead className="print:border print:border-gray-300 print:bg-gray-50 print:p-2 print:font-semibold w-32">
                              Dia da Semana
                            </TableHead>
                            <TableHead className="print:border print:border-gray-300 print:bg-gray-50 print:p-2 print:font-semibold">
                              Integrante
                            </TableHead>
                            <TableHead className="print:border print:border-gray-300 print:bg-gray-50 print:p-2 print:font-semibold w-40">
                              Especialização
                            </TableHead>
                            <TableHead className="print:border print:border-gray-300 print:bg-gray-50 print:p-2 print:font-semibold print:hidden">
                              Observações
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {participations
                            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
                            .map((participation, index) => {
                              const date = moment(participation.data);
                              const dayOfWeek = DAYS_OF_WEEK[date.day()];
                              
                              return (
                                <TableRow 
                                  key={participation.id} 
                                  className={`print:border-b print:border-gray-200 ${
                                    index % 2 === 0 ? 'bg-secondary print:bg-white' : 'bg-muted/30 print:bg-gray-50'
                                  }`}
                                >
                                  <TableCell className="print:border print:border-gray-300 print:p-2 print:text-center">
                                    <span className="font-medium print:text-sm">
                                      {date.format('DD/MM/YYYY')}
                                    </span>
                                  </TableCell>
                                  <TableCell className="print:border print:border-gray-300 print:p-2 print:text-center">
                                    <span className="print:text-sm">{dayOfWeek}</span>
                                  </TableCell>
                                  <TableCell className="print:border print:border-gray-300 print:p-2">
                                    <div className="flex items-center gap-3 print:gap-2">
                                      <Avatar className="h-8 w-8 print:hidden">
                                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                          {getInitials(participation.integrantes?.nome || "??")}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium print:text-sm">{participation.integrantes?.nome}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="print:border print:border-gray-300 print:p-2 print:text-center">
                                    <Badge variant="secondary" className="print:bg-transparent print:border print:border-gray-400 print:text-gray-800 print:text-xs print:px-2 print:py-1 print:rounded">
                                      {participation.especializacoes?.nome || "Sem especialização"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="print:border print:border-gray-300 print:p-2 print:hidden">
                                    <span className="text-sm text-muted-foreground print:text-xs print:text-gray-600">
                                      {participation.observacao || "—"}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  );
}
