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
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";

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
  especializacaoId: string | null;
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [scaleName, setScaleName] = useState("");
  const [assignments, setAssignments] = useState<ScaleAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const {organizations} = useOrganization();
  const {userId} = useAuth();
  // Form states para adicionar nova participação
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");

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
    if (!selectedDate || !selectedMember) {
      toast.error("Preencha todos os campos obrigatórios para adicionar à escala");
      return;
    }

    const member = members.find(m => m.id === selectedMember);
    if (!member) return;

    // Verificar se o membro tem especializações
    const memberSpecializations = member.especializacoes || [];
    let selectedSpec: Specialization | null = null;

    if (memberSpecializations.length > 1) {
      // Se tem mais de uma especialização, a especialização deve ser selecionada
      if (!selectedSpecialization) {
        toast.error("Este integrante possui múltiplas especializações. Selecione uma especialização.");
        return;
      }
      selectedSpec = specializations.find(s => s.id === selectedSpecialization) || null;
    } else if (memberSpecializations.length === 1) {
      // Se tem apenas uma especialização, usar automaticamente
      selectedSpec = specializations.find(s => s.id === memberSpecializations[0].id) || null;
    } else {
      // Se não tem especializações, permitir adicionar sem especialização
      selectedSpec = null;
    }

    // Verificar se já existe essa combinação membro + data + especialização
    const existingAssignment = assignments.find(a => 
      a.memberId === selectedMember && 
      a.date.toDateString() === selectedDate.toDateString() &&
      a.especializacaoId === (selectedSpec?.id || null)
    );

    if (existingAssignment) {
      toast.error("Este integrante já foi adicionado nesta data com essa especialização");
      return;
    }

    const newAssignment: ScaleAssignment = {
      id: Math.random().toString(36).substr(2, 9),
      memberId: selectedMember,
      memberName: member.nome,
      date: selectedDate,
      especializacaoId: selectedSpec?.id || null,
      especializacaoNome: selectedSpec?.nome || "Sem especialização"
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
    if (assignments.length === 0) {
      toast.error("Adicione pelo menos uma participação antes de imprimir");
      return;
    }

    // Criar conteúdo específico para impressão
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Organizar participações por data
    const sortedAssignments = assignments.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Criar cabeçalhos da tabela
    const headerRow = `
      <tr>
        <th style="width: 100px;">Data</th>
        <th style="width: 120px;">Dia da Semana</th>
        <th style="width: 200px;">Integrante</th>
        <th style="width: 150px;">Especialização</th>
      </tr>
    `;

    // Criar linhas da tabela
    const tableContent = sortedAssignments.map((assignment, index) => `
      <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
        <td style="text-align: center;">${format(assignment.date, "dd/MM/yyyy", { locale: ptBR })}</td>
        <td style="text-align: center;">${DAYS_OF_WEEK[getDay(assignment.date)]}</td>
        <td>${assignment.memberName}</td>
        <td style="text-align: center;">${assignment.especializacaoNome}</td>
      </tr>
    `).join('');

    // Calcular período da escala
    const startDate = sortedAssignments[0]?.date || new Date();
    const endDate = sortedAssignments[sortedAssignments.length - 1]?.date || new Date();

    const organizationName = organizations.find(o => o.id === selectedOrganization)?.nome || "ORGANIZAÇÃO";
    const departmentName = departments.find(d => d.id === selectedDepartment)?.nome || "DEPARTAMENTO";

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Escala de Serviço - ${scaleName || "Nova Escala"}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .organization-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          .scale-title {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 3px;
            text-transform: uppercase;
          }
          .period {
            font-size: 11px;
            margin-bottom: 5px;
          }
          .scale-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .scale-table th,
          .scale-table td {
            border: 1px solid #000;
            text-align: left;
            vertical-align: middle;
            font-size: 10px;
            padding: 8px;
          }
          .scale-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
          }
          .signature-section {
            margin-top: 40px;
            text-align: center;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            width: 300px;
            margin: 0 auto 5px auto;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="organization-name">${organizationName}</div>
          <div class="scale-title">ESCALA DE SERVIÇO - ${departmentName.toUpperCase()}</div>
          <div class="scale-title">${scaleName.toUpperCase()}</div>
          <div class="period">PERÍODO: ${format(startDate, "dd/MM/yyyy", { locale: ptBR })} a ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}</div>
        </div>

        <table class="scale-table">
          <thead>
            ${headerRow}
          </thead>
          <tbody>
            ${tableContent}
          </tbody>
        </table>

        <div class="footer">
          <div>${organizationName}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.</div>
        </div>

        <div class="signature-section">
          <div style="margin-top: 60px;">
            <div class="signature-line"></div>
            <div style="margin-top: 5px; font-weight: bold;">
              RESPONSÁVEL PELA ESCALA<br>
              ${organizationName}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Aguardar o carregamento e imprimir
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
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

                      {/* Mostrar seleção de especialização apenas se o membro tem mais de uma */}
                      {selectedMember && (() => {
                        const member = members.find(m => m.id === selectedMember);
                        const memberSpecs = member?.especializacoes || [];
                        
                        if (memberSpecs.length > 1) {
                          return (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Especialização</label>
                              <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma especialização" />
                                </SelectTrigger>
                                <SelectContent>
                                  {memberSpecs.map((spec) => {
                                    const fullSpec = specializations.find(s => s.id === spec.id);
                                    return fullSpec ? (
                                      <SelectItem key={fullSpec.id} value={fullSpec.id}>
                                        {fullSpec.nome}
                                      </SelectItem>
                                    ) : null;
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        } else if (memberSpecs.length === 1) {
                          const singleSpec = specializations.find(s => s.id === memberSpecs[0].id);
                          return (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Especialização</label>
                              <div className="p-2 bg-muted rounded-md text-sm">
                                {singleSpec?.nome || "Especialização única"}
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Especialização</label>
                              <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                                Sem especialização
                              </div>
                            </div>
                          );
                        }
                      })()}

                      <Button 
                        onClick={addAssignment} 
                        className="w-full"
                        disabled={(() => {
                          if (!selectedDate || !selectedMember) return true;
                          
                          const member = members.find(m => m.id === selectedMember);
                          const memberSpecs = member?.especializacoes || [];
                          
                          // Se tem mais de uma especialização, deve selecionar uma
                          if (memberSpecs.length > 1 && !selectedSpecialization) {
                            return true;
                          }
                          
                          return false;
                        })()}
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
                    
                    {/* Tabela de Participações */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Participações da Escala</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-secondary border-b-2 border-primary">
                            <tr>
                              <th className="text-left p-3 font-medium">Data</th>
                              <th className="text-left p-3 font-medium">Dia da Semana</th>
                              <th className="text-left p-3 font-medium">Integrante</th>
                              <th className="text-left p-3 font-medium">Especialização</th>
                              <th className="text-center p-3 font-medium w-16">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignments
                              .sort((a, b) => a.date.getTime() - b.date.getTime())
                              .map((assignment, index) => (
                              <tr key={assignment.id} className={index % 2 === 0 ? "bg-secondary" : "bg-muted/30"}>
                                <td className="p-3">
                                  {format(assignment.date, "dd/MM/yyyy", { locale: ptBR })}
                                </td>
                                <td className="p-3">
                                  {DAYS_OF_WEEK[getDay(assignment.date)]}
                                </td>
                                <td className="p-3 font-medium">
                                  {assignment.memberName}
                                </td>
                                <td className="p-3">
                                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                    {assignment.especializacaoNome}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <Button
                                    onClick={() => removeAssignment(assignment.id)}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {assignments.length === 0 && (
                          <div className="p-8 text-center text-muted-foreground">
                            <p>Nenhuma participação adicionada ainda</p>
                          </div>
                        )}
                      </div>
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