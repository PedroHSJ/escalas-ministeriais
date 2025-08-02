"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Info } from "lucide-react";
import FeriadoManager from "@/utils/feriados";
import FeriadosPersonalizados from "@/components/feriados/FeriadosPersonalizados";
import { NavigationButton } from "@/components/ui/navigation-button";

export default function FeriadosPage() {
  const [feriadoManager] = useState(() => new FeriadoManager());
  const [anoSelecionado, setAnoSelecionado] = useState(
    new Date().getFullYear()
  );

  // Obter feriados nacionais do ano selecionado
  const feriadosNacionais = feriadoManager
    .getFeriados(anoSelecionado)
    .filter((f) => f.tipo === "nacional")
    .sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <NavigationButton href="/folgas/list" variant="outline" size="sm">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Feriados Nacionais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Feriados Nacionais {anoSelecionado}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {feriadosNacionais.map((feriado, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
                >
                  <div>
                    <p className="font-medium">{feriado.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(feriado.data + "T00:00:00").toLocaleDateString(
                        "pt-BR",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
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
              ))}
            </div>

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
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controle de Ano */}
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
                    {feriadosNacionais.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Feriados Personalizados:</span>
                  <span className="font-medium">
                    {
                      feriadoManager.getFeriadosPersonalizados(anoSelecionado)
                        .length
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-medium">
                    {feriadoManager.getFeriados(anoSelecionado).length}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Impacto nas Escalas</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Feriados reduzem o número de pessoas trabalhando</p>
                <p>• Folgas em feriados valem 1.5x no contador</p>
                <p>• Períodos especiais (Natal/Ano Novo) têm regras próprias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Feriados Personalizados */}
      <FeriadosPersonalizados feriadoManager={feriadoManager} />
    </div>
  );
}
