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
  Building2,
  Users,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Target,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const { selectedOrganization, loading: orgLoading } = useOrganization();

  const router = useRouter();

  const fetchDashboardStats = async (organizationId: string) => {
    setLoading(true);
    try {
      // Buscar total de departamentos
      const { data: departmentsData, error: deptError } = await supabase
        .from("departamentos")
        .select("id, nome, organizacao_id")
        .eq("organizacao_id", organizationId);

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
            organizacao_id
          )
        `
        )
        .eq("departamentos.organizacao_id", organizationId);

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
            organizacao_id
          )
        `
        )
        .eq("departamentos.organizacao_id", organizationId)
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
            organizacao_id
          )
        `
        )
        .eq("departamentos.organizacao_id", organizationId)
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrganization && !orgLoading) {
      fetchDashboardStats(selectedOrganization.id);
    } else if (!orgLoading && !selectedOrganization) {
      router.push("/organizations/create");
    }
  }, [selectedOrganization, orgLoading, router]);

  if (orgLoading || loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <Skeleton className="aspect-video rounded-xl" />
          <Skeleton className="aspect-video rounded-xl" />
          <Skeleton className="aspect-video rounded-xl" />
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (!selectedOrganization) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Building2 className="h-16 w-16 text-muted-foreground" />
          <div className="text-center">
            <h1 className="text-2xl font-bold">
              Nenhuma Organização Encontrada
            </h1>
            <p className="text-muted-foreground mt-2">
              Crie sua primeira organização para começar a gerenciar escalas.
            </p>
          </div>
          <Button onClick={() => router.push("/organizations/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Organização
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral da {selectedOrganization.nome}
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Departamentos
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalDepartments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Departamentos ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Membros
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
            <p className="text-xs text-muted-foreground">Membros cadastrados</p>
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
              Escalas de Folgas
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalFolgasScales || 0}
            </div>
            <p className="text-xs text-muted-foreground">Escalas de folgas</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de informações detalhadas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Escalas ativas deste mês */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Atividade Mensal
            </CardTitle>
            <CardDescription>Escalas criadas neste mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {stats?.activeScalesThisMonth || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {format(new Date(), "MMMM yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        {/* Distribuição de membros */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Membros por Departamento
            </CardTitle>
            <CardDescription>
              Distribuição dos membros cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.membersByDepartment.map((dept, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {dept.departamento}
                  </span>
                  <Badge variant="secondary">{dept.count} membros</Badge>
                </div>
              ))}
              {!stats?.membersByDepartment.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum membro cadastrado ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Escalas recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Escalas Recentes
          </CardTitle>
          <CardDescription>
            Últimas escalas criadas na organização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.recentScales.map((scale) => (
              <div
                key={scale.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    {scale.tipo === "normal" ? (
                      <Calendar className="h-4 w-4 text-primary" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{scale.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {scale.departamento.nome}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={scale.tipo === "normal" ? "default" : "secondary"}
                  >
                    {scale.tipo === "normal" ? "Normal" : "Folgas"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(scale.created_at), "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
            ))}
            {!stats?.recentScales.length && (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma escala criada ainda
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button asChild size="sm">
                    <Link href="/scales/create">Criar Escala Normal</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/folgas/create">Criar Escala de Folgas</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ações Rápidas
          </CardTitle>
          <CardDescription>
            Acesso rápido às principais funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/members/create">
                <Users className="h-4 w-4 mr-2" />
                Adicionar Membro
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/scales/create">
                <Calendar className="h-4 w-4 mr-2" />
                Nova Escala
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/folgas/create">
                <Clock className="h-4 w-4 mr-2" />
                Escala de Folgas
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/members/list">
                <BarChart3 className="h-4 w-4 mr-2" />
                Ver Relatórios
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
