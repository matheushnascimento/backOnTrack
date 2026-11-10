/**
 * Peso corporal, pra sugerir a meta diária da água (#423).
 *
 * ## A conta
 *
 * 35 ml por kg, arredondado pra 100 ml. É regra prática da clínica, e não um
 * número com estudo forte por trás: as referências de ingestão adequada
 * (EFSA, 2010) falam em 2,0 L pra mulheres e 2,5 L pra homens, contando a
 * água da comida. Por isso o peso **sugere** a meta e a pessoa decide: o
 * número salvo continua sendo a meta, e ela edita como qualquer outra.
 *
 * ## Cifrado
 *
 * Peso é dado de saúde, como os remédios do autocuidado. Vai num valor
 * sincronizado, cifrado com a chave da proteção, e só abre com ela destravada
 * neste aparelho. A meta que sai dele vai em claro: ela já existia em claro
 * antes do peso, e o peso não se recupera dela com precisão.
 */

import { decryptField, encryptField } from "./e2e";
import { GOAL_LIMITS } from "./goals";

export const ML_POR_KG = 35;

/** Fora disto só pode ser engano de digitação. */
export const PESO_LIMITES = { min: 30, max: 250 };

const CONTEXTO = "corpo.peso";

/**
 * Converte o que a pessoa digitou em kg, com até uma casa decimal.
 *
 * @param {string} texto "72", "72,5" ou "72.5"
 * @returns {number | null}
 */
export function parsePeso(texto) {
  const limpo = String(texto ?? "")
    .trim()
    .replace(",", ".");
  if (!/^\d+(\.\d)?$/.test(limpo)) return null;
  const kg = Number(limpo);
  if (kg < PESO_LIMITES.min || kg > PESO_LIMITES.max) return null;
  return kg;
}

/**
 * O peso do jeito que o campo espera.
 *
 * @param {number | null | undefined} kg
 * @returns {string}
 */
export function pesoNoCampo(kg) {
  if (kg == null || !Number.isFinite(kg)) return "";
  return kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/**
 * A meta de água que o peso sugere, em ml, dentro dos limites da meta.
 *
 * @param {number} kg
 * @returns {number}
 */
export function aguaPeloPeso(kg) {
  const { min, max, step } = GOAL_LIMITS.water;
  const ml = Math.round((kg * ML_POR_KG) / step) * step;
  return Math.min(max, Math.max(min, ml));
}

/**
 * O campo cifrado do peso.
 *
 * @param {{kid: string, dataKey: Uint8Array}} chave a do pacote principal
 * @param {number} kg
 * @returns {string}
 */
export function cifrarPeso(chave, kg) {
  return encryptField(chave, JSON.stringify({ kg }), CONTEXTO);
}

/**
 * @param {Record<string, Uint8Array>} chaves
 * @param {string | null | undefined} protegido
 * @returns {{estado: "vazio"} | {estado: "aberto", kg: number} | {estado: "travado" | "ilegivel"}}
 */
export function lerPeso(chaves, protegido) {
  if (!protegido) return { estado: "vazio" };
  try {
    const { kg } = JSON.parse(decryptField(chaves, protegido, CONTEXTO));
    const valido = parsePeso(String(kg));
    return valido == null
      ? { estado: "ilegivel" }
      : { estado: "aberto", kg: valido };
  } catch (e) {
    const code = /** @type {{code?: string}} */ (e)?.code;
    return { estado: code === "chave-ausente" ? "travado" : "ilegivel" };
  }
}
