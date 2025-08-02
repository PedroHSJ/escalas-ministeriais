"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ObservacaoItem, ObservacaoTemplate } from "@/types/observacoes";
import Link from "next/link";

export default function ObservacoesEditPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const { userId } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Form state
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [observacoes, setObservacoes] = useState<ObservacaoItem[]>([
    { texto: "", ordem: 1 },
  ]);

  useEffect(() => {
    if (templateId && userId) {
      fetchTemplate();
    }
  }, [templateId, userId]);

  const fetchTemplate = async () => {
    try {
      setInitialLoading(true);

      const { data, error } = await supabase
        .from("observacoes_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) {
        console.error("Erro ao buscar template:", error);
        toast.error("Template não encontrado");
        router.push("/observacoes/list");
        return;
      }

      if (!data) {
        toast.error("Template não encontrado");
        router.push("/observacoes/list");
        return;
      }

      // Verificar se o template pertence à organização selecionada
      if (
        selectedOrganization &&
        data.organizacao_id !== selectedOrganization.id
      ) {
        toast.error("Template não pertence à organização selecionada");
        router.push("/observacoes/list");
        return;
      }

      setNome(data.nome);
      setDescricao(data.descricao || "");
      setAtivo(data.ativo);
      setObservacoes(data.observacoes || [{ texto: "", ordem: 1 }]);
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro ao carregar template");
      router.push("/observacoes/list");
    } finally {
      setInitialLoading(false);
    }
  };

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
        .update({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          observacoes: observacoesValidas,
          ativo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar template:", error);
        toast.error("Erro ao atualizar template");
        return;
      }

      toast.success("Template atualizado com sucesso!");
      router.push("/observacoes/list");
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao atualizar template");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Editar Template de Observações
            </h1>
            <p className="text-muted-foreground">Carregando template...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedOrganization) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Editar Template de Observações
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
              Editar Template de Observações
            </h1>
            <p className="text-muted-foreground">
              Modifique o template conforme necessário
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
                      Modifique as observações que serão incluídas nas escalas
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
                    Salvar Alterações
                  </>
                )}
              </Button>
              <NavigationButton href="/observacoes/list" variant="outline">
                Cancelar
              </NavigationButton>
            </div>
          </form>
        </div>

        {/* Informações Laterais */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dicas de Edição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Use as setas para reordenar as observações</p>
              <p>• A ordem define a prioridade na exibição</p>
              <p>• Templates inativos não aparecem na seleção</p>
              <p>• Alterações afetam apenas novas escalas criadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>Como ficará na escala impressa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1">
                <div className="font-medium">OBS:</div>
                {observacoes
                  .filter((obs) => obs.texto.trim())
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((obs, index) => (
                    <div key={index} className="text-muted-foreground">
                      {index + 1}. {obs.texto}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
