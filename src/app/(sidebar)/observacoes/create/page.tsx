"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { NavigationButton } from "@/components/ui/navigation-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { ObservacaoItem } from "@/types/observacoes";
import Link from "next/link";

export default function ObservacoesCreatePage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);

  // Form state
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [observacoes, setObservacoes] = useState<ObservacaoItem[]>([
    { texto: "", ordem: 1 },
  ]);

  // Templates padrão para sugestão
  const templatesSugestoes = [
    {
      nome: "Observações Padrão - Cozinha",
      observacoes: [
        "O militar que estiver na copa das panelas é o responsável pelo lixo da cozinha",
        "O horário de chegada dos militares ao RANCHO é às 6:45 horas",
        "O militar que estiver entrando de serviço chegará obrigatoriamente às 06:00 horas pronto",
        "A troca de serviço poderá ser autorizada por um graduado",
      ],
    },
    {
      nome: "Observações Padrão - Plantão",
      observacoes: [
        "O plantonista deve estar presente no local designado 15 minutos antes do início do turno",
        "Em caso de emergência, acionar imediatamente o superior hierárquico",
        "É vedado o uso de celular durante o plantão, exceto em casos de emergência",
        "A passagem de serviço deve ser realizada de forma detalhada e documentada",
      ],
    },
    {
      nome: "Observações Padrão - Limpeza",
      observacoes: [
        "A limpeza deve ser iniciada sempre pelos ambientes mais críticos",
        "Utilizar EPI adequado conforme protocolo de segurança",
        "Verificar e reabastecer materiais de higiene nos banheiros",
        "Reportar qualquer dano ou necessidade de manutenção",
      ],
    },
  ];

  const addObservacao = () => {
    const newOrder = Math.max(...observacoes.map((o) => o.ordem)) + 1;
    setObservacoes([...observacoes, { texto: "", ordem: newOrder }]);
  };

  const removeObservacao = (index: number) => {
    if (observacoes.length > 1) {
      const newObservacoes = observacoes.filter((_, i) => i !== index);
      // Reordenar
      const reorderedObservacoes = newObservacoes.map((obs, i) => ({
        ...obs,
        ordem: i + 1,
      }));
      setObservacoes(reorderedObservacoes);
    }
  };

  const updateObservacao = (index: number, texto: string) => {
    const newObservacoes = [...observacoes];
    newObservacoes[index].texto = texto;
    setObservacoes(newObservacoes);
  };

  const moveObservacao = (index: number, direction: "up" | "down") => {
    const newObservacoes = [...observacoes];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newObservacoes.length) {
      // Trocar posições
      [newObservacoes[index], newObservacoes[targetIndex]] = [
        newObservacoes[targetIndex],
        newObservacoes[index],
      ];

      // Reordenar números
      const reorderedObservacoes = newObservacoes.map((obs, i) => ({
        ...obs,
        ordem: i + 1,
      }));

      setObservacoes(reorderedObservacoes);
    }
  };

  const aplicarTemplate = (templateIndex: number) => {
    const template = templatesSugestoes[templateIndex];
    setNome(template.nome);
    setObservacoes(
      template.observacoes.map((texto, i) => ({
        texto,
        ordem: i + 1,
      }))
    );
    toast.success("Template aplicado! Você pode editar conforme necessário.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrganization) {
      toast.error("Selecione uma organização");
      return;
    }

    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const observacoesValidas = observacoes.filter((obs) => obs.texto.trim());
    if (observacoesValidas.length === 0) {
      toast.error("Adicione pelo menos uma observação");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("observacoes_templates")
        .insert({
          organizacao_id: selectedOrganization.id,
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          observacoes: observacoesValidas,
          ativo,
        })
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar template:", error);
        toast.error("Erro ao criar template");
        return;
      }

      toast.success("Template criado com sucesso!");
      router.push("/observacoes/list");
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao criar template");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedOrganization) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Criar Template de Observações
            </h1>
            <p className="text-muted-foreground">
              Selecione uma organização para continuar
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/observacoes/list">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              Criar Template de Observações
            </h1>
            <p className="text-muted-foreground">
              Crie um template reutilizável de observações para suas escalas
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Dados gerais do template de observações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Template *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Observações Padrão - Cozinha"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descrição opcional do template..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ativo"
                    checked={ativo}
                    onCheckedChange={(checked) => setAtivo(checked as boolean)}
                  />
                  <Label htmlFor="ativo">Template ativo</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Observações</CardTitle>
                    <CardDescription>
                      Adicione as observações que serão incluídas nas escalas
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    onClick={addObservacao}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {observacoes.map((obs, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 border rounded-lg"
                  >
                    <div className="flex flex-col gap-1 mt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveObservacao(index, "up")}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveObservacao(index, "down")}
                        disabled={index === observacoes.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        ↓
                      </Button>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                          {obs.ordem}
                        </span>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Textarea
                        value={obs.texto}
                        onChange={(e) =>
                          updateObservacao(index, e.target.value)
                        }
                        placeholder="Digite a observação..."
                        rows={2}
                        className="resize-none"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeObservacao(index)}
                      disabled={observacoes.length === 1}
                      className="mt-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Template
                  </>
                )}
              </Button>
              <NavigationButton href="/observacoes/list" variant="outline">
                Cancelar
              </NavigationButton>
            </div>
          </form>
        </div>

        {/* Templates Sugeridos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates Sugeridos</CardTitle>
              <CardDescription>
                Clique para aplicar um template e depois personalize
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {templatesSugestoes.map((template, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{template.nome}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => aplicarTemplate(index)}
                    >
                      Aplicar
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {template.observacoes.length} observações
                  </div>
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-primary">
                      Ver preview
                    </summary>
                    <ol className="list-decimal list-inside mt-1 text-xs space-y-1">
                      {template.observacoes.map((obs, i) => (
                        <li key={i} className="text-muted-foreground">
                          {obs}
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                • Use a ordem das observações para priorizar informações
                importantes
              </p>
              <p>• Seja claro e objetivo nas observações</p>
              <p>• Templates inativos não aparecem na seleção das escalas</p>
              <p>• Você pode reutilizar templates em várias escalas</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
