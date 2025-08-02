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
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { ObservacaoTemplate } from "@/types/observacoes";

export default function ObservacoesListPage() {
  const { userId } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [templates, setTemplates] = useState<ObservacaoTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] =
    useState<ObservacaoTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (userId && selectedOrganization) {
      fetchTemplates();
    }
  }, [userId, selectedOrganization]);

  const fetchTemplates = async () => {
    if (!userId || !selectedOrganization) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("observacoes_templates")
        .select(
          `
          *,
          organizacao:organizacoes(nome)
        `
        )
        .eq("organizacao_id", selectedOrganization.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar templates:", error);
        toast.error("Erro ao carregar templates de observações");
        return;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao carregar templates");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (template: ObservacaoTemplate) => {
    setDeletingTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTemplate) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("observacoes_templates")
        .delete()
        .eq("id", deletingTemplate.id);

      if (error) {
        console.error("Erro ao excluir template:", error);
        toast.error("Erro ao excluir template");
        return;
      }

      toast.success("Template excluído com sucesso!");
      await fetchTemplates();
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao excluir template");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingTemplate(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Templates de Observações</h1>
            <p className="text-muted-foreground">Carregando templates...</p>
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
            <h1 className="text-3xl font-bold">Templates de Observações</h1>
            <p className="text-muted-foreground">
              Selecione uma organização para ver seus templates
            </p>
          </div>
        </div>
        <Card className="p-12">
          <div className="text-center">
            <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhuma organização selecionada
            </h3>
            <p className="text-muted-foreground mb-4">
              Selecione uma organização no menu superior para gerenciar
              templates de observações
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
          <h1 className="text-3xl font-bold">Templates de Observações</h1>
          <p className="text-muted-foreground">
            Gerencie templates reutilizáveis de observações para suas escalas
          </p>
        </div>
        <NavigationButton href="/observacoes/create">
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </NavigationButton>
      </div>

      {/* Lista de Templates */}
      {templates.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhum template cadastrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Comece criando seu primeiro template de observações
            </p>
            <NavigationButton href="/observacoes/create">
              <Plus className="h-4 w-4 mr-2" />
              Criar Template
            </NavigationButton>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Visualização em Cards para mobile */}
          <div className="block md:hidden space-y-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {template.nome}
                      </CardTitle>
                      <CardDescription>
                        {template.observacoes.length} observações
                        {template.ativo ? (
                          <Badge variant="default" className="ml-2">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="ml-2">
                            Inativo
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <NavigationButton
                        href={`/observacoes/edit/${template.id}`}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </NavigationButton>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(template)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.descricao && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.descricao}
                    </p>
                  )}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Observações:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {template.observacoes
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((obs, index) => (
                          <li key={index} className="text-muted-foreground">
                            {obs.texto}
                          </li>
                        ))}
                    </ol>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Criado em{" "}
                    {format(new Date(template.created_at), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
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
                    <TableHead>Descrição</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          {template.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {template.descricao || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <div className="text-sm text-muted-foreground mb-1">
                            {template.observacoes.length} observações
                          </div>
                          <details className="text-xs">
                            <summary className="cursor-pointer text-primary hover:underline">
                              Ver observações
                            </summary>
                            <ol className="list-decimal list-inside mt-2 space-y-1 max-h-32 overflow-y-auto">
                              {template.observacoes
                                .sort((a, b) => a.ordem - b.ordem)
                                .map((obs, index) => (
                                  <li key={index}>{obs.texto}</li>
                                ))}
                            </ol>
                          </details>
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.ativo ? (
                          <Badge variant="default">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(template.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <NavigationButton
                            href={`/observacoes/edit/${template.id}`}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </NavigationButton>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
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
              Tem certeza que deseja excluir o template{" "}
              <strong>{deletingTemplate?.nome}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita e pode afetar escalas que usam
              este template.
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
