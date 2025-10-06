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
import Link from "next/link";
import { toast } from "sonner";

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
  const scaleId = searchParams.get("id");
  
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
    const printContent = document.getElementById('print-scale');
    if (!printContent) {
      toast.error('Erro ao preparar impressão');
      return;
    }

    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Não foi possível abrir a janela de impressão');
      return;
    }

    // HTML completo para a janela de impressão
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Impressão - ${scale?.nome}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { 
                margin: 0;
                padding: 20px;
                font-family: system-ui, -apple-system, sans-serif;
              }
              .no-print { display: none !important; }
              .page-break { page-break-before: always; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
              th { background-color: #f9fafb; font-weight: 600; }
            }
          </style>
        </head>
        <body class="bg-white">
          ${printContent.outerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Aguardar o carregamento e imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
    
    toast.success('Preparando impressão...');
  };

  if (!scaleId) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold">Escala não encontrada</h1>
          <p className="text-muted-foreground mb-4">ID da escala não foi fornecido.</p>
          <Link href="/scales/list">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à Lista
            </Button>
          </Link>
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
          <Link href="/scales/list">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à Lista
            </Button>
          </Link>
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
            <Link href="/scales/list">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
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
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Editar
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
                  {/* Participações Agrupadas por Dia */}
                  <div className="space-y-6 print:space-y-4">
                    {Object.entries(groupedParticipations).map(([dayDate, dayParticipations]) => (
                      <div key={dayDate} className="space-y-3 print:space-y-2 print:break-inside-avoid">
                        <h4 className="font-semibold text-lg border-b border-muted pb-2 flex items-center gap-2 print:text-base print:pb-1 print:border-gray-300">
                          <Clock className="h-5 w-5 print:h-4 print:w-4" />
                          {dayDate}
                        </h4>
                        
                        {/* Visualização em Cards para mobile - ocultar na impressão */}
                        <div className="block md:hidden print:hidden space-y-3">
                          {dayParticipations.map((participation) => (
                            <Card key={participation.id}>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-blue-100 text-blue-600">
                                      {getInitials(participation.integrantes?.nome || "??")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="font-medium">{participation.integrantes?.nome}</div>
                                    <div className="text-sm text-blue-600">
                                      {participation.especializacoes?.nome}
                                    </div>
                                    {participation.observacao && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {participation.observacao}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Visualização em Tabela para desktop e impressão */}
                        <div className="hidden md:block print:block">
                          <Table className="print:border-collapse print:w-full">
                            <TableHeader>
                              <TableRow className="print:border-b print:border-gray-300">
                                <TableHead className="print:border print:border-gray-300 print:bg-gray-50 print:p-2 print:font-semibold">
                                  Integrante
                                </TableHead>
                                <TableHead className="print:border print:border-gray-300 print:bg-gray-50 print:p-2 print:font-semibold">
                                  Especialização
                                </TableHead>
                                <TableHead className="print:border print:border-gray-300 print:bg-gray-50 print:p-2 print:font-semibold">
                                  Observações
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dayParticipations && dayParticipations.map((participation) => (
                                <TableRow key={participation.id} className="print:border-b print:border-gray-200">
                                  <TableCell className="print:border print:border-gray-300 print:p-2">
                                    <div className="flex items-center gap-3 print:gap-2">
                                      <Avatar className="h-8 w-8 print:h-6 print:w-6">
                                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs print:text-xs print:bg-gray-200 print:text-gray-700">
                                          {getInitials(participation.integrantes?.nome || "??")}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium print:text-sm">{participation.integrantes?.nome}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="print:border print:border-gray-300 print:p-2">
                                    <Badge variant="secondary" className="print:bg-gray-200 print:text-gray-800 print:text-xs print:px-2 print:py-1 print:rounded">
                                      {participation.especializacoes?.nome}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="print:border print:border-gray-300 print:p-2">
                                    <span className="text-sm text-muted-foreground print:text-xs print:text-gray-600">
                                      {participation.observacao || "—"}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
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
