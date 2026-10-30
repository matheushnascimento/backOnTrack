// @ts-nocheck -- helper puro; tipos vêm quando toda a constants/ for tipada (ADR-002)

/**
 * Plano de remédios (#392, fatia 3b da #374). Vem do pedido da Nayara em
 * 24/10: "nome do remédio, horário, e pra marcar se tomou ou não".
 *
 * ## O plano
 *
 * Um remédio por linha na tabela `meds`, sincronizada. Nome e horários vão
 * juntos num campo cifrado ponta a ponta (`protegido`), como o resto do
 * autocuidado: o plano é dado de saúde tanto quanto os registros. Em claro
 * fica só quando a linha foi criada. O servidor sabe quantos remédios há no
 * plano, e não quais nem quando.
 *
 * ## Decisões de 29/10 (na #392)
 *
 * - **Um remédio pode ter vários horários.** Manhã e noite é comum, e
 *   acrescentar depois exigiria migrar dado cifrado.
 * - **"Não tomei" é só a ausência de "tomei".** Marcar o que não fez vira
 *   cobrança.
 * - **O aviso no horário entra aqui.** A notificação aparece na tela de
 *   bloqueio, então não diz o nome do remédio, nem a palavra "remédio".
 *
 * ## O "tomei"
 *
 * É um registro de autocuidado do tipo remédio, com `{id, nome, horario}`
 * dentro do campo cifrado (`cifrarRegistro` em `constants/selfcare.js`). Vale
 * pro dia do registro. Desmarcar apaga o registro.
 *
 * Isolado como função pura pelo motivo de sempre: o `expo-notifications` não
 * roda no jest, e a regra inteira dá pra testar sem ele.
 */

import { decryptField, encryptField } from "./e2e";
import { diaLocal } from "./habitSignals";
import { diaDoRegistro, lerRegistro } from "./selfcare";
import { parseHHMM } from "./sleepTimes";

/** Contexto do campo cifrado do plano: não decifra se copiado pra outro campo. */
const CONTEXTO = "selfcare.remedio";

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Horários válidos, como "HH:MM", sem repetição e em ordem.
 *
 * @param {string[]} horarios
 * @returns {string[]}
 */
export function normalizarHorarios(horarios) {
  const minutos = new Set();
  for (const h of horarios ?? []) {
    const m = parseHHMM(h);
    if (m != null) minutos.add(m);
  }
  return [...minutos]
    .sort((a, b) => a - b)
    .map((m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`);
}

/**
 * O campo cifrado de um remédio novo ou editado.
 *
 * @param {{kid: string, dataKey: Uint8Array}} chave a do pacote principal
 * @param {{nome: string, horarios: string[]}} remedio
 * @returns {string}
 */
export function cifrarRemedio(chave, { nome, horarios }) {
  const limpo = String(nome ?? "").trim();
  const hs = normalizarHorarios(horarios);
  if (!limpo) throw new Error("remédio sem nome");
  if (hs.length === 0) throw new Error("remédio sem horário");
  return encryptField(
    chave,
    JSON.stringify({ nome: limpo, horarios: hs }),
    CONTEXTO,
  );
}

/**
 * O que dá pra mostrar de uma linha do plano. Mesmos estados do
 * `lerRegistro`: `aberto`, `travado` (falta destravar) ou `ilegivel`.
 *
 * @param {Record<string, Uint8Array>} chaves
 * @param {{protegido?: string}} linha
 * @returns {{estado: "aberto", nome: string, horarios: string[]}|{estado: "travado"|"ilegivel"}}
 */
export function lerRemedio(chaves, linha) {
  if (!linha?.protegido) return { estado: "ilegivel" };
  try {
    const { nome, horarios } = JSON.parse(
      decryptField(chaves, linha.protegido, CONTEXTO),
    );
    return {
      estado: "aberto",
      nome: String(nome ?? ""),
      horarios: normalizarHorarios(horarios),
    };
  } catch (e) {
    return { estado: e?.code === "chave-ausente" ? "travado" : "ilegivel" };
  }
}

/**
 * Os remédios do plano, decifrados, na ordem em que foram cadastrados.
 *
 * Os que não abrem vêm também, com o estado, pra tela dizer que há remédio
 * protegido em vez de fingir que o plano está vazio.
 *
 * @param {Record<string, Uint8Array>} chaves
 * @param {Record<string, {protegido?: string, createdAt?: number}>} tabela `meds`
 * @returns {Array<{id: string, createdAt: number, estado: string, nome?: string, horarios?: string[]}>}
 */
export function remediosDaTabela(chaves, tabela) {
  return Object.entries(tabela ?? {})
    .map(([id, linha]) => ({
      id,
      createdAt: Number(linha?.createdAt) || 0,
      ...lerRemedio(chaves, linha),
    }))
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

/**
 * Os "tomei" do plano, decifrados.
 *
 * @param {Record<string, Uint8Array>} chaves
 * @param {Record<string, object>} registros a tabela `records` crua, com o id
 *   como chave
 * @returns {Array<{recordId: string, dia: string, remedioId: string, horario: string}>}
 */
export function marcasDoPlano(chaves, registros) {
  const out = [];
  for (const [recordId, r] of Object.entries(registros ?? {})) {
    if (r?.type !== "selfcare") continue;
    const lido = lerRegistro(chaves, r);
    if (lido.estado !== "aberto" || !lido.remedio) continue;
    const dia = diaDoRegistro(r);
    if (!dia) continue;
    out.push({
      recordId,
      dia,
      remedioId: lido.remedio.id,
      horario: lido.remedio.horario,
    });
  }
  return out;
}

const chaveDaMarca = (dia, remedioId, horario) =>
  `${dia}|${remedioId}|${horario}`;

/**
 * O que tomar num dia: um item por horário de cada remédio aberto, em ordem
 * de horário. `marca` é o id do registro do "tomei", ou `null`.
 *
 * @param {ReturnType<typeof remediosDaTabela>} remedios
 * @param {ReturnType<typeof marcasDoPlano>} marcas
 * @param {string} dia "AAAA-MM-DD"
 * @returns {Array<{remedioId: string, nome: string, horario: string, marca: string|null}>}
 */
export function planoDoDia(remedios, marcas, dia) {
  const tomados = new Map();
  for (const m of marcas ?? []) {
    if (m.dia === dia) {
      tomados.set(chaveDaMarca(m.dia, m.remedioId, m.horario), m.recordId);
    }
  }
  const itens = [];
  for (const r of remedios ?? []) {
    if (r.estado !== "aberto") continue;
    for (const horario of r.horarios) {
      itens.push({
        remedioId: r.id,
        nome: r.nome,
        horario,
        marca: tomados.get(chaveDaMarca(dia, r.id, horario)) ?? null,
      });
    }
  }
  return itens.sort(
    (a, b) =>
      parseHHMM(a.horario) - parseHHMM(b.horario) ||
      a.nome.localeCompare(b.nome),
  );
}

/**
 * Agenda dos avisos: as próximas `dias` ocorrências de cada horário de cada
 * remédio, puladas as que já têm "tomei".
 *
 * `setDate` em vez de somar 24h, pra hora de parede sobreviver à troca de
 * horário de verão.
 *
 * @param {{
 *   remedios: ReturnType<typeof remediosDaTabela>,
 *   marcas: ReturnType<typeof marcasDoPlano>,
 *   enabled: boolean,
 *   dias: number,
 *   now?: number,
 * }} args
 * @returns {Array<{at: number, remedioId: string, horario: string}>} em ordem
 */
export function medReminderSchedule({
  remedios,
  marcas,
  enabled,
  dias,
  now = Date.now(),
}) {
  if (!enabled) return [];
  const tomados = new Set(
    (marcas ?? []).map((m) => chaveDaMarca(m.dia, m.remedioId, m.horario)),
  );
  const agora = new Date(now);
  const agenda = [];
  for (const r of remedios ?? []) {
    if (r.estado !== "aberto") continue;
    for (const horario of r.horarios) {
      const min = parseHHMM(horario);
      let achados = 0;
      for (let k = 0; achados < dias && k <= dias; k++) {
        const at = new Date(
          agora.getFullYear(),
          agora.getMonth(),
          agora.getDate() + k,
          Math.floor(min / 60),
          min % 60,
        ).getTime();
        if (at <= now) continue;
        if (tomados.has(chaveDaMarca(diaLocal(at), r.id, horario))) continue;
        agenda.push({ at, remedioId: r.id, horario });
        achados += 1;
      }
    }
  }
  return agenda.sort((a, b) => a.at - b.at);
}

/**
 * As semanas de um mês, de domingo a sábado. Cada célula é o dia
 * ("AAAA-MM-DD") ou `null` antes do dia 1 e depois do último.
 *
 * @param {number} ano
 * @param {number} mes 0 a 11, como no `Date`
 * @returns {Array<Array<string|null>>}
 */
export function semanasDoMes(ano, mes) {
  const inicio = new Date(ano, mes, 1).getDay();
  const total = new Date(ano, mes + 1, 0).getDate();
  const celulas = Array.from({ length: inicio }, () => null);
  for (let d = 1; d <= total; d++) {
    celulas.push(`${ano}-${pad2(mes + 1)}-${pad2(d)}`);
  }
  while (celulas.length % 7) celulas.push(null);
  const semanas = [];
  for (let i = 0; i < celulas.length; i += 7) {
    semanas.push(celulas.slice(i, i + 7));
  }
  return semanas;
}

/**
 * Como foi cada dia de um remédio (#393): `cheio` com todos os horários
 * marcados, `meio` com parte deles. Dia sem marca não entra no mapa: fica sem
 * ponto, sem contar falha (decisões de 30/10).
 *
 * Conta horários distintos marcados contra quantos o remédio tem hoje. Se o
 * horário mudou, a marca antiga ainda conta, pra o dia que foi cumprido no
 * plano de então não virar meio.
 *
 * @param {ReturnType<typeof remediosDaTabela>[number]} remedio
 * @param {ReturnType<typeof marcasDoPlano>} marcas
 * @returns {Record<string, "cheio"|"meio">} por dia "AAAA-MM-DD"
 */
export function adesaoDoRemedio(remedio, marcas) {
  if (remedio?.estado !== "aberto") return {};
  const porDia = new Map();
  for (const m of marcas ?? []) {
    if (m.remedioId !== remedio.id) continue;
    if (!porDia.has(m.dia)) porDia.set(m.dia, new Set());
    porDia.get(m.dia).add(m.horario);
  }
  const total = remedio.horarios.length;
  const out = {};
  for (const [dia, horarios] of porDia) {
    out[dia] = horarios.size >= total ? "cheio" : "meio";
  }
  return out;
}

/**
 * Texto do aviso. Aparece na tela de bloqueio, pra qualquer pessoa perto do
 * aparelho: nem o nome do remédio, nem a palavra "remédio" (#394).
 *
 * @returns {{title: string, body: string}}
 */
export function medReminderText() {
  return { title: "Back on Track", body: "Hora do seu cuidado." };
}
