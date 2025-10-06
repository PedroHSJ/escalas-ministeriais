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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    options?: object
  ) => Promise<{
    user: User | null;
    session: Session | null;
  }>;
  linkWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
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
        id: "2e93247a-1867-4d1b-98b9-f566c2286880",
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

  // Login com e-mail e senha
  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      console.log(error);
      throw error;
    }
    await fetchSession();
  };

  // Cadastro com e-mail e senha
  const signUpWithEmail = async (
    email: string,
    password: string,
    options?: object
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });
    if (error) throw error;
    return data;
  };

  // Vincular e-mail/senha à conta autenticada (link provider)
  const linkWithEmail = async (email: string, password: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    setLoading(true);
    // O Supabase não tem um método direto, mas podemos usar updateUser para adicionar email/senha
    const { error } = await supabase.auth.updateUser({ email, password });
    setLoading(false);
    if (error) throw error;
    await fetchSession();
  };

  const value = {
    user,
    session,
    userId,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    linkWithEmail,
    signOut,
    sendPasswordResetEmail,
  };

  // Enviar e-mail de redefinição de senha
  async function sendPasswordResetEmail(email: string): Promise<void> {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) throw error;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
