"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Share2, Users, Eye, Edit, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";


interface CompartilharEscalaDialogProps {
  escalaId: string;
  escalaNome: string;
  trigger?: React.ReactNode;
}

interface UsuarioCompartilhamento {
  id: string;
  email: string;
  nome: string;
  tipo_permissao: "visualizacao" | "edicao" | "administrador";
  created_at: string;
}

export default function CompartilharEscalaDialog({
  escalaId,
  escalaNome,
  trigger,
}: CompartilharEscalaDialogProps) {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [tipoPermissao, setTipoPermissao] = useState<"visualizacao" | "edicao" | "administrador">("visualizacao");
  const [loading, setLoading] = useState(false);
  const [usuariosCompartilhados, setUsuariosCompartilhados] = useState<UsuarioCompartilhamento[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  const carregarUsuariosCompartilhados = async () => {
    setLoadingUsuarios(true);
    try {
      const { data, error } = await supabase
        .from("escala_folgas_compartilhamento")
        .select(`
          id,
          email_usuario,
          tipo_permissao,
          created_at
        `)
        .eq("escala_folga_id", escalaId);

      if (error) throw error;

      const usuarios = data?.map((item: any) => ({
        id: item.id,
        email: item.email_usuario,
        nome: item.email_usuario, // Usar email como nome por enquanto
        tipo_permissao: item.tipo_permissao,
        created_at: item.created_at,
      })) || [];

      setUsuariosCompartilhados(usuarios);
    } catch (error) {
      console.error("Erro ao carregar usuários compartilhados:", error);
      toast.error("Erro ao carregar usuários compartilhados");
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const compartilharEscala = async () => {
    if (!email.trim()) {
      toast.error("Digite um email válido");
      return;
    }

    setLoading(true);
    try {
      // Verificar se já existe compartilhamento
      const { data: existingShares, error: checkError } = await supabase
        .from("escala_folgas_compartilhamento")
        .select("id")
        .eq("escala_folga_id", escalaId)
        .eq("email_usuario", email.trim());

      if (checkError) {
        console.error("Erro ao verificar compartilhamento existente:", checkError);
        toast.error("Erro ao verificar compartilhamento existente");
        return;
      }

      if (existingShares && existingShares.length > 0) {
        toast.error("Esta escala já está compartilhada com este usuário");
        return;
      }

      // Criar o compartilhamento
      const { error: shareError } = await supabase
        .from("escala_folgas_compartilhamento")
        .insert({
          escala_folga_id: escalaId,
          email_usuario: email.trim(),
          tipo_permissao: tipoPermissao,
          created_by: userId,
        });

      if (shareError) throw shareError;

      // Marcar a escala como compartilhada
      await supabase
        .from("escalas_folgas")
        .update({ compartilhada: true })
        .eq("id", escalaId);

      toast.success("Escala compartilhada com sucesso!");
      setEmail("");
      setTipoPermissao("visualizacao");
      carregarUsuariosCompartilhados();
    } catch (error) {
      console.error("Erro ao compartilhar escala:", error);
      toast.error("Erro ao compartilhar escala");
    } finally {
      setLoading(false);
    }
  };

  const removerCompartilhamento = async (compartilhamentoId: string) => {
    try {
      const { error } = await supabase
        .from("escala_folgas_compartilhamento")
        .delete()
        .eq("id", compartilhamentoId);

      if (error) throw error;

      toast.success("Usuário removido do compartilhamento");
      carregarUsuariosCompartilhados();

      // Se não há mais usuários compartilhados, marcar como não compartilhada
      if (usuariosCompartilhados.length <= 1) {
        await supabase
          .from("escalas_folgas")
          .update({ compartilhada: false })
          .eq("id", escalaId);
      }
    } catch (error) {
      console.error("Erro ao remover compartilhamento:", error);
      toast.error("Erro ao remover compartilhamento");
    }
  };

  const alterarPermissao = async (compartilhamentoId: string, novaPermissao: string) => {
    try {
      const { error } = await supabase
        .from("escala_folgas_compartilhamento")
        .update({ tipo_permissao: novaPermissao })
        .eq("id", compartilhamentoId);

      if (error) throw error;

      toast.success("Permissão alterada com sucesso");
      carregarUsuariosCompartilhados();
    } catch (error) {
      console.error("Erro ao alterar permissão:", error);
      toast.error("Erro ao alterar permissão");
    }
  };

  const getPermissaoIcon = (tipo: string) => {
    switch (tipo) {
      case "visualizacao":
        return <Eye className="w-4 h-4" />;
      case "edicao":
        return <Edit className="w-4 h-4" />;
      case "administrador":
        return <Shield className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getPermissaoLabel = (tipo: string) => {
    switch (tipo) {
      case "visualizacao":
        return "Visualização";
      case "edicao":
        return "Edição";
      case "administrador":
        return "Administrador";
      default:
        return "Visualização";
    }
  };

  const getPermissaoColor = (tipo: string) => {
    switch (tipo) {
      case "visualizacao":
        return "bg-blue-100 text-blue-800";
      case "edicao":
        return "bg-green-100 text-green-800";
      case "administrador":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Compartilhar Escala</DialogTitle>
          <DialogDescription>
            Compartilhe a escala "{escalaNome}" com outros usuários
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulário para adicionar usuário */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email do usuário</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && compartilharEscala()}
              />
            </div>
            <div>
              <Label htmlFor="permissao">Permissão</Label>
              <Select
                value={tipoPermissao}
                onValueChange={(value: "visualizacao" | "edicao" | "administrador") =>
                  setTipoPermissao(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visualizacao">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Visualização
                    </div>
                  </SelectItem>
                  <SelectItem value="edicao">
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Edição
                    </div>
                  </SelectItem>
                  <SelectItem value="administrador">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Administrador
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={compartilharEscala}
            disabled={loading || !email.trim()}
            className="w-full sm:w-auto"
          >
            {loading ? "Compartilhando..." : "Compartilhar"}
          </Button>

          {/* Lista de usuários compartilhados */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="font-medium">Usuários com acesso</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={carregarUsuariosCompartilhados}
                disabled={loadingUsuarios}
              >
                {loadingUsuarios ? "Carregando..." : "Atualizar"}
              </Button>
            </div>

            {usuariosCompartilhados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum usuário compartilhado ainda
              </p>
            ) : (
              <div className="space-y-2">
                {usuariosCompartilhados.map((usuario) => (
                  <div
                    key={usuario.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getPermissaoIcon(usuario.tipo_permissao)}
                        <Badge className={getPermissaoColor(usuario.tipo_permissao)}>
                          {getPermissaoLabel(usuario.tipo_permissao)}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium">{usuario.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {usuario.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={usuario.tipo_permissao}
                        onValueChange={(value: string) =>
                          alterarPermissao(usuario.id, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visualizacao">Visualização</SelectItem>
                          <SelectItem value="edicao">Edição</SelectItem>
                          <SelectItem value="administrador">Administrador</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removerCompartilhamento(usuario.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
