"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Settings,
  Play,
  Download,
  AlertTriangle,
  CheckCircle,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import {
  EscalaPlantao,
  EscalaPlantaoParticipacao,
  TipoTurno,
  OpcoeGeracaoPlantoes,
  NovoPlantao,
} from "@/types/plantoes";
import { gerarPlantoesAutomaticos } from "@/utils/geradorPlantoes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function GeneratePlantoes() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [escala, setEscala] = useState<EscalaPlantao | null>(null);
  const [participacoes, setParticipacoes] = useState<
    EscalaPlantaoParticipacao[]
  >([]);
  const [tiposTurnos, setTiposTurnos] = useState<TipoTurno[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Opções de geração
  const [opcoes, setOpcoes] = useState<OpcoeGeracaoPlantoes>({
    distribuicao_equilibrada: true,
    respeitar_preferencias_turno: true,
    evitar_turnos_consecutivos: true,
    intervalo_minimo_horas: 8,
    priorizar_disponibilidade_fins_semana: true,
  });

  // Resultados da geração
  const [plantoesGerados, setPlantoesGerados] = useState<NovoPlantao[]>([]);
  const [estatisticas, setEstatisticas] = useState<any>(null);

  useEffect(() => {
    fetchOrganization();
  }, [user]);

  useEffect(() => {
    if (organization?.id && params?.id) {
      fetchData();
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

  const fetchData = async () => {
    try {
      // Buscar escala
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

      // Buscar participações
      const { data: participacoesData, error: participacoesError } =
        await supabase
          .from("escala_plantoes_participacoes")
          .select(
            `
          *,
          integrante:integrantes(id, nome, telefone)
        `
          )
          .eq("escala_plantao_id", params?.id)
          .eq("ativo", true);

      if (participacoesError) throw participacoesError;
      setParticipacoes(participacoesData || []);

      // Buscar tipos de turnos
      const { data: turnosData, error: turnosError } = await supabase
        .from("tipos_turnos")
        .select("*")
        .eq("organizacao_id", organization?.id)
        .eq("ativo", true)
        .order("hora_inicio");

      if (turnosError) throw turnosError;
      setTiposTurnos(turnosData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da escala");
    } finally {
      setLoading(false);
    }
  };

  const handleGerar = async () => {
    if (!escala || participacoes.length === 0) {
      toast.error("Dados insuficientes para geração");
      return;
    }

    setGerando(true);
    try {
      const resultado = await gerarPlantoesAutomaticos(
        escala,
        participacoes,
        tiposTurnos,
        opcoes
      );

      setPlantoesGerados(resultado.plantoes);
      setEstatisticas(resultado.estatisticas);

      if (resultado.estatisticas.conflitos.length > 0) {
        toast.warning(
          `Geração concluída com ${resultado.estatisticas.conflitos.length} conflitos`
        );
      } else {
        toast.success("Plantões gerados com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao gerar plantões:", error);
      toast.error("Erro ao gerar plantões automaticamente");
    } finally {
      setGerando(false);
    }
  };

  const handleSalvar = async () => {
    if (plantoesGerados.length === 0) {
      toast.error("Nenhum plantão para salvar");
      return;
    }

    setSalvando(true);
    try {
      // Limpar plantões existentes (opcional - pode implementar uma opção para isso)
      // const { error: deleteError } = await supabase
      //   .from('plantoes_programados')
      //   .delete()
      //   .eq('escala_plantao_id', escala?.id);

      // Preparar dados para inserção
      const plantoesParaInserir = plantoesGerados.map((plantao) => ({
        ...plantao,
        escala_plantao_id: escala?.id,
        status: "programado" as const,
      }));

      // Inserir plantões
      const { error: insertError } = await supabase
        .from("plantoes_programados")
        .insert(plantoesParaInserir);

      if (insertError) throw insertError;

      toast.success("Plantões salvos com sucesso!");
      router.push(`/plantoes/view/${escala?.id}`);
    } catch (error) {
      console.error("Erro ao salvar plantões:", error);
      toast.error("Erro ao salvar plantões");
    } finally {
      setSalvando(false);
    }
  };

  const getIntegranteNome = (integranteId: string) => {
    const participacao = participacoes.find(
      (p) => p.integrante_id === integranteId
    );
    return participacao?.integrante?.nome || "Desconhecido";
  };

  const getTurnoNome = (turnoId: string) => {
    const turno = tiposTurnos.find((t) => t.id === turnoId);
    return turno
      ? `${turno.nome} (${turno.hora_inicio}-${turno.hora_fim})`
      : "Desconhecido";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayOfWeek = date.toLocaleDateString("pt-BR", { weekday: "short" });
    const formattedDate = date.toLocaleDateString("pt-BR");
    return `${dayOfWeek}, ${formattedDate}`;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Gerar Plantões Automaticamente</h1>
          <p className="text-muted-foreground">
            {escala.nome} • {escala.departamento?.nome}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configurações */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Opções de Geração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="distribuicao_equilibrada"
                  checked={opcoes.distribuicao_equilibrada}
                  onCheckedChange={(checked) =>
                    setOpcoes((prev) => ({
                      ...prev,
                      distribuicao_equilibrada: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="distribuicao_equilibrada" className="text-sm">
                  Distribuição equilibrada de horas
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="respeitar_preferencias"
                  checked={opcoes.respeitar_preferencias_turno}
                  onCheckedChange={(checked) =>
                    setOpcoes((prev) => ({
                      ...prev,
                      respeitar_preferencias_turno: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="respeitar_preferencias" className="text-sm">
                  Respeitar preferências de turno
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="evitar_consecutivos"
                  checked={opcoes.evitar_turnos_consecutivos}
                  onCheckedChange={(checked) =>
                    setOpcoes((prev) => ({
                      ...prev,
                      evitar_turnos_consecutivos: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="evitar_consecutivos" className="text-sm">
                  Evitar turnos consecutivos
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="priorizar_fins_semana"
                  checked={opcoes.priorizar_disponibilidade_fins_semana}
                  onCheckedChange={(checked) =>
                    setOpcoes((prev) => ({
                      ...prev,
                      priorizar_disponibilidade_fins_semana: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="priorizar_fins_semana" className="text-sm">
                  Priorizar disponíveis em fins de semana
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="intervalo_minimo" className="text-sm">
                  Intervalo mínimo entre turnos (horas)
                </Label>
                <Input
                  id="intervalo_minimo"
                  type="number"
                  min="0"
                  max="24"
                  value={opcoes.intervalo_minimo_horas}
                  onChange={(e) =>
                    setOpcoes((prev) => ({
                      ...prev,
                      intervalo_minimo_horas: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <Button
                onClick={handleGerar}
                disabled={gerando || participacoes.length === 0}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {gerando ? "Gerando..." : "Gerar Plantões"}
              </Button>
            </CardContent>
          </Card>

          {/* Resumo da Escala */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Resumo da Escala
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Integrantes:</span>
                <span className="font-medium">{participacoes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tipos de turno:</span>
                <span className="font-medium">{tiposTurnos.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Período:</span>
                <span className="font-medium">
                  {new Date(escala.data_inicio).toLocaleDateString("pt-BR")} -{" "}
                  {new Date(escala.data_fim).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Turnos simultâneos:</span>
                <span className="font-medium">{escala.turnos_simultaneos}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resultados */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estatísticas */}
          {estatisticas && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Resultados da Geração
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {estatisticas.plantoes_gerados}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Plantões gerados
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {estatisticas.total_plantoes}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total necessário
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {estatisticas.cobertura_percentual.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Cobertura
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {estatisticas.conflitos.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Conflitos
                    </div>
                  </div>
                </div>

                <Progress
                  value={estatisticas.cobertura_percentual}
                  className="w-full"
                />

                {/* Conflitos */}
                {estatisticas.conflitos.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Conflitos Encontrados
                    </Label>
                    <div className="bg-red-50 p-3 rounded-md max-h-32 overflow-y-auto">
                      {estatisticas.conflitos.map(
                        (conflito: string, index: number) => (
                          <div key={index} className="text-sm text-red-700">
                            • {conflito}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Sugestões */}
                {estatisticas.sugestoes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-600">
                      Sugestões
                    </Label>
                    <div className="bg-blue-50 p-3 rounded-md max-h-32 overflow-y-auto">
                      {estatisticas.sugestoes.map(
                        (sugestao: string, index: number) => (
                          <div key={index} className="text-sm text-blue-700">
                            • {sugestao}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {plantoesGerados.length > 0 && (
                  <div className="flex gap-2">
                    <Button onClick={handleSalvar} disabled={salvando}>
                      <Download className="h-4 w-4 mr-2" />
                      {salvando ? "Salvando..." : "Salvar Plantões"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preview dos Plantões Gerados */}
          {plantoesGerados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Preview dos Plantões Gerados ({plantoesGerados.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Turno</TableHead>
                        <TableHead>Integrante</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plantoesGerados.slice(0, 50).map((plantao, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-sm">
                            {formatDate(plantao.data)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {getTurnoNome(plantao.tipo_turno_id)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {getIntegranteNome(plantao.integrante_id)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {plantoesGerados.length > 50 && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center text-muted-foreground text-sm"
                          >
                            ... e mais {plantoesGerados.length - 50} plantões
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estado vazio */}
          {!estatisticas && !gerando && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Configure e Gere os Plantões
                </h3>
                <p className="text-muted-foreground text-center mb-6">
                  Ajuste as opções de geração e clique em "Gerar Plantões" para
                  criar automaticamente a distribuição de turnos baseada nas
                  suas configurações
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
