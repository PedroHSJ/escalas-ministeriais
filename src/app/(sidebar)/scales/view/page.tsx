"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, PrinterIcon, Edit, ArrowLeft, Users, Building2, Clock } from "lucide-react";
import { format, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  integrante?: {
    id: string;
    nome: string;
  };
  especializacao?: {
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
      const date = new Date(participation.data);
      const dayOfWeek = getDay(date);
      const dayName = DAYS_OF_WEEK[dayOfWeek];
      const dateKey = `${dayName} - ${format(date, "dd/MM/yyyy")}`;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(participation);
    });

    return grouped;
  };

  const printScale = () => {
    const printContent = document.getElementById('scale-content');
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    const printableContent = printContent.innerHTML;

    document.body.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        ${printableContent}
      </div>
    `;

    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
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
            <Button onClick={printScale} variant="outline">
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
                Criada em {format(new Date(scale.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo da Escala */}
        <Card>
          <CardHeader>
            <CardTitle>Participações da Escala</CardTitle>
            <CardDescription>
              Visualização detalhada de todas as participações organizadas por data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div id="scale-content">
              {participations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma participação cadastrada</p>
                  <p className="text-sm">Esta escala ainda não possui participações</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cabeçalho da Escala para impressão */}
                  <div className="text-center border-b pb-4 print:block hidden">
                    <h3 className="text-xl font-semibold">{scale.departamento?.organizacao?.nome}</h3>
                    <h4 className="text-lg">{scale.departamento?.nome}</h4>
                    <p className="text-md font-medium">{scale.nome}</p>
                  </div>
                  
                  {/* Participações Agrupadas por Dia */}
                  <div className="space-y-6">
                    {Object.entries(groupedParticipations).map(([dayDate, dayParticipations]) => (
                      <div key={dayDate} className="space-y-3">
                        <h4 className="font-semibold text-lg border-b border-muted pb-2 flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          {dayDate}
                        </h4>
                        
                        {/* Visualização em Cards para mobile */}
                        <div className="block md:hidden space-y-3">
                          {dayParticipations.map((participation) => (
                            <Card key={participation.id}>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-blue-100 text-blue-600">
                                      {getInitials(participation.integrante?.nome || "??")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="font-medium">{participation.integrante?.nome}</div>
                                    <div className="text-sm text-blue-600">
                                      {participation.especializacao?.nome}
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

                        {/* Visualização em Tabela para desktop */}
                        <div className="hidden md:block">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Integrante</TableHead>
                                <TableHead>Especialização</TableHead>
                                <TableHead>Observações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dayParticipations.map((participation) => (
                                <TableRow key={participation.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                          {getInitials(participation.integrante?.nome || "??")}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium">{participation.integrante?.nome}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">
                                      {participation.especializacao?.nome}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm text-muted-foreground">
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
