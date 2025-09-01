"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Shield, Calendar, Building } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import Link from "next/link";

interface EscalaCompartilhada {
  id: string;
  nome: string;
  departamento_nome: string;
  organizacao_nome: string;
  tipo_permissao: string;
  compartilhada_em: string;
}

export default function EscalasCompartilhadas() {
  const [escalas, setEscalas] = useState<EscalaCompartilhada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEscalasCompartilhadas();
  }, []);

  const carregarEscalasCompartilhadas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('obter_escalas_compartilhadas');

      if (error) throw error;

      setEscalas(data || []);
    } catch (error) {
      console.error("Erro ao carregar escalas compartilhadas:", error);
      toast.error("Erro ao carregar escalas compartilhadas");
    } finally {
      setLoading(false);
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

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (escalas.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma escala compartilhada
          </h3>
          <p className="text-gray-500">
            Você ainda não tem acesso a escalas compartilhadas por outros usuários.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Escalas Compartilhadas</h2>
        <Button
          variant="outline"
          onClick={carregarEscalasCompartilhadas}
          disabled={loading}
        >
          {loading ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {escalas.map((escala) => (
          <Card key={escala.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg leading-tight">
                  {escala.nome}
                </CardTitle>
                <Badge className={getPermissaoColor(escala.tipo_permissao)}>
                  <div className="flex items-center gap-1">
                    {getPermissaoIcon(escala.tipo_permissao)}
                    {getPermissaoLabel(escala.tipo_permissao)}
                  </div>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building className="w-4 h-4" />
                <span>{escala.departamento_nome}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Compartilhada em {formatarData(escala.compartilhada_em)}</span>
              </div>

              <div className="pt-2">
                <Link href={`/escalas-folgas/${escala.id}`}>
                  <Button className="w-full" size="sm">
                    Acessar Escala
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
