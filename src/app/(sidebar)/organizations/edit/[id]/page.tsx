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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { NavigationButton } from "@/components/ui/navigation-button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Organization {
  id: string;
  nome: string;
  tipo: string;
  created_at: string;
  user_id: string;
}

export default function EditOrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const { refetchOrganizations } = useOrganization();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const organizationId = params?.id as string;

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!userId || !organizationId) return;

      try {
        const { data, error } = await supabase
          .from("organizacoes")
          .select("*")
          .eq("id", organizationId)
          .eq("user_id", userId)
          .single();

        if (error) {
          console.error("Erro ao buscar organização:", error);
          toast.error("Organização não encontrada");
          router.push("/organizations/list");
          return;
        }

        if (data) {
          setOrganization(data);
          setFormData({
            nome: data.nome,
            tipo: data.tipo,
          });
        }
      } catch (error) {
        console.error("Erro inesperado:", error);
        toast.error("Erro ao carregar organização");
        router.push("/organizations/list");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [userId, organizationId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim() || !formData.tipo) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("organizacoes")
        .update({
          nome: formData.nome.trim(),
          tipo: formData.tipo,
        })
        .eq("id", organizationId)
        .eq("user_id", userId);

      if (error) {
        console.error("Erro ao atualizar organização:", error);
        toast.error("Erro ao salvar alterações");
        return;
      }

      // Recarregar as organizações para atualizar o contexto
      await refetchOrganizations();

      toast.success("Organização atualizada com sucesso!");
      router.push("/organizations/list");
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
            href="/organizations/list"
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
          </NavigationButton>
          <div>
            <h1 className="text-3xl font-bold">Editar Organização</h1>
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

  if (!organization) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <NavigationButton
            href="/organizations/list"
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </NavigationButton>
          <div>
            <h1 className="text-3xl font-bold">Organização não encontrada</h1>
            <p className="text-muted-foreground">
              A organização solicitada não existe.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <NavigationButton
          href="/organizations/list"
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
        </NavigationButton>
        <div>
          <h1 className="text-3xl font-bold">Editar Organização</h1>
          <p className="text-muted-foreground">
            Atualize as informações da organização
          </p>
        </div>
      </div>

      <div className="grid gap-6 w-full">
        {/* Informações da Organização */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Organização</CardTitle>
            <CardDescription>
              Criada em{" "}
              {format(
                new Date(organization.created_at),
                "dd 'de' MMMM 'de' yyyy",
                { locale: ptBR }
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Organização</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                    placeholder="Digite o nome da organização"
                    disabled={saving}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Organização</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => handleInputChange("tipo", value)}
                    disabled={saving}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="igreja">Igreja</SelectItem>
                      <SelectItem value="empresa">Empresa</SelectItem>
                      <SelectItem value="grupo">Grupo</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <NavigationButton
                  href="/organizations/list"
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
