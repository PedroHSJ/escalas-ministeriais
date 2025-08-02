"use client";

import { useState } from "react";
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

export default function CreateSpecializationTypePage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { organizations } = useOrganization();

  const [formData, setFormData] = useState({
    nome: "",
    organizacao_id: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim() || !formData.organizacao_id) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("tipos_especializacao").insert({
        nome: formData.nome.trim(),
        organizacao_id: formData.organizacao_id,
      });

      if (error) {
        console.error("Erro ao criar tipo de especialização:", error);
        toast.error("Erro ao criar tipo de especialização");
        return;
      }

      toast.success("Tipo de especialização criado com sucesso!");
      router.push("/specializations/list");
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao criar tipo de especialização");
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

  const typeExamples = [
    "Instrumentos Musicais",
    "Habilidades Técnicas",
    "Certificações",
    "Competências de Liderança",
    "Habilidades de Comunicação",
    "Especialidades Médicas",
    "Áreas de Atuação",
    "Níveis de Experiência",
  ];

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
          <h1 className="text-3xl font-bold">Novo Tipo de Especialização</h1>
          <p className="text-muted-foreground">
            Crie um novo tipo de especialização para categorizar suas
            especializações
          </p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Tipo</CardTitle>
            <CardDescription>
              Um tipo de especialização é uma categoria que agrupa
              especializações relacionadas
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
                      Criando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Criar Tipo
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Card com Exemplos */}
        <Card>
          <CardHeader>
            <CardTitle>Exemplos de Tipos de Especialização</CardTitle>
            <CardDescription>
              Aqui estão alguns exemplos para te inspirar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {typeExamples.map((example, index) => (
                <div
                  key={index}
                  className="p-2 bg-gray-50 rounded-md text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleInputChange("nome", example)}
                >
                  {example}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
