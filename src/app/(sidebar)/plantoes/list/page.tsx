"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { EscalaPlantao, EstatisticasEscalaPlantao } from "@/types/plantoes";
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
import { toast } from "sonner";

export default function PlantoesList() {
  const router = useRouter();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [escalas, setEscalas] = useState<EscalaPlantao[]>([]);
  const [estatisticas, setEstatisticas] = useState<
    Record<string, EstatisticasEscalaPlantao>
  >({});
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [escalaToDelete, setEscalaToDelete] = useState<string | null>(null);

  // Debug do AuthContext
  useEffect(() => {
    console.log("Debug AuthContext:", { user: !!user, userId: user?.id });

    // Se não há usuário após 3 segundos, assume que está em desenvolvimento
    const timeout = setTimeout(() => {
      if (!user) {
        console.log("Assumindo modo desenvolvimento - criando mock user");
        // Simular organização para desenvolvimento
        setOrganization({
          id: "mock-org",
          nome: "Organização Desenvolvimento",
        });
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [user]);

  useEffect(() => {
    console.log("useAuth hook result:", { user, userId: user?.id });

    if (user?.id) {
      console.log("Usuário autenticado, buscando organização...");
      fetchOrganization();
    }
  }, [user]);

  useEffect(() => {
    console.log("Organization effect:", organization);
    if (organization?.id) {
      console.log("Organização definida, buscando escalas...");
      fetchEscalas();
    } else if (organization && !organization.id) {
      // Organização mock ou sem ID válido
      console.log("Organização mock, finalizando loading...");
      setLoading(false);
    }
  }, [organization]);

  const fetchOrganization = async () => {
    if (!user?.id) {
      console.log("Usuário não logado ainda");
      return;
    }

    console.log("Buscando organização para usuário:", user.id);

    try {
      const { data, error } = await supabase
        .from("integrantes")
        .select("organizacao_id, organizacoes(id, nome)")
        .eq("auth_user_id", user.id)
        .single();

      if (error) {
        console.error("Erro ao buscar organização:", error);
        if (error.code === "PGRST116") {
          console.log("Usuário não tem organização vinculada");
          setLoading(false);
          return;
        }
        throw error;
      }

      console.log("Dados retornados:", data);

      if (data?.organizacoes) {
        console.log("Organização encontrada:", data.organizacoes);
        setOrganization(data.organizacoes);
      } else {
        console.log("Nenhuma organização encontrada para o usuário");
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro ao buscar organização:", error);
      setLoading(false);
    }
  };

  const fetchEscalas = async () => {
    try {
      // Primeiro, vamos verificar se a tabela existe
      console.log("Iniciando busca de escalas...");

      // Buscar escalas de plantões - corrigindo a consulta
      const { data: escalasData, error: escalasError } = await supabase
        .from("escalas_plantoes")
        .select(
          `
          *,
          departamento:departamentos!inner(id, nome, organizacao_id)
        `
        )
        .eq("departamento.organizacao_id", organization?.id)
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (escalasError) {
        console.error("Erro ao buscar escalas:", escalasError);

        // Se a tabela não existir, mostrar uma mensagem mais amigável
        if (
          escalasError.code === "PGRST116" ||
          escalasError.message.includes("does not exist")
        ) {
          console.log("Tabelas de plantões não existem ainda");
          setEscalas([]);
          setLoading(false);
          return;
        }

        toast.error("Erro ao carregar escalas de plantões");
        setLoading(false);
        return;
      }

      console.log("Escalas encontradas:", escalasData?.length || 0);
      setEscalas(escalasData || []);

      // Buscar estatísticas para cada escala apenas se houver escalas
      if (escalasData && escalasData.length > 0) {
        console.log("Buscando estatísticas...");
        const estatisticasPromises = escalasData.map(async (escala) => {
          const stats = await fetchEstatisticasEscala(escala.id);
          return { escalaId: escala.id, stats };
        });

        const estatisticasResults = await Promise.all(estatisticasPromises);
        const estatisticasMap = estatisticasResults.reduce(
          (acc, { escalaId, stats }) => {
            acc[escalaId] = stats;
            return acc;
          },
          {} as Record<string, EstatisticasEscalaPlantao>
        );

        setEstatisticas(estatisticasMap);
        console.log("Estatísticas carregadas");
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const fetchEstatisticasEscala = async (
    escalaId: string
  ): Promise<EstatisticasEscalaPlantao> => {
    try {
      // Buscar plantões programados
      const { data: plantoes, error } = await supabase
        .from("plantoes_programados")
        .select("*, tipo_turno:tipos_turnos(duracao_horas)")
        .eq("escala_plantao_id", escalaId);

      if (error) {
        console.error("Erro ao buscar plantões:", error);
        // Se a tabela não existir, retornar estatísticas vazias
        if (
          error.code === "PGRST116" ||
          error.message.includes("does not exist")
        ) {
          return {
            total_plantoes: 0,
            plantoes_cobertos: 0,
            plantoes_descobertos: 0,
            percentual_cobertura: 0,
            horas_totais_programadas: 0,
            horas_totais_trabalhadas: 0,
            integrantes_ativos: 0,
            substituicoes_necessarias: 0,
          };
        }
        throw error;
      }

      const total_plantoes = plantoes?.length || 0;
      const plantoes_cobertos =
        plantoes?.filter((p) => p.integrante_id).length || 0;
      const plantoes_descobertos = total_plantoes - plantoes_cobertos;
      const percentual_cobertura =
        total_plantoes > 0 ? (plantoes_cobertos / total_plantoes) * 100 : 0;

      const horas_totais_programadas =
        plantoes?.reduce((acc, p) => {
          return acc + (p.tipo_turno?.duracao_horas || 0);
        }, 0) || 0;

      const horas_totais_trabalhadas =
        plantoes?.reduce((acc, p) => {
          return acc + (p.horas_trabalhadas || 0);
        }, 0) || 0;

      // Buscar participações ativas
      const { data: participacoes } = await supabase
        .from("escala_plantoes_participacoes")
        .select("integrante_id")
        .eq("escala_plantao_id", escalaId)
        .eq("ativo", true);

      const integrantes_ativos = participacoes?.length || 0;

      // Buscar substituições necessárias - com proteção contra tabela inexistente
      let substituicoes_necessarias = 0;
      try {
        const { data: ausencias } = await supabase
          .from("plantoes_ausencias")
          .select("id")
          .eq("substituicao_aprovada", false)
          .in("plantao_programado_id", plantoes?.map((p) => p.id) || []);

        substituicoes_necessarias = ausencias?.length || 0;
      } catch (ausenciaError: any) {
        console.log("Tabela de ausências não existe ainda:", ausenciaError);
        substituicoes_necessarias = 0;
      }

      return {
        total_plantoes,
        plantoes_cobertos,
        plantoes_descobertos,
        percentual_cobertura,
        horas_totais_programadas,
        horas_totais_trabalhadas,
        integrantes_ativos,
        substituicoes_necessarias,
      };
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      return {
        total_plantoes: 0,
        plantoes_cobertos: 0,
        plantoes_descobertos: 0,
        percentual_cobertura: 0,
        horas_totais_programadas: 0,
        horas_totais_trabalhadas: 0,
        integrantes_ativos: 0,
        substituicoes_necessarias: 0,
      };
    }
  };

  const handleDeleteEscala = async (escalaId: string) => {
    try {
      const { error } = await supabase
        .from("escalas_plantoes")
        .update({ ativo: false })
        .eq("id", escalaId);

      if (error) throw error;

      toast.success("Escala de plantão removida com sucesso");
      fetchEscalas();
    } catch (error) {
      console.error("Erro ao remover escala:", error);
      toast.error("Erro ao remover escala de plantão");
    }
  };

  const formatPeriodo = (dataInicio: string, dataFim: string) => {
    const inicio = new Date(dataInicio).toLocaleDateString("pt-BR");
    const fim = new Date(dataFim).toLocaleDateString("pt-BR");
    return `${inicio} - ${fim}`;
  };

  const getStatusBadge = (stats: EstatisticasEscalaPlantao) => {
    if (stats.percentual_cobertura >= 95) {
      return (
        <Badge variant="default" className="bg-green-500">
          Completa
        </Badge>
      );
    } else if (stats.percentual_cobertura >= 80) {
      return <Badge variant="secondary">Quase completa</Badge>;
    } else if (stats.percentual_cobertura >= 50) {
      return <Badge variant="outline">Parcial</Badge>;
    } else {
      return <Badge variant="destructive">Incompleta</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Escalas de Plantões</h1>
            <p className="text-muted-foreground">
              Sistema 24h com turnos e controle de horas
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <p className="mb-4">Carregando escalas...</p>
              <p className="text-sm text-muted-foreground mb-4">
                User: {user ? "✅ Logado" : "❌ Não logado"} | Org:{" "}
                {organization ? "✅ Definida" : "❌ Não definida"}
              </p>
              <Button
                onClick={() => {
                  console.log("Forçando fim do loading");
                  setLoading(false);
                }}
                variant="outline"
                size="sm"
              >
                Forçar Carregamento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Escalas de Plantões</h1>
          <p className="text-muted-foreground">
            Sistema 24h com turnos e controle de horas
          </p>
        </div>
        <Button onClick={() => router.push("/plantoes/create")} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Nova Escala de Plantão
        </Button>
      </div>

      {escalas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma escala de plantão encontrada
            </h3>
            <p className="text-muted-foreground text-center mb-6">
              {organization
                ? "Crie sua primeira escala de plantão para gerenciar turnos 24h com controle de horas"
                : "Você precisa estar vinculado a uma organização para ver as escalas de plantões"}
            </p>
            {organization && (
              <Button onClick={() => router.push("/plantoes/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Escala
              </Button>
            )}
            {!organization && (
              <p className="text-sm text-muted-foreground mt-4">
                Entre em contato com o administrador para ser adicionado a uma
                organização.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Escalas de Plantões ({escalas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estatísticas</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalas.map((escala) => {
                  const stats = estatisticas[escala.id];
                  return (
                    <TableRow key={escala.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{escala.nome}</div>
                          {escala.observacoes && (
                            <div className="text-sm text-muted-foreground">
                              {escala.observacoes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {escala.departamento?.nome}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatPeriodo(escala.data_inicio, escala.data_fim)}
                        </div>
                      </TableCell>
                      <TableCell>{stats && getStatusBadge(stats)}</TableCell>
                      <TableCell>
                        {stats && (
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {stats.horas_totais_programadas}h programadas
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {stats.integrantes_ativos} integrantes
                            </div>
                            {stats.substituicoes_necessarias > 0 && (
                              <div className="flex items-center gap-1 text-amber-600">
                                <AlertCircle className="h-3 w-3" />
                                {stats.substituicoes_necessarias} substituições
                                pendentes
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/plantoes/view/${escala.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/plantoes/edit/${escala.id}`)
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Dialog
                            open={deleteDialogOpen}
                            onOpenChange={setDeleteDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEscalaToDelete(escala.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Remover escala de plantão
                                </DialogTitle>
                                <DialogDescription>
                                  Tem certeza que deseja remover a escala "
                                  {escala.nome}"? Esta ação não pode ser
                                  desfeita.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setDeleteDialogOpen(false)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    if (escalaToDelete) {
                                      handleDeleteEscala(escalaToDelete);
                                      setDeleteDialogOpen(false);
                                      setEscalaToDelete(null);
                                    }
                                  }}
                                >
                                  Remover
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
