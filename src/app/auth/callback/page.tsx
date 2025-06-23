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
        router.push("/login");
        return;
      }
      
      if (data?.session?.user) {
        console.log("Usuário autenticado:", data.session.user);
        
        // Verificar se o usuário já tem uma organização
        const { data: organizations, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('user_id', data.session.user.id)
          .limit(1);
        
        if (orgError) {
          console.error("Erro ao verificar organização:", orgError);
          router.push("/onboarding");
          return;
        }
        
        // Se não tem organização, é primeiro login
        if (!organizations || organizations.length === 0) {
          console.log("Primeiro login - redirecionando para onboarding");
          router.push("/onboarding");
        } else {
          console.log("Usuário já tem organização - redirecionando para dashboard");
          router.push("/dashboard");
        }
      } else {
        console.log("Usuário não autenticado, redirecionando para login");
        router.push("/login");
      }
    };
    
    console.log("Iniciando processo de autenticação...");
    handleAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2">Carregando...</p>
      </div>
    </div>
  );
}