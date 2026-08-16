// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Tela do hábito estável (#297) — tela 4a·5 do Turno 4.
//
// O que esta tela precisa dizer, e que nenhuma outra diz: o app **parou de
// usar este hábito pra medir a pessoa**. Não é elogio nem prêmio; é uma
// mudança de relação, e o texto admite isso sem embelezar.

import { CATEGORY_MAP } from "@/components/categoryUtils";

const MS_DIA = 86_400_000;

/**
 * Há quantos dias o hábito está estável.
 *
 * `null` quando não há data — o hábito pode estar estável agora sem que a
 * data tenha sido registrada ainda (primeira abertura depois de graduar).
 * Nesse caso a tela omite o "há N dias" em vez de inventar zero.
 *
 * @param {number|undefined} desde Epoch ms.
 * @param {number} [agora]
 * @returns {number|null}
 */
export function stableForDays(desde, agora = Date.now()) {
  if (!Number.isFinite(desde) || desde <= 0) return null;
  const dias = Math.floor((agora - desde) / MS_DIA);
  return dias >= 0 ? dias : null;
}

/**
 * Rótulo do chip de status.
 *
 * ⚠️ **Cinza, nunca verde** — quem chama isso decide a cor, mas o texto já
 * evita vocabulário de prêmio: "estável", não "conquistado" nem "dominado".
 * É status, não medalha.
 */
export function stableChip(dias) {
  if (dias == null) return "estável";
  if (dias === 0) return "estável desde hoje";
  if (dias === 1) return "estável há 1 dia";
  return `estável há ${dias} dias`;
}

/**
 * O bloco que explica o que "estável" significa.
 *
 * Três movimentos, nesta ordem, e a ordem importa:
 *
 * 1. **o que mudou pra pessoa** — "não precisa mais do seu esforço ativo".
 *    Acerta o mecanismo do modelo: hábito automático deixa de disputar o
 *    recurso de autorregulação (§7). É o benefício real, e vem primeiro.
 * 2. **por que ainda vale registrar** — "manter os dados apurados". Sem isso
 *    o registro vira permissão sem propósito, e a pessoa para.
 * 3. **o que deixou de acontecer** — "não pode mais derrubar seu nível".
 *
 * A versão anterior abria pelo negativo e dizia que o app parou de "medir
 * você". Era honesta e ficou fria: transformava a pessoa em objeto do app, e
 * a primeira informação era sobre uma punição que sumiu, não sobre o que ela
 * ganhou. Continua sem elogio — reforço sóbrio, não celebração.
 */
export function stableExplanation(metric) {
  const nome = CATEGORY_MAP[metric]?.displayName ?? metric;
  const capitalizado = `${nome.charAt(0).toUpperCase()}${nome.slice(1)}`;
  return {
    label: 'o que "estável" quer dizer',
    body: `${capitalizado} não precisa mais do seu esforço ativo. Pode continuar registrando pra manter os dados apurados — mas não derruba mais o seu nível.`,
  };
}

/**
 * Faixa dos últimos N dias, pro strip visual.
 *
 * Reusa os vereditos já calculados: cada dia vira `hit` ou não. O rótulo das
 * pontas dá âncora temporal sem poluir com 14 datas.
 *
 * @param {Array<{dia: string, hit: boolean}>} verdicts Cronológico.
 * @param {number} [dias]
 */
export function stableStrip(verdicts, dias = 14) {
  const janela = (verdicts ?? []).slice(-dias);
  const rotulo = (iso) => {
    const [, mes, dia] = String(iso ?? "").split("-");
    return mes && dia ? `${dia}/${mes}` : "";
  };
  return {
    days: janela,
    from: rotulo(janela[0]?.dia),
    to: janela.length ? "hoje" : "",
  };
}

/** Rótulo do botão ghost de registro. */
export function stableRegisterLabel(metric) {
  const nome = CATEGORY_MAP[metric]?.displayName ?? metric;
  return `Registrar ${nome} de hoje`;
}
