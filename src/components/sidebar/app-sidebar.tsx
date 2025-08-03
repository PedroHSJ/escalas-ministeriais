"use client";

import * as React from "react";
import {
  Calendar,
  GalleryVerticalEnd,
  SquareTerminal,
  Settings,
} from "lucide-react";

import { NavMain } from "@/components/sidebar/nav-main";
import { TeamSwitcher } from "@/components/sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { NavUser } from "./nav-user";
import { useAuth } from "@/contexts/AuthContext";
// This is sample data.

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, userId, loading } = useAuth();
  const pathname = usePathname();

  // Criar dados do usuário para o NavUser
  const userData = {
    name:
      user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário",
    email: user?.email || "usuario@exemplo.com",
    avatar: user?.user_metadata?.avatar_url || "",
  };

  const data = {
    user: userData,
    navMain: [
      {
        title: "Início",
        url: "/dashboard",
        icon: GalleryVerticalEnd,
        isActive: pathname === "/dashboard",
      },
      {
        title: "Estrutura",
        url: "#",
        icon: SquareTerminal,
        isActive:
          pathname.startsWith("/members") ||
          pathname.startsWith("/organizations") ||
          pathname.startsWith("/departments") ||
          pathname.startsWith("/specializations"),
        items: [
          {
            title: "Organização",
            url: "/organizations/list",
            isActive: pathname.startsWith("/organizations"),
          },
          {
            title: "Departamentos",
            url: "/departments/list",
            isActive: pathname.startsWith("/departments"),
          },
          {
            title: "Especializações",
            url: "/specializations/list",
            isActive: pathname.startsWith("/specializations"),
          },
          {
            title: "Membros",
            url: "/members/list",
            isActive: pathname.startsWith("/members"),
          },
        ],
      },
      {
        title: "Escalas",
        url: "#",
        icon: Calendar,
        isActive:
          pathname.startsWith("/generate") ||
          pathname.startsWith("/scales") ||
          pathname.startsWith("/folgas") ||
          pathname.startsWith("/feriados"),
        items: [
          {
            title: "Preta e Vermelha",
            url: "#",
            isActive: pathname.startsWith("/folgas"),
            items: [
              {
                title: "Criar",
                url: "/folgas/create",
                isActive: pathname.startsWith("/folgas/create"),
              },
              {
                title: "Listar",
                url: "/folgas/list",
                isActive: pathname.startsWith("/folgas/list"),
              },
              {
                title: "Feriados",
                url: "/feriados",
                isActive: pathname.startsWith("/feriados"),
              },
            ],
          },
          {
            title: "Escalas de Plantões",
            url: "#",
            isActive: pathname.startsWith("/plantoes"),
            items: [
              {
                title: "Criar",
                url: "/plantoes/create",
                isActive: pathname.startsWith("/plantoes/create"),
              },
              {
                title: "Listar",
                url: "/plantoes/list",
                isActive: pathname.startsWith("/plantoes/list"),
              },
            ],
          },
          // {
          //   title: "Escala Manual",
          //   url: "#",
          //   isActive: pathname.startsWith("/scales"),
          //   items: [
          //     {
          //       title: "Criar",
          //       url: "/scales/create",
          //       isActive: pathname.startsWith("/scales/create"),
          //     },
          //     {
          //       title: "Listar",
          //       url: "/scales/list",
          //       isActive: pathname.startsWith("/scales/list"),
          //     },
          //   ],
          // },
        ],
      },
      {
        title: "Configurações",
        url: "#",
        icon: Settings,
        isActive: pathname.startsWith("/observacoes"),
        items: [
          {
            title: "Observações",
            url: "/observacoes/list",
            isActive: pathname.startsWith("/observacoes"),
          },
        ],
      },
      // {
      //   title: "Documentation",
      //   url: "#",
      //   icon: BookOpen,
      //   items: [
      //     {
      //       title: "Introduction",
      //       url: "#",
      //     },
      //     {
      //       title: "Get Started",
      //       url: "#",
      //     },
      //     {
      //       title: "Tutorials",
      //       url: "#",
      //     },
      //     {
      //       title: "Changelog",
      //       url: "#",
      //     },
      //   ],
      // },
      // {
      //   title: "Settings",
      //   url: "#",
      //   icon: Settings2,
      //   items: [
      //     {
      //       title: "General",
      //       url: "#",
      //     },
      //     {
      //       title: "Team",
      //       url: "#",
      //     },
      //     {
      //       title: "Billing",
      //       url: "#",
      //     },
      //     {
      //       title: "Limits",
      //       url: "#",
      //     },
      //   ],
      // },
    ],
  };
  return (
    <Sidebar {...props} variant="inset">
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <span>Loading...</span>
          </div>
        ) : (
          <NavUser user={data.user} />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
