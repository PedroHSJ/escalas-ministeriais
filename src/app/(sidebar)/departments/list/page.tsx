"use client";

import { useState, useEffect } from "react";
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
import { Plus, Edit, Trash2, Building2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  OrganizationContext,
  useOrganization,
} from "@/contexts/OrganizationContext";

interface Department {
  id: string;
  nome: string;
  organizacao_id: string;
  tipo_departamento: string;
  created_at: string;
  organizacao?: {
    nome: string;
  };
}

export default function DepartmentsListPage() {
  const { userId } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDepartment, setDeletingDepartment] =
    useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchDepartments();
    }
    if (selectedOrganization) {
      fetchDepartments();
    }
  }, [userId, selectedOrganization]);

  const fetchDepartments = async () => {
    if (!userId) return;
    if (!selectedOrganization) {
      setDepartments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("departamentos")
        .select(
          `
          *,
          organizacao:organizacoes(nome)
        `
        )
        .in(
          "organizacao_id",
          selectedOrganization ? [selectedOrganization.id] : []
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar departamentos:", error);
        toast.error("Erro ao carregar departamentos");
        return;
      }

      setDepartments(data || []);
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao carregar departamentos");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (department: Department) => {
    setDeletingDepartment(department);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDepartment) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("departamentos")
        .delete()
        .eq("id", deletingDepartment.id);

      if (error) {
        console.error("Erro ao excluir departamento:", error);
        toast.error("Erro ao excluir departamento");
        return;
      }

      toast.success("Departamento excluído com sucesso!");
      await fetchDepartments();
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao excluir departamento");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingDepartment(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Departamentos</h1>
            <p className="text-muted-foreground">Carregando departamentos...</p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departamentos</h1>
          <p className="text-muted-foreground">
            Gerencie os departamentos das suas organizações
          </p>
        </div>
        <NavigationButton href="/departments/create">
          <Plus className="h-4 w-4 mr-2" />
          Novo Departamento
        </NavigationButton>
      </div>

      {/* Lista de Departamentos */}
      {departments.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhum departamento cadastrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Comece criando seu primeiro departamento
            </p>
            <NavigationButton href="/departments/create">
              <Plus className="h-4 w-4 mr-2" />
              Criar Departamento
            </NavigationButton>
          </div>
        </Card>
      ) : (
        <>
          {/* Visualização em Cards para mobile */}
          <div className="block md:hidden space-y-4">
            {departments.map((dept) => (
              <Card key={dept.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{dept.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {dept.organizacao?.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criado em{" "}
                        {format(new Date(dept.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        {dept.tipo_departamento}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <NavigationButton
                        href={`/departments/edit/${dept.id}`}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </NavigationButton>
                      {/* <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(dept)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button> */}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Visualização em Tabela para desktop */}
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.nome}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {dept.tipo_departamento}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(dept.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <NavigationButton
                            href={`/departments/edit/${dept.id}`}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </NavigationButton>
                          {/* <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(dept)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button> */}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o departamento{" "}
              <strong>{deletingDepartment?.nome}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita e todos os integrantes e dados
              relacionados a este departamento serão afetados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Departamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
