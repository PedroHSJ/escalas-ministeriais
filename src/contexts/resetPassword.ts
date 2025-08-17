import { supabase } from "@/lib/supabaseClient";

export async function resetPassword(
  email: string,
  token: string,
  newPassword: string
) {
  // O Supabase espera que o usuário esteja autenticado via o link do e-mail (token na URL)
  // Aqui, tentamos atualizar a senha usando o token
  // O fluxo correto é: usuário clica no link do e-mail, que autentica ele, e então ele pode trocar a senha
  // Se necessário, pode-se usar supabase.auth.updateUser({ password: newPassword })
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return true;
}
