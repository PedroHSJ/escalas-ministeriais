"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { CalendarIcon, PrinterIcon, Download, Users, Building2, Plus, X, Save } from "lucide-react";
import { format, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

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

interface ScaleAssignment {
  id: string;
  memberId: string;
  memberName: string;
  date: Date;
  especializacaoId: string;
  especializacaoNome: string;
}

const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export default function Page() {
  const [userId, setUserId] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [scaleName, setScaleName] = useState("");
  const [assignments, setAssignments] = useState<ScaleAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states para adicionar nova participação
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");

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
      .eq('departamento_id', departmentId);
    
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
      setSelectedDepartment("");
      setDepartments([]);
      setMembers([]);
      setAssignments([]);
      clearForm();
    }
  }, [selectedOrganization]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchMembers(selectedDepartment);
      setAssignments([]);
      clearForm();
    }
  }, [selectedDepartment]);

  const clearForm = () => {
    setSelectedDate(undefined);
    setSelectedMember("");
    setSelectedSpecialization("");
  };

  const addAssignment = () => {
    if (!selectedDate || !selectedMember || !selectedSpecialization) {
      toast.error("Preencha todos os campos para adicionar à escala");
      return;
    }

    const member = members.find(m => m.id === selectedMember);
    const specialization = specializations.find(s => s.id === selectedSpecialization);

    if (!member || !specialization) return;

    const newAssignment: ScaleAssignment = {
      id: Math.random().toString(36).substr(2, 9),
      memberId: selectedMember,
      memberName: member.nome,
      date: selectedDate,
      especializacaoId: selectedSpecialization,
      especializacaoNome: specialization.nome
    };

    setAssignments([...assignments, newAssignment]);
    clearForm();
    toast.success(`${member.nome} adicionado à escala`);
  };

  const removeAssignment = (assignmentId: string) => {
    setAssignments(assignments.filter(a => a.id !== assignmentId));
    toast.success("Participação removida da escala");
  };

  const groupAssignmentsByDay = () => {
    const grouped: Record<string, ScaleAssignment[]> = {};
    
    assignments.forEach(assignment => {
      const dayOfWeek = getDay(assignment.date);
      const dayName = DAYS_OF_WEEK[dayOfWeek];
      const dateKey = `${dayName} - ${format(assignment.date, "dd/MM/yyyy")}`;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(assignment);
    });

    return grouped;
  };

  const saveScale = async () => {
    if (!selectedDepartment || !scaleName.trim() || assignments.length === 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    setLoading(true);
    
    try {
      // Criar a escala
      const { data: newScale, error: scaleError } = await supabase
        .from('escalas')
        .insert({
          nome: scaleName,
          departamento_id: selectedDepartment
        })
        .select()
        .single();

      if (scaleError) throw scaleError;

      // Salvar as participações
      const participacoes = assignments.map(assignment => ({
        escala_id: newScale.id,
        integrante_id: assignment.memberId,
        data: assignment.date.toISOString().split('T')[0],
        especializacao_id: assignment.especializacaoId,
        observacao: `${assignment.especializacaoNome} - ${scaleName}`
      }));

      const { error: saveError } = await supabase
        .from('escala_participacoes')
        .insert(participacoes);
      
      if (saveError) throw saveError;

      toast.success("Escala salva com sucesso!", {
        description: `${assignments.length} participação(ões) foram salvas.`
      });

      // Limpar formulário após salvar
      setScaleName("");
      setAssignments([]);
      clearForm();
      
    } catch (error) {
      console.error("Erro ao salvar escala:", error);
      toast.error("Erro ao salvar escala", {
        description: "Tente novamente em alguns instantes."
      });
    } finally {
      setLoading(false);
    }
  };

  const printScale = () => {
    const printContent = document.getElementById('scale-preview');
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    const printableContent = printContent.innerHTML;

    document.body.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        ${printableContent}
      </div>
    `;

    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const groupedAssignments = groupAssignmentsByDay();

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
          <div>
            <h1 className="text-3xl font-bold">Gerar Nova Escala</h1>
            <p className="text-muted-foreground">
              Crie e configure uma nova escala definindo integrantes, datas e especializações
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Configuração da Escala */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Configurar Escala
              </CardTitle>
              <CardDescription>
                Informações básicas e adicionar participações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seleção de Organização e Departamento */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Organização</label>
                <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma organização" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {org.nome} ({org.tipo})
                        </div>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Escala</label>
                <Input
                  placeholder="Ex: Louvor Domingo Manhã..."
                  value={scaleName}
                  onChange={(e) => setScaleName(e.target.value)}
                  disabled={!selectedDepartment}
                />
              </div>

              {selectedDepartment && (
                <>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Adicionar Participação</h4>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Data</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? (
                                format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                              ) : (
                                <span>Selecione a data</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Integrante</label>
                        <Select value={selectedMember} onValueChange={setSelectedMember}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um integrante" />
                          </SelectTrigger>
                          <SelectContent>
                            {members.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Especialização</label>
                        <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma especialização" />
                          </SelectTrigger>
                          <SelectContent>
                            {specializations.map((spec) => (
                              <SelectItem key={spec.id} value={spec.id}>
                                {spec.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={addAssignment} 
                        className="w-full"
                        disabled={!selectedDate || !selectedMember || !selectedSpecialization}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar à Escala
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Preview da Escala */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview da Escala</CardTitle>
                  <CardDescription>
                    Visualize a escala em tempo real ({assignments.length} participação{assignments.length !== 1 ? 'ões' : ''})
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {assignments.length > 0 && (
                    <>
                      <Button onClick={printScale} variant="outline" size="sm">
                        <PrinterIcon className="mr-2 h-4 w-4" />
                        Imprimir
                      </Button>
                      <Button 
                        onClick={saveScale} 
                        disabled={!scaleName.trim() || assignments.length === 0 || loading}
                        size="sm"
                      >
                        {loading ? (
                          "Salvando..."
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Escala
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div id="scale-preview">
                {assignments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhuma participação adicionada</p>
                    <p className="text-sm">Configure a organização, departamento e comece a adicionar participações</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Cabeçalho da Escala */}
                    <div className="text-center border-b pb-4">
                      <h3 className="text-xl font-semibold">
                        {organizations.find(o => o.id === selectedOrganization)?.nome}
                      </h3>
                      <h4 className="text-lg">
                        {departments.find(d => d.id === selectedDepartment)?.nome}
                      </h4>
                      <p className="text-md font-medium">{scaleName || "Nome da Escala"}</p>
                    </div>
                    
                    {/* Participações Agrupadas por Dia */}
                    <div className="space-y-4">
                      {Object.entries(groupedAssignments).map(([dayDate, dayAssignments]) => (
                        <div key={dayDate} className="space-y-2">
                          <h4 className="font-semibold text-lg border-b border-muted pb-1">
                            {dayDate}
                          </h4>
                          <div className="grid gap-2">
                            {dayAssignments.map((assignment) => (
                              <div key={assignment.id} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                                <div className="flex-1">
                                  <div className="font-medium">{assignment.memberName}</div>
                                  <div className="text-sm text-blue-600">
                                    {assignment.especializacaoNome}
                                  </div>
                                </div>
                                <Button
                                  onClick={() => removeAssignment(assignment.id)}
                                  variant="outline"
                                  size="sm"
                                  className="ml-2"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>
  );
}