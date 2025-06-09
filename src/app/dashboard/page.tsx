// "use client";

// import { useEffect, useState } from "react";
// import { Card } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Textarea } from "@/components/ui/textarea";
// import { supabase } from "@/lib/supabaseClient";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
// import { Skeleton } from "@/components/ui/skeleton";
// import { LogOutIcon } from "lucide-react";
// import { toast } from "sonner";
// import { Form, FormProvider, useForm } from "react-hook-form";
// import {
//   FormControl,
//   FormDescription,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import * as yup from "yup";
// import { Label } from "@/components/ui/label";

// interface EscalaItem {
//   data: string;
//   integrante: string;
//   instrumento?: string;
//   observacao: string;
// }

// const instrumentos = [
//   "Guitarra",
//   "Baixo",
//   "Bateria",
//   "Teclado",
//   "Voz",
//   "Violão",
//   "Outro",
// ];
// const meses = [
//   "Janeiro",
//   "Fevereiro",
//   "Março",
//   "Abril",
//   "Maio",
//   "Junho",
//   "Julho",
//   "Agosto",
//   "Setembro",
//   "Outubro",
//   "Novembro",
//   "Dezembro",
// ];

// export default function EscalaPreviewPage() {
//   const [integrante, setIntegrante] = useState("");
//   const [inputData, setInputData] = useState("");
//   const [instrumento, setInstrumento] = useState("");
//   const [observacao, setObservacao] = useState("");
//   const [escala, setEscala] = useState<EscalaItem[]>([]);
//   const [mes, setMes] = useState("");
//   const [ministerioNome, setMinisterioNome] = useState("");
//   const [hasMinisterio, setHasMinisterio] = useState(false);
//   const [ministerioId, setMinisterioId] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [userId, setUserId] = useState("");
//   const fetchMinisterio = async (userId: string) => {
//     setLoading(true); // Inicia o carregamento

//     try {
//       const { data, error } = await supabase
//         .from("ministerios")
//         .select("*")
//         .eq("user_id", userId)
//         .single();

//       if (error) {
//         console.error("Erro ao buscar ministério:", error);
//       } else {
//         setHasMinisterio(!!data);
//         setMinisterioId(data?.id || "");
//         setMinisterioNome(data?.nome || "");
//       }
//     } catch (error) {
//       console.error("Erro ao buscar ministério:", error);
//     } finally {
//       setLoading(false); // Finaliza o carregamento independente do resultado
//     }
//   };

//   const fetchSessionAndMinisterio = async () => {
//     const { data } = await supabase.auth.getSession();
//     if (data.session?.user) {
//       setUserId(data.session.user.id);
//       fetchMinisterio(data.session?.user?.id);
//     } else {
//       setLoading(false); // Se não houver usuário, finaliza o carregamento
//     }
//   };
//   useEffect(() => {
//     fetchSessionAndMinisterio();
//   }, []);

//   const adicionarNaEscala = () => {
//     if (integrante && inputData) {
//       // Corrigir o problema de fuso horário
//       const dataSelecionada = new Date(inputData);
//       // Adicionar o fuso horário local para garantir que a data seja correta
//       const dataCorrigida = new Date(
//         dataSelecionada.getTime() + dataSelecionada.getTimezoneOffset() * 60000
//       )
//         .toISOString()
//         .split("T")[0];

//       setEscala((prev) => [
//         ...prev,
//         {
//           data: dataCorrigida,
//           integrante,
//           instrumento: instrumento || undefined,
//           observacao,
//         },
//       ]);
//       setIntegrante("");
//       setInputData("");
//       setInstrumento("");
//       setObservacao("");
//     }
//   };

//   const salvarEscala = async () => {
//     console.log(escala);

//     const { data: escalaSaved, error: errorEscala } = await supabase
//       .from("escalas")
//       .upsert({
//         ministerio_id: ministerioId,
//         nome: "Escala de " + mes,
//       })
//       .select(); // Adicione select para retornar os dados

//     if (errorEscala) {
//       console.error("Erro ao salvar escala:", errorEscala);
//       return;
//     }

//     for (const itemEscala of escala) {
//       const { data: integranteSaved, error: errorIntegrante } = await supabase
//         .from("integrantes")
//         .upsert(
//           {
//             nome: itemEscala.integrante,
//             ministerio_id: ministerioId,
//           },
//           {
//             // Configurar para retornar os dados após upsert
//             onConflict: "nome, ministerio_id", // Define campos para verificar duplicidade
//             ignoreDuplicates: false, // Faz update se existir
//           }
//         )
//         .select(); // Adicione select para retornar os dados

//       if (errorIntegrante) {
//         console.error("Erro ao salvar integrante:", errorIntegrante);
//         return;
//       }

//       const { data: escalaParticipacoes, error: errorEscalaParticipacoes } =
//         await supabase
//           .from("escala_participacoes")
//           .upsert({
//             escala_id: escalaSaved[0].id ?? "",
//             integrante_id: integranteSaved[0].id ?? "",
//             data: itemEscala.data,
//             instrumento: itemEscala.instrumento,
//             observacao: itemEscala.observacao,
//           })
//           .select(); // Adicione select para retornar os dados

//       if (errorEscalaParticipacoes) {
//         console.error(
//           "Erro ao salvar participação na escala:",
//           errorEscalaParticipacoes
//         );
//         return;
//       }

//       toast.success(`Escala salva com sucesso!`);
//     }
//   };

//   const agruparPorDiaSemana = (itens: EscalaItem[]) => {
//     return itens.reduce((acc: Record<string, EscalaItem[]>, item) => {
//       const diaSemana = new Date(item.data).toLocaleDateString("pt-BR", {
//         weekday: "long",
//       });
//       if (!acc[diaSemana]) {
//         acc[diaSemana] = [];
//       }
//       acc[diaSemana].push(item);
//       return acc;
//     }, {});
//   };

//   const grupos = agruparPorDiaSemana(escala);

//   const exportarPDF = () => {
//     // Cria uma nova instância do PDF
//     const doc = new jsPDF();

//     // Adiciona um título
//     doc.setFontSize(18);
//     doc.text(`Escala do Ministério - ${mes}`, 14, 20);

//     // Prepara os dados para a tabela
//     const tableData = [] as any[];

//     Object.entries(grupos).forEach(([diaSemana, itens]) => {
//       // Adiciona cabeçalho do dia da semana
//       tableData.push([
//         {
//           content: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
//           colSpan: 3,
//           styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
//         },
//       ]);

//       const agrupadosPorData = itens.reduce<Record<string, EscalaItem[]>>(
//         (acc, item) => {
//           if (!acc[item.data]) {
//             acc[item.data] = [];
//           }
//           acc[item.data].push(item);
//           return acc;
//         },
//         {}
//       );

//       // Adiciona linhas para cada data
//       Object.entries(agrupadosPorData).forEach(([data, integrantes]) => {
//         // Formata os integrantes em texto
//         const integrantesText = integrantes
//           .map(
//             (item) =>
//               `${item.integrante}${
//                 item.instrumento ? ` (${item.instrumento})` : ""
//               }${item.observacao ? `\nObs: ${item.observacao}` : ""}`
//           )
//           .join("\n\n");

//         tableData.push([
//           "",
//           new Date(data).toLocaleDateString("pt-BR"),
//           integrantesText,
//         ]);
//       });
//     });

//     // Gera a tabela no PDF
//     autoTable(doc, {
//       head: [["Dia da Semana", "Data", "Integrantes"]],
//       body: tableData,
//       startY: 30,
//       theme: "grid",
//       headStyles: { fillColor: [100, 100, 100] },
//     });

//     // Salva o PDF
//     doc.save(`Escala_${mes}.pdf`);
//   };

//   const formMinisterioSchema = yup.object({
//     ministerioNome: yup.string().min(3, {
//       message: "O nome deve ter pelo menos 3 caracteres.",
//     }),
//   });

//   // 1. Define your form.
//   const formMinisterio = useForm<yup.InferType<typeof formMinisterioSchema>>({
//     defaultValues: {
//       ministerioNome: "",
//     },
//   });

//   // 2. Define a submit handler.
//   async function onSubmit(values: yup.InferType<typeof formMinisterioSchema>) {
//     // Do something with the form values.
//     // ✅ This will be type-safe and validated.
//     setLoading(true);

//     const { data, error } = await supabase
//       .from("ministerios")
//       .insert([{ nome: values.ministerioNome, user_id: userId }])
//       .select();

//     if (error) {
//       console.error("Erro ao criar ministério:", error);
//     } else {
//       setHasMinisterio(true);
//     }
//     fetchSessionAndMinisterio();
//     setLoading(false);
//   }

//   const formatarData = (dataString: string) => {
//     const data = new Date(dataString);
//     // 60000 = 60 segundos * 1000 milissegundos = 1 minuto em milissegundos
//     return new Date(data.getTime() + data.getTimezoneOffset() * 60000).toLocaleDateString(
//       "pt-BR"
//     );
//   };

//   const PageSkeleton = () => (
//     <div className="p-6 space-y-6">
//       <Skeleton className="h-8 w-64 mb-4" /> {/* Título */}
//       <Skeleton className="h-6 w-96 mb-8" /> {/* Subtítulo */}
//       <div className="space-y-4">
//         <Skeleton className="h-10 w-[180px]" /> {/* Select de mês */}
//         <Skeleton className="h-10 w-full" /> {/* Input de integrante */}
//         <div className="flex gap-2">
//           <Skeleton className="h-10 w-full" /> {/* Input de data */}
//           <Skeleton className="h-10 w-[180px]" /> {/* Select de instrumento */}
//           <Skeleton className="h-10 w-32" /> {/* Botão */}
//         </div>
//         <Skeleton className="h-24 w-full" /> {/* Textarea */}
//       </div>
//     </div>
//   );

//   if (loading) {
//     return <PageSkeleton />;
//   }

//   if (!hasMinisterio) {
//     return (
//       <main className="flex flex-col items-center justify-center min-h-screen">
//         <h1 className="text-2xl font-bold">
//           Voce nao possui um ministerio cadastrado
//         </h1>
//         <p className="text-lg mb-2">Vamos começar a trabalhar no seu ministerio?</p>
//         <Card className="rounded-2xl shadow-md p-4 sm:w-1/4 w-full">
//           {/* <p className="text-lg">Digite o nome do seu ministerio</p>
//           <Input
//             placeholder="Nome do ministerio"
//             value={ministerioNome}
//             onChange={(e) => setMinisterioNome(e.target.value)}
//           />
//           <Button
//             onClick={async () => {
//               const { data, error } = await supabase
//                 .from("ministerios")
//                 .insert([{ nome: ministerioNome, user_id: userId }])
//                 .select();

//               if (error) {
//                 console.error("Erro ao criar ministério:", error);
//               } else {
//                 setHasMinisterio(true);
//               }
//             }}
//           >
//             Cadastrar Ministério
//           </Button> */}
//           <FormProvider {...formMinisterio}>
//             <Form {...formMinisterio}>
//               <form className="space-y-8">
//                 <FormField
//                   control={formMinisterio.control}
//                   name="ministerioNome"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel>Nome</FormLabel>
//                       <FormControl>
//                         <Input placeholder="Ministério Infantil" {...field} />
//                       </FormControl>
//                       <FormDescription>
//                         Digite o nome do seu ministério.
//                       </FormDescription>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
//                 <Button
//                   type="button"
//                   disabled={loading}
//                   onClick={() => formMinisterio.handleSubmit(onSubmit)()}
//                 >
//                   Cadastrar
//                 </Button>
//               </form>
//             </Form>
//           </FormProvider>
//         </Card>
//       </main>
//     );
//   }

//   return (
//     <main className="px-6 py-2">
//       <div className="flex items-center gap-2 flex-row justify-between mb-4">
//         <div className="border-bottom border-gray-500 pb-2">
//           <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
//             Gerar Escala
//           </h1>

//           {/* <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
//             Você está criando uma escala para o {ministerioNome}
//           </h4> */}
//         </div>
//         <div>
//           <Button
//             onClick={async () => {
//               const { error } = await supabase.auth.signOut();
//               if (error) {
//                 console.error("Erro ao fazer logout:", error);
//               }
//               console.log("Logout realizado com sucesso!");
//               window.location.href = "/";
//             }}
//             className="mt-4"
//           >
//             <LogOutIcon />
//           </Button>
//         </div>
//       </div>
      
//       <Card className="rounded-2xl shadow-md p-4 mb-6">
//       <div className="space-y-4 w-full sm:w-1/2">
//       <Label htmlFor="mes">
//         Selecione o mês da escala
//       </Label>
//         <Select value={mes} onValueChange={setMes}>
//           <SelectTrigger className="w-full">
//             <SelectValue placeholder="Janeiro" />
//           </SelectTrigger>
//           <SelectContent>
//             {meses.map((m) => (
//               <SelectItem key={m} value={m}>
//                 {m}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//       <Label htmlFor="integrante">
//         Nome do Integrante
//       </Label>
//         <Input
//           placeholder="João Batista"
//           value={integrante}
//           onChange={(e) => setIntegrante(e.target.value)}
//         />
//       <Label htmlFor="data">
//         Data
//       </Label>
//           <Input
//             type="date"
//             value={inputData}
//             onChange={(e) => setInputData(e.target.value)}
            
//           />
//       <Label htmlFor="instrumento">
//         Instrumento (opcional)
//       </Label>
//           <Select value={instrumento} onValueChange={setInstrumento}>
//             <SelectTrigger className="w-full">
//               <SelectValue placeholder="Violão" />
//             </SelectTrigger>
//             <SelectContent>
//               {instrumentos.map((inst) => (
//                 <SelectItem key={inst} value={inst}>
//                   {inst}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//       <Label htmlFor="observacao">
//         Observações (opcional)
//       </Label>
//         <Textarea
//           placeholder="Observações sobre o integrante"
//           value={observacao}
//           onChange={(e) => setObservacao(e.target.value)}
//         />
//           <Button onClick={adicionarNaEscala}>Adicionar na Escala</Button>

//       </div>
//       <div>
//         <h2 className="text-xl font-semibold">Preview da Escala - {mes}</h2>
//         <Card className="rounded-2xl shadow-md p-4">
//           <table className="w-full border-collapse rounded-lg">
//             <thead>
//               <tr>
//                 <th className="border p-2">Dia da Semana</th>
//                 <th className="border p-2">Data</th>
//                 <th className="border p-2">Integrantes</th>
//               </tr>
//             </thead>
//             <tbody>
//               {Object.entries(grupos).map(([diaSemana, itens]) => {
//                 const agrupadosPorData = itens.reduce<
//                   Record<string, EscalaItem[]>
//                 >((acc, item) => {
//                   if (!acc[item.data]) {
//                     acc[item.data] = [];
//                   }
//                   acc[item.data].push(item);
//                   return acc;
//                 }, {});

//                 return (
//                   <>
//                     <tr key={diaSemana} className="bg-gray-100">
//                       <td
//                         className="border p-2 capitalize font-semibold"
//                         colSpan={3}
//                       >
//                         {diaSemana}
//                       </td>
//                     </tr>
//                     {Object.entries(agrupadosPorData).map(
//                       ([data, integrantes]) => (
//                         <tr key={data}>
//                           <td className="border p-2"></td>
//                           <td className="border p-2">
//                             {formatarData(data)}
//                           </td>
//                           <td className="border p-2">
//                             {integrantes.map((item) => (
//                               <div
//                                 key={item.integrante + (item.instrumento || "")}
//                                 className="mb-2"
//                               >
//                                 <div className="font-semibold">
//                                   {item.integrante}
//                                   {item.instrumento
//                                     ? ` (${item.instrumento})`
//                                     : ""}
//                                 </div>
//                                 {item.observacao && (
//                                   <div className="text-sm text-gray-600">
//                                     Obs: {item.observacao}
//                                   </div>
//                                 )}
//                               </div>
//                             ))}
//                           </td>
//                         </tr>
//                       )
//                     )}
//                   </>
//                 );
//               })}
//             </tbody>
//           </table>
//         </Card>
//         <div className="mt-4 flex gap-2">
//           <Button onClick={salvarEscala}>Salvar Escala</Button>
//           <Button
//             onClick={exportarPDF}
//             variant="outline"
//             disabled={escala.length === 0 || !mes}
//           >
//             Exportar PDF
//           </Button>
//         </div>
//       </div>
//       </Card>
//     </main>
//   );
// }


"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { OrganizationWizard } from "@/components/wizard/OrganizationWizard";
import { Button } from "@/components/ui/button";
import { LogOutIcon } from "lucide-react";
import { redirect, useRouter } from "next/navigation";

interface Organization {
  id: string;
  nome: string;
  tipo: string;
  created_at: string;
  user_id: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [redirectToOnboarding, setRedirectToOnboarding] = useState(false);

const router = useRouter();

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
      //setUserId(data.session.user.id);
      fetchOrganization(data.session.user.id);
    } else {
     // setUserId("d7e39c07-f7e4-4065-8e3a-aac5ccb02f1b"); // For testing purposes, using a static user ID
            fetchOrganization("d7e39c07-f7e4-4065-8e3a-aac5ccb02f1b");

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

  if (redirectToOnboarding) {
    console.log("Redirecionando para o onboarding...");
    // return (
    //   <OrganizationWizard 
    //     userId={userId} 
    //     onComplete={handleWizardComplete}
    //   />
    // );
    // REDIRECIONAR PARA O ONBOARDING
    console.log(organization)
  router.push('/onboarding');
  return null; // Retorne null enquanto o redirecionamento ocorre
  }

  return (
    <main className="px-6 py-2">
      <div className="flex items-center gap-2 flex-row justify-between mb-4">
        <div className="border-bottom border-gray-500 pb-2">
          <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            {organization?.nome}
          </h1>
          <p className="text-muted-foreground">
            {organization?.tipo === 'igreja' && 'Igreja'}
            {organization?.tipo === 'empresa' && 'Empresa'}  
            {organization?.tipo === 'grupo' && 'Grupo'}
            {organization?.tipo === 'outro' && 'Organização'}
          </p>
        </div>
        <div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="mt-4"
          >
            <LogOutIcon className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6">
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h2 className="text-xl font-semibold text-green-800 mb-2">
            ✨ Organização Configurada!
          </h2>
          <p className="text-green-700">
            Sua organização foi configurada com sucesso. 
            As próximas funcionalidades (criação de escalas, gestão de integrantes, etc.) 
            serão implementadas nas próximas fases.
          </p>
        </div>

        {/* TODO: Implementar dashboard principal com nova estrutura */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="font-medium text-orange-800 mb-2">Escalas</h3>
            <p className="text-sm text-orange-600">
              Crie e gerencie escalas
            </p>
            <Button className="mt-3" size="sm" onClick={() => router.push('/generate')}>
              Gerar Escala
            </Button>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2">Departamentos</h3>
            <p className="text-sm text-blue-600">
              Gerencie os departamentos da sua organização
            </p>
            <Button disabled className="mt-3" size="sm">
              Em breve
            </Button>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="font-medium text-purple-800 mb-2">Integrantes</h3>
            <p className="text-sm text-purple-600">
              Adicione e gerencie integrantes
            </p>
            <Button disabled className="mt-3" size="sm">
              Em breve
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}