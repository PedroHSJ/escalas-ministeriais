import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, organizacaoId } = req.body;
  if (!email || !organizacaoId) return res.status(400).json({ error: "Dados obrigatórios ausentes" });

  const { error } = await supabase.from("convites_organizacoes").insert({ email, organizacao_id: organizacaoId });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
