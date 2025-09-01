"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Plus,
  Eye,
  Trash2,
  Building2,
  Calendar,
  Users,
  Edit,
  Undo2,
  Archive,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { EscalaFolgaType } from "@/types/escala-folgas";
import FilterBar from "@/components/filters/FilterBar";
import Pagination from "@/components/pagination/Pagination";
import { NavigationButton } from "@/components/ui/navigation-button";
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

interface DeleteDialog {
  isOpen: boolean;
  scale: EscalaFolgaType | null;
  isDeleting: boolean;
}

interface EditDialog {
  isOpen: boolean;
  scale: EscalaFolgaType | null;
  isEditing: boolean;
  newName: string;
}

export default function FolgasListPage() {
  const { userId, user } = useAuth();
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

  const [editDialog, setEditDialog] = useState<EditDialog>({
    isOpen: false,
    scale: null,
    isEditing: false,
    newName: "",
  });

  // Estados para gerenciar lixeira
  const [showTrash, setShowTrash] = useState(false);
  const [deletedScales, setDeletedScales] = useState<EscalaFolgaType[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);

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
    if (!userId) return;
    let query = supabase
      .from("departamentos")
      .select(
        `
        *,
        organizacoes!inner (
          user_id
        )
      `
      )
      .eq("organizacoes.user_id", userId)
      .order("nome");

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

    try {
      // Buscar escalas criadas pelo usuário
      const { data: ownedScales, error: ownedError } = await supabase
        .from("escalas_folgas")
        .select(
          `
          *,
          departamentos!inner (
            nome,
            tipo_departamento,
            organizacoes!inner (
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
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (ownedError) throw ownedError;

      // Buscar escalas compartilhadas com o usuário
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = user?.email;
      
      if (!userEmail) {
        console.error("Email do usuário não encontrado");
        return;
      }

      const { data: sharedScales, error: sharedError } = await supabase
        .from("escala_folgas_compartilhamento")
        .select(
          `
          tipo_permissao,
          escalas_folgas (
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
          )
        `
        )
        .eq("email_usuario", userEmail)
        .is("escalas_folgas.deleted_at", null);

      if (sharedError) throw sharedError;

      // Combinar e processar escalas próprias
      const ownedScalesWithDetails = (ownedScales || []).map((scale) => ({
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
        tipo_acesso: "proprietario" as const,
      }));

      // Processar escalas compartilhadas
      const sharedScalesWithDetails = (sharedScales || []).map((share) => {
        const escala = share.escalas_folgas as any;
        if (!escala) return null;
        
        return {
          ...escala,
          departamento: {
            nome: Array.isArray(escala.departamentos) ? escala.departamentos[0]?.nome : escala.departamentos?.nome,
            tipo_departamento: Array.isArray(escala.departamentos) ? escala.departamentos[0]?.tipo_departamento : escala.departamentos?.tipo_departamento,
            organizacao: {
              nome: Array.isArray(escala.departamentos) ? escala.departamentos[0]?.organizacoes?.nome : escala.departamentos?.organizacoes?.nome,
              tipo: Array.isArray(escala.departamentos) ? escala.departamentos[0]?.organizacoes?.tipo : escala.departamentos?.organizacoes?.tipo,
            },
          },
          _count: {
            participacoes:
              (Array.isArray(escala.escala_folgas_participacoes) ? escala.escala_folgas_participacoes : [escala.escala_folgas_participacoes])?.filter((p: any) => p?.ativo)
                .length || 0,
          },
          tipo_acesso: share.tipo_permissao as "visualizacao" | "edicao" | "administrador",
          compartilhada_por: escala.proprietario_id,
        };
      }).filter(Boolean);

      // Combinar todas as escalas e ordenar por data de criação
      const allScales = [...ownedScalesWithDetails, ...sharedScalesWithDetails]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setScales(allScales);
      setFilteredScales(allScales);
    } catch (error) {
      console.error("Erro ao carregar escalas:", error);
      toast.error("Erro ao carregar escalas");
    } finally {
      setLoading(false);
    }
  };

  const fetchScalesByOrganization = async (organizationId: string) => {
    setLoading(true);

    try {
      // Primeiro verificar se a organização pertence ao usuário
      const { data: orgData, error: orgError } = await supabase
        .from("organizacoes")
        .select("id")
        .eq("id", organizationId)
        .eq("user_id", userId)
        .single();

      if (orgError || !orgData) {
        console.error("Acesso negado: organização não pertence ao usuário");
        setLoading(false);
        return;
      }

      // Buscar escalas criadas pelo usuário na organização específica
      const { data: ownedScales, error: ownedError } = await supabase
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
        .eq("departamentos.organizacao_id", organizationId)
        .eq("departamentos.organizacoes.user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (ownedError) throw ownedError;

      // Buscar escalas compartilhadas com o usuário na organização específica
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email;
      
      if (!userEmail) {
        console.error("Email do usuário não encontrado");
        setLoading(false);
        return;
      }

      const { data: sharedScales, error: sharedError } = await supabase
        .from("escala_folgas_compartilhamento")
        .select(
          `
          tipo_permissao,
          escalas_folgas (
            *,
            departamentos (
              nome,
              tipo_departamento,
              organizacao_id,
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
          )
        `
        )
        .eq("email_usuario", userEmail)
        .is("escalas_folgas.deleted_at", null);

      if (sharedError) throw sharedError;

      // Filtrar escalas compartilhadas que pertencem à organização específica
      const sharedScalesInOrg = (sharedScales || []).filter((share) => {
        const escala = share.escalas_folgas as any;
        if (!escala) return false;
        
        // Verificar se a escala pertence à organização selecionada
        const departamento = Array.isArray(escala.departamentos) ? escala.departamentos[0] : escala.departamentos;
        return departamento?.organizacao_id === organizationId;
      });

      // Combinar e processar escalas próprias
      const ownedScalesWithDetails = (ownedScales || []).map((scale) => ({
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
        tipo_acesso: "proprietario" as const,
      }));

      // Processar escalas compartilhadas
      const sharedScalesWithDetails = sharedScalesInOrg.map((share) => {
        const escala = share.escalas_folgas as any;
        if (!escala) return null;
        
        return {
          ...escala,
          departamento: {
            nome: Array.isArray(escala.departamentos) ? escala.departamentos[0]?.nome : escala.departamentos?.nome,
            tipo_departamento: Array.isArray(escala.departamentos) ? escala.departamentos[0]?.tipo_departamento : escala.departamentos?.tipo_departamento,
            organizacao: {
              nome: Array.isArray(escala.departamentos) ? escala.departamentos[0]?.organizacoes?.nome : escala.departamentos?.organizacoes?.nome,
              tipo: Array.isArray(escala.departamentos) ? escala.departamentos[0]?.organizacoes?.tipo : escala.departamentos?.organizacoes?.tipo,
            },
          },
          _count: {
            participacoes:
              (Array.isArray(escala.escala_folgas_participacoes) ? escala.escala_folgas_participacoes : [escala.escala_folgas_participacoes])?.filter((p: any) => p?.ativo)
                .length || 0,
          },
          tipo_acesso: share.tipo_permissao as "visualizacao" | "edicao" | "administrador",
          compartilhada_por: escala.proprietario_id,
        };
      }).filter(Boolean);

      // Combinar todas as escalas e ordenar por data de criação
      const allScales = [...ownedScalesWithDetails, ...sharedScalesWithDetails]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setScales(allScales);
      setFilteredScales(allScales);
    } catch (error) {
      console.error("Erro ao carregar escalas da organização:", error);
      toast.error("Erro ao carregar escalas da organização");
    } finally {
      setLoading(false);
    }
  };

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

  const openEditDialog = (scale: EscalaFolgaType) => {
    setEditDialog({
      isOpen: true,
      scale,
      isEditing: false,
      newName: scale.nome,
    });
  };

  const closeEditDialog = () => {
    setEditDialog({
      isOpen: false,
      scale: null,
      isEditing: false,
      newName: "",
    });
  };

  const confirmEditScale = async () => {
    if (!editDialog.scale || !editDialog.newName.trim()) return;

    setEditDialog((prev) => ({ ...prev, isEditing: true }));

    try {
      // Verificar se a escala pertence ao usuário antes de editar
      const { data: scaleData, error: scaleError } = await supabase
        .from("escalas_folgas")
        .select(
          `
          id,
          departamentos!inner (
            organizacoes!inner (
              user_id
            )
          )
        `
        )
        .eq("id", editDialog.scale.id)
        .eq("departamentos.organizacoes.user_id", userId)
        .single();

      if (scaleError || !scaleData) {
        toast.error(
          "Acesso negado: você não tem permissão para editar esta escala"
        );
        setEditDialog((prev) => ({ ...prev, isEditing: false }));
        return;
      }

      const { error } = await supabase
        .from("escalas_folgas")
        .update({ nome: editDialog.newName.trim() })
        .eq("id", editDialog.scale.id);

      if (error) throw error;

      toast.success("Nome da escala atualizado com sucesso");

      // Atualizar lista
      if (selectedOrganization) {
        await fetchScalesByOrganization(selectedOrganization);
      } else {
        await fetchAllScales();
      }

      closeEditDialog();
    } catch (error) {
      console.error("Erro ao atualizar nome da escala:", error);
      toast.error("Erro ao atualizar nome da escala");
      setEditDialog((prev) => ({ ...prev, isEditing: false }));
    }
  };

  const fetchDeletedScales = async () => {
    setLoadingTrash(true);

    const { data, error } = await supabase
      .from("escalas_folgas")
      .select(
        `
        *,
        departamentos!inner (
          nome,
          tipo_departamento,
          organizacoes!inner (
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
      .not("deleted_at", "is", null) // Filtrar apenas escalas excluídas
      .order("deleted_at", { ascending: false });

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
      setDeletedScales(scalesWithDetails);
    }

    setLoadingTrash(false);
  };

  const restoreScale = async (scaleId: string, scaleName: string) => {
    try {
      // Verificar se a escala pertence ao usuário antes de restaurar
      const { data: scaleData, error: scaleError } = await supabase
        .from("escalas_folgas")
        .select(
          `
          id,
          departamentos!inner (
            organizacoes!inner (
              user_id
            )
          )
        `
        )
        .eq("id", scaleId)
        .eq("departamentos.organizacoes.user_id", userId)
        .single();

      if (scaleError || !scaleData) {
        toast.error(
          "Acesso negado: você não tem permissão para restaurar esta escala"
        );
        return;
      }

      const { error } = await supabase
        .from("escalas_folgas")
        .update({ deleted_at: null })
        .eq("id", scaleId);

      if (error) throw error;

      toast.success("Escala restaurada com sucesso", {
        description: `${scaleName} foi restaurada e já está disponível novamente.`,
      });

      // Atualizar ambas as listas
      await fetchDeletedScales();
      if (selectedOrganization) {
        await fetchScalesByOrganization(selectedOrganization);
      } else {
        await fetchAllScales();
      }
    } catch (error) {
      console.error("Erro ao restaurar escala:", error);
      toast.error("Erro ao restaurar escala");
    }
  };

  const permanentDeleteScale = async (scaleId: string, scaleName: string) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir PERMANENTEMENTE a escala "${scaleName}"? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      // Verificar se a escala pertence ao usuário antes de excluir permanentemente
      const { data: scaleData, error: scaleError } = await supabase
        .from("escalas_folgas")
        .select(
          `
          id,
          departamentos!inner (
            organizacoes!inner (
              user_id
            )
          )
        `
        )
        .eq("id", scaleId)
        .eq("departamentos.organizacoes.user_id", userId)
        .single();

      if (scaleError || !scaleData) {
        toast.error(
          "Acesso negado: você não tem permissão para excluir esta escala"
        );
        return;
      }

      // Primeiro deletar as atribuições
      await supabase
        .from("escala_folgas_atribuicoes")
        .delete()
        .eq("escala_folga_id", scaleId);

      // Depois deletar as participações
      await supabase
        .from("escala_folgas_participacoes")
        .delete()
        .eq("escala_folga_id", scaleId);

      // Por último deletar a escala permanentemente
      const { error } = await supabase
        .from("escalas_folgas")
        .delete()
        .eq("id", scaleId);

      if (error) throw error;

      toast.success("Escala excluída permanentemente", {
        description: `${scaleName} foi excluída permanentemente do sistema.`,
      });

      // Atualizar lista de excluídas
      await fetchDeletedScales();
    } catch (error) {
      console.error("Erro ao excluir permanentemente:", error);
      toast.error("Erro ao excluir permanentemente");
    }
  };

  const confirmDeleteScale = async () => {
    if (!deleteDialog.scale) return;

    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      // Verificar se a escala pertence ao usuário antes de excluir
      const { data: scaleData, error: scaleError } = await supabase
        .from("escalas_folgas")
        .select(
          `
          id,
          departamentos!inner (
            organizacoes!inner (
              user_id
            )
          )
        `
        )
        .eq("id", deleteDialog.scale.id)
        .eq("departamentos.organizacoes.user_id", userId)
        .single();

      if (scaleError || !scaleData) {
        toast.error(
          "Acesso negado: você não tem permissão para excluir esta escala"
        );
        setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
        return;
      }

      // Soft delete: apenas marcar como excluído
      const { error } = await supabase
        .from("escalas_folgas")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", deleteDialog.scale.id);

      if (error) throw error;

      toast.success("Escala preta e vermelha excluída com sucesso", {
        description:
          "A escala foi movida para a lixeira e pode ser recuperada se necessário.",
      });

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
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Escalas Preta e Vermelha</h1>
            <p className="text-muted-foreground">
              Gerencie suas escalas de folgas no sistema preta e vermelha
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowTrash(!showTrash);
                if (!showTrash) {
                  fetchDeletedScales();
                }
              }}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Archive className="mr-2 h-4 w-4" />
              {showTrash ? "Ver Ativas" : "Lixeira"}
            </Button>
            <NavigationButton href="/folgas/create" variant="default" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Criar
            </NavigationButton>
          </div>
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
              {showTrash ? (
                <>
                  <Archive className="h-5 w-5" />
                  Escalas Excluídas ({deletedScales.length})
                </>
              ) : (
                <>
                  <Calendar className="h-5 w-5" />
                  Escalas Preta e Vermelha ({totalItems})
                </>
              )}
            </CardTitle>
            <CardDescription>
              {showTrash
                ? "Escalas que foram excluídas e podem ser restauradas ou removidas permanentemente"
                : totalPages > 1
                ? `Mostrando ${startIndex + 1}-${Math.min(
                    endIndex,
                    totalItems
                  )} de ${totalItems} escalas`
                : "Lista de todas as escalas preta e vermelha criadas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showTrash ? (
              // Visualização da Lixeira
              loadingTrash ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin mx-auto h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                  <p>Carregando escalas excluídas...</p>
                </div>
              ) : deletedScales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Archive className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Lixeira vazia</p>
                  <p className="text-sm">Nenhuma escala foi excluída ainda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deletedScales.map((scale) => (
                    <Card key={scale.id} className="border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-red-900">
                              {scale.nome}
                            </h3>
                            <div className="space-y-1 text-sm text-red-700 mt-2">
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
                                Excluída em{" "}
                                {scale.deleted_at &&
                                  format(
                                    new Date(scale.deleted_at),
                                    "dd/MM/yyyy 'às' HH:mm",
                                    { locale: ptBR }
                                  )}
                              </p>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  restoreScale(scale.id, scale.nome)
                                }
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <Undo2 className="h-4 w-4 mr-2" />
                                Restaurar
                              </Button>
                              {/* <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  permanentDeleteScale(scale.id, scale.nome)
                                }
                                className="text-red-600 border-red-200 hover:bg-red-100"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir Permanentemente
                              </Button> */}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : // Visualização Normal (Escalas Ativas)
            totalItems === 0 ? (
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
                                onClick={() => openEditDialog(scale)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(scale)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
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
                              <NavigationButton
                                href={`/folgas/view?id=${scale.id}`}
                                variant="outline"
                                size="sm"
                              >
                                <Eye className="h-4 w-4" />
                              </NavigationButton>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(scale)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(scale)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
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

        {/* Dialog de Edição de Nome */}
        <Dialog open={editDialog.isOpen} onOpenChange={closeEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Nome da Escala</DialogTitle>
              <DialogDescription>
                Altere o nome da escala "{editDialog.scale?.nome}".
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Nome da escala"
                value={editDialog.newName}
                onChange={(e) =>
                  setEditDialog((prev) => ({
                    ...prev,
                    newName: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editDialog.newName.trim()) {
                    confirmEditScale();
                  }
                }}
                disabled={editDialog.isEditing}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeEditDialog}
                disabled={editDialog.isEditing}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmEditScale}
                disabled={editDialog.isEditing || !editDialog.newName.trim()}
              >
                {editDialog.isEditing ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
