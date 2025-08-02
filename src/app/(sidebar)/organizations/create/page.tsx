"use client";
import { OrganizationWizard } from "@/components/wizard/OrganizationWizard";
import { supabase } from "@/lib/supabaseClient";
import { redirect, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";

export default function Page() {
  const { userId } = useAuth();
  const { refetchOrganizations, onOrganizationCreated } = useOrganization();
  const router = useRouter();

  const handleWizardComplete = async () => {
    try {
      // Recarregar as organizações para atualizar o TeamSwitcher
      await refetchOrganizations();
      toast.success("Organização criada com sucesso!");

      // Usar router.push em vez de redirect para melhor UX
      router.push("/dashboard");
    } catch (error) {
      console.error("Erro ao recarregar organizações:", error);
      // Mesmo assim mostrar sucesso e redirecionar
      toast.success("Organização criada com sucesso!");
      router.push("/dashboard");
    }
  };

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div>
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
        </div>
      }
    >
      <OrganizationWizard userId={userId} onComplete={handleWizardComplete} />
    </Suspense>
  );
}
