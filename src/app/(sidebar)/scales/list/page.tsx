"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Calendar, Search, Filter, Users, Eye, Edit, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
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

interface Scale {
  id: string;
  nome: string;
  departamento_id: string;
  created_at: string;
  departamento?: {
    nome: string;
    tipo_departamento: string;
    organizacao?: {
      nome: string;
      tipo: string;
    };
  };
  participacoes?: {
    id: string;
    data: string;
    integrante: {
      nome: string;
    };
    especializacao: {
      nome: string;
    };
  }[];
  _count?: {
    participacoes: number;
  };
}

export default function Page() {
  const [userId, setUserId] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [scales, setScales] = useState<Scale[]>([]);
  const [filteredScales, setFilteredScales] = useState<Scale[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string | undefined>();
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Dialog de confirmação de exclusão
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    scale: null as Scale | null,
    isDeleting: false
  });

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
      .select(`
        *,
        usuario_organizacoes!inner (
          usuario_id
        )
      `)
      .eq('usuario_organizacoes.usuario_id', userId)
      .order('nome');
    
    if (!error && data) {
      setOrganizations(data);
    }
  };

  const fetchDepartments = async (organizationId?: string) => {
    let query = supabase
      .from('departamentos')
      .select('*')
      .order('nome');

    if (organizationId) {
      query = query.eq('organizacao_id', organizationId);
    }
    
    const { data, error } = await query;
    
    if (!error && data) {
      setDepartments(data);
    }
  };

  const fetchAllScales = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('escalas')
      .select(`
        *,
        departamentos!inner (
          nome,
          tipo_departamento,
          organizacoes!inner (
            nome,
            tipo,
            usuario_organizacoes!inner (
              usuario_id
            )
          )
        ),
        escala_participacoes (
          id,
          data,
          integrantes (
            nome
          ),
          especializacoes (
            nome
          )
        )
      `)
      .eq('departamentos.organizacoes.usuario_organizacoes.usuario_id', userId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const scalesWithDetails = data.map(scale => ({
        ...scale,
        departamento: {
          nome: scale.departamentos?.nome,
          tipo_departamento: scale.departamentos?.tipo_departamento,
          organizacao: {
            nome: scale.departamentos?.organizacoes?.nome,
            tipo: scale.departamentos?.organizacoes?.tipo
          }
        },
        participacoes: scale.escala_participacoes?.map((p: any) => ({
          id: p.id,
          data: p.data,
          integrante: {
            nome: p.integrantes?.nome
          },
          especializacao: {
            nome: p.especializacoes?.nome
          }
        })) || [],
        _count: {
          participacoes: scale.escala_participacoes?.length || 0
        }
      }));
      setScales(scalesWithDetails);
      setFilteredScales(scalesWithDetails);
    }
    
    setLoading(false);
  };

  const fetchScalesByOrganization = async (organizationId: string) => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('escalas')
      .select(`
        *,
        departamentos!inner (
          nome,
          tipo_departamento,
          organizacao_id,
          organizacoes!inner (
            nome,
            tipo
          )
        ),
        escala_participacoes (
          id,
          data,
          integrantes (
            nome
          ),
          especializacoes (
            nome
          )
        )
      `)
      .eq('departamentos.organizacao_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const scalesWithDetails = data.map(scale => ({
        ...scale,
        departamento: {
          nome: scale.departamentos?.nome,
          tipo_departamento: scale.departamentos?.tipo_departamento,
          organizacao: {
            nome: scale.departamentos?.organizacoes?.nome,
            tipo: scale.departamentos?.organizacoes?.tipo
          }
        },
        participacoes: scale.escala_participacoes?.map((p: any) => ({
          id: p.id,
          data: p.data,
          integrante: {
            nome: p.integrantes?.nome
          },
          especializacao: {
            nome: p.especializacoes?.nome
          }
        })) || [],
        _count: {
          participacoes: scale.escala_participacoes?.length || 0
        }
      }));
      setScales(scalesWithDetails);
      setFilteredScales(scalesWithDetails);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchOrganizations();
      fetchDepartments();
      fetchAllScales();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedOrganization) {
      fetchScalesByOrganization(selectedOrganization);
      fetchDepartments(selectedOrganization);
      setSelectedDepartment(undefined);
    } else if (userId) {
      fetchAllScales();
      fetchDepartments();
    }
  }, [selectedOrganization]);

  // Filtros
  useEffect(() => {
    let filtered = scales;

    // Filtro por departamento
    if (selectedDepartment) {
      filtered = filtered.filter(scale => scale.departamento_id === selectedDepartment);
    }

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(scale =>
        scale.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scale.departamento?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scale.departamento?.organizacao?.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredScales(filtered);
  }, [scales, selectedDepartment, searchTerm]);

  const openDeleteDialog = (scale: Scale) => {
    setDeleteDialog({
      isOpen: true,
      scale,
      isDeleting: false
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      scale: null,
      isDeleting: false
    });
  };

  const confirmDeleteScale = async () => {
    if (!deleteDialog.scale) return;
    
    setDeleteDialog(prev => ({ ...prev, isDeleting: true }));
    
    try {
      // Primeiro deletar as participações
      const { error: participacoesError } = await supabase
        .from('escala_participacoes')
        .delete()
        .eq('escala_id', deleteDialog.scale.id);
      
      if (participacoesError) throw participacoesError;

      // Depois deletar a escala
      const { error } = await supabase
        .from('escalas')
        .delete()
        .eq('id', deleteDialog.scale.id);
      
      if (error) throw error;
      
      toast.success("Escala excluída com sucesso");
      
      // Atualizar lista
      if (selectedOrganization) {
        await fetchScalesByOrganization(selectedOrganization);
      } else {
        await fetchAllScales();
      }
      
      closeDeleteDialog();
    } catch (error) {
      console.error("Erro ao excluir escala:", error);
      toast.error("Erro ao excluir escala");
      setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const clearFilters = () => {
    setSelectedOrganization(undefined);
    setSelectedDepartment(undefined);
    setSearchTerm("");
  };

  const getNextDates = (participacoes: any[]) => {
    if (!participacoes || participacoes.length === 0) return null;
    
    const today = new Date();
    const futureDates = participacoes
      .filter(p => new Date(p.data) >= today)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .slice(0, 2);
    
    return futureDates;
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
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lista de Escalas</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie todas as escalas das suas organizações
            </p>
          </div>
          <Link href="/generate">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Escala
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome da escala, departamento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Organização</label>
                <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as organizações" />
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
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os departamentos" />
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

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={clearFilters}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista/Tabela de Escalas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Escalas ({filteredScales.length})
            </CardTitle>
            <CardDescription>
              {loading ? "Carregando..." : `${filteredScales.length} escala(s) encontrada(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Carregando escalas...</p>
              </div>
            ) : filteredScales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || selectedOrganization || selectedDepartment 
                  ? "Nenhuma escala encontrada com os filtros aplicados"
                  : "Nenhuma escala cadastrada"
                }
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visualização em Cards para mobile */}
                <div className="block md:hidden space-y-4">
                  {filteredScales.map((scale) => {
                    const nextDates = getNextDates(scale.participacoes || []);
                    return (
                      <Card key={scale.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium">{scale.nome}</h3>
                              <p className="text-sm text-muted-foreground">
                                {scale.departamento?.organizacao?.nome} • {scale.departamento?.nome}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary">
                                  {scale._count?.participacoes || 0} participações
                                </Badge>
                              </div>
                              {nextDates && nextDates.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-muted-foreground">Próximas datas:</p>
                                  <div className="flex gap-1 mt-1">
                                    {nextDates.map((p, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {format(new Date(p.data), "dd/MM", { locale: ptBR })}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                Criada em {format(new Date(scale.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Link href={`/scales/view?id=${scale.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(scale)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Visualização em Tabela para desktop */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome da Escala</TableHead>
                        <TableHead>Organização</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Participações</TableHead>
                        <TableHead>Próximas Datas</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredScales.map((scale) => {
                        const nextDates = getNextDates(scale.participacoes || []);
                        return (
                          <TableRow key={scale.id}>
                            <TableCell>
                              <div className="font-medium">{scale.nome}</div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{scale.departamento?.organizacao?.nome}</div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {scale.departamento?.organizacao?.tipo}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{scale.departamento?.nome}</div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {scale.departamento?.tipo_departamento}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {scale._count?.participacoes || 0}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {nextDates && nextDates.length > 0 ? (
                                <div className="flex gap-1">
                                  {nextDates.map((p, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {format(new Date(p.data), "dd/MM", { locale: ptBR })}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Nenhuma</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {format(new Date(scale.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Link href={`/scales/view?id=${scale.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteDialog(scale)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={deleteDialog.isOpen} onOpenChange={closeDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Confirmar Exclusão
              </DialogTitle>
              <DialogDescription>
                Esta ação não pode ser desfeita. A escala e todas as suas participações serão removidas permanentemente.
              </DialogDescription>
            </DialogHeader>
            
            {deleteDialog.scale && (
              <div className="py-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Calendar className="h-10 w-10 text-red-500" />
                  <div>
                    <p className="font-medium">{deleteDialog.scale.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {deleteDialog.scale.departamento?.organizacao?.nome} • {deleteDialog.scale.departamento?.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {deleteDialog.scale._count?.participacoes || 0} participações
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={closeDeleteDialog}
                disabled={deleteDialog.isDeleting}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteScale}
                disabled={deleteDialog.isDeleting}
              >
                {deleteDialog.isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Escala
                  </>
                )}
              </Button>              
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
