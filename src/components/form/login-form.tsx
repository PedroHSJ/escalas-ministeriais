"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Formik, Form, Field, FieldProps } from "formik";
import * as yup from "yup";
import { RegisterForm } from "./register-form";
import { InputWithLabel } from "@/components/inputs/input-label";
import { PasswordInput } from "@/components/inputs/password-input";
import { toast } from "sonner";
import { AuthApiError } from "@supabase/supabase-js";

export function LoginForm() {
  const { signInWithGoogle, signInWithEmail, loading, user, linkWithEmail } =
    useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  if (showRegister) {
    return <RegisterForm onBack={() => setShowRegister(false)} />;
  }

  const schema = yup.object({
    email: yup.string().email("E-mail inválido").required("E-mail obrigatório"),
    password: yup.string().required("Senha obrigatória"),
  });

  const initialValues = { email: "", password: "" };

  const handleSubmit = async (
    values: typeof initialValues,
    { setSubmitting }: any
  ) => {
    setError("");
    setSuccess("");
    try {
      await signInWithEmail(values.email, values.password);
      router.push("/auth/callback");
    } catch (err: any) {
      console.log(err);
      if (err instanceof AuthApiError) {
        if (err.message?.toLowerCase().includes("email not confirmed")) {
          toast.error("Verifique seu e-mail para ativar a conta.");
          setSubmitting(false);
          return;
        }
        if (err.message?.toLowerCase().includes("invalid login credentials")) {
          toast.error("E-mail ou senha inválidos.");
          setSubmitting(false);
          return;
        }
      }
      toast.error(err?.message || "Erro ao autenticar.");
    }
    setSubmitting(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Fazer Login</CardTitle>
        <CardDescription>
          Entre com sua conta Google ou e-mail para continuar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Formik
          initialValues={initialValues}
          validationSchema={schema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <Field name="email">
                {({ field, meta }: FieldProps) => (
                  <InputWithLabel
                    id="email"
                    label="E-mail"
                    placeholder="seu@email.com"
                    type="email"
                    {...field}
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>
              <Field name="password">
                {({ field, meta }: FieldProps) => (
                  <PasswordInput
                    id="password"
                    label="Senha"
                    placeholder="Senha"
                    {...field}
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>
              <Button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full"
              >
                {isSubmitting || loading ? "Carregando..." : "Entrar"}
              </Button>
            </Form>
          )}
        </Formik>
        <div className="my-4 after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            Ou continue com
          </span>
        </div>
        <Button
          onClick={async () => {
            try {
              await signInWithGoogle();
            } catch (err) {
              toast.error("Erro ao autenticar com Google.");
            }
          }}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? "Carregando..." : "Continuar com Google"}
        </Button>
        <div className="text-center text-xs mt-2">
          Não tem uma conta?{" "}
          <span
            className="underline underline-offset-4 cursor-pointer"
            onClick={() => setShowRegister(true)}
          >
            Cadastre-se
          </span>
          <br />
          <a
            href="/forgot-password"
            className="underline underline-offset-4 text-primary cursor-pointer mt-2 inline-block"
          >
            Esqueceu a senha?
          </a>
        </div>
        {error && <div className="text-red-500 mt-2 text-center">{error}</div>}
        {success && (
          <div className="text-green-600 mt-2 text-center">{success}</div>
        )}
        {user && !user.email_confirmed_at && (
          <div className="text-yellow-600 mt-2 text-center">
            Verifique seu e-mail para ativar a conta.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
