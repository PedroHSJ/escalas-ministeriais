// Utilitário para gerenciamento de feriados no sistema de escalas

export interface Feriado {
  data: string; // YYYY-MM-DD
  nome: string;
  tipo: "nacional" | "regional" | "organizacional";
  afetaEscala: boolean; // Se deve afetar a geração da escala
  folgasAdicionais?: number; // Quantas folgas adicionais conceder
}

// Feriados nacionais fixos
export const FERIADOS_NACIONAIS_FIXOS: Omit<Feriado, "data">[] = [
  {
    nome: "Confraternização Universal",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  },
  {
    nome: "Independência do Brasil",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  },
  {
    nome: "Nossa Senhora Aparecida",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  },
  {
    nome: "Finados",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  },
  {
    nome: "Proclamação da República",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  },
  {
    nome: "Natal",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 2, // Natal é mais especial
  },
];

// Função para calcular feriados móveis
export function calcularFeriadosMoveis(ano: number): Feriado[] {
  const feriados: Feriado[] = [];

  // Calcular Páscoa usando algoritmo
  const pascoa = calcularPascoa(ano);

  // Carnaval (47 dias antes da Páscoa)
  const carnaval = new Date(pascoa);
  carnaval.setDate(pascoa.getDate() - 47);
  feriados.push({
    data: formatDate(carnaval),
    nome: "Carnaval",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  });

  // Sexta-feira Santa (2 dias antes da Páscoa)
  const sextaSanta = new Date(pascoa);
  sextaSanta.setDate(pascoa.getDate() - 2);
  feriados.push({
    data: formatDate(sextaSanta),
    nome: "Sexta-feira Santa",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  });

  // Corpus Christi (60 dias após a Páscoa)
  const corpusChristi = new Date(pascoa);
  corpusChristi.setDate(pascoa.getDate() + 60);
  feriados.push({
    data: formatDate(corpusChristi),
    nome: "Corpus Christi",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  });

  return feriados;
}

// Algoritmo para calcular a Páscoa
function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = Math.floor((h + l - 7 * m + 114) / 31);
  const p = (h + l - 7 * m + 114) % 31;

  return new Date(ano, n - 1, p + 1);
}

// Gerar feriados fixos para um ano
export function gerarFeriadosFixos(ano: number): Feriado[] {
  const feriados: Feriado[] = [];

  // Janeiro
  feriados.push({
    data: `${ano}-01-01`,
    nome: "Confraternização Universal",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  });

  // Abril - Tiradentes
  feriados.push({
    data: `${ano}-04-21`,
    nome: "Tiradentes",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  });

  // Maio - Dia do Trabalhador
  feriados.push({
    data: `${ano}-05-01`,
    nome: "Dia do Trabalhador",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  });

  // Setembro - Independência
  feriados.push({
    data: `${ano}-09-07`,
    nome: "Independência do Brasil",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  });

  // Outubro - Nossa Senhora Aparecida
  feriados.push({
    data: `${ano}-10-12`,
    nome: "Nossa Senhora Aparecida",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  });

  // Novembro - Finados
  feriados.push({
    data: `${ano}-11-02`,
    nome: "Finados",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  });

  // Novembro - Proclamação da República
  feriados.push({
    data: `${ano}-11-15`,
    nome: "Proclamação da República",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 1,
  });

  // Dezembro - Natal
  feriados.push({
    data: `${ano}-12-25`,
    nome: "Natal",
    tipo: "nacional",
    afetaEscala: true,
    folgasAdicionais: 2,
  });

  return feriados;
}

// Combinar todos os feriados de um ano
export function obterTodosFeriados(ano: number): Feriado[] {
  const feriadosFixos = gerarFeriadosFixos(ano);
  const feriadosMoveis = calcularFeriadosMoveis(ano);

  return [...feriadosFixos, ...feriadosMoveis].sort((a, b) =>
    a.data.localeCompare(b.data)
  );
}

// Verificar se uma data é feriado
export function isFeriado(data: Date, feriados: Feriado[]): Feriado | null {
  const dataStr = formatDate(data);
  return feriados.find((f) => f.data === dataStr) || null;
}

// Aplicar regras de feriado na escala preta e vermelha
export function aplicarRegrasFeriado(
  data: Date,
  membrosAtivos: any[],
  feriado: Feriado | null
): { folgasExtras: number; ajusteEspecial: boolean } {
  if (!feriado || !feriado.afetaEscala) {
    return { folgasExtras: 0, ajusteEspecial: false };
  }

  // Regras especiais para feriados
  const totalMembros = membrosAtivos.length;
  const folgasExtras = feriado.folgasAdicionais || 0;

  // Em feriados importantes, mais pessoas ficam de folga
  if (
    feriado.nome === "Natal" ||
    feriado.nome === "Confraternização Universal"
  ) {
    // No Natal e Ano Novo, apenas 1 pessoa trabalha (se possível)
    return {
      folgasExtras: Math.max(0, totalMembros - 1),
      ajusteEspecial: true,
    };
  }

  // Outros feriados: folgas normais + folgas extras
  return {
    folgasExtras,
    ajusteEspecial: true,
  };
}

// Verificar se uma data é feriado ou deve ser considerada escala vermelha
export function isEscalaVermelha(data: Date, feriados: Feriado[]): boolean {
  const dayOfWeek = data.getDay();
  // Finais de semana (sábado e domingo) são escala vermelha
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Feriados também são considerados escala vermelha
  const isFeriadoData = isFeriado(data, feriados) !== null;

  return isWeekend || isFeriadoData;
}

// Função auxiliar para formatar data
function formatDate(data: Date): string {
  return data.toISOString().split("T")[0];
}

// Hook para usar feriados no componente
export function useFeriados(ano: number) {
  return {
    feriados: obterTodosFeriados(ano),
    isFeriado: (data: Date) => isFeriado(data, obterTodosFeriados(ano)),
    aplicarRegras: (data: Date, membros: any[]) => {
      const feriado = isFeriado(data, obterTodosFeriados(ano));
      return aplicarRegrasFeriado(data, membros, feriado);
    },
  };
}

import { supabase } from "@/lib/supabaseClient";

// Classe principal para gerenciar feriados
export default class FeriadoManager {
  private feriados: Map<number, Feriado[]> = new Map();
  private feriadosPersonalizados: Map<number, Feriado[]> = new Map();
  private organizacaoId: string;
  private userId: string;

  constructor(organizacaoId: string, userId: string) {
    if (!organizacaoId || organizacaoId.trim() === "") {
      throw new Error("ID da organização é obrigatório");
    }
    if (!userId || userId.trim() === "") {
      throw new Error("ID do usuário é obrigatório");
    }
    this.organizacaoId = organizacaoId;
    this.userId = userId;
  }

  // Carregar feriados personalizados do banco de dados
  async carregarFeriadosPersonalizados(ano?: number): Promise<void> {
    try {
      // Verificar se o organizacaoId é válido
      if (!this.organizacaoId || this.organizacaoId.trim() === "") {
        console.warn(
          "ID da organização não está definido, pulando carregamento de feriados personalizados"
        );
        return;
      }

      let query = supabase
        .from("feriados_personalizados")
        .select("*")
        .eq("organizacao_id", this.organizacaoId);

      if (ano) {
        const inicioAno = `${ano}-01-01`;
        const fimAno = `${ano}-12-31`;
        query = query.gte("data", inicioAno).lte("data", fimAno);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro na consulta de feriados personalizados:", error);
        throw error;
      }

      // Agrupar por ano
      if (data) {
        const feriadosPorAno = new Map<number, Feriado[]>();

        data.forEach((item) => {
          const dataFeriado = new Date(item.data);
          const anoFeriado = dataFeriado.getFullYear();

          const feriado: Feriado = {
            data: item.data,
            nome: item.nome,
            tipo: item.tipo as "nacional" | "regional" | "organizacional",
            afetaEscala: item.afeta_escala,
            folgasAdicionais: item.folgas_adicionais,
          };

          if (!feriadosPorAno.has(anoFeriado)) {
            feriadosPorAno.set(anoFeriado, []);
          }
          feriadosPorAno.get(anoFeriado)!.push(feriado);
        });

        // Atualizar o cache
        for (const [anoKey, feriados] of feriadosPorAno.entries()) {
          this.feriadosPersonalizados.set(anoKey, feriados);
          // Invalidar cache de feriados combinados
          this.feriados.delete(anoKey);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar feriados personalizados:", error);
    }
  }

  // Adicionar feriado personalizado
  async addFeriadoPersonalizado(feriado: Feriado): Promise<boolean> {
    try {
      console.log("Inserindo feriado:", {
        organizacao_id: this.organizacaoId,
        data: feriado.data,
        nome: feriado.nome,
        tipo: feriado.tipo,
        afeta_escala: feriado.afetaEscala,
        folgas_adicionais: feriado.folgasAdicionais || 1,
        created_by: this.userId,
      });

      const { data: insertData, error } = await supabase
        .from("feriados_personalizados")
        .insert({
          organizacao_id: this.organizacaoId,
          data: feriado.data,
          nome: feriado.nome,
          tipo: feriado.tipo,
          afeta_escala: feriado.afetaEscala,
          folgas_adicionais: feriado.folgasAdicionais || 1,
          created_by: this.userId,
        })
        .select();

      if (error) {
        console.error("Erro ao inserir feriado:", error);
        throw error;
      }

      console.log("Feriado inserido com sucesso:", insertData);

      // Atualizar cache local
      const data = new Date(feriado.data);
      const ano = data.getFullYear();

      if (!this.feriadosPersonalizados.has(ano)) {
        this.feriadosPersonalizados.set(ano, []);
      }

      const feriadosAno = this.feriadosPersonalizados.get(ano)!;
      const existe = feriadosAno.some((f) => f.data === feriado.data);

      if (!existe) {
        feriadosAno.push(feriado);
        // Invalidar cache do ano
        this.feriados.delete(ano);
      }

      return true;
    } catch (error) {
      console.error("Erro ao adicionar feriado personalizado:", error);
      return false;
    }
  }

  // Remover feriado personalizado
  async removeFeriadoPersonalizado(data: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("feriados_personalizados")
        .delete()
        .eq("organizacao_id", this.organizacaoId)
        .eq("data", data);

      if (error) throw error;

      // Atualizar cache local
      const dataObj = new Date(data);
      const ano = dataObj.getFullYear();

      if (this.feriadosPersonalizados.has(ano)) {
        const feriadosAno = this.feriadosPersonalizados.get(ano)!;
        const index = feriadosAno.findIndex((f) => f.data === data);

        if (index >= 0) {
          feriadosAno.splice(index, 1);
          // Invalidar cache do ano
          this.feriados.delete(ano);
        }
      }

      return true;
    } catch (error) {
      console.error("Erro ao remover feriado personalizado:", error);
      return false;
    }
  }

  // Obter feriados personalizados de um ano
  async getFeriadosPersonalizados(ano: number): Promise<Feriado[]> {
    // Se não temos no cache, carregar do banco
    if (!this.feriadosPersonalizados.has(ano)) {
      await this.carregarFeriadosPersonalizados(ano);
    }
    return this.feriadosPersonalizados.get(ano) || [];
  }

  // Verificar se um feriado é personalizado
  async isFeriadoPersonalizado(data: Date): Promise<boolean> {
    const ano = data.getFullYear();
    const dataStr = formatDate(data);
    const feriadosPersonalizados = await this.getFeriadosPersonalizados(ano);
    return feriadosPersonalizados.some((f) => f.data === dataStr);
  }

  // Obter feriados de um ano específico (incluindo personalizados)
  async getFeriados(ano: number): Promise<Feriado[]> {
    if (!this.feriados.has(ano)) {
      const feriadosNacionais = obterTodosFeriados(ano);
      const feriadosPersonalizados = await this.getFeriadosPersonalizados(ano);

      // Combinar e ordenar por data
      const todosFeriados = [
        ...feriadosNacionais,
        ...feriadosPersonalizados,
      ].sort((a, b) => a.data.localeCompare(b.data));

      this.feriados.set(ano, todosFeriados);
    }
    return this.feriados.get(ano)!;
  }

  // Verificar se uma data é feriado
  async isHoliday(data: Date): Promise<boolean> {
    const ano = data.getFullYear();
    const feriados = await this.getFeriados(ano);
    return isFeriado(data, feriados) !== null;
  }

  // Obter informações do feriado
  async getHolidayInfo(data: Date): Promise<Feriado | null> {
    const ano = data.getFullYear();
    const feriados = await this.getFeriados(ano);
    return isFeriado(data, feriados);
  }

  // Verificar se uma data deve ser considerada escala vermelha (finais de semana + feriados)
  async isEscalaVermelha(data: Date): Promise<boolean> {
    const ano = data.getFullYear();
    const feriados = await this.getFeriados(ano);
    return isEscalaVermelha(data, feriados);
  }

  // Verificar se é período especial (entre Natal e Ano Novo)
  isSpecialPeriod(data: Date): boolean {
    const month = data.getMonth() + 1; // getMonth() retorna 0-11
    const day = data.getDate();

    // Entre 26 de dezembro e 31 de dezembro
    return month === 12 && day >= 26 && day <= 31;
  }

  // Aplicar regras de feriado para escala
  async applyHolidayRules(
    data: Date,
    membrosAtivos: any[]
  ): Promise<{ folgasExtras: number; ajusteEspecial: boolean }> {
    const feriado = await this.getHolidayInfo(data);
    return aplicarRegrasFeriado(data, membrosAtivos, feriado);
  }

  // Exportar feriados personalizados para JSON
  exportarFeriadosPersonalizados(): string {
    const todosPersonalizados: Record<number, Feriado[]> = {};

    for (const [ano, feriados] of this.feriadosPersonalizados.entries()) {
      todosPersonalizados[ano] = feriados;
    }

    return JSON.stringify(todosPersonalizados, null, 2);
  }

  // Importar feriados personalizados de JSON
  importarFeriadosPersonalizados(json: string): void {
    try {
      const dados: Record<number, Feriado[]> = JSON.parse(json);

      for (const [anoStr, feriados] of Object.entries(dados)) {
        const ano = parseInt(anoStr);
        if (!isNaN(ano) && Array.isArray(feriados)) {
          this.feriadosPersonalizados.set(ano, feriados);
          // Invalidar cache
          this.feriados.delete(ano);
        }
      }
    } catch (error) {
      throw new Error("Formato JSON inválido para importação de feriados");
    }
  }

  // Limpar todos os feriados personalizados
  limparFeriadosPersonalizados(): void {
    this.feriadosPersonalizados.clear();
    this.feriados.clear(); // Limpar cache
  }

  // Validar formato de feriado personalizado
  static validarFeriado(feriado: Partial<Feriado>): string[] {
    const erros: string[] = [];

    if (!feriado.data || !/^\d{4}-\d{2}-\d{2}$/.test(feriado.data)) {
      erros.push("Data deve estar no formato YYYY-MM-DD");
    }

    if (!feriado.nome || feriado.nome.trim().length === 0) {
      erros.push("Nome do feriado é obrigatório");
    }

    if (
      !feriado.tipo ||
      !["nacional", "regional", "organizacional"].includes(feriado.tipo)
    ) {
      erros.push("Tipo deve ser: nacional, regional ou organizacional");
    }

    if (typeof feriado.afetaEscala !== "boolean") {
      erros.push('Campo "afetaEscala" deve ser verdadeiro ou falso');
    }

    if (
      feriado.folgasAdicionais !== undefined &&
      (typeof feriado.folgasAdicionais !== "number" ||
        feriado.folgasAdicionais < 0)
    ) {
      erros.push("Folgas adicionais deve ser um número positivo");
    }

    return erros;
  }
}
