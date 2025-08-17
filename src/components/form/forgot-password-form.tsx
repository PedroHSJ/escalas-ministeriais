"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { InputWithLabel } from "@/components/inputs/input-label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";
import { NavigationLink } from "../ui/navigation-link";
import { useNavigation } from "@/contexts/NavigationContext";

export function ForgotPasswordForm() {
  const { sendPasswordResetEmail, loading } = useAuth?.() || {};
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const { isNavigating } = useNavigation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email) {
      setError("Informe seu e-mail.");
      return;
    }
    try {
      await sendPasswordResetEmail(email);
      toast.success("Enviamos um link de redefinição para seu e-mail.", {
        description: "Se não encontrar, verifique a caixa de spam.",
      });
    } catch (err: any) {
      setError(err?.message || "Erro ao enviar e-mail de redefinição.");
      toast.error(err?.message || "Erro ao enviar e-mail de redefinição.");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>
          <h2 className="text-2xl font-bold mb-2">Recuperar Senha</h2>
        </CardTitle>
        <CardDescription>
          Informe seu e-mail para receber o link de redefinição de senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputWithLabel
            id="email"
            label="E-mail"
            placeholder="seu@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error || undefined}
            required
            disabled={loading || isNavigating}
          />
          <Button
            type="submit"
            disabled={loading || isNavigating}
            className="w-full"
          >
            {loading ? "Enviando..." : "Enviar link de redefinição"}
          </Button>
          {success && (
            <div className="text-green-600 mt-2 text-center">{success}</div>
          )}
        </form>

        <div className="mt-4 text-center">
          {/* <a
            href="/login"
            className="underline underline-offset-4 text-primary cursor-pointer text-xs"
          >
            Voltar para Login
          </a> */}
          <NavigationLink
            href="/login"
            className="underline underline-offset-4 text-primary cursor-pointer text-xs"
          >
            Voltar para Login
          </NavigationLink>
        </div>
      </CardContent>
    </Card>
  );
}
