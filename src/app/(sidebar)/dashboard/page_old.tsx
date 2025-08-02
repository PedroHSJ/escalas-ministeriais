"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOutIcon,
  Building2,
  Users,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Target,
} from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Organization {
  id: string;
  nome: string;
  tipo: string;
  created_at: string;
  user_id: string;
}

interface DashboardStats {
  totalDepartments: number;
  totalMembers: number;
  totalScales: number;
  totalFolgasScales: number;
  recentScales: Array<{
    id: string;
    nome: string;
    created_at: string;
    tipo: "normal" | "folgas";
    departamento: {
      nome: string;
      organizacao: {
        nome: string;
      };
    };
  }>;
  membersByDepartment: Array<{
    departamento: string;
    count: number;
  }>;
  activeScalesThisMonth: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { selectedOrganization } = useOrganization();

  const router = useRouter();

  const fetchDashboardStats = async (userId: string) => {
    try {
      // Buscar total de departamentos
      const { data: departmentsData, error: deptError } = await supabase
        .from("departamentos")
        .select(
          `
          id,
          nome,
          organizacao_id,
          organizacoes!inner(user_id)
        `
        )
        .eq("organizacoes.user_id", userId);

      // Buscar total de integrantes
      const { data: membersData, error: membersError } = await supabase
        .from("integrantes")
        .select(
          `
          id,
          nome,
          departamento_id,
          departamentos!inner(
            nome,
            organizacao_id,
            organizacoes!inner(user_id)
          )
        `
        )
        .eq("departamentos.organizacoes.user_id", userId);

      // Buscar escalas normais
      const { data: scalesData, error: scalesError } = await supabase
        .from("escalas")
        .select(
          `
          id,
          nome,
          created_at,
          departamento_id,
          departamentos!inner(
            nome,
            organizacao_id,
            organizacoes!inner(nome, user_id)
          )
        `
        )
        .eq("departamentos.organizacoes.user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      // Buscar escalas de folgas
      const { data: folgasScalesData, error: folgasError } = await supabase
        .from("escalas_folgas")
        .select(
          `
          id,
          nome,
          created_at,
          departamento_id,
          departamentos!inner(
            nome,
            organizacao_id,
            organizacoes!inner(nome, user_id)
          )
        `
        )
        .eq("departamentos.organizacoes.user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      // Processar dados para estatísticas
      const totalDepartments = departmentsData?.length || 0;
      const totalMembers = membersData?.length || 0;
      const totalScales = scalesData?.length || 0;
      const totalFolgasScales = folgasScalesData?.length || 0;

      // Contar membros por departamento
      const membersByDepartment =
        membersData?.reduce((acc: any[], member: any) => {
          const deptName = member.departamentos?.nome || "Sem departamento";
          const existing = acc.find((item) => item.departamento === deptName);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ departamento: deptName, count: 1 });
          }
          return acc;
        }, []) || [];

      // Combinar escalas recentes
      const recentScales = [
        ...(scalesData?.map((scale) => ({
          ...scale,
          tipo: "normal" as const,
        })) || []),
        ...(folgasScalesData?.map((scale) => ({
          ...scale,
          tipo: "folgas" as const,
        })) || []),
      ]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5)
        .map((scale) => ({
          id: scale.id,
          nome: scale.nome,
          created_at: scale.created_at,
          tipo: scale.tipo,
          departamento: {
            nome: (scale as any).departamentos?.nome || "",
            organizacao: {
              nome: (scale as any).departamentos?.organizacoes?.nome || "",
            },
          },
        }));

      // Calcular escalas ativas deste mês
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const activeScalesThisMonth = [
        ...(scalesData || []),
        ...(folgasScalesData || []),
      ].filter((scale) => {
        const scaleDate = new Date(scale.created_at);
        return (
          scaleDate.getMonth() === currentMonth &&
          scaleDate.getFullYear() === currentYear
        );
      }).length;

      setStats({
        totalDepartments,
        totalMembers,
        totalScales,
        totalFolgasScales,
        recentScales,
        membersByDepartment,
        activeScalesThisMonth,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  const fetchOrganization = async (userId: string) => {
    setLoading(true);
    try {
      const { data: orgData, error: orgError } = await supabase
        .from("organizacoes")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!orgError && orgData) {
        console.log("Organização encontrada:", orgData);
        setOrganization(orgData);
        // Buscar estatísticas do dashboard
        await fetchDashboardStats(userId);
      } else {
        setOrganization(null);
        setRedirectToOnboarding(true);
      }
    } catch (error) {
      console.error("Erro ao buscar organização:", error);
      setOrganization(null);
      setRedirectToOnboarding(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionAndOrganization = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setUserId(data.session.user.id);
      await fetchOrganization(data.session.user.id);
    } else {
      // Para desenvolvimento - usar ID estático
      const devUserId = "d58c420f-7db1-42e9-b040-e1d038ef79af";
      setUserId(devUserId);
      await fetchOrganization(devUserId);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndOrganization();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Erro ao fazer logout:", error);
    } else {
      window.location.href = "/";
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-6 w-96 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  // if (redirectToOnboarding) {
  //   console.log("Redirecionando para o onboarding...");
  //   // return (
  //   //   <OrganizationWizard
  //   //     userId={userId}
  //   //     onComplete={handleWizardComplete}
  //   //   />
  //   // );
  //   // REDIRECIONAR PARA O ONBOARDING
  //   console.log(organization)
  // router.push('/onboarding');
  // return null; // Retorne null enquanto o redirecionamento ocorre
  // }

  return (
    <main className="px-6 py-2">
      <div className="flex items-center gap-2 flex-row justify-between mb-6">
        <div className="border-bottom border-gray-500 pb-2">
          <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Visão geral da {organization?.nome}
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalDepartments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de departamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total de integrantes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Escalas Normais
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalScales || 0}</div>
            <p className="text-xs text-muted-foreground">Escalas criadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Preta e Vermelha
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalFolgasScales || 0}
            </div>
            <p className="text-xs text-muted-foreground">Escalas de folgas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Escalas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Escalas Recentes
            </CardTitle>
            <CardDescription>Últimas escalas criadas</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentScales && stats.recentScales.length > 0 ? (
              <div className="space-y-3">
                {stats.recentScales.map((scale) => (
                  <div
                    key={scale.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{scale.nome}</h4>
                        <Badge
                          variant={
                            scale.tipo === "folgas"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {scale.tipo === "folgas"
                            ? "Preta e Vermelha"
                            : "Normal"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {scale.departamento.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(scale.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <Link
                      href={
                        scale.tipo === "folgas"
                          ? `/folgas/view?id=${scale.id}`
                          : `/scales/view?id=${scale.id}`
                      }
                    >
                      <Button variant="ghost" size="sm">
                        Ver
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma escala criada ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integrantes por Departamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Integrantes por Departamento
            </CardTitle>
            <CardDescription>Distribuição de integrantes</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.membersByDepartment &&
            stats.membersByDepartment.length > 0 ? (
              <div className="space-y-3">
                {stats.membersByDepartment.map((dept, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{dept.departamento}</span>
                        <span className="text-sm text-muted-foreground">
                          {dept.count} integrantes
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.max(
                              (dept.count / (stats?.totalMembers || 1)) * 100,
                              10
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum integrante cadastrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ações Rápidas
          </CardTitle>
          <CardDescription>
            Acesso rápido às principais funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <Link href="/organizations/create">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2"
              >
                <Building2 className="h-6 w-6" />
                <span className="text-sm">Nova Organização</span>
              </Button>
            </Link>

            <Link href="/members/create">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2"
              >
                <Users className="h-6 w-6" />
                <span className="text-sm">Novo Integrante</span>
              </Button>
            </Link>

            <Link href="/folgas/create">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2"
              >
                <Target className="h-6 w-6" />
                <span className="text-sm">Preta e Vermelha</span>
              </Button>
            </Link>

            <Link href="/scales/create">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2"
              >
                <Calendar className="h-6 w-6" />
                <span className="text-sm">Nova Escala</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
