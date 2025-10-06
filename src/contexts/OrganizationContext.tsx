"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./AuthContext";

interface Organization {
  id: string;
  nome: string;
  tipo: string;
  created_at: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  selectedOrganization: Organization | null;
  setSelectedOrganization: (org: Organization) => void;
  loading: boolean;
  refetchOrganizations: () => Promise<void>;
  onOrganizationCreated: (newOrganization: Organization) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Buscar organizações que o usuário gerencia
      const { data: orgs1, error: error1 } = await supabase
        .from("usuario_organizacoes")
        .select("organizacoes(*)")
        .eq("usuario_id", userId);

      // Unir e filtrar duplicatas
      const allOrgs = [
        ...(orgs1?.map((o: any) => o.organizacoes) || []),
      ];
      const uniqueOrgs = allOrgs.filter(
        (org, idx, arr) => org && arr.findIndex((o) => o.id === org.id) === idx
      );
      setOrganizations(uniqueOrgs);

      // Se não há organização selecionada, selecionar a primeira
      if (!selectedOrganization && uniqueOrgs.length > 0) {
        setSelectedOrganization(uniqueOrgs[0]);
      }

      // Se a organização selecionada não existe mais na lista, selecionar a primeira
      if (
        selectedOrganization &&
        !uniqueOrgs.find((org) => org.id === selectedOrganization.id)
      ) {
        setSelectedOrganization(uniqueOrgs[0] || null);
      }
    } catch (error) {
      console.error("Erro ao buscar organizações:", error);
    } finally {
      setLoading(false);
    }
  };

  const refetchOrganizations = async () => {
    await fetchOrganizations();
  };

  const onOrganizationCreated = (newOrganization: Organization) => {
    // Adicionar a nova organização à lista
    setOrganizations((prev) => [newOrganization, ...prev]);
    // Selecionar automaticamente a nova organização
    setSelectedOrganization(newOrganization);
    // Salvar no localStorage
    localStorage.setItem("selectedOrganizationId", newOrganization.id);
  };

  useEffect(() => {
    if (userId) {
      fetchOrganizations();

      // Listener em tempo real para mudanças na tabela organizacoes
      const channel = supabase
        .channel("organizacoes-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "usuario_organizacoes",
            filter: `usuario_id=eq.${userId}`,
          },
          (payload) => {
            console.log("Mudança detectada na tabela usuario_organizacoes:", payload);
            // Recarregar organizações quando houver mudanças
            fetchOrganizations();
          }
        )
        .subscribe();

      // Cleanup do listener
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  // Salvar organização selecionada no localStorage
  useEffect(() => {
    if (selectedOrganization) {
      localStorage.setItem("selectedOrganizationId", selectedOrganization.id);
    }
  }, [selectedOrganization]);

  // Recuperar organização selecionada do localStorage na inicialização
  useEffect(() => {
    if (organizations.length > 0 && !selectedOrganization) {
      const savedOrgId = localStorage.getItem("selectedOrganizationId");
      if (savedOrgId) {
        const savedOrg = organizations.find((org) => org.id === savedOrgId);
        if (savedOrg) {
          setSelectedOrganization(savedOrg);
        } else {
          setSelectedOrganization(organizations[0]);
        }
      } else {
        setSelectedOrganization(organizations[0]);
      }
    }
  }, [organizations]);

  const value = {
    organizations,
    selectedOrganization,
    setSelectedOrganization,
    loading,
    refetchOrganizations,
    onOrganizationCreated,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization deve ser usado dentro de um OrganizationProvider"
    );
  }
  return context;
}

export { OrganizationContext };
