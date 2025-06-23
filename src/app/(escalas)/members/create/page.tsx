"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Edit, Trash2, Building2, User, ArrowLeft, List } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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

interface Member {
  id: string;
  nome: string;
  departamento_id: string;
  created_at: string;
  especializacoes?: {
    id: string;
    nome: string;
    nivel: string;
  }[];
}

interface Specialization {
  id: string;
  nome: string;
}

export default function Page() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [userId, setUserId] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [memberName, setMemberName] = useState("");
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);

  const fetchSession = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setUserId(data.session.user.id);
    } else {
      setUserId("d7e39c07-f7e4-4065-8e3a-aac5ccb02f1b");
    }
  };

  const fetchOrganizations = async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from('organizacoes')
      .select('*')
      .eq('user_id', userId);
    
    if (!error && data) {
      setOrganizations(data);
    }
  };

  const fetchDepartments = async (organizationId: string) => {
    const { data, error } = await supabase
      .from('departamentos')
      .select('*')
      .eq('organizacao_id', organizationId);
    
    if (!error && data) {
      setDepartments(data);
    }
  };

  const fetchMembers = async (departmentId: string) => {
    const { data, error } = await supabase
      .from('integrantes')
      .select(`
        *,
        integrante_especializacoes (
          especializacoes (
            id,
            nome
          ),
          nivel
        )
      `)
      .eq('departamento_id', departmentId)
      .order('nome');
    
    if (!error && data) {
      const membersWithSpecializations = data.map(member => ({
        ...member,
        especializacoes: member.integrante_especializacoes?.map((ie: any) => ({
          id: ie.especializacoes.id,
          nome: ie.especializacoes.nome,
          nivel: ie.nivel
        })) || []
      }));
      setMembers(membersWithSpecializations);
    }
  };

  const fetchSpecializations = async (organizationId: string) => {
    const { data, error } = await supabase
      .from('especializacoes')
      .select(`
        id,
        nome,
        tipos_especializacao!inner (
          organizacao_id
        )
      `)
      .eq('tipos_especializacao.organizacao_id', organizationId);
    
    if (!error && data) {
      setSpecializations(data);
    }
  };

  // Função para buscar membro por ID para edição
  const fetchMemberById = async (memberId: string) => {
    const { data, error } = await supabase
      .from('integrantes')
      .select(`
        *,
        departamentos (
          id,
          organizacao_id
        ),
        integrante_especializacoes (
          especializacoes (
            id,
            nome
          ),
          nivel
        )
      `)
      .eq('id', memberId)
      .single();
    
    if (!error && data) {
      const memberWithSpecializations = {
        ...data,
        especializacoes: data.integrante_especializacoes?.map((ie: any) => ({
          id: ie.especializacoes.id,
          nome: ie.especializacoes.nome,
          nivel: ie.nivel
        })) || []
      };

      // Configurar os selects automaticamente
      if (data.departamentos) {
        setSelectedOrganization(data.departamentos.organizacao_id);
        setSelectedDepartment(data.departamento_id);
      }

      return memberWithSpecializations;
    }
    return null;
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchOrganizations();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedOrganization) {
      fetchDepartments(selectedOrganization);
      fetchSpecializations(selectedOrganization);
      if (!editId) {
        setSelectedDepartment("");
        setMembers([]);
      }
    }
  }, [selectedOrganization]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchMembers(selectedDepartment);
    }
  }, [selectedDepartment]);

  // Effect para carregar membro para edição
  useEffect(() => {
    if (editId && userId) {
      fetchMemberById(editId).then(member => {
        if (member) {
          openDialog(member);
        }
      });
    }
  }, [editId, userId]);

  const resetForm = () => {
    setMemberName("");
    setSelectedSpecializations([]);
    setEditingMember(null);
  };

  const openDialog = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setMemberName(member.nome);
      setSelectedSpecializations(member.especializacoes?.map(e => e.id) || []);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const saveMember = async () => {
    if (!memberName.trim() || !selectedDepartment) return;
    
    setLoading(true);
    
    try {
      let memberId: string;
      let isNew = false;
      
      if (editingMember) {
        // Atualizar membro existente
        const { error } = await supabase
          .from('integrantes')
          .update({ nome: memberName })
          .eq('id', editingMember.id);
        
        if (error) throw error;
        memberId = editingMember.id;
      } else {
        // Criar novo membro
        const { data, error } = await supabase
          .from('integrantes')
          .insert({
            nome: memberName,
            departamento_id: selectedDepartment
          })
          .select()
          .single();
        
        if (error) throw error;
        memberId = data.id;
        isNew = true;
      }

      // Remover especializações antigas se estiver editando
      if (editingMember) {
        await supabase
          .from('integrante_especializacoes')
          .delete()
          .eq('integrante_id', memberId);
      }

      // Adicionar novas especializações
      if (selectedSpecializations.length > 0) {
        const specializationInserts = selectedSpecializations.map(specId => ({
          integrante_id: memberId,
          especializacao_id: specId,
          nivel: 'básico'
        }));

        await supabase
          .from('integrante_especializacoes')
          .insert(specializationInserts);
      }

      setIsDialogOpen(false);
      resetForm();
      fetchMembers(selectedDepartment);
      
      // Toast de sucesso
      if (isNew) {
        toast.success("Integrante cadastrado com sucesso!", {
          description: `${memberName} foi adicionado ao departamento.`,
          action: {
            label: "Ver Lista",
            onClick: () => window.open("/escalas/members/list", "_blank")
          }
        });
      } else {
        toast.success("Integrante atualizado com sucesso!", {
          description: `As informações de ${memberName} foram atualizadas.`,
        });
      }
      
    } catch (error) {
      console.error("Erro ao salvar membro:", error);
      toast.error("Erro ao salvar integrante", {
        description: "Tente novamente em alguns instantes."
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteMember = async (memberId: string, memberName: string) => {
    if (!confirm("Tem certeza que deseja excluir este integrante?")) return;
    
    try {
      const { error } = await supabase
        .from('integrantes')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      fetchMembers(selectedDepartment);
      
      toast.success("Integrante excluído", {
        description: `${memberName} foi removido do departamento.`
      });
      
    } catch (error) {
      console.error("Erro ao excluir membro:", error);
      toast.error("Erro ao excluir integrante", {
        description: "Tente novamente em alguns instantes."
      });
    }
  };

  return (
    <Suspense fallback={
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
      </div>
    }>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/members/list">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Gerenciar Integrantes</h1>
              <p className="text-muted-foreground">
                Cadastre e gerencie os integrantes dos seus departamentos
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Filtros
              </CardTitle>
              <CardDescription>
                Selecione organização e departamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Organização</label>
                <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
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
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Departamento</label>
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
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => openDialog()}
                    disabled={!selectedDepartment}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Integrante
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingMember ? "Editar Integrante" : "Novo Integrante"}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha as informações do integrante
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome</label>
                      <Input
                        placeholder="Nome completo do integrante"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Especializações</label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {specializations.map((spec) => (
                          <label key={spec.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedSpecializations.includes(spec.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSpecializations([...selectedSpecializations, spec.id]);
                                } else {
                                  setSelectedSpecializations(
                                    selectedSpecializations.filter(id => id !== spec.id)
                                  );
                                }
                              }}
                            />
                            <span className="text-sm">{spec.nome}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={saveMember}
                        disabled={!memberName.trim() || loading}
                        className="flex-1"
                      >
                        {loading ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Lista de Integrantes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Integrantes ({members.length})
              </CardTitle>
              <CardDescription>
                {selectedDepartment 
                  ? `Integrantes do departamento ${departments.find(d => d.id === selectedDepartment)?.nome}`
                  : "Selecione um departamento para ver os integrantes"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedDepartment ? (
                <div className="text-center py-8 text-muted-foreground">
                  Selecione uma organização e departamento para ver os integrantes
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum integrante cadastrado neste departamento
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{member.nome}</h3>
                          {member.especializacoes && member.especializacoes.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {member.especializacoes.map((esp) => (
                                <Badge key={esp.id} variant="secondary" className="text-xs">
                                  {esp.nome}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(member)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMember(member.id, member.nome)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>
  );
}