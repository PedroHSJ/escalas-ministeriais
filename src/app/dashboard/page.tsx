"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Form, useForm } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as yup from 'yup';

interface EscalaItem {
  data: string;
  integrante: string;
  instrumento?: string;
  observacao: string;
}

const instrumentos = [
  "Guitarra",
  "Baixo",
  "Bateria",
  "Teclado",
  "Voz",
  "Violão",
  "Outro",
];
const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function EscalaPreviewPage() {
  const [integrante, setIntegrante] = useState("");
  const [inputData, setInputData] = useState("");
  const [instrumento, setInstrumento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [escala, setEscala] = useState<EscalaItem[]>([]);
  const [mes, setMes] = useState("");
  const [ministerioNome, setMinisterioNome] = useState("");
  const [hasMinisterio, setHasMinisterio] = useState(false);
  const [ministerioId, setMinisterioId] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchMinisterio = async () => {
      setLoading(true); // Inicia o carregamento

      try {
        const { data, error } = await supabase
          .from("ministerios")
          .select("*")
          .single();

        if (error) {
          console.error("Erro ao buscar ministério:", error);
        } else {
          setHasMinisterio(!!data);
          setMinisterioId(data?.id || "");
          setMinisterioNome(data?.nome || "");
        }
      } catch (error) {
        console.error("Erro ao buscar ministério:", error);
      } finally {
        setLoading(false); // Finaliza o carregamento independente do resultado
      }
    };

    fetchMinisterio();
  }, []);

  const adicionarNaEscala = () => {
    if (integrante && inputData) {
      setEscala((prev) => [
        ...prev,
        {
          data: inputData,
          integrante,
          instrumento: instrumento || undefined,
          observacao,
        },
      ]);
      setIntegrante("");
      setInputData("");
      setInstrumento("");
      setObservacao("");
    }
  };

  const salvarEscala = async () => {
    console.log(escala);

    const { data: escalaSaved, error: errorEscala } = await supabase
      .from("escalas")
      .upsert({
        ministerio_id: ministerioId,
        nome: "Escala de " + mes,
      })
      .select(); // Adicione select para retornar os dados

    if (errorEscala) {
      console.error("Erro ao salvar escala:", errorEscala);
      return;
    }

    for (const itemEscala of escala) {
      const { data: integranteSaved, error: errorIntegrante } = await supabase
        .from("integrantes")
        .upsert(
          {
            nome: itemEscala.integrante,
            ministerio_id: ministerioId,
          },
          {
            // Configurar para retornar os dados após upsert
            onConflict: "nome, ministerio_id", // Define campos para verificar duplicidade
            ignoreDuplicates: false, // Faz update se existir
          }
        )
        .select(); // Adicione select para retornar os dados

      if (errorIntegrante) {
        console.error("Erro ao salvar integrante:", errorIntegrante);
        return;
      }

      const { data: escalaParticipacoes, error: errorEscalaParticipacoes } =
        await supabase
          .from("escala_participacoes")
          .upsert({
            escala_id: escalaSaved[0].id ?? "",
            integrante_id: integranteSaved[0].id ?? "",
            data: itemEscala.data,
            instrumento: itemEscala.instrumento,
            observacao: itemEscala.observacao,
          })
          .select(); // Adicione select para retornar os dados

      if (errorEscalaParticipacoes) {
        console.error(
          "Erro ao salvar participação na escala:",
          errorEscalaParticipacoes
        );
        return;
      }

      toast.success(`Escala salva com sucesso!`);
    }
  };

  const agruparPorDiaSemana = (itens: EscalaItem[]) => {
    return itens.reduce((acc: Record<string, EscalaItem[]>, item) => {
      const diaSemana = new Date(item.data).toLocaleDateString("pt-BR", {
        weekday: "long",
      });
      if (!acc[diaSemana]) {
        acc[diaSemana] = [];
      }
      acc[diaSemana].push(item);
      return acc;
    }, {});
  };

  const grupos = agruparPorDiaSemana(escala);

  const exportarPDF = () => {
    // Cria uma nova instância do PDF
    const doc = new jsPDF();

    // Adiciona um título
    doc.setFontSize(18);
    doc.text(`Escala do Ministério - ${mes}`, 14, 20);

    // Prepara os dados para a tabela
    const tableData = [] as any[];

    Object.entries(grupos).forEach(([diaSemana, itens]) => {
      // Adiciona cabeçalho do dia da semana
      tableData.push([
        {
          content: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
          colSpan: 3,
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
      ]);

      const agrupadosPorData = itens.reduce<Record<string, EscalaItem[]>>(
        (acc, item) => {
          if (!acc[item.data]) {
            acc[item.data] = [];
          }
          acc[item.data].push(item);
          return acc;
        },
        {}
      );

      // Adiciona linhas para cada data
      Object.entries(agrupadosPorData).forEach(([data, integrantes]) => {
        // Formata os integrantes em texto
        const integrantesText = integrantes
          .map(
            (item) =>
              `${item.integrante}${
                item.instrumento ? ` (${item.instrumento})` : ""
              }${item.observacao ? `\nObs: ${item.observacao}` : ""}`
          )
          .join("\n\n");

        tableData.push([
          "",
          new Date(data).toLocaleDateString("pt-BR"),
          integrantesText,
        ]);
      });
    });

    // Gera a tabela no PDF
    autoTable(doc, {
      head: [["Dia da Semana", "Data", "Integrantes"]],
      body: tableData,
      startY: 30,
      theme: "grid",
      headStyles: { fillColor: [100, 100, 100] },
    });

    // Salva o PDF
    doc.save(`Escala_${mes}.pdf`);
  };

  const formMinisterioSchema = yup.object({
  ministerioNome: yup.string().min(3, {
    message: "O nome deve ter pelo menos 3 caracteres."
    }),
  });

    // 1. Define your form.
  const formMinisterio = useForm<yup.InferType<typeof formMinisterioSchema>>({
    defaultValues: {
      ministerioNome: "",
    },
  })
 
  // 2. Define a submit handler.
  async function onSubmit(values: yup.InferType<typeof formMinisterioSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    setLoading(true);
    console.log(values)

    const { data, error } = await supabase
                .from("ministerios")
                .insert([{ nome: ministerioNome }])
                .select();

              if (error) {
                console.error("Erro ao criar ministério:", error);
              } else {
                setHasMinisterio(true);
              }

              setLoading(false);
  }

  const PageSkeleton = () => (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-64 mb-4" /> {/* Título */}
      <Skeleton className="h-6 w-96 mb-8" /> {/* Subtítulo */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-[180px]" /> {/* Select de mês */}
        <Skeleton className="h-10 w-full" /> {/* Input de integrante */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-full" /> {/* Input de data */}
          <Skeleton className="h-10 w-[180px]" /> {/* Select de instrumento */}
          <Skeleton className="h-10 w-32" /> {/* Botão */}
        </div>
        <Skeleton className="h-24 w-full" /> {/* Textarea */}
      </div>
    </div>
  );

  if (loading) {
    return <PageSkeleton />;
  }

  if (!hasMinisterio) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold">
          Voce nao possui um ministerio cadastrado
        </h1>
        <p className="text-lg">Vamos começar a trabalhar no seu ministerio?</p>
        <Card className="rounded-2xl shadow-md p-4">
          {/* <p className="text-lg">Digite o nome do seu ministerio</p>
          <Input
            placeholder="Nome do ministerio"
            value={ministerioNome}
            onChange={(e) => setMinisterioNome(e.target.value)}
          />
          <Button
            onClick={async () => {
              const { data, error } = await supabase
                .from("ministerios")
                .insert([{ nome: ministerioNome }])
                .select();

              if (error) {
                console.error("Erro ao criar ministério:", error);
              } else {
                setHasMinisterio(true);
              }
            }}
          >
            Cadastrar Ministério
          </Button> */}

        <Form {...formMinisterio}>
          <form onSubmit={formMinisterio.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={formMinisterio.control}
              name="ministerioNome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="shadcn" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is your public display name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        <Button type="submit" disabled={loading}>Cadastrar</Button>
      </form>
    </Form>


        </Card>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center gap-2 flex-row justify-between mb-4">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Escala do Ministério
          </h1>
          <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
            Você está criando uma escala para o {ministerioNome}
          </h4>
        </div>
        <div>
          <Button
            onClick={async () => {
              const { error } = await supabase.auth.signOut();
              if (error) {
                console.error("Erro ao fazer logout:", error);
              }
              console.log("Logout realizado com sucesso!");
              window.location.href = "/";
            }}
            className="mt-4"
          >
            <LogOutIcon />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o mês" />
          </SelectTrigger>
          <SelectContent>
            {meses.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Nome do Integrante"
          value={integrante}
          onChange={(e) => setIntegrante(e.target.value)}
        />

        <div className="flex gap-2">
          <Input
            type="date"
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
          />
          <Select value={instrumento} onValueChange={setInstrumento}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Instrumento (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {instrumentos.map((inst) => (
                <SelectItem key={inst} value={inst}>
                  {inst}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={adicionarNaEscala}>Adicionar na Escala</Button>
        </div>

        <Textarea
          placeholder="Observações"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold">Preview da Escala - {mes}</h2>
        <Card className="rounded-2xl shadow-md p-4">
          <table className="w-full border-collapse rounded-lg">
            <thead>
              <tr>
                <th className="border p-2">Dia da Semana</th>
                <th className="border p-2">Data</th>
                <th className="border p-2">Integrantes</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grupos).map(([diaSemana, itens]) => {
                const agrupadosPorData = itens.reduce<
                  Record<string, EscalaItem[]>
                >((acc, item) => {
                  if (!acc[item.data]) {
                    acc[item.data] = [];
                  }
                  acc[item.data].push(item);
                  return acc;
                }, {});

                return (
                  <>
                    <tr key={diaSemana} className="bg-gray-100">
                      <td
                        className="border p-2 capitalize font-semibold"
                        colSpan={3}
                      >
                        {diaSemana}
                      </td>
                    </tr>
                    {Object.entries(agrupadosPorData).map(
                      ([data, integrantes]) => (
                        <tr key={data}>
                          <td className="border p-2"></td>
                          <td className="border p-2">
                            {new Date(data).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="border p-2">
                            {integrantes.map((item) => (
                              <div
                                key={item.integrante + (item.instrumento || "")}
                                className="mb-2"
                              >
                                <div className="font-semibold">
                                  {item.integrante}
                                  {item.instrumento
                                    ? ` (${item.instrumento})`
                                    : ""}
                                </div>
                                {item.observacao && (
                                  <div className="text-sm text-gray-600">
                                    Obs: {item.observacao}
                                  </div>
                                )}
                              </div>
                            ))}
                          </td>
                        </tr>
                      )
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </Card>
        <div className="mt-4 flex gap-2">
          <Button onClick={salvarEscala}>Salvar Escala</Button>
          <Button
            onClick={exportarPDF}
            variant="outline"
            disabled={escala.length === 0 || !mes}
          >
            Exportar PDF
          </Button>
        </div>
      </div>
    </main>
  );
}
