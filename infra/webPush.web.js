// @ts-nocheck -- APIs de push e service worker do navegador (ADR-002)

/**
 * Lembretes por Web Push no navegador (#417, fatia 4 da #407).
 *
 * No navegador não existe aviso agendado local que funcione. Então a conta de
 * QUANDO avisar continua a mesma do celular (`reminderSchedule` e as outras),
 * e a lista dos próximos avisos de cada tipo vai pro server de sync, que
 * dispara na hora (`server/push.js`).
 *
 * A lista substitui a anterior do mesmo tipo, como o cancelar-e-agendar do
 * celular: registrar o hábito manda uma lista sem o aviso, e ele some.
 *
 * ## Onde funciona
 *
 * Chrome no Android e no computador, e o iPhone com o app instalado na tela
 * de início: o iOS só entrega push pra PWA instalado. E só em https, que é
 * onde o service worker é registrado (`public/index.html`).
 */

import { SYNC_URL } from "@/constants/sync";

import { buildHttpUrl } from "./sync-url";
import { supabase } from "./supabase";

/** Id deste aparelho no server, pra uma conta ter vários navegadores. */
const CHAVE_APARELHO = "bot-push-aparelho";

/** O teto do server por tipo. Com 3 dias agendados, não chega perto. */
const MAX_AVISOS = 64;

/** O último corpo mandado por tipo: o mesmo de novo não vira outro pedido. */
const ultimo = new Map();

let aparelhoEmMemoria = null;

export function pushSuportado() {
  return (
    typeof window !== "undefined" &&
    window.location?.protocol === "https:" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iPhone (ou iPad) no navegador, fora do app instalado. */
export function precisaInstalar() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const ios = /iPhone|iPad|iPod/.test(ua) || ipad;
  const instalado =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    navigator.standalone === true;
  return ios && !instalado;
}

export function permissaoConcedida() {
  return pushSuportado() && Notification.permission === "granted";
}

/**
 * Pede a permissão. ⚠️ O pedido tem que sair antes de qualquer `await`: o
 * iOS só mostra o diálogo dentro do toque da pessoa.
 */
export async function pedirPermissao() {
  if (!pushSuportado()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

function idDoAparelho() {
  try {
    let id = localStorage.getItem(CHAVE_APARELHO);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CHAVE_APARELHO, id);
    }
    return id;
  } catch {
    // Sem localStorage (aba privada no iOS), vale pela sessão.
    aparelhoEmMemoria ??= crypto.randomUUID();
    return aparelhoEmMemoria;
  }
}

async function token() {
  const { data } = (await supabase?.auth.getSession()) ?? {};
  return data?.session?.access_token ?? null;
}

/** base64url → bytes, o formato que o `subscribe` pede pra chave VAPID. */
function bytesDaChave(base64url) {
  const b64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** A inscrição deste navegador, criando na primeira vez. */
async function inscricao() {
  const reg = await navigator.serviceWorker.ready;
  const existente = await reg.pushManager.getSubscription();
  if (existente) return existente;
  const resp = await fetch(buildHttpUrl(SYNC_URL, "/push/chave"));
  if (!resp.ok) throw new Error(`push indisponível (${resp.status})`);
  const { publicKey } = await resp.json();
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: bytesDaChave(publicKey),
  });
}

/**
 * Manda a agenda de um tipo pro server. Lista vazia cala o tipo.
 *
 * @param {"foco"|"sono"|"remedio"} tipo
 * @param {Array<{at: number, title: string, body: string}>} avisos
 * @returns {Promise<Array<object>>} o que foi agendado
 */
export async function enviarAgenda(tipo, avisos) {
  if (!permissaoConcedida() || !SYNC_URL) return [];
  const sessao = await token();
  if (!sessao) return [];
  const lista = [...avisos]
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_AVISOS)
    .map(({ at, title, body }) => ({ at, title, body }));
  const corpo = JSON.stringify({
    aparelho: idDoAparelho(),
    inscricao: (await inscricao()).toJSON(),
    tipo,
    avisos: lista,
  });
  if (ultimo.get(tipo) === corpo) return lista;
  const resp = await fetch(buildHttpUrl(SYNC_URL, "/push/agenda"), {
    method: "PUT",
    headers: {
      authorization: `Bearer ${sessao}`,
      "content-type": "application/json",
    },
    body: corpo,
  });
  if (!resp.ok) throw new Error(`agenda recusada (${resp.status})`);
  ultimo.set(tipo, corpo);
  return lista;
}

/**
 * Tira este navegador do server, ao sair da conta. Sem isto, os avisos já
 * agendados continuariam chegando aqui pra quem entrasse depois.
 */
export async function esquecerAparelho() {
  ultimo.clear();
  if (!pushSuportado() || !SYNC_URL) return;
  const sessao = await token();
  if (!sessao) return;
  await fetch(buildHttpUrl(SYNC_URL, `/push/aparelhos/${idDoAparelho()}`), {
    method: "DELETE",
    headers: { authorization: `Bearer ${sessao}` },
  });
}
