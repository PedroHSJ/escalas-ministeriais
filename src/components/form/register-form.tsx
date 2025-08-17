"use client";

import { useState } from "react";
import { Formik, Form, Field, FieldProps, FormikHelpers } from "formik";
import * as yup from "yup";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InputWithLabel } from "@/components/inputs/input-label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface RegisterFormValues {
  fullName: string;
  phone?: string | null;
  email: string;
  password: string;
}

const schema = yup.object({
  fullName: yup.string().required("Nome obrigatório"),
  phone: yup.string().nullable().notRequired(),
  email: yup.string().email("E-mail inválido").required("E-mail obrigatório"),
  password: yup
    .string()
    .min(6, "A senha deve ter pelo menos 6 caracteres")
    .required("Senha obrigatória"),
});

export function RegisterForm({ onBack }: { onBack: () => void }) {
  const { signUpWithEmail, loading } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const initialValues: RegisterFormValues = {
    fullName: "",
    phone: null,
    email: "",
    password: "",
  };

  const handleSubmit = async (
    values: RegisterFormValues,
    { setSubmitting }: FormikHelpers<RegisterFormValues>
  ) => {
    setError("");
    setSuccess("");
    try {
      const result = await signUpWithEmail(values.email, values.password, {
        data: {
          full_name: values.fullName,
          phone: values.phone,
          custom_provider: "email",
        },
      });

      if (
        result?.user &&
        Array.isArray(result.user.identities) &&
        result.user.identities.length === 0
      ) {
        toast.error(
          "Não foi possível cadastrar. Este e-mail já está vinculado a outro método de login. Faça login com Google e adicione uma senha nas configurações."
        );
        return;
      }
      toast.success(
        "Cadastro realizado! Verifique seu e-mail para confirmar sua conta."
      );
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() || "";
      if (
        msg.includes("already") ||
        msg.includes("existe") ||
        msg.includes("exists")
      ) {
        setError(
          "E-mail já cadastrado. Faça login com Google, depois adicione uma senha em sua conta nas configurações."
        );
      } else {
        setError(err?.message || "Erro ao cadastrar.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Criar Conta</CardTitle>
        <CardDescription>Preencha os campos para se cadastrar</CardDescription>
      </CardHeader>
      <CardContent>
        <Formik
          initialValues={initialValues}
          validationSchema={schema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <Field name="fullName">
                {({ field, meta }: FieldProps) => (
                  <InputWithLabel
                    id="fullName"
                    label="Nome completo"
                    placeholder="Seu nome"
                    {...field}
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>

              <Field name="phone">
                {({ field, meta }: FieldProps) => (
                  <InputWithLabel
                    id="phone"
                    label="Telefone"
                    placeholder="(00) 00000-0000"
                    mask="(00) 00000-0000"
                    value={field.value || null}
                    onChange={field.onChange}
                    name={field.name}
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>

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
                  <InputWithLabel
                    id="password"
                    label="Senha"
                    placeholder="Senha"
                    type="password"
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
                {isSubmitting || loading ? "Carregando..." : "Cadastrar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={onBack}
              >
                Já tem conta? Entrar
              </Button>

              {error && (
                <div className="text-red-500 mt-2 text-center">{error}</div>
              )}
              {success && (
                <div className="text-green-600 mt-2 text-center">{success}</div>
              )}
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
}
