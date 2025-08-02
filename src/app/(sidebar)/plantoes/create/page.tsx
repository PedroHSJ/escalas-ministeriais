"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, X, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  NovaEscalaPlantao,
  NovaParticipacaoPlantao,
  TipoTurno,
  DIAS_SEMANA,
  TURNOS_PADRAO,
} from "@/types/plantoes";

interface Departamento {
  id: string;
  nome: string;
}

interface Integrante {
  id: string;
  nome: string;
  telefone?: string;
}

export default function CreatePlantao() {
  const router = useRouter();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [tiposTurnos, setTiposTurnos] = useState<TipoTurno[]>([]);
  const [loading, setLoading] = useState(false);

  // Dados da escala
  const [escalaData, setEscalaData] = useState<NovaEscalaPlantao>({
    nome: "",
    departamento_id: "",
    data_inicio: "",
    data_fim: "",
    dias_funcionamento: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ],
    turnos_simultaneos: 1,
    observacoes: "",
  });

  // Participações
  const [participacoes, setParticipacoes] = useState<NovaParticipacaoPlantao[]>(
    []
  );

  useEffect(() => {
    fetchOrganization();
  }, [user]);

  useEffect(() => {
    if (organization?.id) {
      fetchDepartamentos();
      fetchIntegrantes();
      setupTiposTurnos();
    }
  }, [organization]);

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

  const fetchDepartamentos = async () => {
    try {
      const { data, error } = await supabase
        .from("departamentos")
        .select("id, nome")
        .eq("organizacao_id", organization?.id)
        .eq("ativo", true);

      if (error) throw error;
      setDepartamentos(data || []);
    } catch (error) {
      console.error("Erro ao buscar departamentos:", error);
    }
  };

  const fetchIntegrantes = async () => {
    try {
      const { data, error } = await supabase
        .from("integrantes")
        .select("id, nome, telefone")
        .eq("organizacao_id", organization?.id)
        .eq("ativo", true);

      if (error) throw error;
      setIntegrantes(data || []);
    } catch (error) {
      console.error("Erro ao buscar integrantes:", error);
    }
  };

  const setupTiposTurnos = async () => {
    try {
      // Verificar se já existem tipos de turnos para esta organização
      const { data: existingTurnos, error: fetchError } = await supabase
        .from("tipos_turnos")
        .select("*")
        .eq("organizacao_id", organization?.id)
        .eq("ativo", true);

      if (fetchError) throw fetchError;

      if (existingTurnos && existingTurnos.length > 0) {
        setTiposTurnos(existingTurnos);
      } else {
        // Criar turnos padrão para a organização
        const turnosParaCriar = TURNOS_PADRAO.map((turno) => ({
          ...turno,
          organizacao_id: organization?.id,
        }));

        const { data: newTurnos, error: createError } = await supabase
          .from("tipos_turnos")
          .insert(turnosParaCriar)
          .select();

        if (createError) throw createError;
        setTiposTurnos(newTurnos || []);
      }
    } catch (error) {
      console.error("Erro ao configurar tipos de turnos:", error);
      toast.error("Erro ao configurar tipos de turnos");
    }
  };

  const handleDiaChange = (dia: string, checked: boolean) => {
    setEscalaData((prev) => ({
      ...prev,
      dias_funcionamento: checked
        ? [...prev.dias_funcionamento, dia]
        : prev.dias_funcionamento.filter((d) => d !== dia),
    }));
  };

  const addParticipacao = () => {
    setParticipacoes((prev) => [
      ...prev,
      {
        integrante_id: "",
        tipos_turnos_disponiveis: [],
        horas_minimas_semana: 0,
        horas_maximas_semana: 40,
        disponivel_fins_semana: true,
        prioridade: 2,
      },
    ]);
  };

  const removeParticipacao = (index: number) => {
    setParticipacoes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateParticipacao = (
    index: number,
    field: keyof NovaParticipacaoPlantao,
    value: any
  ) => {
    setParticipacoes((prev) =>
      prev.map((part, i) => (i === index ? { ...part, [field]: value } : part))
    );
  };

  const handleTurnoToggle = (
    participacaoIndex: number,
    turnoId: string,
    checked: boolean
  ) => {
    updateParticipacao(
      participacaoIndex,
      "tipos_turnos_disponiveis",
      checked
        ? [
            ...participacoes[participacaoIndex].tipos_turnos_disponiveis,
            turnoId,
          ]
        : participacoes[participacaoIndex].tipos_turnos_disponiveis.filter(
            (id) => id !== turnoId
          )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !escalaData.nome ||
      !escalaData.departamento_id ||
      !escalaData.data_inicio ||
      !escalaData.data_fim
    ) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (escalaData.dias_funcionamento.length === 0) {
      toast.error("Selecione pelo menos um dia de funcionamento");
      return;
    }

    if (participacoes.length === 0) {
      toast.error("Adicione pelo menos um integrante à escala");
      return;
    }

    // Validar participações
    for (let i = 0; i < participacoes.length; i++) {
      const part = participacoes[i];
      if (!part.integrante_id) {
        toast.error(`Selecione um integrante para a participação ${i + 1}`);
        return;
      }
      if (part.tipos_turnos_disponiveis.length === 0) {
        toast.error(
          `Selecione pelo menos um turno para ${
            integrantes.find((int) => int.id === part.integrante_id)?.nome
          }`
        );
        return;
      }
    }

    setLoading(true);

    try {
      // Criar a escala
      const { data: novaEscala, error: escalaError } = await supabase
        .from("escalas_plantoes")
        .insert([escalaData])
        .select()
        .single();

      if (escalaError) throw escalaError;

      // Criar as participações
      const participacoesComEscala = participacoes.map((part) => ({
        ...part,
        escala_plantao_id: novaEscala.id,
      }));

      const { error: participacoesError } = await supabase
        .from("escala_plantoes_participacoes")
        .insert(participacoesComEscala);

      if (participacoesError) throw participacoesError;

      toast.success("Escala de plantão criada com sucesso!");
      router.push("/plantoes/list");
    } catch (error) {
      console.error("Erro ao criar escala:", error);
      toast.error("Erro ao criar escala de plantão");
    } finally {
      setLoading(false);
    }
  };

  const getTurnoLabel = (turno: TipoTurno) => {
    return `${turno.nome} (${turno.hora_inicio} - ${turno.hora_fim})`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Escala de Plantão</h1>
          <p className="text-muted-foreground">
            Configure turnos 24h com controle de horas
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Escala *</Label>
                <Input
                  id="nome"
                  value={escalaData.nome}
                  onChange={(e) =>
                    setEscalaData((prev) => ({ ...prev, nome: e.target.value }))
                  }
                  placeholder="Ex: Plantão de Segurança - Janeiro 2025"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="departamento">Departamento *</Label>
                <Select
                  value={escalaData.departamento_id}
                  onValueChange={(value) =>
                    setEscalaData((prev) => ({
                      ...prev,
                      departamento_id: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentos.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Início *</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={escalaData.data_inicio}
                  onChange={(e) =>
                    setEscalaData((prev) => ({
                      ...prev,
                      data_inicio: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_fim">Data de Fim *</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={escalaData.data_fim}
                  onChange={(e) =>
                    setEscalaData((prev) => ({
                      ...prev,
                      data_fim: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="turnos_simultaneos">Turnos Simultâneos</Label>
                <Input
                  id="turnos_simultaneos"
                  type="number"
                  min="1"
                  value={escalaData.turnos_simultaneos}
                  onChange={(e) =>
                    setEscalaData((prev) => ({
                      ...prev,
                      turnos_simultaneos: parseInt(e.target.value),
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Quantos turnos podem acontecer ao mesmo tempo
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dias de Funcionamento *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(DIAS_SEMANA).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={escalaData.dias_funcionamento.includes(key)}
                      onCheckedChange={(checked) =>
                        handleDiaChange(key, checked as boolean)
                      }
                    />
                    <Label htmlFor={key} className="text-sm">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={escalaData.observacoes}
                onChange={(e) =>
                  setEscalaData((prev) => ({
                    ...prev,
                    observacoes: e.target.value,
                  }))
                }
                placeholder="Observações gerais sobre a escala..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Participações */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Integrantes ({participacoes.length})
              </CardTitle>
              <Button type="button" onClick={addParticipacao} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Integrante
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {participacoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum integrante adicionado</p>
                <p className="text-sm">
                  Clique em "Adicionar Integrante" para começar
                </p>
              </div>
            ) : (
              participacoes.map((participacao, index) => (
                <Card key={index} className="relative">
                  <CardContent className="pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeParticipacao(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Integrante *</Label>
                        <Select
                          value={participacao.integrante_id}
                          onValueChange={(value) =>
                            updateParticipacao(index, "integrante_id", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um integrante" />
                          </SelectTrigger>
                          <SelectContent>
                            {integrantes
                              .filter(
                                (int) =>
                                  !participacoes.some(
                                    (p, i) =>
                                      i !== index && p.integrante_id === int.id
                                  )
                              )
                              .map((integrante) => (
                                <SelectItem
                                  key={integrante.id}
                                  value={integrante.id}
                                >
                                  {integrante.nome}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Horas Mínimas/Semana</Label>
                        <Input
                          type="number"
                          min="0"
                          value={participacao.horas_minimas_semana}
                          onChange={(e) =>
                            updateParticipacao(
                              index,
                              "horas_minimas_semana",
                              parseInt(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Horas Máximas/Semana</Label>
                        <Input
                          type="number"
                          min="0"
                          value={participacao.horas_maximas_semana}
                          onChange={(e) =>
                            updateParticipacao(
                              index,
                              "horas_maximas_semana",
                              parseInt(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Prioridade para Substituições</Label>
                        <Select
                          value={participacao.prioridade.toString()}
                          onValueChange={(value) =>
                            updateParticipacao(
                              index,
                              "prioridade",
                              parseInt(value)
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Baixa</SelectItem>
                            <SelectItem value="2">Normal</SelectItem>
                            <SelectItem value="3">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`fins_semana_${index}`}
                          checked={participacao.disponivel_fins_semana}
                          onCheckedChange={(checked) =>
                            updateParticipacao(
                              index,
                              "disponivel_fins_semana",
                              checked
                            )
                          }
                        />
                        <Label htmlFor={`fins_semana_${index}`}>
                          Disponível fins de semana
                        </Label>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label>Turnos Disponíveis *</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {tiposTurnos.map((turno) => (
                          <div
                            key={turno.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`turno_${index}_${turno.id}`}
                              checked={participacao.tipos_turnos_disponiveis.includes(
                                turno.id
                              )}
                              onCheckedChange={(checked) =>
                                handleTurnoToggle(
                                  index,
                                  turno.id,
                                  checked as boolean
                                )
                              }
                            />
                            <Label
                              htmlFor={`turno_${index}_${turno.id}`}
                              className="flex items-center gap-2"
                            >
                              <Clock className="h-3 w-3" />
                              {getTurnoLabel(turno)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Criando..." : "Criar Escala"}
          </Button>
        </div>
      </form>
    </div>
  );
}
