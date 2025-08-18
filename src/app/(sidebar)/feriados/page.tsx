"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Info } from "lucide-react";
import FeriadoManager, { Feriado } from "@/utils/feriados";
import FeriadosPersonalizados from "@/components/feriados/FeriadosPersonalizados";
import { NavigationButton } from "@/components/ui/navigation-button";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";

export default function FeriadosPage() {
  const { selectedOrganization } = useOrganization();
  const { userId } = useAuth();
  const [feriadoManager, setFeriadoManager] = useState<FeriadoManager | null>(
    null
  );
  const [anoSelecionado, setAnoSelecionado] = useState(
    new Date().getFullYear()
  );
  const [feriadosNacionais, setFeriadosNacionais] = useState<Feriado[]>([]);
  const [feriadosPersonalizados, setFeriadosPersonalizados] = useState<
    Feriado[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Criar FeriadoManager quando a organização e userId estiverem disponíveis
  useEffect(() => {
    if (selectedOrganization?.id && userId) {
      setFeriadoManager(new FeriadoManager(selectedOrganization.id, userId));
    }
  }, [selectedOrganization?.id, userId]);

  // Carregar feriados quando o ano ou organização mudarem
  useEffect(() => {
    const carregarFeriados = async () => {
      if (!feriadoManager) return;

      setLoading(true);
      try {
        const todosFeriados = await feriadoManager.getFeriados(anoSelecionado);
        const nacionais = todosFeriados
          .filter((f) => f.tipo === "nacional")
          .sort((a, b) => a.data.localeCompare(b.data));

        const personalizados = await feriadoManager.getFeriadosPersonalizados(
          anoSelecionado
        );

        setFeriadosNacionais(nacionais);
        setFeriadosPersonalizados(personalizados);
      } catch (error) {
        console.error("Erro ao carregar feriados:", error);
        setFeriadosNacionais([]);
        setFeriadosPersonalizados([]);
      } finally {
        setLoading(false);
      }
    };

    carregarFeriados();
  }, [anoSelecionado, feriadoManager]);

  if (!selectedOrganization) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-muted-foreground mb-2">
              Nenhuma organização selecionada
            </h2>
            <p className="text-muted-foreground">
              Selecione uma organização para gerenciar feriados
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <NavigationButton href="/dashboard" variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </NavigationButton>
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Feriados</h1>
            <p className="text-muted-foreground">
              Configure feriados personalizados e visualize o calendário
              nacional
            </p>
          </div>
        </div>
      </div>

      {/* <div className="grid gap-6 lg:grid-cols-2">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Feriados Nacionais {anoSelecionado}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">
                  Carregando feriados...
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {feriadosNacionais.length > 0 ? (
                  feriadosNacionais.map((feriado, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
                    >
                      <div>
                        <p className="font-medium">{feriado.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(
                            feriado.data + "T00:00:00"
                          ).toLocaleDateString("pt-BR", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="default" className="bg-green-600">
                          Nacional
                        </Badge>
                        {feriado.afetaEscala && (
                          <Badge variant="outline">
                            +{feriado.folgasAdicionais || 1} folga
                            {(feriado.folgasAdicionais || 1) > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum feriado nacional encontrado para {anoSelecionado}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
              <div className="flex items-start">
                <Info className="h-4 w-4 text-blue-400 mt-0.5" />
                <div className="ml-2">
                  <p className="text-sm text-blue-700">
                    <strong>Feriados Automáticos:</strong>
                  </p>
                  <ul className="text-xs text-blue-600 mt-1 space-y-1">
                    <li>• Feriados fixos são calculados automaticamente</li>
                    <li>
                      • Feriados móveis baseados na Páscoa (Carnaval,
                      Sexta-feira Santa, Corpus Christi)
                    </li>
                    <li>• Aplicam regras especiais na geração de escalas</li>
                    <li>• Dias considerados como "escala vermelha"</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle>Controles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Ano para Visualização
              </label>
              <div className="flex gap-2 mt-2">
                {Array.from(
                  { length: 5 },
                  (_, i) => new Date().getFullYear() + i - 2
                ).map((ano) => (
                  <Button
                    key={ano}
                    variant={ano === anoSelecionado ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAnoSelecionado(ano)}
                  >
                    {ano}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Estatísticas</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Feriados Nacionais:</span>
                  <span className="font-medium">
                    {loading ? "..." : feriadosNacionais.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Feriados Personalizados:</span>
                  <span className="font-medium">
                    {loading ? "..." : feriadosPersonalizados.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-medium">
                    {loading
                      ? "..."
                      : feriadosNacionais.length +
                        feriadosPersonalizados.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Impacto nas Escalas</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Feriados são considerados "escala vermelha"</p>
                <p>• Reduzem o número de pessoas trabalhando</p>
                <p>• Folgas em feriados valem pontos extras</p>
                <p>• Períodos especiais (Natal/Ano Novo) têm regras próprias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Seção de Feriados Personalizados */}
      {feriadoManager && (
        <FeriadosPersonalizados
          feriadoManager={feriadoManager}
          onFeriadoChange={async () => {
            // Recarregar feriados personalizados quando houver mudanças
            try {
              const personalizados =
                await feriadoManager.getFeriadosPersonalizados(anoSelecionado);
              setFeriadosPersonalizados(personalizados);
            } catch (error) {
              console.error(
                "Erro ao recarregar feriados personalizados:",
                error
              );
            }
          }}
        />
      )}
    </div>
  );
}
