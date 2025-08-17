import { ResetPasswordForm } from "@/components/form/reset-password-form";
import { KeyRoundIcon } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/login" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <KeyRoundIcon className="size-4" />
            </div>
            Redefinir Senha
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2070&q=80"
          alt="Ambiente corporativo moderno - Unsplash"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Redefinir sua senha</h2>
          <p className="text-sm opacity-90">
            Defina uma nova senha para sua conta.
          </p>
        </div>
      </div>
    </div>
  );
}
