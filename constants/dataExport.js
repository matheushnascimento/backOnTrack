/**
 * Exportação dos dados (#429, item do M8).
 *
 * A pessoa tira uma cópia própria do que registrou. O original fica no
 * aparelho, e a cópia do servidor tem os campos sensíveis cifrados, então a
 * única cópia legível que ela pode guardar é esta.
 *
 * ## O que entra, e o que fica de fora
 *
 * Entram os registros, as metas, o plano de remédios, as metas do
 * autocuidado, o peso, a escada da higiene do sono e o nome de exibição.
 *
 * Ficam de fora de propósito: a lista de testers (telefones de outras
 * pessoas), os pacotes de chave, o id da sala de sync e as preferências do
 * aparelho. Nada disso é registro da pessoa, e o pacote de chave só serve pra
 * abrir o que esta cópia já traz aberto.
 *
 * O estado da jornada (`journeyGranted`, `journeyGraduatedAt`,
 * `journeyPeakLevel`, `journeyAckLevel`) também fica de fora por enquanto, de
 * propósito: ele só tem uso pra quem for importar, e entra junto com a
 * importação, quando ela existir.
 *
 * ## Campo cifrado
 *
 * Sai aberto quando a proteção está destravada. Travado ou ilegível, o campo
 * é omitido e entra em `omitidos`, pra o arquivo dizer o que ficou de fora.
 * Texto cifrado nunca vai pro arquivo: sem a chave ele não serve pra nada, e
 * com ela a pessoa já teria a versão aberta.
 *
 * Funções puras: quem lê a store e quem grava o arquivo é a tela.
 */

import { CATEGORY_MAP } from "@/components/categoryUtils";

import { lerPeso } from "./bodyWeight";
import { diaLocal } from "./habitSignals";
import { remediosDaTabela } from "./medPlan";
import { lerRegistro } from "./selfcare";
import { lerMetas } from "./selfcareGoals";
import { degrausDaTabela } from "./sleepHygiene";

export const FORMATO = "backontrack-export";
export const VERSAO = 1;

/** O que cada item omitido quer dizer, pra o arquivo e a tela. */
export const DESCRICAO_OMITIDO = {
  autocuidado: "tipo e nota dos registros do autocuidado",
  remedios: "remédios do plano",
  metasAutocuidado: "metas do autocuidado",
  peso: "peso",
};

/** Colunas da linha do registro. O resto vai pro `detalhes`. */
const COLUNAS = new Set([
  "id",
  "type",
  "date",
  "quantity",
  "unit",
  "note",
  "createdAt",
]);

/**
 * @typedef {"autocuidado"|"remedios"|"metasAutocuidado"|"peso"} ItemOmitido
 * @typedef {{item: ItemOmitido, motivo: "travado"|"ilegivel", quantidade: number, descricao: string}} Omitido
 * @typedef {Record<string, any>} Linha
 */

/**
 * O instante que dá o DIA do registro: a `date`, que é o que agrupa o
 * histórico, ou o `createdAt` quando ela falta.
 *
 * @param {Linha} r
 * @returns {number} NaN quando não há nenhum dos dois
 */
function msDoDia(r) {
  const ms = Date.parse(r?.date ?? "");
  if (Number.isFinite(ms)) return ms;
  const ts = Number(r?.createdAt);
  return Number.isFinite(ts) && ts > 0 ? ts : NaN;
}

/**
 * O instante que dá a HORA do registro: o `createdAt`, que é a hora do evento
 * pro app inteiro e a que a correção de hora (#336) mexe, ou a `date` quando
 * ele falta.
 *
 * @param {Linha} r
 * @returns {number} NaN quando não há nenhum dos dois
 */
function msDaHora(r) {
  const ts = Number(r?.createdAt);
  if (Number.isFinite(ts) && ts > 0) return ts;
  return Date.parse(r?.date ?? "");
}

/**
 * Ordem dos registros: pelo dia local, e dentro do dia pela hora que a coluna
 * `hora` mostra. Ordenar pela `date` deixaria fora de ordem o registro com a
 * hora corrigida, porque o `setRecordTime` só mexe no `createdAt`.
 *
 * @param {Linha} a
 * @param {Linha} b
 */
function emOrdem(a, b) {
  const diaA = Number.isFinite(msDoDia(a)) ? diaLocal(msDoDia(a)) : "";
  const diaB = Number.isFinite(msDoDia(b)) ? diaLocal(msDoDia(b)) : "";
  if (diaA !== diaB) return diaA < diaB ? -1 : 1;
  return (
    (msDaHora(a) || 0) - (msDaHora(b) || 0) ||
    String(a.id).localeCompare(String(b.id))
  );
}

/**
 * Espalha o `details` no topo, como o `hidratar` da `infra/database.js`, e
 * troca o campo cifrado pelo conteúdo aberto. O `protegido` nunca passa.
 *
 * @param {Record<string, Uint8Array>} chaves
 * @param {string} id
 * @param {Linha} linha
 * @returns {{registro: Linha, omitido: null|"travado"|"ilegivel"}}
 */
function registroDaLinha(chaves, id, linha) {
  const { details, ...resto } = linha ?? {};
  /** @type {Linha} */
  let extras;
  try {
    const lido = JSON.parse(details || "{}");
    extras = lido && typeof lido === "object" ? lido : {};
  } catch {
    extras = {};
  }
  const { protegido, ...semCifra } = /** @type {Linha} */ ({
    id,
    ...resto,
    ...extras,
  });
  if (!protegido) return { registro: semCifra, omitido: null };

  const lido = lerRegistro(chaves, { protegido });
  if (lido.estado !== "aberto") {
    return { registro: semCifra, omitido: lido.estado };
  }
  /** @type {Linha} */
  const autocuidado = { tipo: lido.tipo, nota: lido.nota };
  if (lido.remedio) autocuidado.remedio = lido.remedio;
  return { registro: { ...semCifra, autocuidado }, omitido: null };
}

/**
 * Soma uma omissão na lista, agrupando por item e motivo.
 *
 * @param {Omitido[]} lista
 * @param {ItemOmitido} item
 * @param {"travado"|"ilegivel"} motivo
 */
function omitir(lista, item, motivo) {
  const existente = lista.find((o) => o.item === item && o.motivo === motivo);
  if (existente) existente.quantidade += 1;
  else {
    lista.push({
      item,
      motivo,
      quantidade: 1,
      descricao: DESCRICAO_OMITIDO[item],
    });
  }
}

/**
 * Monta o objeto da exportação.
 *
 * @param {{
 *   tabelas: {records?: Record<string, Linha>, goals?: Record<string, Linha>, meds?: Record<string, Linha>, hygieneSteps?: Record<string, Linha>},
 *   valores: {displayName?: string, selfcareGoals?: string, bodyWeight?: string, hygieneTarget?: string},
 *   chaves: Record<string, Uint8Array>,
 *   agora: number,
 * }} args
 */
export function montarExportacao({ tabelas, valores, chaves, agora }) {
  /** @type {Omitido[]} */
  const omitidos = [];

  const registros = [];
  for (const [id, linha] of Object.entries(tabelas?.records ?? {})) {
    const { registro, omitido } = registroDaLinha(chaves, id, linha);
    if (omitido) omitir(omitidos, "autocuidado", omitido);
    registros.push(registro);
  }
  registros.sort(emOrdem);

  /** @type {Record<string, number>} */
  const metas = {};
  for (const [metric, row] of Object.entries(tabelas?.goals ?? {})) {
    if (Number.isFinite(row?.target)) metas[metric] = row.target;
  }

  const remedios = [];
  for (const r of remediosDaTabela(chaves, tabelas?.meds ?? {})) {
    if (r.estado === "aberto") {
      remedios.push({
        id: r.id,
        nome: r.nome,
        horarios: r.horarios,
        createdAt: r.createdAt,
      });
    } else {
      omitir(
        omitidos,
        "remedios",
        /** @type {"travado"|"ilegivel"} */ (r.estado),
      );
    }
  }

  const lidasMetas = lerMetas(chaves, valores?.selfcareGoals ?? "");
  let metasAutocuidado = null;
  if (lidasMetas.estado === "aberto") metasAutocuidado = lidasMetas.metas;
  else omitir(omitidos, "metasAutocuidado", lidasMetas.estado);

  const lidoPeso = lerPeso(chaves, valores?.bodyWeight ?? "");
  let peso = null;
  if (lidoPeso.estado === "aberto") peso = { kg: lidoPeso.kg };
  else if (lidoPeso.estado !== "vazio") {
    omitir(omitidos, "peso", lidoPeso.estado);
  }

  return {
    formato: FORMATO,
    versao: VERSAO,
    geradoEm: new Date(agora).toISOString(),
    omitidos,
    registros,
    metas,
    remedios,
    metasAutocuidado,
    peso,
    higiene: {
      alvo: String(valores?.hygieneTarget ?? ""),
      degraus: degrausDaTabela(tabelas?.hygieneSteps ?? {}),
    },
    nome: String(valores?.displayName ?? ""),
  };
}

/** @typedef {ReturnType<typeof montarExportacao>} Exportacao */

/** O JSON do arquivo, indentado pra quem abrir num editor. */
export function paraJson(/** @type {Exportacao} */ exportacao) {
  return JSON.stringify(exportacao, null, 2);
}

// --- CSV ---------------------------------------------------------------------

/** O Excel só lê acento em UTF-8 com esta marca no começo. */
const BOM = "\uFEFF";
/** O Excel em pt-BR separa colunas por ponto e vírgula. */
const SEP = ";";
const FIM_DE_LINHA = "\r\n";

export const CABECALHO_CSV = [
  "data",
  "hora",
  "habito",
  "quantidade",
  "unidade",
  "nota",
  "detalhes",
];

const pad2 = (/** @type {number} */ n) => String(n).padStart(2, "0");

/**
 * Aspas em volta do campo que tem separador, aspas ou quebra de linha, com as
 * aspas de dentro dobradas.
 *
 * @param {unknown} valor
 */
export function campoCsv(valor) {
  const texto = valor == null ? "" : String(valor);
  if (!/[;"\r\n]/.test(texto)) return texto;
  return `"${texto.replace(/"/g, '""')}"`;
}

/**
 * Texto livre que começa com `=`, `+`, `-`, `@`, tab ou CR vira fórmula no
 * Excel e no Planilhas ("- dor de cabeça" aparece como `#NOME?`). O apóstrofo
 * na frente faz a planilha ler como texto.
 *
 * @param {unknown} valor
 */
export function textoCsv(valor) {
  const texto = valor == null ? "" : String(valor);
  return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
}

/** Número com vírgula decimal, como o Excel em pt-BR espera. */
function numeroCsv(/** @type {unknown} */ n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return String(v).replace(".", ",");
}

/**
 * Data e hora locais do registro, pelos mesmos instantes da ordem: o dia pelo
 * `msDoDia` e a hora pelo `msDaHora`.
 *
 * @param {Linha} r
 * @returns {{data: string, hora: string}}
 */
function quando(r) {
  const dia = msDoDia(r);
  const msHora = msDaHora(r);
  if (!Number.isFinite(dia)) return { data: "", hora: "" };
  const d = new Date(dia);
  const h = new Date(msHora);
  return {
    data: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`,
    hora: Number.isFinite(msHora)
      ? `${pad2(h.getHours())}:${pad2(h.getMinutes())}`
      : "",
  };
}

/** Os extras do registro, em JSON compacto, ou vazio quando não há. */
function detalhesCsv(/** @type {Linha} */ r) {
  const extras = Object.fromEntries(
    Object.entries(r).filter(([k]) => !COLUNAS.has(k)),
  );
  return Object.keys(extras).length ? JSON.stringify(extras) : "";
}

/**
 * Uma linha por registro, em ordem de tempo.
 *
 * @param {Exportacao} exportacao
 * @returns {string}
 */
export function paraCsv(exportacao) {
  const linhas = [CABECALHO_CSV.join(SEP)];
  for (const r of exportacao?.registros ?? []) {
    const { data, hora } = quando(r);
    const habito =
      CATEGORY_MAP[/** @type {keyof typeof CATEGORY_MAP} */ (r.type)]
        ?.displayName ?? r.type;
    linhas.push(
      [
        data,
        hora,
        habito,
        numeroCsv(r.quantity),
        textoCsv(r.unit),
        textoCsv(r.note),
        detalhesCsv(r),
      ]
        .map(campoCsv)
        .join(SEP),
    );
  }
  return BOM + linhas.join(FIM_DE_LINHA) + FIM_DE_LINHA;
}

/**
 * O nome do arquivo, com o dia local: `backontrack-AAAA-MM-DD.json`.
 *
 * @param {number} agora
 * @param {"json"|"csv"} extensao
 */
export function nomeDoArquivo(agora, extensao) {
  return `backontrack-${diaLocal(agora)}.${extensao}`;
}

export const MIME = { json: "application/json", csv: "text/csv" };
