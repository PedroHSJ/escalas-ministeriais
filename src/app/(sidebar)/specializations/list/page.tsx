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
import { Plus, Edit, Trash2, Star, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";

interface SpecializationType {
  id: string;
  nome: string;
  organizacao_id: string;
  created_at: string;
  organizacao?: {
    nome: string;
  };
  especializacoes?: Specialization[];
}

interface Specialization {
  id: string;
  nome: string;
  tipo_especializacao_id: string;
  icone?: string;
  cor?: string;
  created_at: string;
}

export default function SpecializationsListPage() {
  const { userId } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [specializationTypes, setSpecializationTypes] = useState<
    SpecializationType[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSpecialization, setDeletingSpecialization] = useState<{
    type: "type" | "specialization";
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (userId && selectedOrganization) {
      fetchSpecializationTypes();
    }
  }, [userId, selectedOrganization]);

  const fetchSpecializationTypes = async () => {
    if (!userId || !selectedOrganization) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("tipos_especializacao")
        .select(
          `
          *,
          organizacao:organizacoes(nome),
          especializacoes(*)
        `
        )
        .eq("organizacao_id", selectedOrganization.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar tipos de especialização:", error);
        toast.error("Erro ao carregar especializações");
        return;
      }

      setSpecializationTypes(data || []);
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao carregar especializações");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (
    type: "type" | "specialization",
    id: string,
    name: string
  ) => {
    setDeletingSpecialization({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSpecialization) return;

    setDeleting(true);
    try {
      const tableName =
        deletingSpecialization.type === "type"
          ? "tipos_especializacao"
          : "especializacoes";

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", deletingSpecialization.id);

      if (error) {
        console.error("Erro ao excluir:", error);
        toast.error("Erro ao excluir item");
        return;
      }

      toast.success("Item excluído com sucesso!");
      await fetchSpecializationTypes();
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao excluir item");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingSpecialization(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Especializações</h1>
            <p className="text-muted-foreground">
              Carregando especializações...
            </p>
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

  if (!selectedOrganization) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Especializações</h1>
            <p className="text-muted-foreground">
              Selecione uma organização para ver suas especializações
            </p>
          </div>
        </div>
        <Card className="p-12">
          <div className="text-center">
            <Star className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhuma organização selecionada
            </h3>
            <p className="text-muted-foreground mb-4">
              Selecione uma organização no menu superior para gerenciar suas
              especializações
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Especializações</h1>
          <p className="text-muted-foreground">
            Gerencie os tipos de especialização e especializações específicas
          </p>
        </div>
        <div className="flex gap-2">
          <NavigationButton
            href="/specializations/types/create"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo
          </NavigationButton>
          <NavigationButton href="/specializations/create">
            <Plus className="h-4 w-4 mr-2" />
            Nova Especialização
          </NavigationButton>
        </div>
      </div>

      {/* Lista de Tipos de Especialização */}
      {specializationTypes.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Star className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhuma especialização cadastrada
            </h3>
            <p className="text-muted-foreground mb-4">
              Comece criando seu primeiro tipo de especialização
            </p>
            <NavigationButton href="/specializations/types/create">
              <Plus className="h-4 w-4 mr-2" />
              Criar Tipo de Especialização
            </NavigationButton>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {specializationTypes.map((specType) => (
            <Card key={specType.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      {specType.nome}
                    </CardTitle>
                    <CardDescription>
                      {specType.organizacao?.nome} •{" "}
                      {specType.especializacoes?.length || 0} especializações
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <NavigationButton
                      href={`/specializations/types/edit/${specType.id}`}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                    </NavigationButton>
                    {/* <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDeleteClick("type", specType.id, specType.nome)
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button> */}
                  </div>
                </div>
              </CardHeader>

              {specType.especializacoes &&
                specType.especializacoes.length > 0 && (
                  <CardContent>
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Especializações:</h4>

                      {/* Visualização em Cards para mobile */}
                      <div className="block md:hidden space-y-2">
                        {specType.especializacoes.map((spec) => (
                          <div
                            key={spec.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              {spec.icone && (
                                <span className="text-lg">{spec.icone}</span>
                              )}
                              <span
                                className="font-medium"
                                style={{ color: spec.cor || "inherit" }}
                              >
                                {spec.nome}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <NavigationButton
                                href={`/specializations/edit/${spec.id}`}
                                variant="outline"
                                size="sm"
                              >
                                <Edit className="h-3 w-3" />
                              </NavigationButton>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDeleteClick(
                                    "specialization",
                                    spec.id,
                                    spec.nome
                                  )
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Visualização em Tabela para desktop */}
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Ícone</TableHead>
                              <TableHead>Cor</TableHead>
                              <TableHead>Data de Criação</TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {specType.especializacoes.map((spec) => (
                              <TableRow key={spec.id}>
                                <TableCell className="font-medium">
                                  {spec.nome}
                                </TableCell>
                                <TableCell>
                                  {spec.icone && (
                                    <span className="text-lg">
                                      {spec.icone}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {spec.cor && (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-4 h-4 rounded-full border"
                                        style={{ backgroundColor: spec.cor }}
                                      />
                                      {spec.cor}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {format(
                                    new Date(spec.created_at),
                                    "dd/MM/yyyy",
                                    { locale: ptBR }
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <NavigationButton
                                      href={`/specializations/edit/${spec.id}`}
                                      variant="outline"
                                      size="sm"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </NavigationButton>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleDeleteClick(
                                          "specialization",
                                          spec.id,
                                          spec.nome
                                        )
                                      }
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
                    </div>
                  </CardContent>
                )}
            </Card>
          ))}
        </div>
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
              Tem certeza que deseja excluir{" "}
              <strong>{deletingSpecialization?.name}</strong>?
              <br />
              <br />
              {deletingSpecialization?.type === "type"
                ? "Esta ação irá excluir também todas as especializações relacionadas a este tipo."
                : "Esta ação não pode ser desfeita."}
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
                  Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
