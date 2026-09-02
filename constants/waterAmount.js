// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Valor manual de água (#324).
//
// A tela de água nasceu no M5-B (#236) com três medidas fixas e um TODO
// dizendo que o valor livre ficava pra depois. O depois não veio, e o buraco
// só ficou visível com a jornada: o card da Home tem um botão "outro" que
// abre esta tela, então a pessoa toca em "outro" esperando digitar um valor e
// encontra as mesmas três medidas.
//
// A validação vive aqui, separada da tela, porque é onde bug de entrada mora:
// texto colado com unidade junto, zero, número absurdo por dedo escorregando.

/** Teto de um registro único. Acima disso é quase certamente erro de digitação. */
export const MAX_ML = 5000;

/**
 * Interpreta o que a pessoa digitou como mililitros.
 *
 * Aceita só dígitos, porque o campo é em ml e teclado numérico. Devolve `null`
 * pra tudo que não vira um registro honesto: vazio, zero, ou acima do teto.
 * Quem chama usa o `null` pra manter o botão desabilitado, em vez de gravar
 * lixo e obrigar a pessoa a apagar depois.
 *
 * @param {string|number|null|undefined} texto
 * @returns {number|null}
 */
export function parseMl(texto) {
  const digitos = String(texto ?? "").replace(/\D/g, "");
  if (digitos === "") return null;
  const n = Number(digitos);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_ML) return null;
  return n;
}

/**
 * O que o campo deve mostrar enquanto a pessoa digita.
 *
 * Mantém só dígitos e corta no comprimento do teto, pra que o campo não aceite
 * silenciosamente um número que o `parseMl` vai recusar depois.
 *
 * @param {string} texto
 * @returns {string}
 */
export function maskMl(texto) {
  return String(texto ?? "")
    .replace(/\D/g, "")
    .slice(0, String(MAX_ML).length);
}
