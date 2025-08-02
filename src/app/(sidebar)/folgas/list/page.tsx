"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
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
import { Plus, Eye, Trash2, Building2, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { EscalaFolgaType } from "@/types/escala-folgas";
import FilterBar from "@/components/filters/FilterBar";
import Pagination from "@/components/pagination/Pagination";

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

interface DeleteDialog {
  isOpen: boolean;
  scale: EscalaFolgaType | null;
  isDeleting: boolean;
}

export default function FolgasListPage() {
  const [userId, setUserId] = useState("");
  const [scales, setScales] = useState<EscalaFolgaType[]>([]);
  const [filteredScales, setFilteredScales] = useState<EscalaFolgaType[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState<
    string | undefined
  >();
  const [selectedDepartment, setSelectedDepartment] = useState<
    string | undefined
  >();

  // Estados da paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>({
    isOpen: false,
    scale: null,
    isDeleting: false,
  });

  const fetchSession = async () => {
    if (process.env.NODE_ENV === "development") {
      setUserId("d58c420f-7db1-42e9-b040-e1d038ef79af");
    } else {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUserId(data.session.user.id);
      }
    }
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

  const fetchAllScales = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("escalas_folgas")
      .select(
        `
        *,
        departamentos (
          nome,
          tipo_departamento,
          organizacoes (
            nome,
            tipo,
            user_id
          )
        ),
        escala_folgas_participacoes (
          id,
          integrante_id,
          ativo
        )
      `
      )
      .eq("departamentos.organizacoes.user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const scalesWithDetails = data.map((scale) => ({
        ...scale,
        departamento: {
          nome: scale.departamentos?.nome,
          tipo_departamento: scale.departamentos?.tipo_departamento,
          organizacao: {
            nome: scale.departamentos?.organizacoes?.nome,
            tipo: scale.departamentos?.organizacoes?.tipo,
          },
        },
        _count: {
          participacoes:
            scale.escala_folgas_participacoes?.filter((p: any) => p.ativo)
              .length || 0,
        },
      }));
      setScales(scalesWithDetails);
      setFilteredScales(scalesWithDetails);
    }

    setLoading(false);
  };

  const fetchScalesByOrganization = async (organizationId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("escalas_folgas")
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
        escala_folgas_participacoes (
          id,
          integrante_id,
          ativo
        )
      `
      )
      .eq("departamentos.organizacao_id", organizationId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const scalesWithDetails = data.map((scale) => ({
        ...scale,
        departamento: {
          nome: scale.departamentos?.nome,
          tipo_departamento: scale.departamentos?.tipo_departamento,
          organizacao: {
            nome: scale.departamentos?.organizacoes?.nome,
            tipo: scale.departamentos?.organizacoes?.tipo,
          },
        },
        _count: {
          participacoes:
            scale.escala_folgas_participacoes?.filter((p: any) => p.ativo)
              .length || 0,
        },
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
      filtered = filtered.filter(
        (scale) => scale.departamento_id === selectedDepartment
      );
    }

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(
        (scale) =>
          scale.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          scale.departamento?.nome
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          scale.departamento?.organizacao?.nome
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    setFilteredScales(filtered);
    setCurrentPage(1); // Reset para primeira página quando filtros mudam
  }, [scales, selectedDepartment, searchTerm]);

  // Dados paginados
  const totalItems = filteredScales.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedScales = filteredScales.slice(startIndex, endIndex);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedOrganization(undefined);
    setSelectedDepartment(undefined);
  };

  const openDeleteDialog = (scale: EscalaFolgaType) => {
    setDeleteDialog({
      isOpen: true,
      scale,
      isDeleting: false,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      scale: null,
      isDeleting: false,
    });
  };

  const confirmDeleteScale = async () => {
    if (!deleteDialog.scale) return;

    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      // Primeiro deletar as atribuições
      await supabase
        .from("escala_folgas_atribuicoes")
        .delete()
        .eq("escala_folga_id", deleteDialog.scale.id);

      // Depois deletar as participações
      await supabase
        .from("escala_folgas_participacoes")
        .delete()
        .eq("escala_folga_id", deleteDialog.scale.id);

      // Por último deletar a escala
      const { error } = await supabase
        .from("escalas_folgas")
        .delete()
        .eq("id", deleteDialog.scale.id);

      if (error) throw error;

      toast.success("Escala preta e vermelha excluída com sucesso");

      // Atualizar lista
      if (selectedOrganization) {
        await fetchScalesByOrganization(selectedOrganization);
      } else {
        await fetchAllScales();
      }

      closeDeleteDialog();
    } catch (error) {
      console.error("Erro ao excluir escala preta e vermelha:", error);
      toast.error("Erro ao excluir escala preta e vermelha");
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Escalas Preta e Vermelha</h1>
            <p className="text-muted-foreground">
              Gerencie suas escalas de folgas no sistema preta e vermelha
            </p>
          </div>
          <Link href="/folgas/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Criar
            </Button>
          </Link>
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
          searchPlaceholder="Nome da escala, departamento..."
          showDepartmentFilter={true}
          onClearFilters={clearFilters}
          loading={loading}
        />

        {/* Lista de Escalas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Escalas Preta e Vermelha ({totalItems})
            </CardTitle>
            <CardDescription>
              {totalPages > 1
                ? `Mostrando ${startIndex + 1}-${Math.min(
                    endIndex,
                    totalItems
                  )} de ${totalItems} escalas`
                : "Lista de todas as escalas preta e vermelha criadas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalItems === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  Nenhuma escala preta e vermelha encontrada
                </p>
                <p className="text-sm mb-4">
                  {searchTerm || selectedOrganization || selectedDepartment
                    ? "Tente ajustar os filtros ou criar uma nova escala."
                    : "Comece criando sua primeira escala preta e vermelha."}
                </p>
                <Link href="/folgas/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeira Escala Preta e Vermelha
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Visualização em Cards para mobile */}
                <div className="md:hidden space-y-4">
                  {paginatedScales.map((scale) => (
                    <Card key={scale.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {scale.nome}
                            </h3>
                            <div className="space-y-1 text-sm text-muted-foreground mt-2">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span>
                                  {scale.departamento?.organizacao?.nome}
                                </span>
                                <span className="capitalize">
                                  ({scale.departamento?.organizacao?.tipo})
                                </span>
                              </div>
                              <div>
                                <strong>Departamento:</strong>{" "}
                                {scale.departamento?.nome} (
                                {scale.departamento?.tipo_departamento})
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>
                                  {scale._count?.participacoes || 0}{" "}
                                  participantes ativos
                                </span>
                              </div>
                              <p className="text-xs">
                                Criada em{" "}
                                {format(
                                  new Date(scale.created_at),
                                  "dd/MM/yyyy",
                                  { locale: ptBR }
                                )}
                              </p>
                            </div>
                            <div className="flex gap-1 mt-3">
                              <Link href={`/folgas/view?id=${scale.id}`}>
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Visualização em Tabela para desktop */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome da Escala</TableHead>
                        <TableHead>Organização</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Participantes</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedScales.map((scale) => (
                        <TableRow key={scale.id}>
                          <TableCell>
                            <div className="font-medium">{scale.nome}</div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {scale.departamento?.organizacao?.nome}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {scale.departamento?.organizacao?.tipo}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{scale.departamento?.nome}</div>
                              {scale.departamento?.nome.toLowerCase() !==
                                scale.departamento?.tipo_departamento.toLowerCase() && (
                                <div className="text-xs text-muted-foreground">
                                  {scale.departamento?.tipo_departamento}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{scale._count?.participacoes || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(scale.created_at), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Link href={`/folgas/view?id=${scale.id}`}>
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={deleteDialog.isOpen} onOpenChange={closeDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Escala Preta e Vermelha</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir a escala "
                {deleteDialog.scale?.nome}"? Esta ação não pode ser desfeita e
                todos os dados relacionados serão perdidos.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
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
                {deleteDialog.isDeleting ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
