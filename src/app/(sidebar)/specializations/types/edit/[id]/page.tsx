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

interface SpecializationType {
  id: string;
  nome: string;
  organizacao_id: string;
  created_at: string;
  organizacao?: {
    nome: string;
    user_id: string;
  };
}

export default function EditSpecializationTypePage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const { organizations } = useOrganization();

  const [specializationType, setSpecializationType] =
    useState<SpecializationType | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    organizacao_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const typeId = params.id as string;

  useEffect(() => {
    const fetchSpecializationType = async () => {
      if (!userId || !typeId) return;

      try {
        const { data, error } = await supabase
          .from("tipos_especializacao")
          .select(
            `
            *,
            organizacao:organizacoes(nome, user_id)
          `
          )
          .eq("id", typeId)
          .single();

        if (error) {
          console.error("Erro ao buscar tipo de especialização:", error);
          toast.error("Tipo de especialização não encontrado");
          router.push("/specializations/list");
          return;
        }

        if (data) {
          // Verificar se o usuário é dono da organização
          if (data.organizacao?.user_id !== userId) {
            toast.error("Você não tem permissão para editar este tipo");
            router.push("/specializations/list");
            return;
          }

          setSpecializationType(data);
          setFormData({
            nome: data.nome,
            organizacao_id: data.organizacao_id,
          });
        }
      } catch (error) {
        console.error("Erro inesperado:", error);
        toast.error("Erro ao carregar tipo de especialização");
        router.push("/specializations/list");
      } finally {
        setLoading(false);
      }
    };

    fetchSpecializationType();
  }, [userId, typeId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim() || !formData.organizacao_id) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("tipos_especializacao")
        .update({
          nome: formData.nome.trim(),
          organizacao_id: formData.organizacao_id,
        })
        .eq("id", typeId);

      if (error) {
        console.error("Erro ao atualizar tipo de especialização:", error);
        toast.error("Erro ao salvar alterações");
        return;
      }

      toast.success("Tipo de especialização atualizado com sucesso!");
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
            <h1 className="text-3xl font-bold">
              Editar Tipo de Especialização
            </h1>
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

  if (!specializationType) {
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
            <h1 className="text-3xl font-bold">Tipo não encontrado</h1>
            <p className="text-muted-foreground">
              O tipo de especialização solicitado não existe.
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
          <h1 className="text-3xl font-bold">Editar Tipo de Especialização</h1>
          <p className="text-muted-foreground">
            Atualize as informações do tipo de especialização
          </p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Tipo</CardTitle>
            <CardDescription>
              Criado em{" "}
              {format(
                new Date(specializationType.created_at),
                "dd 'de' MMMM 'de' yyyy",
                { locale: ptBR }
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizacao">Organização</Label>
                <Select
                  value={formData.organizacao_id}
                  onValueChange={(value) =>
                    handleInputChange("organizacao_id", value)
                  }
                  disabled={saving}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a organização" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Tipo de Especialização</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange("nome", e.target.value)}
                  placeholder="Ex: Instrumentos Musicais, Habilidades Técnicas..."
                  disabled={saving}
                  required
                />
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
