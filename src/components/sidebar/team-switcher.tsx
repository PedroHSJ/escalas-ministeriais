"use client";

import * as React from "react";
import { ChevronsUpDown, Plus, Building2, Church, Users } from "lucide-react";
import { useNavigationWithLoading } from "@/hooks/useNavigationWithLoading";
import { useNavigation } from "@/contexts/NavigationContext";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useOrganization } from "@/contexts/OrganizationContext";

const getOrganizationIcon = (tipo: string) => {
  switch (tipo.toLowerCase()) {
    case "igreja":
      return Church;
    case "empresa":
      return Building2;
    default:
      return Users;
  }
};

export function TeamSwitcher() {
  const { isMobile } = useSidebar();
  const { navigateTo } = useNavigationWithLoading();
  const { isNavigating } = useNavigation();
  const {
    organizations,
    selectedOrganization,
    setSelectedOrganization,
    loading,
  } = useOrganization();

  if (loading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled={isNavigating}>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Users className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Carregando...</span>
              <span className="truncate text-xs">Organizações</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!selectedOrganization || organizations.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => navigateTo("/organizations/create")}
            disabled={isNavigating}
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Plus className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Criar Organização</span>
              <span className="truncate text-xs">Primeira organização</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const IconComponent = getOrganizationIcon(selectedOrganization.tipo);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              disabled={isNavigating}
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <IconComponent className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {selectedOrganization.nome}
                </span>
                <span className="truncate text-xs capitalize">
                  {selectedOrganization.tipo}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizações
            </DropdownMenuLabel>
            {organizations.map((org, index) => {
              const OrgIcon = getOrganizationIcon(org.tipo);
              return (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setSelectedOrganization(org)}
                  className="gap-2 p-2"
                  disabled={isNavigating}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <OrgIcon className="size-3.5 shrink-0" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{org.nome}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {org.tipo}
                    </span>
                  </div>
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={() => navigateTo("/organizations/create")}
              disabled={isNavigating}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">
                Adicionar Organização
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
