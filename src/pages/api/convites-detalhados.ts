import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Use a Service Role Key para acessar auth.users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email obrigatório" });
  }

  // 1. Buscar convites recebidos
  const { data: convites, error } = await supabaseAdmin
    .from("convites_organizacoes")
    .select("*, organizacao:organizacao_id(*)")
    .eq("email", email);

  if (error) return res.status(500).json({ error: error.message });

  // 2. Buscar dados dos criadores via Admin API
  const criadoresIds = Array.from(new Set(convites.map((c: any) => c.criado_por).filter(Boolean)));
  let criadores: Record<string, any> = {};
  if (criadoresIds.length > 0) {
    // Buscar todos usuários (até 1000)
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) return res.status(500).json({ error: usersError.message });
    // Filtrar apenas os criadores
    usersData.users.forEach((u: any) => {
      if (criadoresIds.includes(u.id)) {
        criadores[u.id] = {
          email: u.email,
          nome: u.user_metadata?.name || u.email,
          foto_url: u.user_metadata?.avatar_url || null,
        };
      }
    });
  }

  // 3. Montar resposta
  const convitesDetalhados = convites.map((c: any) => ({
    ...c,
    criador_email: criadores[c.criado_por]?.email || null,
    criador_nome: criadores[c.criado_por]?.nome || null,
    criador_foto_url: criadores[c.criado_por]?.foto_url || null,
  }));

  return res.status(200).json({ convites: convitesDetalhados });
}
