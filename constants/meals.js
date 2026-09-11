// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Qual refeição é cada registro (#332).
//
// O horário sugere bem no uso normal: quem registra o almoço à uma da tarde
// não quer escolher nada. Ele erra feio no preenchimento em lote, porque três
// refeições lançadas às 22h viravam três jantares, e não havia como corrigir:
// o rótulo era derivado na hora de renderizar e nunca chegava a ser gravado.
//
// Agora a escolha manda quando existe, e o horário preenche quando não existe.
// A sugestão continua sendo o caminho de um toque.

/** As quatro, na ordem do dia. Ordem também é a da lista de escolha. */
export const MEALS = ["café", "almoço", "lanche", "jantar"];

/**
 * A refeição que o horário sugere.
 *
 * As faixas vieram do desenho original e não mudaram: o que mudou é que agora
 * elas são palpite, e não veredito.
 *
 * @param {number} hora 0 a 23.
 * @returns {string}
 */
export function mealFromHour(hora) {
  const h = Number(hora);
  if (!Number.isFinite(h)) return MEALS[0];
  if (h < 11) return "café";
  if (h < 15) return "almoço";
  if (h < 18) return "lanche";
  return "jantar";
}

/**
 * A refeição de um registro: a escolhida, ou a que o horário sugere.
 *
 * Valor desconhecido em `meal` cai na sugestão em vez de aparecer cru na tela.
 * Isso protege contra dado vindo do sync de uma versão futura, e contra typo.
 *
 * @param {{meal?: string, createdAt?: number}|null|undefined} registro
 * @returns {string}
 */
export function mealOf(registro) {
  const escolhida = registro?.meal;
  if (MEALS.includes(escolhida)) return escolhida;
  return mealFromHour(new Date(registro?.createdAt ?? 0).getHours());
}

/**
 * A pessoa escolheu, ou é palpite do horário?
 *
 * A tela usa isso pra não afirmar com a mesma confiança as duas coisas.
 *
 * @param {{meal?: string}|null|undefined} registro
 * @returns {boolean}
 */
export function isMealChosen(registro) {
  return MEALS.includes(registro?.meal);
}
