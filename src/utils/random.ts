/**
 * Função utilitária para selecionar um elemento aleatório de um array
 * @param array - Array de elementos para seleção
 * @returns Elemento selecionado aleatoriamente ou undefined se o array estiver vazio
 */
export function pickRandom<T>(array: T[]): T | undefined {
  if (!array || array.length === 0) {
    return undefined;
  }
  
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

/**
 * Função para embaralhar um array usando o algoritmo Fisher-Yates
 * @param array - Array para embaralhar
 * @returns Novo array embaralhado
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Função para selecionar múltiplos elementos aleatórios de um array
 * @param array - Array de elementos para seleção
 * @param count - Número de elementos para selecionar
 * @returns Array com elementos selecionados aleatoriamente
 */
export function pickRandomMultiple<T>(array: T[], count: number): T[] {
  if (!array || array.length === 0 || count <= 0) {
    return [];
  }
  
  if (count >= array.length) {
    return shuffleArray(array);
  }
  
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}
