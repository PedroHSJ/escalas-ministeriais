"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserX,
  Shuffle,
  Edit,
  Plus,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import {
  EscalaPlantao,
  PlantaoProgramado,
  TipoTurno,
  EstatisticasEscalaPlantao,
  DIAS_SEMANA,
  StatusPlantao,
} from "@/types/plantoes";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function ViewPlantao() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [escala, setEscala] = useState<EscalaPlantao | null>(null);
  const [plantoes, setPlantoes] = useState<PlantaoProgramado[]>([]);
  const [tiposTurnos, setTiposTurnos] = useState<TipoTurno[]>([]);
  const [estatisticas, setEstatisticas] =
    useState<EstatisticasEscalaPlantao | null>(null);
  const [loading, setLoading] = useState(true);
  const [ausenciaDialogOpen, setAusenciaDialogOpen] = useState(false);
  const [plantaoSelecionado, setPlantaoSelecionado] =
    useState<PlantaoProgramado | null>(null);
  const [motivoAusencia, setMotivoAusencia] = useState("");
  const [urgente, setUrgente] = useState(false);

  useEffect(() => {
    fetchOrganization();
  }, [user]);

  useEffect(() => {
    if (organization?.id && params?.id) {
      fetchEscalaData();
    }
  }, [organization, params?.id]);

  const fetchOrganization = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("integrantes")
        .select("organizacao_id, organizacoes(id, nome)")
        .eq("auth_user_id", user.id)
        .single();

      if (error) throw error;
      if (data?.organizacoes) {
        setOrganization(data.organizacoes);
      }
    } catch (error) {
      console.error("Erro ao buscar organização:", error);
    }
  };

  const fetchEscalaData = async () => {
    try {
      // Buscar dados da escala
      const { data: escalaData, error: escalaError } = await supabase
        .from("escalas_plantoes")
        .select(
          `
          *,
          departamento:departamentos(id, nome)
        `
        )
        .eq("id", params?.id)
        .single();

      if (escalaError) throw escalaError;
      setEscala(escalaData);

      // Buscar plantões programados
      const { data: plantoesData, error: plantoesError } = await supabase
        .from("plantoes_programados")
        .select(
          `
          *,
          tipo_turno:tipos_turnos(*),
          integrante:integrantes(id, nome, telefone),
          substituto:integrantes!integrante_substituto_id(id, nome, telefone)
        `
        )
        .eq("escala_plantao_id", params?.id)
        .order("data", { ascending: true })
        .order("tipo_turno.hora_inicio", { ascending: true });

      if (plantoesError) throw plantoesError;
      setPlantoes(plantoesData || []);

      // Buscar tipos de turnos
      const { data: turnosData, error: turnosError } = await supabase
        .from("tipos_turnos")
        .select("*")
        .eq("organizacao_id", organization?.id)
        .eq("ativo", true);

      if (turnosError) throw turnosError;
      setTiposTurnos(turnosData || []);

      // Calcular estatísticas
      calcularEstatisticas(plantoesData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da escala");
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = (plantoesList: PlantaoProgramado[]) => {
    const total_plantoes = plantoesList.length;
    const plantoes_cobertos = plantoesList.filter(
      (p) => p.integrante_id && p.status !== "ausencia"
    ).length;
    const plantoes_descobertos = total_plantoes - plantoes_cobertos;
    const percentual_cobertura =
      total_plantoes > 0 ? (plantoes_cobertos / total_plantoes) * 100 : 0;

    const horas_totais_programadas = plantoesList.reduce((acc, p) => {
      return acc + (p.tipo_turno?.duracao_horas || 0);
    }, 0);

    const horas_totais_trabalhadas = plantoesList.reduce((acc, p) => {
      return acc + (p.horas_trabalhadas || 0);
    }, 0);

    const integrantes_unicos = new Set(plantoesList.map((p) => p.integrante_id))
      .size;
    const substituicoes_necessarias = plantoesList.filter(
      (p) => p.status === "ausencia" && !p.integrante_substituto_id
    ).length;

    setEstatisticas({
      total_plantoes,
      plantoes_cobertos,
      plantoes_descobertos,
      percentual_cobertura,
      horas_totais_programadas,
      horas_totais_trabalhadas,
      integrantes_ativos: integrantes_unicos,
      substituicoes_necessarias,
    });
  };

  const getStatusBadge = (status: StatusPlantao) => {
    const statusConfig = {
      programado: { label: "Programado", variant: "secondary" as const },
      confirmado: { label: "Confirmado", variant: "default" as const },
      ausencia: { label: "Ausência", variant: "destructive" as const },
      substituido: { label: "Substituído", variant: "outline" as const },
      realizado: { label: "Realizado", variant: "default" as const },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: StatusPlantao) => {
    switch (status) {
      case "confirmado":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "ausencia":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "substituido":
        return <Shuffle className="h-4 w-4 text-blue-500" />;
      case "realizado":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleRegistrarAusencia = async () => {
    if (!plantaoSelecionado || !motivoAusencia.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      // Registrar ausência
      const { error: ausenciaError } = await supabase
        .from("plantoes_ausencias")
        .insert([
          {
            plantao_programado_id: plantaoSelecionado.id,
            integrante_id: plantaoSelecionado.integrante_id,
            motivo: motivoAusencia,
            urgente,
            observacoes: "",
          },
        ]);

      if (ausenciaError) throw ausenciaError;

      // Atualizar status do plantão
      const { error: updateError } = await supabase
        .from("plantoes_programados")
        .update({ status: "ausencia" })
        .eq("id", plantaoSelecionado.id);

      if (updateError) throw updateError;

      toast.success("Ausência registrada com sucesso");
      setAusenciaDialogOpen(false);
      setPlantaoSelecionado(null);
      setMotivoAusencia("");
      setUrgente(false);
      fetchEscalaData();
    } catch (error) {
      console.error("Erro ao registrar ausência:", error);
      toast.error("Erro ao registrar ausência");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayOfWeek = date.toLocaleDateString("pt-BR", { weekday: "short" });
    const formattedDate = date.toLocaleDateString("pt-BR");
    return `${dayOfWeek}, ${formattedDate}`;
  };

  const agruparPlantoesPorSemana = (plantoesList: PlantaoProgramado[]) => {
    const grupos: { [key: string]: PlantaoProgramado[] } = {};

    plantoesList.forEach((plantao) => {
      const date = new Date(plantao.data);
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const weekKey = startOfWeek.toISOString().split("T")[0];

      if (!grupos[weekKey]) {
        grupos[weekKey] = [];
      }
      grupos[weekKey].push(plantao);
    });

    return grupos;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Carregando...</h1>
        </div>
      </div>
    );
  }

  if (!escala) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Escala não encontrada</h1>
        </div>
      </div>
    );
  }

  const plantoesGrouped = agruparPlantoesPorSemana(plantoes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{escala.nome}</h1>
            <p className="text-muted-foreground">
              {escala.departamento?.nome} • {formatDate(escala.data_inicio)} -{" "}
              {formatDate(escala.data_fim)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/plantoes/edit/${escala.id}`)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button
            onClick={() => router.push(`/plantoes/generate/${escala.id}`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Gerar Plantões
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total de Plantões
                  </p>
                  <p className="text-2xl font-bold">
                    {estatisticas.total_plantoes}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Cobertura
                  </p>
                  <p className="text-2xl font-bold">
                    {estatisticas.percentual_cobertura.toFixed(1)}%
                  </p>
                </div>
                <CheckCircle
                  className={`h-8 w-8 ${
                    estatisticas.percentual_cobertura >= 95
                      ? "text-green-500"
                      : "text-yellow-500"
                  }`}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Horas Programadas
                  </p>
                  <p className="text-2xl font-bold">
                    {estatisticas.horas_totais_programadas}h
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Integrantes Ativos
                  </p>
                  <p className="text-2xl font-bold">
                    {estatisticas.integrantes_ativos}
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas */}
      {estatisticas && estatisticas.substituicoes_necessarias > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700">
                {estatisticas.substituicoes_necessarias} plantão(ões) precisam
                de substituto
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plantões por Semana */}
      <div className="space-y-6">
        {Object.entries(plantoesGrouped).map(([weekStart, weekPlantoes]) => {
          const startDate = new Date(weekStart);
          const endDate = new Date(weekStart);
          endDate.setDate(startDate.getDate() + 6);

          return (
            <Card key={weekStart}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Semana de {startDate.toLocaleDateString("pt-BR")} -{" "}
                  {endDate.toLocaleDateString("pt-BR")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Integrante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weekPlantoes.map((plantao) => (
                      <TableRow key={plantao.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {formatDate(plantao.data)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <div>
                              <div className="font-medium">
                                {plantao.tipo_turno?.nome}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {plantao.tipo_turno?.hora_inicio} -{" "}
                                {plantao.tipo_turno?.hora_fim}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {plantao.integrante?.nome}
                            </div>
                            {plantao.integrante?.telefone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {plantao.integrante.telefone}
                              </div>
                            )}
                            {plantao.substituto && (
                              <div className="text-sm text-blue-600">
                                Substituto: {plantao.substituto.nome}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(plantao.status)}
                            {getStatusBadge(plantao.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">
                              Programado: {plantao.tipo_turno?.duracao_horas}h
                            </div>
                            {plantao.horas_trabalhadas && (
                              <div className="text-sm text-muted-foreground">
                                Trabalhado: {plantao.horas_trabalhadas}h
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {plantao.status === "programado" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPlantaoSelecionado(plantao);
                                  setAusenciaDialogOpen(true);
                                }}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog para registrar ausência */}
      <Dialog open={ausenciaDialogOpen} onOpenChange={setAusenciaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Ausência</DialogTitle>
            <DialogDescription>
              Registre a ausência de {plantaoSelecionado?.integrante?.nome} no
              plantão de{" "}
              {plantaoSelecionado && formatDate(plantaoSelecionado.data)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Ausência *</Label>
              <Textarea
                id="motivo"
                value={motivoAusencia}
                onChange={(e) => setMotivoAusencia(e.target.value)}
                placeholder="Descreva o motivo da ausência..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="urgente"
                checked={urgente}
                onChange={(e) => setUrgente(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="urgente">
                Ausência urgente (precisa de substituto imediato)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAusenciaDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleRegistrarAusencia}>
              Registrar Ausência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
