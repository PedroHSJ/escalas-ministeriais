"use client";
import { useState, useEffect, Suspense } from "react";
import { InviteOrganizationDialog } from "@/components/organizations/InviteOrganizationDialog";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { NavigationButton } from "@/components/ui/navigation-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Plus, Building, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import FilterBar from "@/components/filters/FilterBar";
import Pagination from "@/components/pagination/Pagination";
import { useAuth } from "@/contexts/AuthContext";

interface Organization {
  id: string;
  nome: string;
  tipo: string;
  created_at: string;
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
  departamento?: {
    nome: string;
    tipo_departamento: string;
    organizacao?: {
      nome: string;
      tipo: string;
    };
  };
}

export default function Page() {
  const { userId } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredOrganizations, setfilteredOrganizations] = useState<
    Organization[]
  >([]);
  const [selectedOrganization, setSelectedOrganization] = useState<
    string | undefined
  >();
  const [selectedDepartment, setSelectedDepartment] = useState<
    string | undefined
  >();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteDialog, setInviteDialog] = useState<{ open: boolean; orgId?: string }>({ open: false });

  // Estados da paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Dialog de confirmação de exclusão
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    member: null as Member | null,
    isDeleting: false,
  });

  const fetchOrganizations = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Buscar organizações que o usuário gerencia
      const { data: orgs1, error: error1 } = await supabase
        .from("usuario_organizacoes")
        .select("organizacoes(*)")
        .eq("usuario_id", userId);

      // Unir e filtrar duplicatas
      const allOrgs = [
        ...(orgs1?.map((o: any) => o.organizacoes) || []),
      ];
      const uniqueOrgs = allOrgs.filter(
        (org, idx, arr) => org && arr.findIndex((o) => o.id === org.id) === idx
      );
      setOrganizations(uniqueOrgs);
      setfilteredOrganizations(uniqueOrgs);
    } catch (error) {
      console.error("Erro ao buscar organizações:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async (organizationId?: string) => {
    let query = supabase.from("departamentos").select("*").order("nome");

    if (organizationId) {
      query = query.eq("organizacao_id", organizationId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setDepartments(data);
    }
  };

  // const fetchAllMembers = async () => {
  //   setLoading(true);

  //   const { data, error } = await supabase
  //     .from('integrantes')
  //     .select(`
  //       *,
  //       departamentos (
  //         nome,
  //         tipo_departamento,
  //         organizacoes (
  //           nome,
  //           tipo
  //         )
  //       ),
  //       integrante_especializacoes (
  //         especializacoes (
  //           id,
  //           nome
  //         ),
  //         nivel
  //       )
  //     `)
  //     .order('nome');

  //   if (!error && data) {
  //     const membersWithDetails = data.map(member => ({
  //       ...member,
  //       departamento: {
  //         nome: member.departamentos?.nome,
  //         tipo_departamento: member.departamentos?.tipo_departamento,
  //         organizacao: {
  //           nome: member.departamentos?.organizacoes?.nome,
  //           tipo: member.departamentos?.organizacoes?.tipo
  //         }
  //       },
  //       especializacoes: member.integrante_especializacoes?.map((ie: any) => ({
  //         id: ie.especializacoes.id,
  //         nome: ie.especializacoes.nome,
  //         nivel: ie.nivel
  //       })) || []
  //     }));
  //     setMembers(membersWithDetails);
  //     setfilteredOrganizations(membersWithDetails);
  //   }

  //   setLoading(false);
  // };

  // const fetchMembersByOrganization = async (organizationId: string) => {
  //   setLoading(true);

  //   const { data, error } = await supabase
  //     .from('integrantes')
  //     .select(`
  //       *,
  //       departamentos!inner (
  //         nome,
  //         tipo_departamento,
  //         organizacao_id,
  //         organizacoes!inner (
  //           nome,
  //           tipo
  //         )
  //       ),
  //       integrante_especializacoes (
  //         especializacoes (
  //           id,
  //           nome
  //         ),
  //         nivel
  //       )
  //     `)
  //     .eq('departamentos.organizacao_id', organizationId)
  //     .order('nome');

  //   if (!error && data) {
  //     const membersWithDetails = data.map(member => ({
  //       ...member,
  //       departamento: {
  //         nome: member.departamentos?.nome,
  //         tipo_departamento: member.departamentos?.tipo_departamento,
  //         organizacao: {
  //           nome: member.departamentos?.organizacoes?.nome,
  //           tipo: member.departamentos?.organizacoes?.tipo
  //         }
  //       },
  //       especializacoes: member.integrante_especializacoes?.map((ie: any) => ({
  //         id: ie.especializacoes.id,
  //         nome: ie.especializacoes.nome,
  //         nivel: ie.nivel
  //       })) || []
  //     }));
  //     setMembers(membersWithDetails);
  //     setfilteredOrganizations(membersWithDetails);
  //   }

  //   setLoading(false);
  // };

  useEffect(() => {
    console.log("User ID changed:", userId);
    console.log("User ID type:", typeof userId);
    console.log("User ID length:", userId?.length);

    if (userId) {
      console.log("Calling fetch functions with userId:", userId);
      fetchOrganizations();
      fetchDepartments();
    } else {
      console.log("No userId available, not fetching data");
    }
  }, [userId]);

  useEffect(() => {
    if (selectedOrganization) {
      fetchDepartments(selectedOrganization);
      setSelectedDepartment(undefined);
    } else if (userId) {
      fetchDepartments();
    }
  }, [selectedOrganization]);

  // Filtros
  useEffect(() => {
    let filtered = organizations;

    // Filtro por organização selecionada
    if (selectedOrganization) {
      filtered = filtered.filter((org) => org.id === selectedOrganization);
    }

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(
        (org) =>
          org.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          org.tipo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setfilteredOrganizations(filtered);
    setCurrentPage(1); // Reset para primeira página quando filtros mudam
  }, [organizations, selectedOrganization, searchTerm]);

  // Dados paginados
  const totalItems = filteredOrganizations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrganizations = filteredOrganizations.slice(
    startIndex,
    endIndex
  );

  const openDeleteDialog = (member: Member) => {
    setDeleteDialog({
      isOpen: true,
      member,
      isDeleting: false,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      member: null,
      isDeleting: false,
    });
  };

  // const confirmDeleteMember = async () => {
  //   if (!deleteDialog.member) return;

  //   setDeleteDialog(prev => ({ ...prev, isDeleting: true }));

  //   try {
  //     const { error } = await supabase
  //       .from('integrantes')
  //       .delete()
  //       .eq('id', deleteDialog.member.id);

  //     if (error) throw error;

  //     // Atualizar lista
  //     if (selectedOrganization) {
  //       await fetchMembersByOrganization(selectedOrganization);
  //     } else {
  //       await fetchAllMembers();
  //     }

  //     closeDeleteDialog();
  //   } catch (error) {
  //     console.error("Erro ao excluir membro:", error);
  //     setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
  //   }
  // };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const clearFilters = () => {
    setSelectedOrganization(undefined);
    setSelectedDepartment(undefined);
    setSearchTerm("");
  };

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div>
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lista de organizações</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie todas as suas organizações
            </p>
          </div>
          <NavigationButton href="/organizations/create">
            <Plus className="mr-2 h-4 w-4" />
            Nova Organização
          </NavigationButton>
        </div>

        {/* Filtros */}
        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedOrganization={selectedOrganization}
          setSelectedOrganization={setSelectedOrganization}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
          organizations={organizations}
          departments={departments}
          searchPlaceholder="Nome da organização, tipo..."
          showDepartmentFilter={false}
          onClearFilters={clearFilters}
          loading={loading}
        />

        {/* Lista/Tabela de Integrantes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Organizações ({totalItems})
            </CardTitle>
            <CardDescription>
              {loading
                ? "Carregando..."
                : totalPages > 1
                ? `Mostrando ${startIndex + 1}-${Math.min(
                    endIndex,
                    totalItems
                  )} de ${totalItems} organizações`
                : `${totalItems} organização(s) encontrada(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">
                  Carregando integrantes...
                </p>
              </div>
            ) : totalItems === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || selectedOrganization || selectedDepartment
                  ? "Nenhum integrante encontrado com os filtros aplicados"
                  : "Nenhum integrante cadastrado"}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visualização em Cards para mobile */}
                <div className="block md:hidden space-y-4">
                  {paginatedOrganizations.map((org) => (
                    <Card key={org.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-blue-100 text-blue-600">
                                {getInitials(org.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium">{org.nome}</h3>
                              {/* <p className="text-sm text-muted-foreground">
                                {member.departamento?.organizacao?.nome} • {member.departamento?.nome}
                              </p> */}
                              {/* <p className="text-xs text-muted-foreground">
                                Cadastrado em {format(new Date(member.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </p> */}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <NavigationButton
                              href={`/organizations/edit/${org.id}`}
                              variant="outline"
                              size="sm"
                            >
                              <Edit className="h-4 w-4" />
                            </NavigationButton>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInviteDialog({ open: true, orgId: org.id })}
                            >
                              Convidar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                console.log("Delete organization:", org.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {/* {member.especializacoes && member.especializacoes.length > 0 && (
                          <div className="flex gap-1 mt-3 flex-wrap">
                            {member.especializacoes.map((esp) => (
                              <Badge key={esp.id} variant="secondary" className="text-xs">
                                {esp.nome}
                              </Badge>
                            ))}
                          </div>
                        )} */}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Visualização em Tabela para desktop */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cadastrado</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrganizations.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                  {getInitials(org.nome)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{org.nome}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              {org.tipo && (
                                <Badge variant="secondary" className="text-xs">
                                  {org.tipo.slice(0, 1).toUpperCase() +
                                    org.tipo.slice(1)}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm">
                                {format(
                                  new Date(org.created_at),
                                  "dd/MM/yyyy",
                                  { locale: ptBR }
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <NavigationButton
                                href={`/organizations/edit/${org.id}`}
                                variant="outline"
                                size="sm"
                              >
                                <Edit className="h-4 w-4" />
                              </NavigationButton>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setInviteDialog({ open: true, orgId: org.id })}
                              >
                                Convidar
                              </Button>
                              {/* <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(org as any)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button> */}
                            </div>
      <InviteOrganizationDialog
        open={inviteDialog.open}
        onOpenChange={open => setInviteDialog({ open })}
        organizacaoId={inviteDialog.orgId || ""}
      />
                          </TableCell>
                          {/* <TableCell>
                            <div>
                              <div className="font-medium">{member.departamento?.organizacao?.nome}</div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {member.departamento?.organizacao?.tipo}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{member.departamento?.nome}</div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {member.departamento?.tipo_departamento}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {member.especializacoes && member.especializacoes.length > 0 ? (
                                member.especializacoes.map((esp) => (
                                  <Badge key={esp.id} variant="secondary" className="text-xs">
                                    {esp.nome}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">Nenhuma</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(member.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Link href={`/escalas/members?edit=${member.id}`}>
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(member)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell> */}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                )}
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
                Esta ação não pode ser desfeita. O integrante será removido
                permanentemente do sistema.
              </DialogDescription>
            </DialogHeader>

            {deleteDialog.member && (
              <div className="py-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-red-100 text-red-600">
                      {getInitials(deleteDialog.member.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{deleteDialog.member.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {deleteDialog.member.departamento?.organizacao?.nome} •{" "}
                      {deleteDialog.member.departamento?.nome}
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
                onClick={() => console.log("Confirmar exclusão")} // confirmDeleteMember
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
                    Excluir Integrante
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
