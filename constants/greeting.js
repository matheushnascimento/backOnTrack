// Saudação da Home ("Bom dia, Ana.").
//
// Vive fora do `app/index.jsx` pelo mesmo motivo do `infra/sync-url.js`:
// função pura com casos de borda de verdade (acento, separador, fallback do
// email) merece teste, e importar a tela puxaria a árvore RN inteira pro
// jest. Aqui roda em Node puro.

/**
 * Só o PRIMEIRO nome: corta no primeiro caractere não-alfabético.
 *
 * `\p{L}` (com flag `u`) é letra Unicode, então acento passa — "João da
 * Silva" vira "João", não "Jo". Cobre de uma vez os separadores que aparecem
 * de verdade: espaço ("Matheus Henrique"), ponto do email
 * ("matheus.mhddn") e dígito.
 *
 * Efeito colateral aceito: nomes com apóstrofo ou hífen também cortam
 * ("D'Angelo" -> "D", "Ana-Maria" -> "Ana"). É a regra literal de "quebrar no
 * primeiro não-alfabético"; se incomodar, o conserto é permitir `'` e `-` no
 * meio da classe.
 */
const PRIMEIRO_NOME = /^\p{L}+/u;

/**
 * Extrai o primeiro nome de uma string livre.
 * @param {unknown} texto
 * @returns {string} primeiro nome, ou "" se não houver letra no começo
 */
export function firstName(texto) {
  const limpo = String(texto ?? "").trim();
  return limpo.match(PRIMEIRO_NOME)?.[0] ?? "";
}

/**
 * Nome pra saudação. Prefere o `displayName` escolhido em Ajustes; sem ele,
 * deriva do email.
 *
 * @param {{ email?: string } | null | undefined} user
 * @param {unknown} displayName
 * @returns {string} "" quando não há nome utilizável
 */
export function pickName(user, displayName) {
  const escolhido = firstName(displayName);
  if (escolhido) {
    // Só garante a inicial maiúscula. O resto fica como a pessoa digitou —
    // ela escolheu esse nome no Ajustes, e forçar lowercase quebraria grafia
    // legítima tipo "McArthur".
    return escolhido.charAt(0).toUpperCase() + escolhido.slice(1);
  }

  const email = user?.email;
  if (!email) return "";
  const localpart = String(email).split("@")[0] || "";
  const derivado = firstName(localpart);
  if (!derivado) return "";
  // Aqui o lowercase vale: localpart é derivado, não escolhido — normaliza
  // "MATHEUS.MHDDN@..." pra "Matheus".
  return derivado.charAt(0).toUpperCase() + derivado.slice(1).toLowerCase();
}

/**
 * Cumprimento por faixa de horário.
 * @param {number} hora 0-23
 * @returns {string}
 */
export function saudacaoPorHora(hora) {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Saudação completa da Home.
 * @param {{ email?: string } | null | undefined} user
 * @param {unknown} displayName
 * @param {number} [hora] injetável pra teste; default é a hora local
 * @returns {string}
 */
export function getGreeting(user, displayName, hora = new Date().getHours()) {
  const cumprimento = saudacaoPorHora(hora);
  const nome = pickName(user, displayName);
  return nome ? `${cumprimento}, ${nome}.` : `${cumprimento}.`;
}
