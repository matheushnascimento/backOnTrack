// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Ordem de exibição do histórico (#314).
//
// O histórico mostrava o registro mais antigo primeiro, porque nenhuma lista
// ordenava: a ordem que aparecia era a de iteração da tabela do TinyBase, que
// na prática é ordem de inserção. Quem abria uma métrica via o registro mais
// velho no topo e precisava rolar até o fim pra achar o de hoje.
//
// ## Por que `date` e não `createdAt`
//
// `date` é a data do **evento**, e é ela que a pessoa reconhece. `createdAt` é
// quando a linha foi gravada, que coincide na maioria dos casos mas não é a
// mesma coisa. Os dois são estáveis na edição, porque o `update` usa
// `setPartialRow` e não toca em nenhum dos dois, então editar um registro
// antigo não o joga pro topo.
//
// `createdAt` entra como desempate, pra ordenar dois registros do mesmo
// instante de `date` na ordem inversa de entrada.

/**
 * Instante de um registro, em ms, pra fins de ordenação.
 *
 * `buildRow` guarda `date: ""` quando a tela não manda data, e aí o parse
 * falha. Nesse caso vale o `createdAt`, que sempre existe.
 *
 * @param {{date?: string, createdAt?: number}} registro
 * @returns {number}
 */
function instante(registro) {
  const t = Date.parse(registro?.date ?? "");
  return Number.isFinite(t) ? t : Number(registro?.createdAt) || 0;
}

/**
 * Comparador: mais recente primeiro.
 *
 * @param {object} a
 * @param {object} b
 * @returns {number}
 */
export function porMaisRecente(a, b) {
  const diff = instante(b) - instante(a);
  if (diff !== 0) return diff;
  return (Number(b?.createdAt) || 0) - (Number(a?.createdAt) || 0);
}

/**
 * Cópia da lista, do mais recente pro mais antigo.
 *
 * Copia de propósito: os chamadores passam o resultado de `Object.values` ou
 * um array vindo do store, e ordenar no lugar esconderia efeito colateral.
 *
 * @param {Array<object>} registros
 * @returns {Array<object>}
 */
export function maisRecentesPrimeiro(registros) {
  return [...(registros ?? [])].sort(porMaisRecente);
}
