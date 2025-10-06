"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { InputWithLabel } from "@/components/inputs/input-label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const ResetPasswordSchema = Yup.object().shape({
  password: Yup.string()
    .min(6, "A senha deve ter pelo menos 6 caracteres.")
    .required("Informe a nova senha."),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "As senhas não coincidem.")
    .required("Confirme a nova senha."),
});
import { resetPassword } from "@/contexts/resetPassword";
import { NavigationLink } from "../ui/navigation-link";
import { useNavigation } from "@/contexts/NavigationContext";

export function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md mx-auto text-center p-8">
          Carregando...
        </div>
      }
    >
      <ResetPasswordFormContent />
    </Suspense>
  );
}

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { isNavigating } = useNavigation();
  const token = searchParams?.get("token");
  const email = searchParams?.get("email");
  const dev = process.env.NODE_ENV === "development";

  if ((!token || !email) && !dev) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Link inválido</CardTitle>
          <CardDescription>
            O link de redefinição de senha é inválido ou expirou.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <a href="/forgot-password" className="underline text-primary">
            Solicitar novo link
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>
          <h2 className="text-2xl font-bold mb-2">Redefinir Senha</h2>
        </CardTitle>
        <CardDescription>Defina uma nova senha para sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <Formik
          initialValues={{ password: "", confirmPassword: "" }}
          validationSchema={ResetPasswordSchema}
          onSubmit={async (values, { setSubmitting }) => {
            setError("");
            setSuccess("");
            setLoading(true);
            try {
              await resetPassword(
                email ?? "dev@example.com",
                token ?? "dev-token",
                values.password
              );
              setSuccess("Senha redefinida com sucesso!");
              toast.success("Senha redefinida com sucesso!");
              setTimeout(() => router.push("/login"), 2000);
            } catch (err: any) {
              setError(err?.message || "Erro ao redefinir senha.");
              toast.error(err?.message || "Erro ao redefinir senha.");
            }
            setLoading(false);
            setSubmitting(false);
          }}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <Field name="password">
                {({ field, meta }) => (
                  <InputWithLabel
                    id="password"
                    label="Nova Senha"
                    type="password"
                    placeholder="Digite a nova senha"
                    {...field}
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>
              <Field name="confirmPassword">
                {({ field, meta }) => (
                  <InputWithLabel
                    id="confirmPassword"
                    label="Confirmar Senha"
                    type="password"
                    placeholder="Confirme a nova senha"
                    {...field}
                    error={meta.touched && meta.error ? meta.error : undefined}
                    disabled={loading || isNavigating}
                  />
                )}
              </Field>
              {error && (
                <div className="text-red-600 text-center text-sm">{error}</div>
              )}
              {success && (
                <div className="text-green-600 text-center text-sm">
                  {success}
                </div>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || loading || isNavigating}
                className="w-full"
              >
                {isSubmitting || loading ? "Redefinindo..." : "Redefinir Senha"}
              </Button>
            </Form>
          )}
        </Formik>
        <div className="mt-4 text-center">
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
