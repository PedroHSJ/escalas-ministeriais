"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      console.log("Dados da sessão:", data);
      if (error) {
        console.error("Erro ao recuperar sessão:", error);
      }
      if (data?.session) {
        console.log("Usuário autenticado:", data.session.user);
        router.push("/dashboard");
      } else {
        console.log("Usuário não autenticado, redirecionando para login");
        router.push("/login");
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Carregando...</p>
    </div>
  );
}
