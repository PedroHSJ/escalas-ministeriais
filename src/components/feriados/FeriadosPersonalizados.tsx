"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Plus,
  Download,
  Upload,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import FeriadoManager, { type Feriado } from "@/utils/feriados";

interface FeriadosPersonalizadosProps {
  feriadoManager: FeriadoManager;
  onFeriadoChange?: () => void;
}

export default function FeriadosPersonalizados({
  feriadoManager,
  onFeriadoChange,
}: FeriadosPersonalizadosProps) {
  const [anoSelecionado, setAnoSelecionado] = useState(
    new Date().getFullYear()
  );
  const [feriadosPersonalizados, setFeriadosPersonalizados] = useState<
    Feriado[]
  >([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [novoFeriado, setNovoFeriado] = useState<
    Partial<Feriado> & { folgasAdicionaisInput?: string }
  >({
    data: "",
    nome: "",
    tipo: "organizacional",
    // afetaEscala removido
    folgasAdicionaisInput: "",
  });

  // Carregar feriados personalizados do ano selecionado
  useEffect(() => {
    const carregarFeriados = async () => {
      try {
        const feriados = await feriadoManager.getFeriadosPersonalizados(
          anoSelecionado
        );
        setFeriadosPersonalizados(feriados);
      } catch (error) {
        console.error("Erro ao carregar feriados:", error);
        toast.error("Erro ao carregar feriados personalizados");
      }
    };
    carregarFeriados();
  }, [anoSelecionado, feriadoManager]);

  // Adicionar novo feriado
  const adicionarFeriado = async () => {
    const erros = FeriadoManager.validarFeriado(novoFeriado);

    if (erros.length > 0) {
      toast.error("Erro de validação", {
        description: erros.join(", "),
      });
      return;
    }

    try {
      // Converter folgasAdicionaisInput para número antes de salvar
      const feriadoParaSalvar: Feriado = {
        data: novoFeriado.data || "",
        nome: novoFeriado.nome || "",
        tipo: novoFeriado.tipo || "organizacional",
        // afetaEscala removido
        folgasAdicionais:
          !novoFeriado.folgasAdicionaisInput ||
          novoFeriado.folgasAdicionaisInput === ""
            ? undefined
            : Number(novoFeriado.folgasAdicionaisInput),
      };
      await feriadoManager.addFeriadoPersonalizado(feriadoParaSalvar);

      // Atualizar lista
      const feriadosAtualizados =
        await feriadoManager.getFeriadosPersonalizados(anoSelecionado);
      setFeriadosPersonalizados(feriadosAtualizados);

      // Resetar formulário
      setNovoFeriado({
        data: "",
        nome: "",
        tipo: "organizacional",
        folgasAdicionaisInput: "",
      });

      setDialogAberto(false);
      onFeriadoChange?.();

      toast.success("Feriado personalizado adicionado!");
    } catch (error) {
      toast.error("Erro ao adicionar feriado");
    }
  };

  // Remover feriado
  const removerFeriado = async (data: string) => {
    try {
      const sucesso = await feriadoManager.removeFeriadoPersonalizado(data);

      if (sucesso) {
        const feriadosAtualizados =
          await feriadoManager.getFeriadosPersonalizados(anoSelecionado);
        setFeriadosPersonalizados(feriadosAtualizados);
        onFeriadoChange?.();
        toast.success("Feriado removido!");
      } else {
        toast.error("Erro ao remover feriado");
      }
    } catch (error) {
      toast.error("Erro ao remover feriado");
    }
  };

  // Exportar feriados
  const exportarFeriados = () => {
    try {
      const json = feriadoManager.exportarFeriadosPersonalizados();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `feriados-personalizados-${new Date().getFullYear()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Feriados exportados!");
    } catch (error) {
      toast.error("Erro ao exportar feriados");
    }
  };

  // Importar feriados
  const importarFeriados = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string;
        feriadoManager.importarFeriadosPersonalizados(json);

        // Atualizar lista
        const feriadosAtualizados =
          await feriadoManager.getFeriadosPersonalizados(anoSelecionado);
        setFeriadosPersonalizados(feriadosAtualizados);

        onFeriadoChange?.();
        toast.success("Feriados importados com sucesso!");
      } catch (error) {
        toast.error("Erro ao importar arquivo. Verifique o formato JSON.");
      }
    };
    reader.readAsText(file);
  };

  // Gerar anos para seleção
  const anosDisponiveis = Array.from(
    { length: 10 },
    (_, i) => new Date().getFullYear() + i - 2
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Feriados Personalizados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controles superiores */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="ano-select">Ano:</Label>
            <Select
              value={anoSelecionado.toString()}
              onValueChange={(value) => setAnoSelecionado(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map((ano) => (
                  <SelectItem key={ano} value={ano.toString()}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportarFeriados}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importarFeriados}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Upload className="h-4 w-4" />
                Importar
              </Button>
            </div>

            <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Feriado Personalizado</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="data">Data</Label>
                    <Input
                      id="data"
                      type="date"
                      value={novoFeriado.data}
                      onChange={(e) =>
                        setNovoFeriado((prev) => ({
                          ...prev,
                          data: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="nome">Nome do Feriado</Label>
                    <Input
                      id="nome"
                      value={novoFeriado.nome}
                      onChange={(e) =>
                        setNovoFeriado((prev) => ({
                          ...prev,
                          nome: e.target.value,
                        }))
                      }
                      placeholder="Ex: Aniversário da Organização"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select
                      value={novoFeriado.tipo}
                      onValueChange={(
                        value: "nacional" | "regional" | "organizacional"
                      ) => setNovoFeriado((prev) => ({ ...prev, tipo: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="organizacional">
                          Organizacional
                        </SelectItem>
                        <SelectItem value="regional">Regional</SelectItem>
                        <SelectItem value="nacional">Nacional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="folgas">Folgas Adicionais</Label>
                    <Input
                      id="folgas"
                      type="number"
                      min="0"
                      max="5"
                      value={novoFeriado.folgasAdicionaisInput ?? ""}
                      onChange={(e) =>
                        setNovoFeriado((prev) => ({
                          ...prev,
                          folgasAdicionaisInput: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Campo afetaEscala removido */}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDialogAberto(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={adicionarFeriado}>Adicionar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Lista de feriados */}
        <div className="space-y-2">
          {feriadosPersonalizados.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum feriado personalizado para {anoSelecionado}</p>
            </div>
          ) : (
            feriadosPersonalizados.map((feriado, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{feriado.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(feriado.data + "T00:00:00").toLocaleDateString(
                        "pt-BR"
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Badge
                      variant={
                        feriado.tipo === "organizacional"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {feriado.tipo}
                    </Badge>
                    {typeof feriado.folgasAdicionais === "number" &&
                      feriado.folgasAdicionais > 0 && (
                        <Badge variant="outline">
                          +{feriado.folgasAdicionais} folga
                          {feriado.folgasAdicionais > 1 ? "s" : ""}
                        </Badge>
                      )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removerFeriado(feriado.data)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
