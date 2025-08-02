"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export default function CreateDepartmentPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { organizations, selectedOrganization } = useOrganization();

  const [formData, setFormData] = useState({
    nome: "",
    organizacao_id: selectedOrganization?.id || "",
    tipo_departamento: "",
  });
  const [saving, setSaving] = useState(false);

  // Atualizar organização quando selectedOrganization mudar
  useEffect(() => {
    if (selectedOrganization && !formData.organizacao_id) {
      setFormData((prev) => ({
        ...prev,
        organizacao_id: selectedOrganization.id,
      }));
    }
  }, [selectedOrganization, formData.organizacao_id]);

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
      const { error } = await supabase.from("departamentos").insert({
        nome: formData.nome.trim(),
        organizacao_id: formData.organizacao_id,
        tipo_departamento: formData.tipo_departamento,
      });

      if (error) {
        console.error("Erro ao criar departamento:", error);
        if (error.code === "23505") {
          toast.error(
            "Já existe um departamento com este nome nesta organização"
          );
        } else {
          toast.error("Erro ao criar departamento");
        }
        return;
      }

      toast.success("Departamento criado com sucesso!");
      router.push("/departments/list");
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao criar departamento");
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <NavigationButton href="/departments/list" variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
        </NavigationButton>
        <div>
          <h1 className="text-3xl font-bold">Novo Departamento</h1>
          <p className="text-muted-foreground">
            Crie um novo departamento para uma de suas organizações
          </p>
        </div>
      </div>

      <div className="grid gap-6 w-full">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Departamento</CardTitle>
            <CardDescription>
              Preencha as informações básicas do novo departamento
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
                {selectedOrganization && (
                  <p className="text-xs text-muted-foreground">
                    A organização atual ({selectedOrganization.nome}) está
                    pré-selecionada
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
                      Criando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Criar Departamento
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
