import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export type TipoPermissao = "visualizacao" | "edicao" | "administrador";

export interface EscalaPermissao {
  id: string;
  escala_folga_id: string;
  usuario_id: string;
  tipo_permissao: TipoPermissao;
  created_at: string;
}

export function useEscalaPermissions(escalaId: string) {
  const { userId } = useAuth();
  const [permissao, setPermissao] = useState<TipoPermissao | null>(null);
  const [isProprietario, setIsProprietario] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (escalaId && userId) {
      verificarPermissoes();
    }
  }, [escalaId, userId]);

  const verificarPermissoes = async () => {
    if (!escalaId || !userId) return;

    setLoading(true);
    try {
      // Verificar se é proprietário
      const { data: escalaData, error: escalaError } = await supabase
        .from("escalas_folgas")
        .select("proprietario_id")
        .eq("id", escalaId)
        .single();

      if (escalaError) throw escalaError;

      if (escalaData?.proprietario_id === userId) {
        setIsProprietario(true);
        setPermissao("administrador");
        setLoading(false);
        return;
      }

      // Verificar permissões de compartilhamento
      // Primeiro, buscar o email do usuário atual
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      const userEmail = userData.user?.email;
      if (!userEmail) {
        setPermissao(null);
        setLoading(false);
        return;
      }

      const { data: permissaoData, error: permissaoError } = await supabase
        .from("escala_folgas_compartilhamento")
        .select("tipo_permissao")
        .eq("escala_folga_id", escalaId)
        .eq("email_usuario", userEmail);

      if (permissaoError) {
        throw permissaoError;
      }

      if (permissaoData && permissaoData.length > 0) {
        setPermissao(permissaoData[0].tipo_permissao);
      } else {
        setPermissao(null);
      }
    } catch (error) {
      console.error("Erro ao verificar permissões:", error);
      setPermissao(null);
    } finally {
      setLoading(false);
    }
  };

  const temPermissao = (tipoRequerido: TipoPermissao): boolean => {
    if (isProprietario) return true;
    if (!permissao) return false;

    const hierarquiaPermissoes: Record<TipoPermissao, number> = {
      visualizacao: 1,
      edicao: 2,
      administrador: 3,
    };

    return hierarquiaPermissoes[permissao] >= hierarquiaPermissoes[tipoRequerido];
  };

  const podeVisualizar = () => temPermissao("visualizacao");
  const podeEditar = () => temPermissao("edicao");
  const podeAdministrar = () => temPermissao("administrador");

  return {
    permissao,
    isProprietario,
    loading,
    temPermissao,
    podeVisualizar,
    podeEditar,
    podeAdministrar,
    verificarPermissoes,
  };
}
