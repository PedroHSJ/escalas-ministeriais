"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, RotateCcw, Building2 } from "lucide-react";

interface Organization {
  id: string;
  nome: string;
  tipo: string;
}

interface Department {
  id: string;
  nome: string;
  organizacao_id: string;
  tipo_departamento: string;
}

interface FilterBarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedOrganization?: string;
  setSelectedOrganization?: (value?: string) => void;
  selectedDepartment?: string;
  setSelectedDepartment: (value?: string) => void;
  organizations: Organization[];
  departments: Department[];
  searchPlaceholder?: string;
  showDepartmentFilter?: boolean;
  onClearFilters: () => void;
  loading?: boolean;
}

export default function FilterBar({
  searchTerm,
  setSearchTerm,
  selectedOrganization,
  setSelectedOrganization,
  selectedDepartment,
  setSelectedDepartment,
  organizations,
  departments,
  searchPlaceholder = "Buscar...",
  showDepartmentFilter = true,
  onClearFilters,
  loading = false,
}: FilterBarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Campo de Busca */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={loading}
              />
            </div>
          </div>

          {/* Filtro por Organização */}
          {setSelectedOrganization && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Organização</label>
              <Select
                value={selectedOrganization || "all"}
                onValueChange={(value) =>
                  setSelectedOrganization(value === "all" ? undefined : value)
                }
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas as organizações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as organizações</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {org.nome} ({org.tipo})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtro por Departamento */}
          {showDepartmentFilter && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Departamento</label>
              <Select
                value={selectedDepartment || "all"}
                onValueChange={(value) =>
                  setSelectedDepartment(value === "all" ? undefined : value)
                }
                disabled={!selectedOrganization || loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos os departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os departamentos</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.nome} ({dept.tipo_departamento})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Botão Limpar Filtros */}
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={onClearFilters}
              disabled={loading}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
