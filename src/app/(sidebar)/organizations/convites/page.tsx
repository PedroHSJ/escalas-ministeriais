"use client";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { TitleH1 } from "@/components/typography/title-h1";
import { Paragraph } from "@/components/typography/paragraph";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { TitleH4 } from "@/components/typography/title-h4";
import { Organization } from "../list/page";

interface Convite {
  id: string;
  email: string;
  organizacao_id: string;
  organizacao: Organization;
  status: string;
  created_at: string;
  criado_por?: string;
  criador_nome?: string;
  criador_foto_url?: string;
}

export default function ConvitesListPage() {
  const { userId, user } = useAuth();
  const [convites, setConvites] = useState<Convite[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("pendentes");
  const isMobile = useIsMobile();

  const fetchConvites = async () => {
    setLoading(true);
    if (!user?.email) return;
    try {
      const res = await fetch(`/api/convites-detalhados?email=${encodeURIComponent(user.email)}`);
      const json = await res.json();
      if (json.convites) setConvites(json.convites);
    } catch (e) {
      // erro ao buscar convites
    }
    setLoading(false);
  };

  // Corrigido: funções para aceitar/rejeitar convite
  const aceitarConvite = async (convite: Convite) => {
    setLoading(true);
    // Atualizar status do convite para "aceito"
    await supabase
      .from("convites_organizacoes")
      .update({ status: "aceito" })
      .eq("id", convite.id);
    // Inserir na tabela usuario_organizacoes
    await supabase
      .from("usuario_organizacoes")
      .insert({ usuario_id: userId, organizacao_id: convite.organizacao_id });
    await fetchConvites();
    setLoading(false);
  };

  const rejeitarConvite = async (convite: Convite) => {
    setLoading(true);
    await supabase
      .from("convites_organizacoes")
      .update({ status: "rejeitado" })
      .eq("id", convite.id);
    await fetchConvites();
    setLoading(false);
  };

  useEffect(() => {
    if (user?.email) fetchConvites();
  }, [user?.email]);

  // Filtros de convites
  const convitesPendentes = convites.filter(c => c.status === "pendente");
  const convitesAceitos = convites.filter(c => c.status === "aceito");
  const convitesRejeitados = convites.filter(c => c.status === "rejeitado");

  const renderTable = (lista: Convite[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Organização</TableHead>
          <TableHead>Convidado por</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lista.map((convite) => (
          <TableRow key={convite.id}>
            <TableCell>{convite.organizacao?.nome}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {convite.criador_foto_url && (
                  <img
                    src={convite.criador_foto_url}
                    alt={convite.criador_nome || "Usuário"}
                    className="w-8 h-8 rounded-full object-cover border"
                  />
                )}
                <span>{convite.criador_nome || "-"}</span>
              </div>
            </TableCell>
            <TableCell>{convite.status.charAt(0).toUpperCase() + convite.status.slice(1)}</TableCell>
            <TableCell>
              {convite.status === "pendente" && (
                <div className="flex gap-2">
                  <Button size={"sm"} onClick={() => aceitarConvite(convite)} disabled={loading}>
                    Aceitar
                  </Button>
                  <Button size={"sm"} onClick={() => rejeitarConvite(convite)} variant="outline" disabled={loading}>
                    Rejeitar
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <TitleH1 text="Convites recebidos" />
          <Paragraph text="Veja e gerencie os convites para organizações que você recebeu." />
        </div>
      </div>

      {/* Tabs ou Cards de seleção */}
      {isMobile ? (
        <div className="grid grid-cols-2 gap-3 mb-2">
          <button
            className={`rounded-lg p-4 flex flex-col items-center justify-center border transition-all ${tab === "pendentes" ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground"}`}
            onClick={() => setTab("pendentes")}
          >
            <span className="font-bold text-lg">{convitesPendentes.length}</span>
            <span>Pendentes</span>
          </button>
          <button
            className={`rounded-lg p-4 flex flex-col items-center justify-center border transition-all ${tab === "aceitos" ? "bg-green-600 text-white border-green-600" : "bg-muted text-muted-foreground"}`}
            onClick={() => setTab("aceitos")}
          >
            <span className="font-bold text-lg">{convitesAceitos.length}</span>
            <span>Aceitos</span>
          </button>
          <button
            className={`rounded-lg p-4 flex flex-col items-center justify-center border transition-all ${tab === "rejeitados" ? "bg-red-600 text-white border-red-600" : "bg-muted text-muted-foreground"}`}
            onClick={() => setTab("rejeitados")}
          >
            <span className="font-bold text-lg">{convitesRejeitados.length}</span>
            <span>Rejeitados</span>
          </button>
          <button
            className={`rounded-lg p-4 flex flex-col items-center justify-center border transition-all ${tab === "todos" ? "bg-blue-600 text-white border-blue-600" : "bg-muted text-muted-foreground"}`}
            onClick={() => setTab("todos")}
          >
            <span className="font-bold text-lg">{convites.length}</span>
            <span>Todos</span>
          </button>
        </div>
      ) : (
        <Tabs defaultValue="pendentes" onValueChange={setTab} className="mb-2">
            <TabsList>
                <TabsTrigger value="pendentes">Pendentes ({convitesPendentes.length})</TabsTrigger>
                <TabsTrigger value="aceitos">Aceitos ({convitesAceitos.length})</TabsTrigger>
                <TabsTrigger value="rejeitados">Rejeitados ({convitesRejeitados.length})</TabsTrigger>
                <TabsTrigger value="todos">Todos ({convites.length})</TabsTrigger>
            </TabsList>
        </Tabs>
      )}

      <Card>
        <CardContent>
          {loading ? (
            <div>Carregando...</div>
          ) : (
            <>
              {tab === "pendentes" && (
                <>
                  <TitleH4 text="Convites pendentes" />
                  {convitesPendentes.length === 0 ? (
                    <div>Nenhum convite pendente.</div>
                  ) : renderTable(convitesPendentes)}
                </>
              )}
              {tab === "aceitos" && (
                <>
                  <TitleH4 text="Convites aceitos" />
                  {convitesAceitos.length === 0 ? (
                    <div>Nenhum convite aceito.</div>
                  ) : renderTable(convitesAceitos)}
                </>
              )}
              {tab === "rejeitados" && (
                <>
                  <TitleH4 text="Convites rejeitados" />
                  {convitesRejeitados.length === 0 ? (
                    <div>Nenhum convite rejeitado.</div>
                  ) : renderTable(convitesRejeitados)}
                </>
              )}
              {tab === "todos" && (
                <>
                  <TitleH4 text="Todos os convites" />
                  {convites.length === 0 ? (
                    <div>Nenhum convite encontrado.</div>
                  ) : renderTable(convites)}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
