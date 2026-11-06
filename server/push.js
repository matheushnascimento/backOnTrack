// @ts-nocheck -- código Node do server, fora do tsc do app (ADR-002).
// Lembretes por Web Push (#417, fatia 4 da #407).
//
// No celular, o `expo-notifications` agenda os próximos avisos no próprio
// aparelho. No navegador não existe aviso agendado local que funcione, então
// quem dispara é este server, que já roda o tempo todo.
//
// ## O que o server guarda
//
// Por conta (o `sub` do login) e por aparelho: a inscrição do push e a agenda
// de cada tipo de lembrete, com o horário e o texto de cada aviso. O texto é o
// da tela de bloqueio, que já não diz nome de remédio (#394). Decisão de 06/11
// na #417.
//
// Fica em `$DATA_DIR/push/`, separado das salas: é estado do aparelho, e não
// dado da pessoa. Nada daqui sincroniza.
//
// ## A agenda substitui, não acumula
//
// O app manda a lista INTEIRA dos próximos avisos de um tipo a cada mudança,
// como o cancelar-e-agendar do celular. Registrar o hábito some com o aviso
// porque a lista nova vem sem ele, e não por uma condição avaliada aqui.

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

/** Os tipos de lembrete, um por agenda. */
export const TIPOS = ["foco", "sono", "remedio"];

const MS_MIN = 60_000;
const MS_DIA = 86_400_000;

/** Teto de avisos por tipo. O app agenda uns 14 dias; folga pra remédio. */
const MAX_AVISOS = 64;
/** Teto de aparelhos por conta: inscrição velha some no 404/410, mas não só. */
const MAX_APARELHOS = 10;
/** Aviso mais atrasado que isto não sai: lembrete fora de hora é ruído. */
export const ATRASO_MAX_MS = 30 * MS_MIN;
/** Quão longe no futuro um aviso pode estar. */
const HORIZONTE_MS = 15 * MS_DIA;

const ID_APARELHO = /^[A-Za-z0-9_-]{8,64}$/;

const texto = (v, max) =>
  typeof v === "string" && v.length > 0 && v.length <= max;

/**
 * Lê e limpa o corpo do PUT. Devolve o erro em palavras, pra resposta 400.
 *
 * @returns {{ok: true, valor: object}|{ok: false, erro: string}}
 */
export function validarAgenda(corpo, now = Date.now()) {
  const { aparelho, inscricao, tipo, avisos } = corpo ?? {};
  if (!ID_APARELHO.test(String(aparelho ?? ""))) {
    return { ok: false, erro: "aparelho inválido" };
  }
  if (!TIPOS.includes(tipo)) return { ok: false, erro: "tipo inválido" };
  if (
    !inscricao ||
    !texto(inscricao.endpoint, 1000) ||
    !/^https:\/\//.test(inscricao.endpoint) ||
    !texto(inscricao.keys?.p256dh, 200) ||
    !texto(inscricao.keys?.auth, 100)
  ) {
    return { ok: false, erro: "inscrição inválida" };
  }
  if (!Array.isArray(avisos) || avisos.length > MAX_AVISOS) {
    return { ok: false, erro: "avisos inválidos" };
  }
  const limpos = [];
  for (const a of avisos) {
    const at = Number(a?.at);
    if (!Number.isFinite(at) || !texto(a?.title, 120) || !texto(a?.body, 240)) {
      return { ok: false, erro: "aviso inválido" };
    }
    // Passado e longe demais saem calados: não é erro do app, é relógio.
    if (at < now - ATRASO_MAX_MS || at > now + HORIZONTE_MS) continue;
    limpos.push({ at, title: a.title, body: a.body });
  }
  limpos.sort((a, b) => a.at - b.at);
  return {
    ok: true,
    valor: {
      aparelho,
      tipo,
      inscricao: {
        endpoint: inscricao.endpoint,
        keys: { p256dh: inscricao.keys.p256dh, auth: inscricao.keys.auth },
      },
      avisos: limpos,
    },
  };
}

/** Nome de arquivo seguro pra conta, como o `safeFilename` das salas. */
function arquivoDaConta(dir, sub) {
  const limpo = String(sub).replace(/[^A-Za-z0-9_-]/g, "-");
  return join(dir, `${limpo || "default"}.json`);
}

/**
 * O estado do push, em memória e em disco.
 *
 * `enviar(inscricao, payload)` é o `webpush.sendNotification` no server, e um
 * falso nos testes. Rejeita com `statusCode` quando o serviço de push recusa.
 *
 * @param {{dir: string, enviar: Function, agora?: () => number, log?: object}} opts
 */
export function criarPush({ dir, enviar, agora = Date.now, log = console }) {
  mkdirSync(dir, { recursive: true });

  /** sub → {aparelhos: {id: {inscricao, agendas: {tipo: avisos[]}}}} */
  const contas = new Map();
  for (const nome of readdirSync(dir)) {
    if (!nome.endsWith(".json")) continue;
    try {
      const conta = JSON.parse(readFileSync(join(dir, nome), "utf8"));
      if (conta?.sub) contas.set(conta.sub, conta);
    } catch (e) {
      log.warn(`[push] ignorando ${nome}: ${e.message}`);
    }
  }

  function salvar(conta) {
    // Escreve ao lado e renomeia: queda no meio não deixa JSON pela metade.
    const destino = arquivoDaConta(dir, conta.sub);
    const tmp = `${destino}.tmp`;
    writeFileSync(tmp, JSON.stringify(conta));
    renameSync(tmp, destino);
  }

  /**
   * Grava a agenda de um tipo, de um aparelho. A inscrição vem junto toda vez:
   * o navegador pode trocá-la, e quem manda a agenda sempre a tem em mãos.
   *
   * @returns {boolean} falso quando a conta já está no teto de aparelhos
   */
  function gravarAgenda(sub, { aparelho, inscricao, tipo, avisos }) {
    const conta = contas.get(sub) ?? { sub, aparelhos: {} };
    const existente = conta.aparelhos[aparelho];
    if (!existente && Object.keys(conta.aparelhos).length >= MAX_APARELHOS) {
      return false;
    }
    conta.aparelhos[aparelho] = {
      inscricao,
      agendas: { ...(existente?.agendas ?? {}), [tipo]: avisos },
      atualizadoEm: agora(),
    };
    contas.set(sub, conta);
    salvar(conta);
    return true;
  }

  /** Esquece o aparelho: interruptor desligado em todos os tipos, ou saída. */
  function apagarAparelho(sub, aparelho) {
    const conta = contas.get(sub);
    if (!conta?.aparelhos[aparelho]) return;
    delete conta.aparelhos[aparelho];
    salvar(conta);
  }

  /**
   * Manda o que venceu e tira da agenda. Chamado a cada meio minuto.
   *
   * Cada aviso sai uma vez só, tenha dado certo ou não: tentar de novo
   * mandaria o lembrete atrasado, que é pior que não mandar. O que passou do
   * `ATRASO_MAX_MS` (server fora do ar, por exemplo) é descartado.
   *
   * @returns {Promise<number>} quantos foram enviados
   */
  async function disparar() {
    const now = agora();
    let enviados = 0;
    for (const conta of contas.values()) {
      let mudou = false;
      for (const [id, aparelho] of Object.entries(conta.aparelhos)) {
        const vencidos = [];
        for (const tipo of Object.keys(aparelho.agendas)) {
          const agenda = aparelho.agendas[tipo];
          const restantes = agenda.filter((a) => a.at > now);
          if (restantes.length === agenda.length) continue;
          for (const a of agenda) {
            if (a.at <= now && now - a.at <= ATRASO_MAX_MS) {
              vencidos.push({ ...a, tipo });
            }
          }
          aparelho.agendas[tipo] = restantes;
          mudou = true;
        }
        for (const a of vencidos) {
          try {
            await enviar(
              aparelho.inscricao,
              JSON.stringify({ title: a.title, body: a.body, tag: a.tipo }),
            );
            enviados += 1;
          } catch (e) {
            // 404 e 410: o navegador cancelou a inscrição. O aparelho sai, e
            // volta sozinho na próxima agenda que o app mandar.
            if (e?.statusCode === 404 || e?.statusCode === 410) {
              delete conta.aparelhos[id];
              log.warn(`[push] inscrição expirada, aparelho removido`);
              break;
            }
            log.warn(`[push] falha ao enviar: ${e?.statusCode ?? e?.message}`);
          }
        }
      }
      if (mudou) salvar(conta);
    }
    return enviados;
  }

  return { gravarAgenda, apagarAparelho, disparar };
}
