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
import {
  AlertTriangle,
  Users,
  Search,
  Filter,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import FilterBar from "@/components/filters/FilterBar";
import Pagination from "@/components/pagination/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { NavigationButton } from "@/components/ui/navigation-button";
import { NavigationLink } from "@/components/ui/navigation-link";

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
  const { selectedOrganization } = useOrganization();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<
    string | undefined
  >();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

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

    const { data, error } = await supabase
      .from("organizacoes")
      .select("*")
      .eq("user_id", userId)
      .order("nome");

    if (!error && data) {
      setOrganizations(data);
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

  const fetchAllMembers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("integrantes")
      .select(
        `
        *,
        departamentos (
          nome,
          tipo_departamento,
          organizacoes (
            nome,
            tipo
          )
        ),
        integrante_especializacoes (
          especializacoes (
            id,
            nome
          ),
          nivel
        )
      `
      )
      .order("nome");

    if (!error && data) {
      const membersWithDetails = data.map((member) => ({
        ...member,
        departamento: {
          nome: member.departamentos?.nome,
          tipo_departamento: member.departamentos?.tipo_departamento,
          organizacao: {
            nome: member.departamentos?.organizacoes?.nome,
            tipo: member.departamentos?.organizacoes?.tipo,
          },
        },
        especializacoes:
          member.integrante_especializacoes?.map((ie: any) => ({
            id: ie.especializacoes.id,
            nome: ie.especializacoes.nome,
            nivel: ie.nivel,
          })) || [],
      }));
      setMembers(membersWithDetails);
      setFilteredMembers(membersWithDetails);
    }

    setLoading(false);
  };

  const fetchMembersByOrganization = async (organizationId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("integrantes")
      .select(
        `
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
        integrante_especializacoes (
          especializacoes (
            id,
            nome
          ),
          nivel
        )
      `
      )
      .eq("departamentos.organizacao_id", organizationId)
      .order("nome");

    if (!error && data) {
      const membersWithDetails = data.map((member) => ({
        ...member,
        departamento: {
          nome: member.departamentos?.nome,
          tipo_departamento: member.departamentos?.tipo_departamento,
          organizacao: {
            nome: member.departamentos?.organizacoes?.nome,
            tipo: member.departamentos?.organizacoes?.tipo,
          },
        },
        especializacoes:
          member.integrante_especializacoes?.map((ie: any) => ({
            id: ie.especializacoes.id,
            nome: ie.especializacoes.nome,
            nivel: ie.nivel,
          })) || [],
      }));
      setMembers(membersWithDetails);
      setFilteredMembers(membersWithDetails);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (userId) {
      fetchOrganizations();
      fetchDepartments();
      fetchAllMembers();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedOrganization) {
      fetchMembersByOrganization(selectedOrganization.id);
      fetchDepartments(selectedOrganization.id);
      setSelectedDepartment(undefined);
    } else if (userId) {
      fetchAllMembers();
      fetchDepartments();
    }
  }, [selectedOrganization]);

  // Filtros
  useEffect(() => {
    let filtered = members;

    // Filtro por departamento
    if (selectedDepartment) {
      filtered = filtered.filter(
        (member) => member.departamento_id === selectedDepartment
      );
    }

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(
        (member) =>
          member.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.departamento?.nome
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          member.especializacoes?.some((esp) =>
            esp.nome.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    setFilteredMembers(filtered);
    setCurrentPage(1); // Reset para primeira página quando filtros mudam
  }, [members, selectedDepartment, searchTerm]);

  // Dados paginados
  const totalItems = filteredMembers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

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

  const confirmDeleteMember = async () => {
    if (!deleteDialog.member) return;

    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      const { error } = await supabase
        .from("integrantes")
        .delete()
        .eq("id", deleteDialog.member.id);

      if (error) throw error;

      // Atualizar lista
      if (selectedOrganization) {
        await fetchMembersByOrganization(selectedOrganization.id);
      } else {
        await fetchAllMembers();
      }

      closeDeleteDialog();
    } catch (error) {
      console.error("Erro ao excluir membro:", error);
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
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

  const clearFilters = () => {
    setSelectedDepartment(undefined);
    setSearchTerm("");
  };

  if (!selectedOrganization) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lista de Integrantes</h1>
            <p className="text-muted-foreground">
              Selecione uma organização para ver seus integrantes
            </p>
          </div>
        </div>
        <Card className="p-12">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhuma organização selecionada
            </h3>
            <p className="text-muted-foreground mb-4">
              Selecione uma organização no menu superior para gerenciar seus
              integrantes
            </p>
          </div>
        </Card>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold">Lista de Integrantes</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie todos os integrantes das suas organizações
            </p>
          </div>
          <NavigationButton href="/members/create">
            <Plus className="h-4 w-4 mr-2" />
            Novo Integrante
          </NavigationButton>
        </div>

        {/* Filtros */}
        <FilterBar
          selectedOrganization={selectedOrganization.id}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
          organizations={organizations}
          departments={departments}
          searchPlaceholder="Nome, departamento, especialização..."
          showDepartmentFilter={true}
          onClearFilters={clearFilters}
          loading={loading}
        />

        {/* Lista/Tabela de Integrantes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Integrantes ({totalItems})
            </CardTitle>
            <CardDescription>
              {loading
                ? "Carregando..."
                : totalPages > 1
                ? `Mostrando ${startIndex + 1}-${Math.min(
                    endIndex,
                    totalItems
                  )} de ${totalItems} integrantes`
                : `${totalItems} integrante(s) encontrado(s)`}
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
                {searchTerm || selectedDepartment
                  ? "Nenhum integrante encontrado com os filtros aplicados"
                  : selectedOrganization
                  ? "Nenhum integrante cadastrado nesta organização"
                  : "Nenhum integrante cadastrado"}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visualização em Cards para mobile */}
                <div className="block md:hidden space-y-4">
                  {paginatedMembers.map((member) => (
                    <Card key={member.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-blue-100 text-blue-600">
                                {getInitials(member.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium">{member.nome}</h3>
                              <p className="text-sm text-muted-foreground">
                                {member.departamento?.organizacao?.nome} •{" "}
                                {member.departamento?.nome}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Cadastrado em{" "}
                                {format(
                                  new Date(member.created_at),
                                  "dd/MM/yyyy",
                                  { locale: ptBR }
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Link href={`/members/edit/${member.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            {/* <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(member)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button> */}
                          </div>
                        </div>
                        {member.especializacoes &&
                          member.especializacoes.length > 0 && (
                            <div className="flex gap-1 mt-3 flex-wrap">
                              {member.especializacoes.map((esp) => (
                                <Badge
                                  key={esp.id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {esp.nome}
                                </Badge>
                              ))}
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Visualização em Tabela para desktop */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Integrante</TableHead>
                        <TableHead>Organização</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Especializações</TableHead>
                        <TableHead>Cadastrado</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                  {getInitials(member.nome)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{member.nome}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {member.departamento?.organizacao?.nome}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {member.departamento?.organizacao?.tipo}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{member.departamento?.nome}</div>
                              {member.departamento?.tipo_departamento.toLowerCase() !=
                                member.departamento?.nome.toLowerCase() && (
                                <div className="text-xs text-muted-foreground capitalize">
                                  {member.departamento?.tipo_departamento}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {member.especializacoes &&
                              member.especializacoes.length > 0 ? (
                                member.especializacoes.map((esp) => (
                                  <Badge
                                    key={esp.id}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {esp.nome}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Nenhuma
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(
                                new Date(member.created_at),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <NavigationButton
                                href={`/members/edit/${member.id}`}
                                variant="outline"
                                size="sm"
                              >
                                <Edit className="h-4 w-4" />
                              </NavigationButton>
                              {/* <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(member)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button> */}
                            </div>
                          </TableCell>
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
                onClick={confirmDeleteMember}
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
