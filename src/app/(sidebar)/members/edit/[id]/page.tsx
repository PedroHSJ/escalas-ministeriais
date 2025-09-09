"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, User, Building2, Users, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { NavigationButton } from "@/components/ui/navigation-button";

interface Organization {
  id: string;
  nome: string;
  tipo: string;
}

interface Department {
  id: string;
  nome: string;
  organizacao_id: string;
  tipo_departamento: string;
}

interface Specialization {
  id: string;
  nome: string;
}

interface Member {
  id: string;
  nome: string;
  departamento_id: string;
  created_at: string;
  departamentos?: {
    id: string;
    nome: string;
    tipo_departamento: string;
    organizacao_id: string;
    organizacoes?: {
      nome: string;
      tipo: string;
    };
  };
  integrante_especializacoes?: {
    especializacao_id: string;
    nivel: string;
    especializacoes: {
      id: string;
      nome: string;
    };
  }[];
}

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params?.id as string;

  const [userId, setUserId] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [memberName, setMemberName] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSpecializations, setSelectedSpecializations] = useState<
    string[]
  >([]);

  const fetchSession = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setUserId(data.session.user.id);
    } else {
      setUserId("d7e39c07-f7e4-4065-8e3a-aac5ccb02f1b");
    }
  };

  const fetchMember = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("integrantes")
      .select(
        `
        *,
        departamentos (
          id,
          nome,
          tipo_departamento,
          organizacao_id,
          organizacoes (
            nome,
            tipo
          )
        ),
        integrante_especializacoes (
          especializacao_id,
          nivel,
          especializacoes (
            id,
            nome
          )
        )
      `
      )
      .eq("id", memberId)
      .single();

    if (error) {
      console.error("Erro ao carregar membro:", error);
      toast.error("Erro ao carregar integrante");
      router.push("/members/list");
      return;
    }

    if (data) {
      setMember(data);
      setMemberName(data.nome);
      setSelectedDepartment(data.departamento_id);
      setSelectedOrganization(data.departamentos?.organizacao_id || "");
      setSelectedSpecializations(
        data.integrante_especializacoes?.map((ie) => ie.especializacao_id) || []
      );
    }

    setLoading(false);
  };

  const fetchOrganizations = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("organizacoes")
      .select("*")
      .eq("user_id", userId)
      .order("nome");

    if (!error && data) {
      setOrganizations(data);
    }
  };

  const fetchDepartments = async (organizationId: string) => {
    const { data, error } = await supabase
      .from("departamentos")
      .select("*")
      .eq("organizacao_id", organizationId)
      .order("nome");

    if (!error && data) {
      setDepartments(data);
    }
  };

  const fetchSpecializations = async (organizationId: string) => {
    const { data, error } = await supabase
      .from("especializacoes")
      .select(
        `
        id,
        nome,
        tipos_especializacao!inner (
          organizacao_id
        )
      `
      )
      .eq("tipos_especializacao.organizacao_id", organizationId)
      .order("nome");

    if (!error && data) {
      setSpecializations(data);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchMember();
      fetchOrganizations();
    }
  }, [userId, memberId]);

  useEffect(() => {
    if (selectedOrganization) {
      fetchDepartments(selectedOrganization);
      fetchSpecializations(selectedOrganization);
    }
  }, [selectedOrganization]);

  const handleSave = async () => {
    if (!memberName.trim() || !selectedDepartment) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);

    try {
      // Atualizar dados básicos do membro
      const { error: updateError } = await supabase
        .from("integrantes")
        .update({
          nome: memberName,
          departamento_id: selectedDepartment,
        })
        .eq("id", memberId);

      if (updateError) throw updateError;

      // Remover especializações antigas
      await supabase
        .from("integrante_especializacoes")
        .delete()
        .eq("integrante_id", memberId);

      // Adicionar novas especializações
      if (selectedSpecializations.length > 0) {
        const specializationInserts = selectedSpecializations.map((specId) => ({
          integrante_id: memberId,
          especializacao_id: specId,
          nivel: "básico",
        }));

        const { error: specError } = await supabase
          .from("integrante_especializacoes")
          .insert(specializationInserts);

        if (specError) throw specError;
      }

      toast.success("Integrante atualizado com sucesso!", {
        description: `${memberName} foi atualizado no sistema.`,
        action: {
          label: "Ver Lista",
          onClick: () => router.push("/members/list"),
        },
      });

      // Redirecionar após sucesso
      setTimeout(() => {
        router.push("/members/list");
      }, 1000);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao atualizar integrante", {
        description: "Tente novamente em alguns instantes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
          <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
          <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
        </div>
        <div className="bg-muted/50 min-h-[400px] flex-1 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold">Integrante não encontrado</h2>
          <p className="text-muted-foreground mt-2">
            O integrante que você está tentando editar não foi encontrado.
          </p>
          <NavigationButton href="/members/list" variant="outline" size={"sm"}>
            Voltar para Lista
          </NavigationButton>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <div className="flex flex-1 flex-col gap-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NavigationButton
              href="/members/list"
              variant="outline"
              size={"sm"}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
            </NavigationButton>
            <div>
              <h1 className="text-3xl font-bold">Editar Integrante</h1>
              <p className="text-muted-foreground">
                Atualize as informações do integrante
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Informações Atuais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Atuais
              </CardTitle>
              <CardDescription>Dados cadastrados no sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {getInitials(member.nome)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{member.nome}</h3>
                  <p className="text-sm text-muted-foreground">
                    {member.departamentos?.organizacoes?.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.departamentos?.nome} •{" "}
                    {member.departamentos?.tipo_departamento}
                  </p>
                </div>
              </div>

              {member.integrante_especializacoes &&
                member.integrante_especializacoes.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">
                      Especializações Atuais
                    </label>
                    <div className="flex gap-1 flex-wrap mt-2">
                      {member.integrante_especializacoes.map((ie) => (
                        <Badge
                          key={ie.especializacao_id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {ie.especializacoes.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Formulário de Edição */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Editar Informações
              </CardTitle>
              <CardDescription>
                Altere os dados do integrante conforme necessário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nome */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  placeholder="Nome completo do integrante"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                />
              </div>

              {/* Organização */}
              {/* <div className="space-y-2">
                <label className="text-sm font-medium">Organização *</label>
                <Select
                  value={selectedOrganization}
                  onValueChange={setSelectedOrganization}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma organização" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.nome} ({org.tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}

              {/* Departamento */}
              {/* <div className="space-y-2">
                <label className="text-sm font-medium">Departamento *</label>
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                  disabled={!selectedOrganization}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.nome} ({dept.tipo_departamento})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}

              {/* Especializações */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Especializações</label>
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  {specializations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {selectedOrganization
                        ? "Nenhuma especialização disponível para esta organização"
                        : "Selecione uma organização para ver as especializações"}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {specializations.map((spec) => (
                        <div
                          key={spec.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={spec.id}
                            checked={selectedSpecializations.includes(spec.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSpecializations([
                                  ...selectedSpecializations,
                                  spec.id,
                                ]);
                              } else {
                                setSelectedSpecializations(
                                  selectedSpecializations.filter(
                                    (id) => id !== spec.id
                                  )
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={spec.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {spec.nome}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedSpecializations.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {selectedSpecializations.map((specId) => {
                      const spec = specializations.find((s) => s.id === specId);
                      return spec ? (
                        <Badge
                          key={specId}
                          variant="outline"
                          className="text-xs"
                        >
                          {spec.nome}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-4 border-t">
                <Link href="/members/list" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>
  );
}
