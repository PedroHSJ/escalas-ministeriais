"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

interface Convite {
  id: string;
  email: string;
  organizacao_id: string;
  status: string;
  created_at: string;
}

export default function ConvitesListPage() {
  const { userId, user } = useAuth();
  const [convites, setConvites] = useState<Convite[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConvites = async () => {
    setLoading(true);
    // Buscar convites onde o email é igual ao do usuário logado
    const { data, error } = await supabase
      .from("convites_organizacoes")
      .select("*")
      .eq("email", user?.email || "");
    if (!error && data) setConvites(data);
    setLoading(false);
  };

  const aceitarConvite = async (convite: Convite) => {
    setLoading(true);
    // 1. Atualizar status do convite para "aceito"
    await supabase
      .from("convites_organizacoes")
      .update({ status: "aceito" })
      .eq("id", convite.id);
    // 2. Inserir na tabela usuario_organizacoes
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

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Convites recebidos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Carregando...</div>
          ) : convites.length === 0 ? (
            <div>Nenhum convite encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {convites.map((convite) => (
                  <TableRow key={convite.id}>
                    <TableCell>{convite.email}</TableCell>
                    <TableCell>{convite.status}</TableCell>
                    <TableCell>
                      {convite.status === "pendente" && (
                        <>
                          <Button onClick={() => aceitarConvite(convite)} disabled={loading}>
                            Aceitar
                          </Button>
                          <Button onClick={() => rejeitarConvite(convite)} variant="outline" disabled={loading}>
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
