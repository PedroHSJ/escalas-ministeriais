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

interface Department {
  id: string;
  nome: string;
  organizacao_id: string;
  tipo_departamento: string;
  created_at: string;
  organizacao?: {
    nome: string;
    user_id: string;
  };
}

export default function EditDepartmentPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const { organizations, selectedOrganization } = useOrganization();

  const [department, setDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    organizacao_id: "",
    tipo_departamento: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const departmentId = params?.id as string;

  useEffect(() => {
    const fetchDepartment = async () => {
      if (!userId || !departmentId) return;

      try {
        const { data, error } = await supabase
          .from("departamentos")
          .select(
            `
            *,
            organizacao:organizacoes(
              nome,
              usuario_organizacoes!inner(usuario_id)
            )
          `
          )
          .eq("id", departmentId)
          .single();

        if (error) {
          console.error("Erro ao buscar departamento:", error);
          toast.error("Departamento não encontrado");
          router.push("/departments/list");
          return;
        }

        if (data) {
          // Verificar se o usuário tem acesso à organização através da tabela usuario_organizacoes
          const { data: userOrgCheck } = await supabase
            .from("usuario_organizacoes")
            .select("id")
            .eq("usuario_id", userId)
            .eq("organizacao_id", data.organizacao_id)
            .single();

          if (!userOrgCheck) {
            toast.error("Você não tem permissão para editar este departamento");
            router.push("/departments/list");
            return;
          }

          setDepartment(data);
          setFormData({
            nome: data.nome,
            organizacao_id: data.organizacao_id,
            tipo_departamento: data.tipo_departamento,
          });
        }
      } catch (error) {
        console.error("Erro inesperado:", error);
        toast.error("Erro ao carregar departamento");
        router.push("/departments/list");
      } finally {
        setLoading(false);
      }
    };

    fetchDepartment();
  }, [userId, departmentId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.nome.trim() ||
      !formData.organizacao_id ||
      !formData.tipo_departamento
    ) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("departamentos")
        .update({
          nome: formData.nome.trim(),
          organizacao_id: formData.organizacao_id,
          tipo_departamento: formData.tipo_departamento,
        })
        .eq("id", departmentId);

      if (error) {
        console.error("Erro ao atualizar departamento:", error);
        if (error.code === "23505") {
          toast.error(
            "Já existe um departamento com este nome nesta organização"
          );
        } else {
          toast.error("Erro ao salvar alterações");
        }
        return;
      }

      toast.success("Departamento atualizado com sucesso!");
      router.push("/departments/list");
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

  const departmentTypes = [
    { value: "louvor", label: "Louvor/Música" },
    { value: "infantil", label: "Ministério Infantil" },
    { value: "jovens", label: "Ministério de Jovens" },
    { value: "adoracao", label: "Adoração" },
    { value: "midia", label: "Mídia/Audiovisual" },
    { value: "recepcao", label: "Recepção" },
    { value: "limpeza", label: "Limpeza" },
    { value: "seguranca", label: "Segurança" },
    { value: "vendas", label: "Vendas" },
    { value: "marketing", label: "Marketing" },
    { value: "ti", label: "Tecnologia da Informação" },
    { value: "rh", label: "Recursos Humanos" },
    { value: "financeiro", label: "Financeiro" },
    { value: "operacional", label: "Operacional" },
    { value: "administrativo", label: "Administrativo" },
    { value: "outro", label: "Outro" },
  ];

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <NavigationButton
            href="/departments/list"
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
          </NavigationButton>
          <div>
            <h1 className="text-3xl font-bold">Editar Departamento</h1>
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </div>

        <Card className="w-full">
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

  if (!department) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <NavigationButton
            href="/departments/list"
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
          </NavigationButton>
          <div>
            <h1 className="text-3xl font-bold">Departamento não encontrado</h1>
            <p className="text-muted-foreground">
              O departamento solicitado não existe.
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
        <NavigationButton href="/departments/list" variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
        </NavigationButton>
        <div>
          <h1 className="text-3xl font-bold">Editar Departamento</h1>
          <p className="text-muted-foreground">
            Atualize as informações do departamento
          </p>
        </div>
      </div>

      <div className="grid gap-6 w-full">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Departamento</CardTitle>
            <CardDescription>
              Criado em{" "}
              {format(
                new Date(department.created_at),
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
                        <div className="flex items-center gap-2">
                          {org.id === selectedOrganization?.id && (
                            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                              Atual
                            </span>
                          )}
                          {org.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {department?.organizacao && (
                  <p className="text-xs text-muted-foreground">
                    Departamento pertence à organização:{" "}
                    {department.organizacao.nome}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Departamento</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange("nome", e.target.value)}
                  placeholder="Digite o nome do departamento"
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Departamento</Label>
                <Select
                  value={formData.tipo_departamento}
                  onValueChange={(value) =>
                    handleInputChange("tipo_departamento", value)
                  }
                  disabled={saving}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <NavigationButton
                  href="/departments/list"
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
