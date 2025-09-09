"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { NavigationButton } from "@/components/ui/navigation-button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Specialization {
  id: string;
  nome: string;
  tipo_especializacao_id: string;
  icone?: string;
  cor?: string;
  created_at: string;
  tipo_especializacao?: {
    nome: string;
    organizacao_id: string;
    organizacao?: {
      nome: string;
      user_id: string;
    };
  };
}

interface SpecializationType {
  id: string;
  nome: string;
  organizacao_id: string;
  organizacao?: {
    nome: string;
  };
}

export default function EditSpecializationPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const { organizations } = useOrganization();

  const [specialization, setSpecialization] = useState<Specialization | null>(
    null
  );
  const [specializationTypes, setSpecializationTypes] = useState<
    SpecializationType[]
  >([]);
  const [formData, setFormData] = useState({
    nome: "",
    tipo_especializacao_id: "",
    icone: "",
    cor: "#3b82f6",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const specializationId = params?.id as string;

  useEffect(() => {
    const fetchData = async () => {
      if (!userId || !specializationId) return;

      try {
        // Buscar especialização
        const { data: specData, error: specError } = await supabase
          .from("especializacoes")
          .select(
            `
            *,
            tipo_especializacao:tipos_especializacao(
              nome,
              organizacao_id,
              organizacao:organizacoes(
                nome,
                usuario_organizacoes!inner(usuario_id)
              )
            )
          `
          )
          .eq("id", specializationId)
          .single();

        if (specError) {
          console.error("Erro ao buscar especialização:", specError);
          toast.error("Especialização não encontrada");
          router.push("/specializations/list");
          return;
        }

        if (specData) {
          // Verificar se o usuário tem acesso à organização através da tabela usuario_organizacoes
          const { data: userOrgCheck } = await supabase
            .from("usuario_organizacoes")
            .select("id")
            .eq("usuario_id", userId)
            .eq("organizacao_id", specData.tipo_especializacao?.organizacao_id)
            .single();

          if (!userOrgCheck) {
            toast.error(
              "Você não tem permissão para editar esta especialização"
            );
            router.push("/specializations/list");
            return;
          }

          setSpecialization(specData);
          setFormData({
            nome: specData.nome,
            tipo_especializacao_id: specData.tipo_especializacao_id,
            icone: specData.icone || "",
            cor: specData.cor || "#3b82f6",
          });
        }

        // Buscar tipos de especialização disponíveis
        const orgIds = organizations.map((org) => org.id);

        if (orgIds.length > 0) {
          const { data: typesData, error: typesError } = await supabase
            .from("tipos_especializacao")
            .select(
              `
              *,
              organizacao:organizacoes(nome)
            `
            )
            .in("organizacao_id", orgIds)
            .order("nome");

          if (typesError) {
            console.error("Erro ao buscar tipos:", typesError);
          } else {
            setSpecializationTypes(typesData || []);
          }
        }
      } catch (error) {
        console.error("Erro inesperado:", error);
        toast.error("Erro ao carregar especialização");
        router.push("/specializations/list");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, specializationId, router, organizations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim() || !formData.tipo_especializacao_id) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("especializacoes")
        .update({
          nome: formData.nome.trim(),
          tipo_especializacao_id: formData.tipo_especializacao_id,
          icone: formData.icone.trim() || null,
          cor: formData.cor || null,
        })
        .eq("id", specializationId);

      if (error) {
        console.error("Erro ao atualizar especialização:", error);
        toast.error("Erro ao salvar alterações");
        return;
      }

      toast.success("Especialização atualizada com sucesso!");
      router.push("/specializations/list");
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const iconExamples = [
    "🎸",
    "🎹",
    "🥁",
    "🎤",
    "🎺",
    "🎻",
    "💻",
    "📱",
    "🎯",
    "⚡",
    "🔧",
    "📊",
  ];
  const colorPresets = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
  ];

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <NavigationButton
            href="/specializations/list"
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </NavigationButton>
          <div>
            <h1 className="text-3xl font-bold">Editar Especialização</h1>
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </div>

        <Card className="max-w-2xl">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!specialization) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <NavigationButton
            href="/specializations/list"
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </NavigationButton>
          <div>
            <h1 className="text-3xl font-bold">
              Especialização não encontrada
            </h1>
            <p className="text-muted-foreground">
              A especialização solicitada não existe.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <NavigationButton
          href="/specializations/list"
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </NavigationButton>
        <div>
          <h1 className="text-3xl font-bold">Editar Especialização</h1>
          <p className="text-muted-foreground">
            Atualize as informações da especialização
          </p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Informações da Especialização</CardTitle>
            <CardDescription>
              Criada em{" "}
              {format(
                new Date(specialization.created_at),
                "dd 'de' MMMM 'de' yyyy",
                { locale: ptBR }
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Especialização</Label>
                <Select
                  value={formData.tipo_especializacao_id}
                  onValueChange={(value) =>
                    handleInputChange("tipo_especializacao_id", value)
                  }
                  disabled={saving}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {specializationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.nome} ({type.organizacao?.nome})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Especialização</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange("nome", e.target.value)}
                  placeholder="Ex: Violão, React.js, Liderança..."
                  disabled={saving}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icone">Ícone (opcional)</Label>
                  <Input
                    id="icone"
                    value={formData.icone}
                    onChange={(e) => handleInputChange("icone", e.target.value)}
                    placeholder="🎸"
                    disabled={saving}
                    maxLength={2}
                  />
                  <div className="flex flex-wrap gap-1">
                    {iconExamples.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className="p-1 text-lg hover:bg-gray-100 rounded"
                        onClick={() => handleInputChange("icone", icon)}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cor">Cor (opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cor"
                      type="color"
                      value={formData.cor}
                      onChange={(e) => handleInputChange("cor", e.target.value)}
                      disabled={saving}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.cor}
                      onChange={(e) => handleInputChange("cor", e.target.value)}
                      placeholder="#3b82f6"
                      disabled={saving}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => handleInputChange("cor", color)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm text-muted-foreground">
                  Preview:
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  {formData.icone && (
                    <span className="text-lg">{formData.icone}</span>
                  )}
                  <span
                    className="font-medium"
                    style={{ color: formData.cor || "inherit" }}
                  >
                    {formData.nome || "Nome da especialização"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <NavigationButton
                  href="/specializations/list"
                  variant="outline"
                  disabled={saving}
                >
                  Cancelar
                </NavigationButton>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
