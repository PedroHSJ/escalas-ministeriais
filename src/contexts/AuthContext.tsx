"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userId: string;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    setLoading(true);

    if (process.env.NODE_ENV === "development") {
      // No desenvolvimento, criar um usuário mock
      const mockUser = {
        id: "",
        email: "dev@example.com",
        user_metadata: {
          full_name: "Usuário Desenvolvimento",
          avatar_url: "",
        },
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: "authenticated",
        updated_at: new Date().toISOString(),
      } as User;

      const mockSession = {
        user: mockUser,
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        refresh_token: "mock-refresh",
      } as Session;

      setUser(mockUser);
      setSession(mockSession);
      setUserId(mockUser.id);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Erro ao buscar sessão:", error);
        setLoading(false);
        return;
      }

      if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
        setUserId(data.session.user.id);
      } else {
        setSession(null);
        setUser(null);
        setUserId("");
      }
    } catch (error) {
      console.error("Erro inesperado ao buscar sessão:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Chamar fetchSession inicialmente
    fetchSession();

    // No modo de desenvolvimento, não precisamos escutar mudanças de auth
    if (process.env.NODE_ENV === "development") {
      return;
    }

    // Escutar mudanças de autenticação apenas em produção
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      setUserId(session?.user?.id ?? "");
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`, // Redirecionar após login
          queryParams: {
            prompt: "select_account", // Força a mostrar o seletor de contas do Google
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Erro ao fazer login com Google:", error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const value = {
    user,
    session,
    userId,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
